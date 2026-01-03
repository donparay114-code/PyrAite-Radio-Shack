#!/usr/bin/env python3
"""Test full connectivity between Backend API and n8n instance."""

import asyncio
import os
import re
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx


def load_env():
    """Load environment variables from .env file."""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())


def update_env_file(key: str, value: str):
    """Update a key in the .env file."""
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        print(f"ERROR: .env file not found at {env_path}")
        return False

    content = env_path.read_text()
    pattern = rf"^{re.escape(key)}=.*$"
    replacement = f"{key}={value}"

    if re.search(pattern, content, re.MULTILINE):
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        new_content = content + f"\n{replacement}\n"

    env_path.write_text(new_content)
    print(f"Updated {key} in .env file")
    return True


async def test_full_connectivity():
    """Test full connectivity flow."""
    load_env()

    n8n_host = os.environ.get("N8N_HOST", "https://n8nbigdata.com")
    backend_url = os.environ.get("BACKEND_PUBLIC_URL", "")
    suno_api_url = os.environ.get("SUNO_API_URL", "")

    print("=" * 60)
    print("FULL CONNECTIVITY TEST")
    print("=" * 60)
    print("\nConfiguration:")
    print(f"  N8N_HOST:           {n8n_host}")
    print(f"  BACKEND_PUBLIC_URL: {backend_url}")
    print(f"  SUNO_API_URL:       {suno_api_url}")
    print()

    results = {
        "local_backend": False,
        "n8n_reachable": False,
        "n8n_healthy": False,
        "tunnel_working": False,
        "webhook_test": False,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test 1: Local backend
        print("1. Testing local backend...")
        try:
            response = await client.get("http://localhost:8000/health")
            results["local_backend"] = response.status_code == 200
            print(f"   Status: {'PASS' if results['local_backend'] else 'FAIL'}")
            if results["local_backend"]:
                print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"   Status: FAIL - {e}")

        # Test 2: n8n reachability
        print("\n2. Testing n8n reachability...")
        try:
            response = await client.get(f"{n8n_host}/")
            results["n8n_reachable"] = response.status_code == 200
            print(f"   Status: {'PASS' if results['n8n_reachable'] else 'FAIL'}")
        except Exception as e:
            print(f"   Status: FAIL - {e}")

        # Test 3: n8n health
        print("\n3. Testing n8n health...")
        try:
            response = await client.get(f"{n8n_host}/healthz")
            if response.status_code == 200:
                data = response.json()
                results["n8n_healthy"] = data.get("status") == "ok"
                print(f"   Status: {'PASS' if results['n8n_healthy'] else 'FAIL'}")
                print(f"   Health: {data}")
        except Exception as e:
            print(f"   Status: FAIL - {e}")

        # Test 4: Tunnel connectivity (if configured)
        if backend_url and "trycloudflare.com" in backend_url:
            print("\n4. Testing Cloudflare tunnel...")
            try:
                response = await client.get(f"{backend_url}/health")
                results["tunnel_working"] = response.status_code == 200
                print(f"   Status: {'PASS' if results['tunnel_working'] else 'FAIL'}")
                if results["tunnel_working"]:
                    print(f"   Response: {response.json()}")
            except Exception as e:
                print(f"   Status: FAIL - {e}")
        else:
            print("\n4. Testing Cloudflare tunnel...")
            print("   Status: SKIP - BACKEND_PUBLIC_URL not configured")
            print("   Run: scripts/setup_tunnel.ps1 to create a tunnel")

        # Test 5: Webhook endpoint (local)
        print("\n5. Testing webhook endpoint (local)...")
        try:
            payload = {
                "job_id": "connectivity-test-123",
                "status": "complete",
                "audio_url": "https://example.com/test.mp3",
            }
            response = await client.post(
                "http://localhost:8000/api/webhooks/suno/status", json=payload
            )
            results["webhook_test"] = response.status_code == 200
            print(f"   Status: {'PASS' if results['webhook_test'] else 'FAIL'}")
            if results["webhook_test"]:
                print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"   Status: FAIL - {e}")

    # Summary
    print("\n" + "=" * 60)
    print("CONNECTIVITY TEST SUMMARY")
    print("=" * 60)

    all_core_passed = (
        results["local_backend"] and results["n8n_reachable"] and results["n8n_healthy"]
    )

    print(f"Local Backend:      {'PASS' if results['local_backend'] else 'FAIL'}")
    print(f"n8n Reachable:      {'PASS' if results['n8n_reachable'] else 'FAIL'}")
    print(f"n8n Healthy:        {'PASS' if results['n8n_healthy'] else 'FAIL'}")
    print(
        f"Tunnel Working:     {'PASS' if results['tunnel_working'] else 'NOT CONFIGURED'}"
    )
    print(f"Webhook Test:       {'PASS' if results['webhook_test'] else 'FAIL'}")
    print()

    if all_core_passed:
        print("CORE CONNECTIVITY: PASSED")
        if not results["tunnel_working"]:
            print("\nTo complete setup:")
            print("1. Run: powershell -File scripts/setup_tunnel.ps1")
            print("2. Copy the tunnel URL")
            print("3. Update BACKEND_PUBLIC_URL in .env")
            print("4. Update n8n workflow nodes with the tunnel URL")
        return 0
    else:
        print("CORE CONNECTIVITY: FAILED")
        print("\nTroubleshooting:")
        if not results["local_backend"]:
            print("- Start the backend: uvicorn src.api.main:app --port 8000")
        if not results["n8n_reachable"]:
            print("- Check N8N_HOST in .env")
            print("- Verify n8n instance is running")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(test_full_connectivity())
    sys.exit(exit_code)
