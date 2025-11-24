use actix_web::{HttpResponse, web};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader as TokioBufReader};
use tokio::process::Command;

use crate::AppState;
use crate::messages::BroadcastLog;

const COMMAND: &str = "java";
const START_PATH: &[&str] = &["-jar", "./server/server.jar", "nogui"];

async fn handle_output_stream<T>(stream: T, app_state: web::Data<AppState>, is_error: bool)
where
    T: AsyncRead + Unpin + Send + 'static,
{
    let mut reader = TokioBufReader::new(stream);
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => break,
            Ok(_) => {
                let log_message = line.trim_end().to_string();

                let broadcaster = &app_state.broadcaster;
                let log_msg = BroadcastLog {
                    message: log_message,
                    is_error,
                };

                broadcaster.do_send(log_msg);
            }
            Err(e) => {
                eprintln!("Error reading stream: {e}");
                break;
            }
        }
    }
    println!("Stream closed.")
}

pub async fn start_server(app_state: web::Data<AppState>) -> HttpResponse {
    let mut command = Command::new(COMMAND);

    command.args(START_PATH);

    match command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(mut child) => {
            let stdout = child.stdout.take().expect("Failed to open stdout");
            let stderr = child.stderr.take().expect("Failed to open stderr");

            tokio::spawn(handle_output_stream(stdout, app_state.clone(), false));
            tokio::spawn(handle_output_stream(stderr, app_state.clone(), true));

            *app_state.server_pid.lock().unwrap() = child.id();

            println!(
                "Server started (PID : {})",
                if let Some(pid) = child.id() {
                    pid.to_string()
                } else {
                    "no pid".to_string()
                }
            );
            HttpResponse::Ok().body(format!(
                "Server started (PID: {})",
                if let Some(pid) = child.id() {
                    pid.to_string()
                } else {
                    "no pid".to_string()
                }
            ))
        }
        Err(e) => {
            eprintln!("Error starting server: {e}");
            actix_web::HttpResponse::InternalServerError()
                .body(format!("Error starting server: {e}"))
        }
    }
}

pub async fn stop_server() -> HttpResponse {
    HttpResponse::Ok().body("(not implemented yet)")
}
