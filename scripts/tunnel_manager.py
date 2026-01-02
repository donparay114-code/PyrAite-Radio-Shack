#!/usr/bin/env python3
"""
Cloudflare Tunnel Manager for PYrte Radio Shack.

This script manages a persistent Cloudflare tunnel, automatically:
- Starts the tunnel if not running
- Updates .env with the tunnel URL
- Monitors tunnel health and restarts if needed
- Can run as a Windows service or background process
"""

import asyncio
import re
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
LOG_FILE = PROJECT_ROOT / "data" / "tunnel.log"
PID_FILE = PROJECT_ROOT / "data" / "tunnel.pid"
BACKEND_PORT = 8000
HEALTH_CHECK_INTERVAL = 30  # seconds
RESTART_DELAY = 5  # seconds


class TunnelManager:
    """Manages Cloudflare tunnel lifecycle."""

    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.tunnel_url: Optional[str] = None
        self.running = False
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        """Ensure data directory exists."""
        (PROJECT_ROOT / "data").mkdir(exist_ok=True)

    def _log(self, message: str, level: str = "INFO"):
        """Log message to file and console."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_msg = f"[{timestamp}] [{level}] {message}"
        print(log_msg)
        try:
            with open(LOG_FILE, "a") as f:
                f.write(log_msg + "\n")
        except Exception:
            pass

    def _update_env_file(self, tunnel_url: str) -> bool:
        """Update BACKEND_PUBLIC_URL in .env file."""
        if not ENV_FILE.exists():
            self._log(f"ERROR: .env file not found at {ENV_FILE}", "ERROR")
            return False

        content = ENV_FILE.read_text()
        key = "BACKEND_PUBLIC_URL"
        pattern = rf"^{re.escape(key)}=.*$"
        replacement = f"{key}={tunnel_url}"

        if re.search(pattern, content, re.MULTILINE):
            new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        else:
            new_content = content + f"\n{replacement}\n"

        ENV_FILE.write_text(new_content)
        self._log(f"Updated {key} in .env: {tunnel_url}")
        return True

    def _extract_tunnel_url(self, line: str) -> Optional[str]:
        """Extract tunnel URL from cloudflared output."""
        # Look for the tunnel URL pattern
        patterns = [
            r"https://[a-z0-9-]+\.trycloudflare\.com",
            r"https://[a-z0-9-]+\.cfargotunnel\.com",
        ]
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(0)
        return None

    def _save_pid(self):
        """Save process PID to file."""
        if self.process:
            PID_FILE.write_text(str(self.process.pid))

    def _clear_pid(self):
        """Remove PID file."""
        if PID_FILE.exists():
            PID_FILE.unlink()

    async def _check_backend_health(self) -> bool:
        """Check if local backend is healthy."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"http://localhost:{BACKEND_PORT}/health")
                return response.status_code == 200
        except Exception:
            return False

    async def _check_tunnel_health(self) -> bool:
        """Check if tunnel is healthy by accessing through it."""
        if not self.tunnel_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.tunnel_url}/health")
                return response.status_code == 200
        except Exception:
            return False

    def start_tunnel(self) -> bool:
        """Start the Cloudflare tunnel."""
        self._log("Starting Cloudflare tunnel...")

        # Check if cloudflared is installed
        try:
            subprocess.run(
                ["cloudflared", "--version"], capture_output=True, check=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            self._log("ERROR: cloudflared not installed!", "ERROR")
            self._log("Install with: winget install Cloudflare.cloudflared", "ERROR")
            return False

        # Start tunnel process with empty config to avoid credential conflicts
        try:
            self.process = subprocess.Popen(
                [
                    "cloudflared",
                    "tunnel",
                    "--url",
                    f"http://127.0.0.1:{BACKEND_PORT}",
                    "--config",
                    "",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            self._save_pid()
            self._log(f"Tunnel process started with PID: {self.process.pid}")

            # Wait for tunnel URL
            start_time = time.time()
            while time.time() - start_time < 30:  # 30 second timeout
                if self.process.poll() is not None:
                    self._log("Tunnel process exited unexpectedly", "ERROR")
                    return False

                line = self.process.stdout.readline()
                if line:
                    self._log(f"cloudflared: {line.strip()}", "DEBUG")
                    url = self._extract_tunnel_url(line)
                    if url:
                        self.tunnel_url = url
                        self._log(f"Tunnel URL: {url}")
                        self._update_env_file(url)
                        return True

            self._log("Timeout waiting for tunnel URL", "ERROR")
            return False

        except Exception as e:
            self._log(f"Failed to start tunnel: {e}", "ERROR")
            return False

    def stop_tunnel(self):
        """Stop the tunnel process."""
        if self.process:
            self._log("Stopping tunnel...")
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.process = None
            self.tunnel_url = None
            self._clear_pid()
            self._log("Tunnel stopped")

    async def monitor_loop(self):
        """Monitor tunnel health and restart if needed."""
        self._log("Starting tunnel monitor...")
        self.running = True

        while self.running:
            # Check backend health
            backend_ok = await self._check_backend_health()
            if not backend_ok:
                self._log("Backend not healthy, waiting...", "WARN")
                await asyncio.sleep(HEALTH_CHECK_INTERVAL)
                continue

            # Check tunnel health
            tunnel_ok = await self._check_tunnel_health()
            if not tunnel_ok:
                self._log("Tunnel unhealthy, restarting...", "WARN")
                self.stop_tunnel()
                await asyncio.sleep(RESTART_DELAY)
                if not self.start_tunnel():
                    self._log("Failed to restart tunnel", "ERROR")

            await asyncio.sleep(HEALTH_CHECK_INTERVAL)

    def handle_signal(self, signum, frame):
        """Handle shutdown signals."""
        self._log(f"Received signal {signum}, shutting down...")
        self.running = False
        self.stop_tunnel()
        sys.exit(0)


async def main():
    """Main entry point."""
    manager = TunnelManager()

    # Set up signal handlers
    signal.signal(signal.SIGINT, manager.handle_signal)
    signal.signal(signal.SIGTERM, manager.handle_signal)

    print("=" * 60)
    print("PYrte Radio Shack - Tunnel Manager")
    print("=" * 60)
    print()

    # Check backend first
    backend_ok = await manager._check_backend_health()
    if not backend_ok:
        print("WARNING: Backend not running on port 8000")
        print("Start it with: python -m uvicorn src.api.main:app --port 8000")
        print()

    # Start tunnel
    if not manager.start_tunnel():
        print("Failed to start tunnel")
        sys.exit(1)

    print()
    print(f"Tunnel URL: {manager.tunnel_url}")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 60)

    # Run monitor loop
    await manager.monitor_loop()


if __name__ == "__main__":
    asyncio.run(main())
