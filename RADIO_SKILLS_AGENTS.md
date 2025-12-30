# PYrte Radio Shack - Skills & Sub-Agents Documentation

This document provides a complete reference for all Claude Code skills and sub-agents created specifically for the multi-channel AI radio station development, monitoring, and maintenance.

## 📚 Overview

The PYrte Radio Shack project includes **3 specialized skills** and **3 specialized sub-agents** designed to handle every aspect of building and operating a production-ready AI radio platform with n8n automation.

## 🎯 Quick Reference

| Type | Name | Primary Use Case |
|------|------|------------------|
| **Skill** | `radio-infrastructure-aws` | AWS infrastructure management (RDS, S3, CloudFront, ECS, EC2) |
| **Skill** | `liquidsoap-streaming` | Liquidsoap/Icecast configuration, HLS streaming, audio processing |
| **Skill** | `radio-queue-optimizer` | Queue priority algorithms, reputation system, fairness optimization |
| **Agent** | `radio-streaming-health-monitor` | 24/7 monitoring of streaming infrastructure and audio quality |
| **Agent** | `radio-cost-optimizer` | Cost analysis, budget optimization, API expense management |
| **Agent** | `n8n-workflow-designer` | Design and optimize n8n workflows for radio automation |

---

## 🛠️ Skills (Domain Expertise)

### 1. AWS Infrastructure Manager (`radio-infrastructure-aws`)

**Location**: `.claude/skills/radio-infrastructure-aws/SKILL.md`

**Purpose**: Complete AWS infrastructure management for multi-channel radio station.

**Covers**:
- **RDS PostgreSQL**: Connection pooling, performance tuning, backup/restore
- **ElastiCache Redis**: Rate limiting cache, session management
- **S3**: Audio file storage, lifecycle policies, presigned URLs
- **CloudFront**: HLS delivery, cache invalidation, regional optimization
- **EC2**: Liquidsoap server management, SSH operations
- **ECS**: n8n queue mode deployment, worker scaling

**Key Features**:
- Infrastructure-as-Code templates (Terraform)
- Cost optimization strategies (Reserved Instances)
- Disaster recovery procedures
- Security best practices (IAM, encryption, VPC)
- Monitoring with CloudWatch alarms

**When to use**:
- Provisioning new infrastructure
- Scaling for traffic increases
- Troubleshooting AWS service issues
- Cost analysis and optimization
- Database performance tuning

**Example Tasks**:
```bash
# Provision new channel infrastructure
# Scale RDS for high traffic
# Restore database from snapshot
# Optimize S3 storage costs
# Configure CloudFront for global delivery
```

---

### 2. Liquidsoap Streaming Specialist (`liquidsoap-streaming`)

**Location**: `.claude/skills/liquidsoap-streaming/SKILL.md`

**Purpose**: Configure and manage Liquidsoap multi-channel streaming with HLS and Icecast outputs.

**Covers**:
- **Liquidsoap Configuration**: Multi-channel setup, queue management, fallback playlists
- **Audio Processing**: Normalization (LUFS), crossfades, compression
- **HLS Streaming**: Segment generation, manifest creation, multi-bitrate
- **Icecast Integration**: Mount point configuration, listener management
- **Quality Control**: Silence detection, clipping prevention, bitrate validation

**Key Features**:
- Production-ready Liquidsoap script for 10+ channels
- Telnet queue control commands
- Audio processing chains (normalize → compress → crossfade)
- HLS tuning for low-latency vs quality
- Emergency recovery procedures

**When to use**:
- Setting up new radio channels
- Debugging silent streams or audio issues
- Optimizing crossfade transitions
- Configuring HLS segment parameters
- Managing Icecast mount points

**Example Tasks**:
```bash
# Add track to channel queue via telnet
# Configure 4-second HLS segments
# Set up LUFS normalization to -14dB
# Create crossfade with 3s fade-in/out
# Monitor listener counts per channel
```

---

### 3. Radio Queue Priority Optimizer (`radio-queue-optimizer`)

**Location**: `.claude/skills/radio-queue-optimizer/SKILL.md`

