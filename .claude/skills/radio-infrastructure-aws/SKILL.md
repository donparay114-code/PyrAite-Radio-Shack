# AWS Infrastructure Manager for Radio Station

**Purpose**: Manage and monitor complete AWS infrastructure for multi-channel AI radio station including RDS, ElastiCache, S3, CloudFront, EC2, and ECS.

**When to use**: Infrastructure provisioning, monitoring, cost optimization, scaling decisions, troubleshooting AWS services, setting up new channels, disaster recovery.

## Infrastructure Components

### Database (RDS PostgreSQL)
- **Production**: db.t3.medium Multi-AZ (4GB RAM, 2 vCPU)
- **Staging**: db.t3.small Single-AZ (2GB RAM, 1 vCPU)
- **Backups**: 7-day retention, automated snapshots at 3 AM UTC
- **Performance Insights**: Enabled for query optimization

**Monitoring Queries:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Find slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Database size
SELECT pg_size_pretty(pg_database_size('radio_station'));
```

### Cache (ElastiCache Redis)
- **Production**: cache.t3.small (1.37GB RAM)
- **Use cases**: Rate limiting, session storage, queue caching
- **Eviction policy**: allkeys-lru (256MB max memory)

**Redis Commands:**
```bash
# Check memory usage
redis-cli INFO memory

# Monitor real-time commands
redis-cli MONITOR

# Check rate limit for user
redis-cli GET "rate_limit:user:{user_id}:{channel_id}"

# Clear rate limit cache
redis-cli DEL "rate_limit:*"
```

### Storage (S3)
- **Bucket**: `radio-audio-{random-suffix}`
- **Structure**: `/audio/`, `/hls/`, `/temp/`
- **Lifecycle**: 30d → Standard-IA, 90d → Glacier Instant Retrieval

**S3 Operations:**
```bash
# List all channels
aws s3 ls s3://radio-audio-bucket/audio/

# Check bucket size
aws s3 ls s3://radio-audio-bucket --recursive --summarize | grep "Total Size"

# Sync HLS segments
aws s3 sync /var/www/hls/ s3://radio-audio-bucket/hls/ --delete --cache-control "max-age=4"

