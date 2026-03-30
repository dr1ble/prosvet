#!/bin/bash
# Quick start: backend + web without docker

cd "$(dirname "$0")"

# Kill existing
pkill -f "uvicorn.*8000" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Start backend
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "Waiting for backend..."
for i in {1..10}; do
    if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    sleep 1
done

# Start web
cd web
npm run dev &
WEB_PID=$!

echo ""
echo "========================================"
echo "  Backend:  http://localhost:8000"
echo "  Web:      http://localhost:3000"
echo "  Health:   http://localhost:8000/api/v1/health"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop"

# Wait
wait