**Purpose**: Optimize queue algorithms for fairness, prevent spam, manage reputation system.

**Covers**:
- **Priority Calculation**: Weighted formula (reputation, upvotes, premium status, wait time)
- **Reputation System**: Auto-updating based on plays, violations, premium duration
- **Anti-Spam**: Cooldowns, rate limiting, diversity enforcement
- **Queue Algorithms**: Weighted randomization, fairness boosting
- **A/B Testing**: Experiment framework for algorithm changes

**Key Features**:
- Advanced priority formula with fairness adjustments
- Reputation auto-calculation triggers
- SQL queries for optimal queue selection
- Performance indexes for fast queries
- Cost-per-user analysis

**When to use**:
- Adjusting queue fairness
- Debugging unbalanced play distribution
- Implementing anti-spam measures
- Analyzing user behavior patterns
- Testing new priority algorithms

**Example Tasks**:
```sql
-- Calculate next track to play with weighted randomization
-- Update reputation scores after track plays
-- Detect users spamming requests
-- Enforce diversity (no same user twice in a row)
-- A/B test new priority formula variants
```

---

## 🤖 Sub-Agents (Specialized Tasks)

### 1. Radio Streaming Health Monitor (`radio-streaming-health-monitor`)

**Location**: `.claude/agents/radio-streaming-health-monitor/AGENT.md`

**Purpose**: 24/7 automated monitoring of streaming infrastructure with alerting and auto-recovery.

**Monitors**:
- **Liquidsoap**: Queue health, source availability, metadata updates
- **Icecast**: Mount point status, listener counts, buffer health
- **HLS**: Segment freshness, manifest validity, S3 sync status
- **Audio Quality**: Silence detection, clipping, LUFS levels
- **Performance**: CPU/memory usage, network bandwidth, disk I/O

**Capabilities**:
- Automated health check script (runs every 60s)
- PagerDuty/Slack alert integration
- Auto-recovery for common failures
- Grafana dashboard configuration
- CloudWatch alarm templates

**Alert Triggers**:
- Silent channel detected (RMS < -50dB for >10s)
- No HLS segments generated in 2 minutes
- Liquidsoap service down
- Listener count drops >50%
- Disk usage >85%

**When to invoke**:
- Streaming interruptions
- Silent channels
- HLS playback issues
- Performance degradation
- Automated ops monitoring

**Example Alerts**:
```
CRITICAL: Channel 'rap' has no fresh HLS segments
WARNING: Channel 'jazz' audio is too quiet (-52dB)
CRITICAL: Liquidsoap service is not running - auto-restarting
WARNING: Disk usage at 87% - cleaning old segments
```

---

### 2. Radio Cost Optimization Advisor (`radio-cost-optimizer`)

**Location**: `.claude/agents/radio-cost-optimizer/AGENT.md`

**Purpose**: Monitor and optimize all costs (AWS, Suno API, Claude AI, OpenAI, WhatsApp).

**Analyzes**:
- **AWS Costs**: RDS, S3, CloudFront, EC2, ECS usage and optimization
- **API Costs**: Suno generations, Claude moderation, OpenAI moderation
- **Scaling Costs**: Projections for 1k, 10k, 50k DAU
- **Cost Per User**: Break-even analysis, premium subscriber ROI

**Optimization Strategies**:
- Reserved Instances (RDS: -40%, ElastiCache: -37%)
- S3 Intelligent-Tiering (-30%)
- CloudFront compression + regional pricing (-45%)
- EC2 Spot Instances (-70%)
- Suno API caching + batching (-20%)
- Claude model optimization (Haiku vs Sonnet: -80%)
- OpenAI moderation caching (-25%)

**Cost Monitoring**:
- Daily budget alerts ($20 Suno limit)
- Monthly cost breakdown reports
- Cost-per-user analysis
- API spending forecasts

**When to invoke**:
- Monthly cost reviews
- Budget exceeded alerts
- Scaling decisions
- API cost spikes
- Infrastructure optimization planning

**Potential Savings**: **$183/month (29% reduction)** at 1,000 DAU scale

---

### 3. n8n Workflow Designer (`n8n-workflow-designer`)

