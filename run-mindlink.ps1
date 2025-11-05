Write-Host "🚀 Starting Mindlink Backend and Frontend..."

# Start backend
Start-Process powershell -ArgumentList "poetry run uvicorn pkg.app.main:app --reload" -NoNewWindow

# Wait a few seconds to let backend start
Start-Sleep -Seconds 3

# Start frontend
Start-Process powershell -ArgumentList "cd frontend; npm run dev" -NoNewWindow

Write-Host "✅ Mindlink is running!"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://127.0.0.1:8000"
