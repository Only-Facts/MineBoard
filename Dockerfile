FROM rust:1.88.0-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && \
  apt-get install -y \
  pkg-config \
  libssl-dev \
  build-essential && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

COPY . .

RUN cargo build --release --locked

FROM rust:1.88.0-slim-bookworm

RUN apt-get update && \
  apt-get install -y \
  libssl-dev && \
  apt-get clean

WORKDIR /app

COPY --from=builder /app/target/release/mineboard ./mineboard
COPY ./.env ./.env

RUN chmod +x ./mineboard

CMD [ "./mineboard" ]

