#!/usr/bin/env python3
"""Generate n8n credential configuration files for PYrte Radio Shack.

This script creates JSON files that can be imported into n8n to set up
the required credentials for the radio station workflows.

Usage:
    python scripts/setup_n8n.py
    python scripts/setup_n8n.py --output-dir ./n8n_credentials

The script reads from your .env file or environment variables.
"""

import argparse
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.config import settings


def generate_telegram_credential() -> dict:
    """Generate Telegram Bot API credential configuration."""
    return {
        "name": "Telegram Bot",
        "type": "telegramApi",
        "data": {
            "accessToken": settings.telegram_bot_token or "YOUR_TELEGRAM_BOT_TOKEN"
        },
    }


def generate_postgres_credential() -> dict:
    """Generate PostgreSQL credential configuration."""
    return {
        "name": "PostgreSQL Radio",
        "type": "postgres",
        "data": {
            "host": settings.postgres_host,
            "port": settings.postgres_port,
            "database": settings.postgres_database,
            "user": settings.postgres_user,
            "password": settings.postgres_password or "YOUR_PASSWORD",
            "ssl": "disable",
        },
    }


def generate_openai_credential() -> dict:
    """Generate OpenAI API credential configuration."""
    return {
        "name": "OpenAI API",
        "type": "openAiApi",
        "data": {"apiKey": settings.openai_api_key or "YOUR_OPENAI_API_KEY"},
    }


def generate_http_credential() -> dict:
    """Generate HTTP Header Auth credential for Suno API."""
    return {
        "name": "Suno API",
        "type": "httpHeaderAuth",
        "data": {
            "name": "Authorization",
            "value": f"Bearer {settings.suno_api_key or 'YOUR_SUNO_API_KEY'}",
        },
    }


def generate_n8n_environment() -> dict:
    """Generate n8n environment variables configuration."""
    return {
        "API_URL": "http://localhost:8000",
        "SUNO_API_URL": settings.suno_api_url or "https://your-suno-api.example.com",
        "TELEGRAM_CHAT_ID": settings.telegram_chat_id or "-1001234567890",
        "LIQUIDSOAP_URL": f"http://{settings.icecast_host}:8080",
    }


def print_setup_instructions():
    """Print manual setup instructions for n8n."""
    print(
        """
n8n Credential Setup Instructions
==================================

1. TELEGRAM BOT CREDENTIAL
   - Go to n8n > Settings > Credentials
   - Click "Add Credential"
   - Select "Telegram API"
   - Name: "Telegram Bot"
   - Access Token: Your bot token from @BotFather

2. POSTGRESQL CREDENTIAL
   - Click "Add Credential"
   - Select "Postgres"
   - Name: "PostgreSQL Radio"
   - Host: {host}
   - Port: {port}
   - Database: {database}
   - User: {user}
   - Password: (from your .env file)
   - SSL: disable (or configure if needed)

3. OPENAI API CREDENTIAL
   - Click "Add Credential"
   - Select "OpenAI API"
   - Name: "OpenAI API"
   - API Key: Your OpenAI API key

4. ENVIRONMENT VARIABLES (in n8n settings)
   - API_URL: Your radio API URL
   - SUNO_API_URL: Your Suno API endpoint
   - TELEGRAM_CHAT_ID: Your Telegram chat ID
   - LIQUIDSOAP_URL: Your Liquidsoap control URL

5. IMPORT WORKFLOWS
   - Go to n8n > Workflows
   - Click "Import from File"
   - Import each file from n8n_workflows/
   - Update credential references if needed
   - Activate the workflows
""".format(
            host=settings.postgres_host,
            port=settings.postgres_port,
            database=settings.postgres_database,
            user=settings.postgres_user,
        )
    )


def main():
    parser = argparse.ArgumentParser(
        description="Generate n8n credential configurations"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./n8n_credentials",
        help="Directory to output credential files",
    )
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Only print instructions, don't create files",
    )
    args = parser.parse_args()

    print("PYrte Radio Shack - n8n Setup Helper")
    print("=" * 40)

    if args.print_only:
        print_setup_instructions()
        return

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nGenerating credential files in: {output_dir}")

    # Generate credentials
    credentials = {
        "telegram": generate_telegram_credential(),
        "postgres": generate_postgres_credential(),
        "openai": generate_openai_credential(),
        "suno": generate_http_credential(),
    }

    # Write credential files
    for name, cred in credentials.items():
        filepath = output_dir / f"credential_{name}.json"
        with open(filepath, "w") as f:
            json.dump(cred, f, indent=2)
        print(f"  Created: {filepath}")

    # Write environment variables file
    env_vars = generate_n8n_environment()
    env_filepath = output_dir / "n8n_environment.json"
    with open(env_filepath, "w") as f:
        json.dump(env_vars, f, indent=2)
    print(f"  Created: {env_filepath}")

    # Write combined credentials file for bulk import
    all_credentials = list(credentials.values())
    combined_filepath = output_dir / "all_credentials.json"
    with open(combined_filepath, "w") as f:
        json.dump(all_credentials, f, indent=2)
    print(f"  Created: {combined_filepath}")

    # Check for placeholder values
    print("\nChecking configuration...")
    warnings = []
    if not settings.telegram_bot_token:
        warnings.append("TELEGRAM_BOT_TOKEN not set")
    if not settings.postgres_password:
        warnings.append("POSTGRES_PASSWORD not set")
    if not settings.openai_api_key:
        warnings.append("OPENAI_API_KEY not set")
    if not settings.suno_api_key:
        warnings.append("SUNO_API_KEY not set")

    if warnings:
        print("\n  WARNINGS - These values need to be configured:")
        for w in warnings:
            print(f"    - {w}")
        print("\n  Update your .env file and run this script again,")
        print("  or manually edit the generated JSON files.")

    print_setup_instructions()

    print("\n" + "=" * 40)
    print("Credential files generated!")
    print(f"\nFiles are in: {output_dir.absolute()}")


if __name__ == "__main__":
    main()
