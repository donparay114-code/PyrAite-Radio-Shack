---
name: mysql-database-operations
description: Query, manage, and optimize MySQL databases. Use for database schema design, query optimization, migrations, and connection pooling. Required mysql2 or similar driver.
---

# MySQL Database Operations

## Instructions

1. Use connection pooling for scalability
2. Write optimized queries with proper indexing
3. Implement transactions for data integrity
4. Use parameterized queries to prevent SQL injection
5. Monitor slow queries and optimize
6. Handle connection errors gracefully
7. Implement proper cleanup with pool.end()

## Best practices

- Create indexes on foreign keys and frequently queried columns
- Use prepared statements for security
- Implement proper error handling
- Use transactions for multi-statement operations
- Monitor query performance with EXPLAIN
- Implement connection retry logic
- Set appropriate pool limits based on traffic

## For AI Radio Station database (radio_station)

**Key tables:**
- `radio_users` - User profiles with reputation system
- `song_requests` - All song requests with moderation
- `radio_queue` - Active queue with Suno tracking
- `radio_history` - Played songs archive
- `chat_messages` - Live chat with GIF support
- `premium_subscriptions` - Stripe subscription tracking

**Critical queries:**
- Queue priority calculation: `100 + (reputation * 0.5) + (upvotes * 10)`
- Get next song: ORDER BY priority_score DESC, queued_at ASC
- Check user ban status before allowing requests
- Update reputation scores after song completion

**Connection details:**
- Host: localhost
- Port: 3306
- Database: radio_station
- User: root
- Password: Hunter0hunter2207
