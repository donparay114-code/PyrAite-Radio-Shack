# Liquidsoap Dockerfile for PYrte Radio Shack

FROM savonet/liquidsoap:v2.2.0

# Install additional dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /app/data/songs \
    /app/data/fallback \
    /app/data/broadcast \
    /var/log/liquidsoap

# Copy configuration
COPY radio.liq /app/radio.liq

# Create non-root user
RUN useradd -r -s /bin/false liquidsoap \
    && chown -R liquidsoap:liquidsoap /app /var/log/liquidsoap

USER liquidsoap

WORKDIR /app

# Expose ports
# 8080 - HTTP API
# 1234 - Telnet control
EXPOSE 8080 1234

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/status || exit 1

# Run Liquidsoap
CMD ["liquidsoap", "/app/radio.liq"]
