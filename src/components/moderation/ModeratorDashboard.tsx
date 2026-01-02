'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import type { SongRequest } from '@/types';

interface ModerationSettings {
  aiModerationEnabled: boolean;
  moderationStrictness: 'low' | 'medium' | 'high';
  allowExplicitLyrics: boolean;
  customModerationPrompt?: string;
}

interface ModeratorDashboardProps {
  channelId: string;
  channelName: string;
  initialSettings?: ModerationSettings;
}

export function ModeratorDashboard({
  channelId,
  channelName,
  initialSettings,
}: ModeratorDashboardProps) {
  const [settings, setSettings] = useState<ModerationSettings>(
    initialSettings || {
      aiModerationEnabled: true,
      moderationStrictness: 'medium',
      allowExplicitLyrics: false,
    }
  );

  const [pendingReviews, setPendingReviews] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Fetch pending reviews
  useEffect(() => {
    fetchPendingReviews();
  }, [channelId]);

  const fetchPendingReviews = async () => {
    try {
      const response = await fetch(`/api/moderation/pending?channelId=${channelId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending reviews:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<ModerationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    setSaveStatus('saving');

    try {
      const response = await fetch(`/api/channels/${channelId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReview = async (requestId: string, decision: 'approve' | 'reject') => {
    setLoading(true);

    try {
      const response = await fetch('/api/moderation/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          decision,
          channelId,
        }),
      });

      if (response.ok) {
        // Remove from pending list
        setPendingReviews((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to review request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold">Moderation Dashboard</h1>
        <p className="text-text-secondary">
          Managing <span className="text-brand-primary">{channelName}</span>
        </p>
      </div>

      {/* Settings Card */}
      <GlassCard padding="lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Moderation Settings</h2>
          {saveStatus === 'saved' && (
            <span className="text-sm text-status-success">✓ Saved</span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-sm text-text-tertiary">Saving...</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-status-error">Failed to save</span>
          )}
        </div>

        <div className="space-y-6">
          {/* AI Moderation Toggle */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <label className="mb-1 block font-medium">AI Moderation</label>
              <p className="text-sm text-text-tertiary">
                {settings.aiModerationEnabled
                  ? 'AI will automatically filter inappropriate content'
                  : '⚠️ Warning: Disabling moderation may allow offensive content'}
              </p>
            </div>
            <button
              onClick={() =>
                updateSettings({ aiModerationEnabled: !settings.aiModerationEnabled })
              }
              className={`relative h-8 w-14 rounded-full transition-colors ${
                settings.aiModerationEnabled ? 'bg-brand-primary' : 'bg-glass-medium'
              }`}
            >
              <div
                className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
                  settings.aiModerationEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Strictness Level */}
          {settings.aiModerationEnabled && (
            <>
              <div>
                <label className="mb-2 block font-medium">Strictness Level</label>
                <select
                  value={settings.moderationStrictness}
                  onChange={(e) =>
                    updateSettings({
                      moderationStrictness: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  className="w-full rounded-lg bg-glass-medium px-4 py-2 text-text-primary outline-none ring-2 ring-transparent transition-all focus:ring-brand-primary"
                >
                  <option value="low">Low - Only extreme violations</option>
                  <option value="medium">Medium - Standard filtering (recommended)</option>
                  <option value="high">High - Strict filtering</option>
                </select>
              </div>

              {/* Explicit Lyrics Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="mb-1 block font-medium">Allow Explicit Lyrics</label>
                  <p className="text-sm text-text-tertiary">
                    Permit songs with explicit language or mature themes
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateSettings({ allowExplicitLyrics: !settings.allowExplicitLyrics })
                  }
                  className={`relative h-8 w-14 rounded-full transition-colors ${
                    settings.allowExplicitLyrics ? 'bg-brand-primary' : 'bg-glass-medium'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
                      settings.allowExplicitLyrics ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="mb-2 block font-medium">
                  Custom Moderation Prompt (Optional)
                </label>
                <textarea
                  value={settings.customModerationPrompt || ''}
                  onChange={(e) =>
                    updateSettings({ customModerationPrompt: e.target.value })
                  }
                  placeholder="Add specific moderation rules for your channel..."
                  className="h-24 w-full rounded-lg bg-glass-medium px-4 py-2 text-text-primary outline-none ring-2 ring-transparent transition-all focus:ring-brand-primary"
                />
                <p className="mt-1 text-xs text-text-tertiary">
                  Provide additional context for AI moderation (e.g., "This is a comedy
                  channel, allow edgy humor")
                </p>
              </div>
            </>
          )}
        </div>
      </GlassCard>

      {/* Pending Reviews */}
      <GlassCard padding="lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            Pending Review ({pendingReviews.length})
          </h2>
          <p className="text-sm text-text-tertiary">
            Content flagged by AI moderation awaiting manual review
          </p>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary">
            <svg
              className="mx-auto mb-4 h-12 w-12 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No pending reviews</p>
            <p className="mt-1 text-sm">All clear! Content is being moderated automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((request) => (
              <div
                key={request.id}
                className="rounded-lg bg-glass-light p-4 transition-colors hover:bg-glass-medium"
              >
                {/* Prompt */}
                <div className="mb-3">
                  <p className="font-medium text-text-primary">{request.prompt}</p>
                </div>

                {/* Flagging Reason */}
                <div className="mb-3 rounded bg-status-warning/20 p-3">
                  <p className="mb-1 text-xs font-semibold text-status-warning">
                    Flagged by AI
                  </p>
                  <p className="text-sm text-text-secondary">
                    {request.moderationReason || 'Content policy concerns detected'}
                  </p>
                </div>

                {/* User Info */}
                <div className="mb-4 text-sm text-text-tertiary">
                  <span>Submitted by: </span>
                  <span className="text-text-primary">@{request.userId}</span>
                  <span className="mx-2">•</span>
                  <span>
                    {new Date(request.requestedAt).toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleReview(request.id, 'approve')}
                    disabled={loading}
                  >
                    Approve & Queue
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReview(request.id, 'reject')}
                    disabled={loading}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard padding="md">
          <p className="mb-1 text-sm text-text-tertiary">Auto-Approved</p>
          <p className="text-2xl font-bold text-status-success">--</p>
        </GlassCard>

        <GlassCard padding="md">
          <p className="mb-1 text-sm text-text-tertiary">Manually Reviewed</p>
          <p className="text-2xl font-bold text-brand-primary">--</p>
        </GlassCard>

        <GlassCard padding="md">
          <p className="mb-1 text-sm text-text-tertiary">Rejected</p>
          <p className="text-2xl font-bold text-status-error">--</p>
        </GlassCard>
      </div>
    </div>
  );
}
