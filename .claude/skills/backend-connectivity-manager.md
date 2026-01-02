# Backend Connectivity Manager Skill

A comprehensive skill for managing backend API connectivity, Cloudflare tunnels, and n8n integration for PYrte Radio Shack.

## Commands

### Check Connectivity Status
```bash
# Quick connectivity check
python scripts/test_n8n_connectivity.py

# Full connectivity test (includes tunnel)
python scripts/test_full_connectivity.py
```

### Tunnel Management
```bash
# Start persistent tunnel with auto-restart
python scripts/tunnel_manager.py

# Quick tunnel (PowerShell)
powershell -File scripts/setup_tunnel.ps1

# Manual tunnel (with empty config to avoid credential conflicts)
cloudflared tunnel --url http://127.0.0.1:8000 --config ""
```

### Backend Server
```bash
# Start backend API
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Start with auto-reload (development)
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Configuration

### Required Environment Variables (.env)
```ini
# n8n Configuration
N8N_HOST=https://n8nbigdata.com
N8N_API_KEY=your_api_key_here

# Suno API (points to n8n webhook)
SUNO_API_URL=https://n8nbigdata.com/webhook/suno/generate
SUNO_API_KEY=your_suno_key

# Backend Public URL (Cloudflare Tunnel)
BACKEND_PUBLIC_URL=https://your-tunnel.trycloudflare.com

# Webhook Security
SECRET_KEY=your-webhook-secret
```

## Connectivity Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Local Backend     │◄────────│   Cloudflare        │
│   (localhost:8000)  │         │   Tunnel            │
└─────────────────────┘         └─────────────────────┘
         │                               ▲
         │ HTTP Request                  │ HTTPS
         ▼                               │
┌─────────────────────┐         ┌───────┴─────────────┐
│   n8n Instance      │────────►│   Public URL        │
│   (n8nbigdata.com)  │         │   (.trycloudflare)  │
└─────────────────────┘         └─────────────────────┘
```

## Troubleshooting

### Tunnel Issues

**Problem**: Tunnel returns 404 errors
```bash
# Fix: Use empty config flag to avoid credential conflicts
cloudflared tunnel --url http://127.0.0.1:8000 --config ""
```

**Problem**: Tunnel URL not updating in .env
```bash
# Manually update or use tunnel_manager.py which auto-updates
python scripts/tunnel_manager.py
```

**Problem**: Tunnel disconnects frequently
```bash
# Use the persistent tunnel manager
python scripts/tunnel_manager.py
# This auto-restarts on failures
```

### Backend Issues

**Problem**: Backend not starting
```bash
# Check dependencies
pip install -r requirements.txt

# Check port availability
netstat -an | findstr :8000

# Start with verbose logging
DEBUG=true python -m uvicorn src.api.main:app --port 8000
```

**Problem**: Webhook returns "Invalid webhook secret"
```bash
# Include the secret header in requests
curl -X POST \
  -H "X-Webhook-Secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"job_id": "test", "status": "complete"}' \
  http://localhost:8000/api/webhooks/suno/status
```

### n8n Issues

**Problem**: n8n not reachable
```bash
# Test n8n connectivity
python scripts/test_n8n_connectivity.py

# Check n8n health directly
curl https://n8nbigdata.com/healthz
```

**Problem**: n8n workflow not receiving callbacks
1. Verify tunnel URL in n8n HTTP Request nodes
2. Check webhook URL matches: `{TUNNEL_URL}/api/webhooks/suno/status`
3. Ensure X-Webhook-Secret header is set in n8n

## Health Check Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Root - basic info |
| `GET /health` | Health check |
| `GET /api/docs` | Swagger UI |
| `POST /api/webhooks/suno/status` | Suno callback |

## Integration Testing

### Test Local → n8n
```bash
# Verify n8n is reachable
curl https://n8nbigdata.com/healthz
```

### Test n8n → Local (via Tunnel)
```bash
# Start tunnel
python scripts/tunnel_manager.py

# From another terminal, test the tunnel URL
curl https://your-tunnel.trycloudflare.com/health
```

### Test Full Flow
```bash
# Run comprehensive test
python scripts/test_full_connectivity.py
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/tunnel_manager.py` | Persistent tunnel with auto-restart |
| `scripts/setup_tunnel.ps1` | Quick PowerShell tunnel setup |
| `scripts/test_n8n_connectivity.py` | Test n8n reachability |
| `scripts/test_full_connectivity.py` | Full connectivity suite |

## Best Practices

1. **Always use tunnel_manager.py** for production - it auto-restarts on failures
2. **Keep .env updated** with the current tunnel URL
3. **Use webhook secrets** for security
4. **Monitor tunnel.log** in data/ for issues
5. **Test connectivity** after any network changes
