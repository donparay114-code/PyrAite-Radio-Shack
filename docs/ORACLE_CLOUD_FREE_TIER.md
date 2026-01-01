# Oracle Cloud Free Tier Guide

## Is Your n8n Instance Free?

Your n8n instance at `140.238.79.211:5678` is running on Oracle Cloud infrastructure. Here's how to verify you're on the free tier:

## Oracle Cloud Always Free Tier

Oracle provides **Always Free** cloud resources that never expire:

### Compute (VMs)
- ✅ **2x AMD VMs**: E2.1.Micro (1/8 OCPU, 1GB RAM)
- ✅ **4x ARM VMs**: Ampere A1 (up to 4 OCPUs, 24GB RAM total)

### Storage
- ✅ **200GB Block Storage** (Boot + Additional)
- ✅ **10GB Object Storage**

### Networking
- ✅ **Outbound Data Transfer**: 10TB/month
- ✅ **Public IPs**: Included

### Database (if needed)
- ✅ **2x Autonomous Database**: 20GB storage each

## Check Your Instance Type

### Via Oracle Cloud Console

1. **Log in** to Oracle Cloud Console
2. Go to **Compute** → **Instances**
3. Click on your instance running n8n
4. Check the **Shape** field:
   - `VM.Standard.E2.1.Micro` = ✅ Free tier AMD
   - `VM.Standard.A1.Flex` = ✅ Free tier ARM (if ≤4 OCPUs, ≤24GB RAM)
   - Other shapes = ⚠️ May be paid

### Via SSH

```bash
ssh user@140.238.79.211

# Check CPU info
lscpu

# Check memory
free -h

# Check disk
df -h
```

## n8n Self-Hosted Cost

n8n Community Edition (what you're running) is **100% FREE**:

- ✅ Apache 2.0 License (open source)
- ✅ Unlimited workflows
- ✅ Unlimited executions
- ✅ All core nodes included
- ✅ No user limits
- ✅ No feature restrictions

**You only pay for:**
- API calls to external services (Suno, OpenAI, etc.)
- Cloud infrastructure (covered by Oracle free tier)

## API Costs to Consider

While n8n and Oracle Cloud are free, you'll pay for:

### 1. Suno API (Music Generation)
- Varies by plan
- Check: https://suno.ai/pricing

### 2. OpenAI API (Content Moderation)
- Pay-as-you-go pricing
- Moderation endpoint is very cheap (~$0.0002 per request)
- Check: https://openai.com/api/pricing

### 3. Telegram Bot API
- ✅ **FREE** - No cost to use

## Staying Within Free Tier

### Oracle Cloud Tips

**To ensure you stay free:**

1. ✅ Use only Always Free shapes (E2.1.Micro or A1.Flex)
2. ✅ Keep block storage under 200GB total
3. ✅ Monitor outbound bandwidth (10TB/month limit)
4. ✅ Set up billing alerts in Oracle Console

**How to set billing alerts:**
```
Oracle Console → Governance → Cost Management → Budgets
Create a budget with $0.01 threshold to get alerts
```

### n8n Resource Optimization

**To reduce n8n resource usage:**

1. **Limit execution retention**:
   ```bash
   # In your n8n .env file
   EXECUTIONS_DATA_PRUNE=true
   EXECUTIONS_DATA_MAX_AGE=168  # Keep 7 days
   ```

2. **Optimize workflow intervals**:
   - Your Queue Processor runs every 30 seconds
   - Consider 60 seconds if queue isn't time-critical

3. **Enable execution pruning**:
   - Automatically delete old execution logs
   - Saves disk space and database size

## Cost Monitoring

### Oracle Cloud Dashboard

Monitor your costs:
1. Go to **Cost Analysis** in Oracle Console
2. View current month usage
3. Set up alerts for any charges

### Expected Monthly Costs

| Item | Cost |
|------|------|
| Oracle Cloud VM (Free Tier) | $0.00 |
| Oracle Block Storage (Free Tier) | $0.00 |
| Oracle Bandwidth (Free Tier) | $0.00 |
| n8n Community Edition | $0.00 |
| n8n MCP Server | $0.00 |
| **Infrastructure Total** | **$0.00** |
| | |
| Suno API Calls | Variable* |
| OpenAI Moderation | ~$0.01-0.10* |
| Telegram Bot API | $0.00 |
| **API Total** | **Variable** |

*Depends on usage volume

## Upgrade Paths (Optional)

If you need more resources in the future:

### Oracle Cloud Paid Tiers
- Standard compute instances
- More storage
- Load balancers
- Pay-as-you-go pricing

### n8n Cloud (Alternative to Self-Hosting)
- **Starter**: $20/month (2,500 executions)
- **Pro**: $50/month (10,000 executions)
- **Enterprise**: Custom pricing

**Recommendation**: Stay self-hosted on Oracle free tier as long as it meets your needs!

## Warnings: When You Might Get Charged

⚠️ **You will be charged if:**

1. You upgrade to a paid compute shape
2. You exceed 200GB block storage
3. You exceed 10TB outbound bandwidth/month
4. You add paid services (load balancer, etc.)
5. You're outside the free tier regions

⚠️ **Oracle Cloud Gotchas:**

- Free tier is region-specific (can't move to another region)
- If you delete your always-free instance, you might not get another
- Inactive accounts (60+ days) may be reclaimed

## Bottom Line

✅ **Your current setup is 100% FREE for infrastructure**
- Oracle Cloud free tier covers your VM, storage, and bandwidth
- n8n Community Edition is open source and free forever
- The n8n MCP server package is free

💰 **You only pay for external API usage**:
- Suno API calls (music generation)
- OpenAI API calls (moderation)
- Any other third-party services

---

**Pro Tip**: Set up billing alerts in Oracle Cloud Console to get notified immediately if any charges occur!
