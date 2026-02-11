#!/bin/bash

# Initialize test database for backend tests

set -e

# Read .env file or use defaults
POSTGRES_USER=${POSTGRES_USER:-app}
TEST_DB=${TEST_DB:-app_test}
CONTAINER_NAME=${CONTAINER_NAME:-dep_postgres}

echo "Creating test database: ${TEST_DB}"

# Check if postgres container is running
if ! docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "SELECT 1" > /dev/null 2>&1; then
    echo "ERROR: PostgreSQL container is not running"
    echo "Please start PostgreSQL first: docker compose up -d postgres"
    exit 1
fi

# Create test database if not exists
docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "SELECT 1 FROM pg_database WHERE datname='${TEST_DB}'" | grep -q 1 || \
    docker exec ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -c "CREATE DATABASE ${TEST_DB}"

echo "Test database '${TEST_DB}' created successfully"
