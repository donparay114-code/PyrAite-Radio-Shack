import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

// POST /api/moderation/review - Approve or reject flagged content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, decision, reason } = body;

    // TODO: Get authenticated user from session/JWT
    const userId = request.headers.get('x-user-id'); // Placeholder

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    if (!requestId || !decision || !['approve', 'reject'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Verify moderator permission
    const permission = await query(
      `SELECT cm.role, sr.channel_id, sr.user_id
       FROM song_requests sr
       JOIN channel_members cm ON sr.channel_id = cm.channel_id
       WHERE sr.id = $1 AND cm.user_id = $2 AND cm.role IN ('owner', 'moderator')`,
      [requestId, userId]
    );

    if (permission.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    const { channel_id: channelId, user_id: submitterId } = permission.rows[0];

    // Perform review in transaction
    const result = await transaction(async (client) => {
      if (decision === 'approve') {
        // Approve and bypass moderation
        await client.query(
          `UPDATE song_requests
           SET moderation_status = 'bypassed',
               moderation_bypassed = true,
               bypassed_by_user_id = $1,
               queue_status = 'queued',
               moderated_at = NOW()
           WHERE id = $2`,
          [userId, requestId]
        );

        // Log bypass event
        await client.query(
          `INSERT INTO moderation_audit_log
           (request_id, moderator_id, action, reason, previous_status, new_status)
           VALUES ($1, $2, 'bypass_approval', $3, 'pending', 'bypassed')`,
          [requestId, userId, reason || 'Moderator override']
        );

        return { action: 'approved', message: 'Request approved and queued' };
      } else {
        // Reject
        await client.query(
          `UPDATE song_requests
           SET moderation_status = 'rejected',
               moderation_reason = $1,
               moderated_at = NOW()
           WHERE id = $2`,
          [reason || 'Rejected by moderator', requestId]
        );

        // Log rejection
        await client.query(
          `INSERT INTO moderation_audit_log
           (request_id, moderator_id, action, reason, previous_status, new_status)
           VALUES ($1, $2, 'force_reject', $3, 'pending', 'rejected')`,
          [requestId, userId, reason]
        );

        // Register violation for user
        await client.query(
          `INSERT INTO user_violations
           (user_id, channel_id, violation_type, details)
           VALUES ($1, $2, 'moderator_rejection', $3)`,
          [submitterId, channelId, reason || 'Content rejected by moderator']
        );

        return { action: 'rejected', message: 'Request rejected' };
      }
    });

    // TODO: Send notification to user via their platform (Telegram/WhatsApp)

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error reviewing request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process review' },
      { status: 500 }
    );
  }
}
