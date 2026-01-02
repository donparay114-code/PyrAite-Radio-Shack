#!/usr/bin/env python3
"""Test connectivity between Backend API and n8n instance."""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx


async def test_n8n_connectivity():
    """Test connectivity to n8n instance."""
    # Get n8n host from environment or use default
    n8n_host = os.environ.get("N8N_HOST", "https://n8nbigdata.com")

    print(f"Testing n8n connectivity to: {n8n_host}")
    print("=" * 60)

    results = {
        "n8n_reachable": False,
        "n8n_healthy": False,
        "api_info": None,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test 1: Basic connectivity
        print("\n1. Testing basic connectivity...")
        try:
            response = await client.get(f"{n8n_host}/")
            results["n8n_reachable"] = response.status_code == 200
            print(f"   Status: {'OK' if results['n8n_reachable'] else 'FAILED'}")
            print(f"   HTTP Status: {response.status_code}")
        except Exception as e:
            print(f"   Status: FAILED - {e}")

        # Test 2: Health check
        print("\n2. Testing health endpoint...")
        try:
            response = await client.get(f"{n8n_host}/healthz")
            if response.status_code == 200:
                data = response.json()
                results["n8n_healthy"] = data.get("status") == "ok"
                print(f"   Status: {'OK' if results['n8n_healthy'] else 'FAILED'}")
                print(f"   Health: {data}")
            else:
                print(f"   Status: FAILED - HTTP {response.status_code}")
        except Exception as e:
            print(f"   Status: FAILED - {e}")

        # Test 3: API info (if accessible)
        print("\n3. Testing API access...")
        try:
            # Try to get API info - may require authentication
            response = await client.get(
                f"{n8n_host}/api/v1/workflows", headers={"Accept": "application/json"}
            )
            if response.status_code == 200:
                data = response.json()
                results["api_info"] = f"{len(data.get('data', []))} workflows found"
                print(f"   Status: OK - {results['api_info']}")
            elif response.status_code == 401:
                results["api_info"] = "Authentication required (expected behavior)"
                print(f"   Status: OK - {results['api_info']}")
            else:
                print(f"   Status: HTTP {response.status_code}")
        except Exception as e:
            print(f"   Status: FAILED - {e}")

    # Summary
    print("\n" + "=" * 60)
    print("CONNECTIVITY TEST SUMMARY")
    print("=" * 60)

    all_passed = results["n8n_reachable"] and results["n8n_healthy"]

    print(f"n8n Reachable:  {'PASS' if results['n8n_reachable'] else 'FAIL'}")
    print(f"n8n Healthy:    {'PASS' if results['n8n_healthy'] else 'FAIL'}")
    print(f"API Access:     {results['api_info'] or 'NOT TESTED'}")
    print()

    if all_passed:
        print("RESULT: All connectivity tests PASSED")
        print("\nNext steps:")
        print("1. Ensure your backend is exposed via Cloudflare Tunnel")
        print("2. Configure API_URL in n8n environment to point to your backend")
        print("3. Import the workflow JSON files from n8n_workflows/")
        return 0
    else:
        print("RESULT: Some connectivity tests FAILED")
        print("\nTroubleshooting:")
        print("1. Check if n8n instance is running")
        print("2. Verify N8N_HOST environment variable")
        print("3. Check network/firewall settings")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(test_n8n_connectivity())
    sys.exit(exit_code)
