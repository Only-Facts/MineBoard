use std::sync::Mutex;

use actix_files::Files;
use actix_web::{App, HttpServer, web};

mod server;

const FRONT_BUILD_DIR: &str = "./front/dist";

#[derive(Debug)]
pub struct AppState {
    pub server_pid: Mutex<Option<u32>>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let app_state = web::Data::new(AppState {
        server_pid: Mutex::new(None),
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
            .service(Files::new("/", FRONT_BUILD_DIR).index_file("index.html"))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
