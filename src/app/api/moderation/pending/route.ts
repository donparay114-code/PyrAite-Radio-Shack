import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/moderation/pending - Get flagged content awaiting review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    // TODO: Get authenticated user from session/JWT
    const userId = request.headers.get('x-user-id'); // Placeholder

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get channels where user is moderator
    const moderatedChannels = await query(
      `SELECT channel_id
       FROM channel_members
       WHERE user_id = $1 AND role IN ('owner', 'moderator')`,
      [userId]
    );

    const channelIds = moderatedChannels.rows.map((r) => r.channel_id);

    if (channelId && !channelIds.includes(channelId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - not a moderator of this channel' },
        { status: 403 }
      );
    }

    // Build query
    let sql = `
      SELECT
        sr.id,
        sr.prompt,
        sr.moderation_reason,
        sr.moderation_score,
        sr.requested_at,
        u.username,
        u.platform,
        rc.name AS channel_name,
        rc.id AS channel_id
      FROM song_requests sr
      JOIN users u ON sr.user_id = u.id
      JOIN radio_channels rc ON sr.channel_id = rc.id
      WHERE sr.moderation_status = 'pending'
        AND rc.ai_moderation_enabled = true
    `;

    const params: any[] = [];

    if (channelId) {
      sql += ` AND sr.channel_id = $1`;
      params.push(channelId);
    } else {
      sql += ` AND sr.channel_id = ANY($1)`;
      params.push(channelIds);
    }

    sql += ' ORDER BY sr.requested_at DESC LIMIT 50';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending reviews' },
      { status: 500 }
    );
  }
}