**Location**: Built-in agent (already available in Claude Code)

**Purpose**: Design and optimize n8n workflows for radio station automation.

**Workflow Types**:
- **Telegram/WhatsApp Bot**: Message parsing, command detection, response sending
- **Music Generation**: Suno API integration, polling, callback handling
- **AI Moderation**: 4-layer system (injection detection, OpenAI, Claude, blocklist)
- **Queue Management**: Priority recalculation, next track selection, Liquidsoap control
- **Real-time Updates**: Socket.io broadcasts, now-playing notifications

**Best Practices**:
- Error handling with retry logic
- Queue mode for scalability
- Webhook security (HMAC validation)
- Rate limiting integration
- Logging and monitoring

**When to invoke**:
- Creating new automation workflows
- Debugging workflow execution issues
- Optimizing n8n performance
- Integrating new APIs (Telegram, Suno, Claude)
- Setting up webhook handlers

---

## 🚀 Usage Guide

### For Infrastructure Setup (Phase 1-2)
Use: **`radio-infrastructure-aws`**
```
Setup RDS PostgreSQL Multi-AZ instance
Configure S3 bucket with lifecycle policies
Deploy n8n in ECS queue mode
Set up CloudFront distribution for HLS
```

### For Streaming Configuration (Phase 5)
Use: **`liquidsoap-streaming`**
```
Create 10-channel Liquidsoap configuration
Set up HLS with 4-second segments
Configure Icecast mount points
Implement crossfade transitions
```

### For Queue Fairness (Phase 3-4)
Use: **`radio-queue-optimizer`**
```
Implement priority calculation formula
Set up reputation system
Create anti-spam cooldowns
Test queue algorithm changes
```

### For Ongoing Monitoring
Use: **`radio-streaming-health-monitor`** (sub-agent)
```
Set up automated health checks every 60s
Configure PagerDuty/Slack alerts
Monitor HLS segment generation
Detect silent channels automatically
```

### For Cost Management
Use: **`radio-cost-optimizer`** (sub-agent)
```
Analyze monthly AWS spending
Optimize Suno API costs with caching
Purchase Reserved Instances for savings
Set up daily budget alerts
```

### For Workflow Automation
Use: **`n8n-workflow-designer`** (sub-agent)
```
Build Telegram bot message handler
Create Suno API integration workflow
Implement 4-layer AI moderation
Set up queue priority recalculation
```

---

## 📊 Development Phase Mapping

| Phase | Primary Skills/Agents |
|-------|----------------------|
| **Phase 1: Infrastructure** | `radio-infrastructure-aws` |
| **Phase 2: n8n Deployment** | `n8n-workflow-designer`, `radio-infrastructure-aws` |
| **Phase 3: AI Moderation** | `n8n-workflow-designer` |
| **Phase 4: Suno Integration** | `n8n-workflow-designer` |
| **Phase 5: Liquidsoap Streaming** | `liquidsoap-streaming`, `radio-infrastructure-aws` |
| **Phase 6: Queue Optimization** | `radio-queue-optimizer` |
| **Phase 7-8: Frontend & Premium** | `radio-infrastructure-aws` |
| **Phase 9: Testing** | `radio-streaming-health-monitor` |
| **Phase 10: Launch & Monitoring** | All agents |
| **Post-Launch: Operations** | `radio-streaming-health-monitor`, `radio-cost-optimizer` |

---

## 🎓 Learning Path

### Beginner (Week 1-2)
1. Read `radio-infrastructure-aws` for AWS basics
2. Understand n8n workflow structure
3. Learn basic Liquidsoap commands

### Intermediate (Week 3-6)
1. Master queue priority algorithms
2. Configure multi-channel Liquidsoap
3. Implement AI moderation workflow
4. Set up monitoring dashboards

### Advanced (Week 7+)
1. Optimize costs with Reserved Instances
2. A/B test queue algorithms
3. Scale infrastructure for 10k+ DAU
4. Build custom monitoring integrations

---

## 🔧 Troubleshooting Guide

