# Backend Dockerfile for VPS deployment
FROM python:3.12-slim

# Install system dependencies and security updates
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Set working directory to app root
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy application code - preserve backend package structure
# Build context is ./backend, so we copy everything to /app/backend/
COPY . /app/backend/

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Set working directory to app root
WORKDIR /app

# Add the app directory to Python path
ENV PYTHONPATH=/app

# Expose port (Cloud Run uses PORT env var, default to 8080)
ENV PORT=8080
EXPOSE 8080

# Copy migration runner script
COPY run_migrations.py /app/backend/

# Create startup script that runs migrations then starts the server
RUN echo '#!/bin/bash\n\
set -e\n\
echo "=== Running database migrations ==="\n\
cd /app\n\
python -u backend/run_migrations.py 2>&1 | tee /tmp/migration.log\n\
MIGRATION_EXIT=${PIPESTATUS[0]}\n\
if [ $MIGRATION_EXIT -ne 0 ]; then\n\
  echo "ERROR: Migrations failed with exit code $MIGRATION_EXIT"\n\
  echo "=== Migration log output ==="\n\
  cat /tmp/migration.log\n\
  echo "=== End migration log ==="\n\
  exit 1\n\
fi\n\
echo "=== Migrations complete - starting server ==="\n\
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1' > /app/start.sh && \
    chmod +x /app/start.sh

# Ensure all files are owned by appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Run migrations and start server
CMD ["/app/start.sh"]

