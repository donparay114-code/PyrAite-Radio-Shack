# PYrte Radio Shack - Install Windows Startup Task
# This script creates a scheduled task to start the radio station on boot

param(
    [switch]$Uninstall,
    [switch]$BackendOnly,
    [switch]$TunnelOnly
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$taskNameBackend = "PYrte-RadioShack-Backend"
$taskNameTunnel = "PYrte-RadioShack-Tunnel"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PYrte Radio Shack - Startup Task Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Uninstall) {
    Write-Host "Uninstalling scheduled tasks..." -ForegroundColor Yellow

    $existing = Get-ScheduledTask -TaskName $taskNameBackend -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskNameBackend -Confirm:$false
        Write-Host "Removed: $taskNameBackend" -ForegroundColor Green
    }

    $existing = Get-ScheduledTask -TaskName $taskNameTunnel -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskNameTunnel -Confirm:$false
        Write-Host "Removed: $taskNameTunnel" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Startup tasks removed." -ForegroundColor Green
    exit 0
}

# Create Backend Task
if (-not $TunnelOnly) {
    Write-Host "Creating Backend startup task..." -ForegroundColor Yellow

    $backendAction = New-ScheduledTaskAction `
        -Execute "python" `
        -Argument "-m uvicorn src.api.main:app --host 0.0.0.0 --port 8000" `
        -WorkingDirectory $projectRoot

    $backendTrigger = New-ScheduledTaskTrigger -AtLogon

    $backendSettings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -RestartCount 3

    $existing = Get-ScheduledTask -TaskName $taskNameBackend -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskNameBackend -Confirm:$false
    }

    Register-ScheduledTask `
        -TaskName $taskNameBackend `
        -Action $backendAction `
        -Trigger $backendTrigger `
        -Settings $backendSettings `
        -Description "PYrte Radio Shack Backend API Server" `
        -RunLevel Highest | Out-Null

    Write-Host "Created: $taskNameBackend" -ForegroundColor Green
}

# Create Tunnel Task
if (-not $BackendOnly) {
    Write-Host "Creating Tunnel startup task..." -ForegroundColor Yellow

    $tunnelAction = New-ScheduledTaskAction `
        -Execute "python" `
        -Argument "scripts/tunnel_manager.py" `
        -WorkingDirectory $projectRoot

    # Delay tunnel start by 30 seconds to let backend initialize
    $tunnelTrigger = New-ScheduledTaskTrigger -AtLogon
    $tunnelTrigger.Delay = "PT30S"

    $tunnelSettings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -RestartCount 3

    $existing = Get-ScheduledTask -TaskName $taskNameTunnel -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskNameTunnel -Confirm:$false
    }

    Register-ScheduledTask `
        -TaskName $taskNameTunnel `
        -Action $tunnelAction `
        -Trigger $tunnelTrigger `
        -Settings $tunnelSettings `
        -Description "PYrte Radio Shack Cloudflare Tunnel Manager" `
        -RunLevel Highest | Out-Null

    Write-Host "Created: $taskNameTunnel" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Startup tasks installed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The radio station will start automatically on login."
Write-Host ""
Write-Host "Manual control:" -ForegroundColor Yellow
Write-Host "  Start Backend: Start-ScheduledTask -TaskName '$taskNameBackend'"
Write-Host "  Start Tunnel:  Start-ScheduledTask -TaskName '$taskNameTunnel'"
Write-Host "  Stop Backend:  Stop-ScheduledTask -TaskName '$taskNameBackend'"
Write-Host "  Stop Tunnel:   Stop-ScheduledTask -TaskName '$taskNameTunnel'"
Write-Host ""
Write-Host "To uninstall: .\install_startup_task.ps1 -Uninstall"
