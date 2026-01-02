# PYrte Radio Shack - Cloudflare Tunnel Setup Script
# This script starts a Cloudflare tunnel and updates the .env file

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PYrte Radio Shack - Tunnel Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared is installed
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "ERROR: cloudflared is not installed!" -ForegroundColor Red
    Write-Host "Install it with: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    exit 1
}

Write-Host "cloudflared found: $($cloudflared.Source)" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running on port 8000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Backend is not running on port 8000" -ForegroundColor Red
    Write-Host "Start it with: python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host "This will expose your local backend to the internet." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Copy the tunnel URL that appears below" -ForegroundColor Cyan
Write-Host "and update BACKEND_PUBLIC_URL in your .env file" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the tunnel when done." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the tunnel
cloudflared tunnel --url http://localhost:8000
