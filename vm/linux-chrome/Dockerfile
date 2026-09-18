FROM debian:bookworm-slim
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    chromium xvfb fluxbox x11vnc novnc websockify socat \
    fonts-liberation fonts-noto-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV DISPLAY=:99
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 5900 6080 9222
VOLUME /data/profile
ENTRYPOINT ["/entrypoint.sh"]
