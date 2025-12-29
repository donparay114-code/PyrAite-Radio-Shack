---
name: vps-deployment-devops
description: Deploy Next.js applications to VPS, manage PM2, Nginx, SSL certificates, databases, and monitoring. Use for server setup, deployment automation, SSL/TLS configuration, and performance tuning.
---

# VPS Deployment and DevOps

## Instructions

1. Configure Nginx as reverse proxy
2. Set up PM2 for application management
3. Install and configure SSL with Let's Encrypt
4. Manage environment variables and .env files
5. Set up log rotation and monitoring
6. Configure firewall rules (UFW)
7. Implement backup strategies
8. Monitor resource usage (CPU, RAM, disk)

## Initial VPS Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server

# Configure firewall
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000/tcp    # Icecast
sudo ufw enable
```

## For AI Radio Station deployment

**Services to deploy:**
1. Next.js web frontend (port 3000)
2. Icecast streaming server (port 8000)
3. Liquidsoap playlist manager
4. MySQL database
5. WebSocket server for chat (port 3001)

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name n8nbigdata.com www.n8nbigdata.com;

    # Next.js frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Icecast stream
    location /stream {
        proxy_pass http://localhost:8000;
        proxy_buffering off;
    }

    # WebSocket for chat
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**PM2 ecosystem file:**
```javascript
module.exports = {
  apps: [
    {
      name: 'radio-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/deploy/radio-frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'chat-websocket',
      script: 'dist/websocket.js',
      cwd: '/home/deploy/radio-frontend/server',
      env: {
        PORT: 3001
      }
    }
  ]
};
```

## SSL Setup (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d n8nbigdata.com -d www.n8nbigdata.com
sudo certbot renew --dry-run  # Test auto-renewal
```

## Deployment steps

1. Build Next.js: `npm run build`
2. Upload to VPS via rsync or git pull
3. Install dependencies: `npm ci --production`
4. Start with PM2: `pm2 start ecosystem.config.js`
5. Save PM2 config: `pm2 save`
6. Enable PM2 startup: `pm2 startup`
7. Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`

## Monitoring

```bash
pm2 monit                # Real-time monitoring
pm2 logs                 # View logs
pm2 status               # App status
sudo systemctl status nginx  # Nginx status
df -h                    # Disk usage
htop                     # Resource monitor
```

## Recommended VPS specs

- **Provider:** DigitalOcean, Linode, or Hetzner
- **CPU:** 2 vCPUs
- **RAM:** 4GB
- **Storage:** 80GB SSD
- **Bandwidth:** 4TB/month
- **Cost:** ~$24/month