### Issue: Silent radio channel
**Use**: `liquidsoap-streaming`, `radio-streaming-health-monitor`
```
1. Check Liquidsoap queue length
2. Verify Icecast mount is active
3. Analyze audio RMS levels
4. Skip current track if corrupted
5. Add emergency backup tracks
```

### Issue: High AWS costs
**Use**: `radio-cost-optimizer`
```
1. Run cost analysis report
2. Enable S3 Intelligent-Tiering
3. Purchase RDS Reserved Instance
4. Optimize CloudFront with compression
5. Implement Suno API caching
```

### Issue: Unfair queue distribution
**Use**: `radio-queue-optimizer`
```
1. Analyze current priority weights
2. Check for spam users (>10 requests/hour)
3. Adjust fairness boost for new users
4. Implement diversity enforcement
5. Test new algorithm with simulation
```

### Issue: n8n workflow failing
**Use**: `n8n-workflow-designer`
```
1. Check workflow execution logs
2. Verify API credentials
3. Test error handling paths
4. Add retry logic with exponential backoff
5. Monitor queue depth
```

---

## 📈 Performance Benchmarks

### Infrastructure
- **RDS**: <50ms query latency for queue selection
- **Redis**: <5ms cache lookups for rate limiting
- **S3**: <200ms upload time for 5MB audio files
- **CloudFront**: <100ms HLS manifest delivery

### Streaming
- **Liquidsoap**: <5% CPU per channel at idle
- **HLS Segments**: Generated within 4-8 seconds
- **Icecast**: Support 500+ concurrent listeners per channel
- **Audio Quality**: -14dB LUFS ±2dB tolerance

### Queue Performance
- **Priority Calculation**: <10ms per request
- **Next Track Selection**: <50ms including database query
- **Reputation Update**: <100ms per user
- **Queue Depth**: Handle 1000+ queued requests per channel

---

## 🔐 Security Best Practices

All skills and agents follow these security principles:

1. **Secrets Management**: Use AWS Secrets Manager, never hardcode
2. **IAM Least Privilege**: Minimal permissions for each service
3. **VPC Isolation**: RDS/ElastiCache in private subnets
4. **Encryption**: At-rest (S3, RDS) and in-transit (HTTPS, TLS)
5. **Input Validation**: SQL injection prevention, prompt sanitization
6. **Rate Limiting**: Prevent abuse via Redis-backed limits
7. **Audit Logging**: CloudTrail for AWS, database audit tables

---

## 📞 Support & Resources

### Documentation
- Skills: `.claude/skills/*/SKILL.md`
- Agents: `.claude/agents/*/AGENT.md`
- Main Guide: `RADIO_SKILLS_AGENTS.md` (this file)

### External Resources
- [n8n Documentation](https://docs.n8n.io/)
- [Liquidsoap Manual](https://www.liquidsoap.info/doc-dev/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/14/performance-tips.html)

### Getting Help
Ask Claude Code with context:
```
"Using the radio-infrastructure-aws skill, help me provision a new channel"
"Invoke the radio-streaming-health-monitor agent to diagnose channel silence"
"With radio-queue-optimizer, analyze why premium users dominate the queue"
```

---

## 🎉 Success Metrics

Track these KPIs using the skills/agents:

### Infrastructure (radio-infrastructure-aws)
- ✅ 99.9% uptime for RDS and Liquidsoap
- ✅ <200ms p95 latency for API endpoints
- ✅ S3 storage costs <$20/month per 1TB

### Streaming (liquidsoap-streaming, radio-streaming-health-monitor)
- ✅ Zero silent channel incidents per week
- ✅ HLS segments generated 100% of the time
- ✅ Average listener count >100 per channel

### Queue (radio-queue-optimizer)
- ✅ Average wait time <30 minutes for free users
- ✅ Premium users play within 10 minutes
- ✅ Queue diversity: No same user twice in a row

### Costs (radio-cost-optimizer)
- ✅ Total cost <$0.50 per DAU per month
- ✅ API costs <40% of total spending
- ✅ Achieve break-even at 1,500 DAU

---

**Last Updated**: 2025-12-30
**Version**: 1.0
**Maintained By**: PYrte Radio Shack Development Team