# Generate presigned URL (7-day expiry)
aws s3 presign s3://radio-audio-bucket/audio/track.mp3 --expires-in 604800
```

### CDN (CloudFront)
- **Purpose**: HLS stream delivery with low latency
- **Cache behavior**:
  - `.m3u8` manifests: 4s TTL
  - `.ts` segments: Segment duration TTL
- **Compression**: Gzip enabled for manifests

**CloudFront Commands:**
```bash
# Create invalidation for updated HLS stream
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/hls/rap/*"

# Get distribution status
aws cloudfront get-distribution --id E1234567890ABC

# Monitor cache hit ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time 2025-12-30T00:00:00Z \
  --end-time 2025-12-30T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### Compute (EC2 for Liquidsoap)
- **Instance**: t3.medium (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Services**: Liquidsoap, Icecast2, FFmpeg
- **Ports**: 8000 (Icecast), 1234 (Liquidsoap telnet)

**EC2 Management:**
```bash
# SSH into server
ssh -i radio-liquidsoap.pem ubuntu@ec2-xx-xx-xx-xx.compute-1.amazonaws.com

# Check Liquidsoap status
sudo systemctl status liquidsoap

# Restart services
sudo systemctl restart liquidsoap
sudo systemctl restart icecast2

# View logs
sudo journalctl -u liquidsoap -f
sudo tail -f /var/log/icecast2/error.log

# Monitor resource usage
htop
iostat -x 1
```

### Container Orchestration (ECS for n8n)
- **Cluster**: radio-n8n-cluster
- **Services**:
  - n8n-main: 1 task (webhooks, UI, triggers)
  - n8n-worker: 2 tasks (queue execution)
- **Load Balancer**: Application LB with HTTPS

**ECS Commands:**
```bash
# List running tasks
aws ecs list-tasks --cluster radio-n8n-cluster

# View task logs
aws logs tail /ecs/n8n-main --follow

# Scale workers
aws ecs update-service --cluster radio-n8n-cluster \
  --service n8n-worker --desired-count 4

# Force new deployment (updates image)
aws ecs update-service --cluster radio-n8n-cluster \
  --service n8n-main --force-new-deployment
```

## Common Tasks

### Provision New Channel Infrastructure
```bash
# 1. Add channel to Liquidsoap config
echo "create_channel({id='neuchannel', mount='newchannel.mp3', hls='/var/www/hls/newchannel/'})" | nc liquidsoap-server 1234

# 2. Create S3 folders
aws s3api put-object --bucket radio-audio-bucket --key audio/newchannel/
aws s3api put-object --bucket radio-audio-bucket --key hls/newchannel/

# 3. Create Icecast mount point (add to icecast.xml)
sudo nano /etc/icecast2/icecast.xml
sudo systemctl reload icecast2

# 4. Update database
psql $DATABASE_URL -c "INSERT INTO radio_channels (id, name, slug, icecast_mount, hls_path) VALUES (gen_random_uuid(), 'New Channel', 'newchannel', '/newchannel.mp3', '/hls/newchannel/');"
```

### Scale for High Traffic
```bash
# 1. Upgrade RDS instance
aws rds modify-db-instance --db-instance-identifier radio-db \
  --db-instance-class db.t3.large --apply-immediately

# 2. Scale Redis cluster
aws elasticache modify-cache-cluster --cache-cluster-id radio-cache \
  --cache-node-type cache.t3.medium --apply-immediately

# 3. Scale n8n workers
aws ecs update-service --cluster radio-n8n-cluster \
  --service n8n-worker --desired-count 5

# 4. Upgrade Liquidsoap EC2
# Create snapshot, stop instance, change instance type, start
```

### Disaster Recovery
```bash
# 1. Restore RDS from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier radio-db-restored \
  --db-snapshot-identifier radio-db-snapshot-2025-12-30

# 2. Recover S3 bucket with versioning
aws s3api list-object-versions --bucket radio-audio-bucket --prefix audio/deleted-track.mp3
aws s3api restore-object --bucket radio-audio-bucket --key audio/deleted-track.mp3 --version-id VERSION_ID

# 3. Rebuild Liquidsoap from AMI backup
aws ec2 run-instances --image-id ami-liquidsoap-backup --instance-type t3.medium
```

## Cost Optimization

### Current Costs (1,000 users)
| Service | Monthly Cost |
|---------|--------------|
| RDS PostgreSQL (db.t3.medium Multi-AZ) | $110 |
| ElastiCache Redis (cache.t3.small) | $35 |
| S3 Storage (500GB) | $12 |
| CloudFront (2TB transfer) | $170 |
| EC2 Liquidsoap (t3.medium) | $30 |
| ECS n8n (3 tasks) | $45 |
| **Total** | **$402/month** |

### Optimization Strategies
```bash
# 1. Delete old audio files (>90 days)
aws s3 ls s3://radio-audio-bucket/audio/ --recursive \
  | awk '$1 < "'$(date -d '90 days ago' +%Y-%m-%d)'" {print $4}' \
  | xargs -I {} aws s3 rm s3://radio-audio-bucket/{}

# 2. Move infrequently accessed to Glacier
aws s3api put-bucket-lifecycle-configuration --bucket radio-audio-bucket --lifecycle-configuration file://lifecycle-policy.json

# 3. Use Reserved Instances for RDS (save 40%)
aws rds purchase-reserved-db-instances-offering \
  --reserved-db-instances-offering-id offering-id \
  --db-instance-count 1

# 4. Enable S3 Intelligent-Tiering
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket radio-audio-bucket \
  --id auto-archive \
  --intelligent-tiering-configuration file://intelligent-tiering.json
```

## Monitoring & Alerts

### CloudWatch Alarms
```bash
# RDS CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name radio-db-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=radio-db \
  --alarm-actions arn:aws:sns:us-east-1:123456789:radio-alerts

# S3 bucket size alarm
aws cloudwatch put-metric-alarm \
  --alarm-name radio-s3-large-bucket \
  --metric-name BucketSizeBytes \
  --namespace AWS/S3 \
  --statistic Average \
  --period 86400 \
  --threshold 1073741824000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=BucketName,Value=radio-audio-bucket Name=StorageType,Value=StandardStorage

# ECS service health
aws cloudwatch put-metric-alarm \
  --alarm-name n8n-service-unhealthy \
  --metric-name HealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2
```

## Troubleshooting

### Issue: RDS connection pool exhausted
```sql
-- Find idle connections
SELECT pid, usename, application_name, state, state_change
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < now() - interval '10 minutes';

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < now() - interval '10 minutes';

-- Increase max connections (requires restart)
ALTER SYSTEM SET max_connections = 200;
```

### Issue: S3 slow uploads
```bash
# Use multipart upload for large files
aws s3 cp large-audio.mp3 s3://radio-audio-bucket/audio/ \
  --storage-class STANDARD_IA \
  --metadata-directive REPLACE

# Enable transfer acceleration
aws s3api put-bucket-accelerate-configuration \
  --bucket radio-audio-bucket \
  --accelerate-configuration Status=Enabled
```

### Issue: CloudFront cache not updating
```bash
# Invalidate entire HLS directory
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/hls/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id E1234567890ABC \
  --id INVALIDATION_ID
```

## Security Best Practices

1. **IAM Roles**: Use least privilege principle
2. **Secrets Manager**: Store DB credentials, API keys
3. **VPC**: Place RDS/ElastiCache in private subnets
4. **Security Groups**: Restrict to necessary ports only
5. **Encryption**: Enable at-rest encryption for RDS and S3
6. **GuardDuty**: Enable for threat detection
7. **CloudTrail**: Log all API calls for audit

**Example IAM Policy (n8n worker):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::radio-audio-bucket/audio/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:radio/*"
    }
  ]
}
```

## Tools & Commands

### Terraform Infrastructure as Code
```hcl
# Example: RDS module
resource "aws_db_instance" "radio_db" {
  identifier              = "radio-db"
  engine                  = "postgres"
  engine_version          = "14.7"
  instance_class          = "db.t3.medium"
  allocated_storage       = 100
  storage_encrypted       = true
  multi_az                = true
  backup_retention_period = 7
  skip_final_snapshot     = false

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.radio_db.name

  tags = {
    Name        = "radio-station-db"
    Environment = "production"
  }
}
```

### AWS CLI Configuration
```bash
# Configure profile
aws configure --profile radio-prod

# Set default region
export AWS_DEFAULT_REGION=us-east-1

# Use profile for commands
aws s3 ls --profile radio-prod
```

## Next Steps

After infrastructure is provisioned:
1. Run database migrations (`psql $DATABASE_URL < schema.sql`)
2. Configure n8n environment variables
3. Deploy Liquidsoap configuration
4. Set up monitoring dashboards in CloudWatch
5. Configure backup verification cron jobs
6. Document runbook for common incidents
