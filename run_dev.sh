#!/usr/bin/env bash
set -e

# StayEase Development Runner
# Starts FastAPI Backend (port 8000) and Frontend (port 5173) concurrently

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo " Starting StayEase Hotel Management Development Platform "
echo "=========================================================="

cleanup() {
    echo ""
    echo "Stopping all StayEase services..."
    kill $(jobs -p) 2>/dev/null || true
    wait $(jobs -p) 2>/dev/null || true
    echo "All services cleanly stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start FastAPI Backend
echo "[Backend] Launching FastAPI on http://127.0.0.1:8000 ..."
cd "$ROOT_DIR/stayease-backend"
if [ -f ".venv/bin/uvicorn" ]; then
    .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
else
    python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
fi
BACKEND_PID=$!

# 2. Start Unified Frontend
echo "[Frontend] Launching TanStack Start / Vite on http://localhost:5173 ..."
cd "$ROOT_DIR/stayease-frontend"
npm run dev -- --port 5173 --host 127.0.0.1 &
FRONTEND_PID=$!

echo ""
echo "----------------------------------------------------------"
echo "  FastAPI Backend API: http://127.0.0.1:8000"
echo "  FastAPI Swagger UI:  http://127.0.0.1:8000/docs"
echo "  StayEase Frontend:   http://localhost:5173"
echo "----------------------------------------------------------"
echo "Press Ctrl+C to terminate both servers."
echo ""

wait

