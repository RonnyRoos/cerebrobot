#!/bin/bash

echo "🛑 Stopping test database container..."
docker-compose --profile test down postgres-test
echo "✅ Test database stopped"
