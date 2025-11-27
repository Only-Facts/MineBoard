FROM rust:1.88.0-slim-bookworm AS builder-back

WORKDIR /app

COPY ./Cargo.toml ./Cargo.lock ./
COPY ./src/ ./src/

RUN cargo build --release --locked

FROM node:22.0-bookworm-slim AS builder-front

WORKDIR /app

COPY ./front .

RUN npm i && npm run build

FROM openjdk:21-rc-jdk-slim-bookworm

WORKDIR /app

COPY --from=builder-back /app/target/release/mineboard /app/mineboard
COPY --from=builder-front /app/dist /app/front/dist/
COPY ./server/ /app/server/

RUN chmod +x ./mineboard

CMD [ "./mineboard" ]
