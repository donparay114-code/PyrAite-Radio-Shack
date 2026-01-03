# Changelog

All notable changes to PYrte Radio Shack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Search Functionality**: Full-text search in header with debounced API calls
  - Search songs, users, and queue items
  - Dropdown results with categorized sections
  - Keyboard shortcuts (Escape to close)
- **Toast Notifications**: Sonner toast library for user feedback
  - Success/error notifications for actions
  - Dark theme styling matching app design
- **New API Hooks**:
  - `useSearch` - Search across songs, users, queue items
  - `useSystemHealth` - System health status for admin dashboard
  - `useRecentActivity` - Recent activity feed for admin dashboard
  - `useTodayStats` - Today's statistics with hourly data
- **TypeScript Interfaces**:
  - `ModerationSettings` - Socket moderation event type
  - `SocketError` - Socket error event type
  - `SearchResult` - Search API response type
  - `SystemHealth` - System health API response type
  - `RecentActivity` - Activity feed item type
  - `TodayStats` - Today stats API response type

### Changed
- **Admin Dashboard**: Replaced all mock data with real API calls
  - Connected to `useAdminStats` for key metrics
  - Connected to `useSystemHealth` for system status
  - Connected to `useRecentActivity` for activity feed
  - Connected to `useTodayStats` for daily statistics
  - Added loading states for all sections
  - Fixed hourly chart to use real data instead of random values
- **Leaderboard Page**: Replaced mock users with real API data
  - Connected to `useLeaderboard` hook
  - Added loading spinner during data fetch
  - Added error state with message display
- **Queue Page**: Connected to real queue APIs
  - Uses `useQueue` for queue items
  - Uses `useQueueStats` for statistics
  - Uses `useVote` for voting with authentication
  - Uses `useSubmitRequest` for new song requests
  - Shows "Login to Request" when unauthenticated
  - Added empty state when no requests in queue
- **Header**: Implemented functional search
  - Real-time search with 300ms debounce
  - Results categorized by type (Songs, Users, Queue)
  - Click outside or Escape to close dropdown
  - Clear button to reset search
  - Loading spinner during search
- **Profile Header**: Real Telegram account linking
  - Connected to `useLinkTelegram` mutation
  - Toast notifications for success/error states
  - Username validation (strips @ prefix)
- **Telegram SDK**: Updated alert fallback
  - Uses toast instead of browser alert when not in Telegram WebApp

### Fixed
- **TypeScript**: Removed `any` type casts in useSocket.ts
  - Added proper interfaces for socket events
  - `moderation-settings-changed` event now typed as `ModerationSettings`
  - `error` event now typed as `SocketError`
- **HealthCard Component**: Fixed TypeScript typing
  - Added `HealthData` interface with proper optional properties
  - Added "unknown" status indicator (yellow)

### Deprecated
- Mock data constants removed from:
  - `frontend/src/app/admin/page.tsx`
  - `frontend/src/app/leaderboard/page.tsx`
  - `frontend/src/app/queue/page.tsx`

## [0.1.0] - 2025-12-XX

### Added
- Initial release with core features
- Telegram WebApp authentication
- Google OAuth integration
- Real-time chat with Supabase
- Song request queue system
- Admin dashboard (with mock data)
- Leaderboard (with mock data)
- n8n workflow integration
- Suno/Udio music generation support

---

## Migration Notes

### Upgrading to Latest

1. **Environment Variables**: Ensure all required env vars are set:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api.example.com
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Dependencies**: Run npm install to get sonner:
   ```bash
   cd frontend && npm install
   ```

3. **API Endpoints Required**: The following backend endpoints must be available:
   - `GET /api/admin/stats` - Admin statistics
   - `GET /api/admin/health` - System health status
   - `GET /api/admin/activity` - Recent activity feed
   - `GET /api/admin/today` - Today's statistics
   - `GET /api/search` - Search endpoint
   - `GET /api/users/leaderboard` - Leaderboard data
   - `GET /api/queue/` - Queue items
   - `GET /api/queue/stats` - Queue statistics
   - `POST /api/queue/` - Submit song request
   - `POST /api/votes/` - Vote on queue items
   - `POST /api/auth/link-telegram` - Link Telegram account
