import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { emitEvent } from '@/lib/socket-emitter';

// PATCH /api/channels/[id]/moderation - Update moderation settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channelId = params.id;
    const body = await request.json();
    const {
      aiModerationEnabled,
      moderationStrictness,
      allowExplicitLyrics,
      customModerationPrompt,
    } = body;

    // TODO: Get authenticated user from session/JWT
    const userId = request.headers.get('x-user-id'); // Placeholder

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is owner or moderator
    const permission = await query(
      `SELECT role FROM channel_members
       WHERE channel_id = $1 AND user_id = $2`,
      [channelId, userId]
    );

    if (
      permission.rows.length === 0 ||
      !['owner', 'moderator'].includes(permission.rows[0].role)
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    // Get old settings for audit trail
    const oldSettings = await query(
      `SELECT ai_moderation_enabled, moderation_strictness, allow_explicit_lyrics
       FROM radio_channels
       WHERE id = $1`,
      [channelId]
    );

    if (oldSettings.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    const oldModerationEnabled = oldSettings.rows[0].ai_moderation_enabled;

    // Update settings in transaction
    await transaction(async (client) => {
      // Update channel settings
      await client.query(
        `UPDATE radio_channels
         SET ai_moderation_enabled = COALESCE($1, ai_moderation_enabled),
             moderation_strictness = COALESCE($2, moderation_strictness),
             allow_explicit_lyrics = COALESCE($3, allow_explicit_lyrics),
             custom_moderation_prompt = COALESCE($4, custom_moderation_prompt)
         WHERE id = $5`,
        [
          aiModerationEnabled,
          moderationStrictness,
          allowExplicitLyrics,
          customModerationPrompt,
          channelId,
        ]
      );

      // Log critical setting changes
      if (
        aiModerationEnabled !== undefined &&
        aiModerationEnabled !== oldModerationEnabled
      ) {
        await client.query(
          `INSERT INTO channel_moderation_history
           (channel_id, changed_by_user_id, setting_name, old_value, new_value)
           VALUES ($1, $2, 'ai_moderation_enabled', $3, $4)`,
          [
            channelId,
            userId,
            String(oldModerationEnabled),
            String(aiModerationEnabled),
          ]
        );
      }
    });

    // Notify channel members of critical changes
    if (
      aiModerationEnabled !== undefined &&
      aiModerationEnabled !== oldModerationEnabled
    ) {
      // Send Socket.io event to channel members
      emitEvent(`channel:${channelId}`, 'moderation-settings-changed', {
        type: 'moderation_settings_changed',
        message: aiModerationEnabled
          ? 'AI moderation has been enabled on this channel'
          : '⚠️ AI moderation has been disabled on this channel'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Moderation settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating moderation settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update moderation settings' },
      { status: 500 }
    );
  }
}

// GET /api/channels/[id]/moderation - Get moderation settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channelId = params.id;

    const result = await query(
      `SELECT
        ai_moderation_enabled,
        moderation_strictness,
        allow_explicit_lyrics,
        custom_moderation_prompt
       FROM radio_channels
       WHERE id = $1`,
      [channelId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching moderation settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moderation settings' },
      { status: 500 }
    );
  }
}
