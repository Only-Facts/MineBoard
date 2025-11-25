use std::sync::Mutex;

use actix::Actor;
use actix_files::Files;
use actix_web::{App, HttpServer, web};
use dotenvy::dotenv;

use crate::broadcaster::Broadcaster;

mod broadcaster;
mod messages;
mod server;
mod websocket;

#[derive(Debug)]
pub struct Config {
    pub front_build_dir: String,
    pub server_path: String,
    pub command: String,
    pub args: Vec<String>,
}

#[derive(Debug)]
pub struct AppState {
    pub server_pid: Mutex<Option<u32>>,
    pub broadcaster: actix::Addr<Broadcaster>,
    pub config: Config,
}

impl Config {
    fn new() -> Self {
        Self {
            front_build_dir: std::env::var("FRONT_BUILD_DIR")
                .expect("Env Error: FRONT_BUILD_DIR variable not found."),
            server_path: std::env::var("SERVER_PATH")
                .expect("Env Error: SERVER_PATH variable not found."),
            command: std::env::var("COMMAND").expect("Env Error: COMMAND variable not found."),
            args: std::env::var("ARGS")
                .expect("Env Error: ARGS variable not found.")
                .split(' ')
                .map(|s| s.to_string())
                .collect::<Vec<String>>(),
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let broadcaster_addr = Broadcaster::new().start();
    let config = Config::new();
    let front_build_dir = config.front_build_dir.clone();

    let app_state = web::Data::new(AppState {
        server_pid: Mutex::new(None),
        broadcaster: broadcaster_addr,
        config,
    });

    println!("Ready !");

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .service(
                web::scope("/api")
                    .route("/start", web::post().to(server::start_server))
                    .route("/stop", web::post().to(server::stop_server)),
            )
            .service(web::scope("/ws").route("/logs", web::get().to(websocket::ws_route)))
            .service(Files::new("/", front_build_dir.clone()).index_file("index.html"))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
