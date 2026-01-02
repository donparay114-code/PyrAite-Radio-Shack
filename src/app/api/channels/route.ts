import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { RadioChannel } from '@/types';

// GET /api/channels - List all channels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'public' or 'private'
    const genre = searchParams.get('genre');
    const isActive = searchParams.get('active') !== 'false';

    let sql = `
      SELECT
        rc.*,
        COUNT(DISTINCT cm.user_id) AS member_count,
        COUNT(DISTINCT sr.id) FILTER (WHERE sr.queue_status = 'queued') AS queued_tracks
      FROM radio_channels rc
      LEFT JOIN channel_members cm ON rc.id = cm.channel_id
      LEFT JOIN song_requests sr ON rc.id = sr.channel_id
      WHERE rc.is_active = $1
    `;

    const params: any[] = [isActive];
    let paramIndex = 2;

    if (type) {
      sql += ` AND rc.channel_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (genre) {
      sql += ` AND rc.genre = $${paramIndex}`;
      params.push(genre);
      paramIndex++;
    }

    sql += ' GROUP BY rc.id ORDER BY rc.listener_count DESC, rc.total_plays DESC';

    const result = await query<RadioChannel>(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/channels - Create new private channel (premium only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, genre, userId } = body;

    // Validate required fields
    if (!name || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is premium
    const userCheck = await query(
      `SELECT is_premium, subscription_expires_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userCheck.rows[0];
    if (!user.is_premium || new Date(user.subscription_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Premium subscription required' },
        { status: 403 }
      );
    }

    // Generate unique slug
    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      Math.random().toString(36).substring(2, 10);

    // Generate mount points
    const mountId = Math.random().toString(36).substring(2, 10);
    const icecastMount = `/private-${mountId}.mp3`;
    const hlsPath = `/hls/private-${mountId}/`;

    // Create channel
    const result = await query(
      `INSERT INTO radio_channels (
        channel_type, name, slug, description, genre,
        icecast_mount, hls_path, owner_user_id,
        is_active, requires_approval, max_queue_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        'private',
        name,
        slug,
        description,
        genre,
        icecastMount,
        hlsPath,
        userId,
        true,
        false,
        50,
      ]
    );

    const channel = result.rows[0];

    // Add owner as channel member
    await query(
      `INSERT INTO channel_members (channel_id, user_id, role, can_submit)
       VALUES ($1, $2, $3, $4)`,
      [channel.id, userId, 'owner', true]
    );

    // TODO: Initialize Liquidsoap and Icecast configuration
    // This would typically call infrastructure scripts or APIs

    return NextResponse.json({
      success: true,
      data: channel,
      message: 'Private channel created successfully',
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
