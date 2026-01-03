# PYrte Radio Shack - Project TODO

## Completed

### Configuration & Environment
- [x] Unify Database Choice (PostgreSQL)
  - [x] Update README.md
  - [x] Update requirements.txt
- [x] Setup Environment Variables
  - [x] Create root .env
  - [x] Create frontend .env

### Backend Fixes
- [x] Cleanup dependencies
- [x] Add Health Check Endpoint

### Frontend Fixes - Infrastructure
- [x] Connect API Client
- [x] Create Frontend Dockerfile
- [x] Add Frontend to docker-compose.yml

### Frontend Fixes - API Integration (Jan 2026)
- [x] Replace mock data with real API calls
  - [x] Admin Dashboard - useAdminStats, useSystemHealth, useRecentActivity, useTodayStats
  - [x] Leaderboard Page - useLeaderboard with loading/error states
  - [x] Queue Page - useQueue, useQueueStats, useVote, useSubmitRequest
- [x] Implement Search Functionality
  - [x] Add useSearch hook with debounced API calls
  - [x] Create search dropdown with results for songs, users, queue items
  - [x] Keyboard shortcuts (Escape to close)
- [x] Implement Telegram Account Linking
  - [x] Connect useLinkTelegram mutation
  - [x] Add proper error handling with toast notifications
- [x] Add Toast Notification System
  - [x] Add Toaster component (sonner) to providers
  - [x] Replace browser alerts with toast notifications
  - [x] Update telegram.ts fallback to use toast
- [x] Fix TypeScript Issues
  - [x] Add proper types for socket events (ModerationSettings, SocketError)
  - [x] Remove `any` casts in useSocket.ts

### Verification
- [x] Docker Build & Start
- [x] Frontend Build Fixes
  - [x] Resolve unused imports
  - [x] Create lib/utils.ts
  - [x] Fix strict type errors
  - [x] Add getInitials to utils.ts
  - [x] Add truncate/formatTimeAgo to utils.ts
- [x] Manual Smoke Test

### Documentation
- [x] Update README.md
- [x] Finalize task.md

### CI/CD
- [x] Fix Database Mismatch in CI (MySQL -> Postgres)
- [x] Add Frontend Build Job
- [x] Restore aiosqlite for tests

---

## Completed (Jan 2026 - Session 2)

### Frontend - Code Quality
- [x] Remove console.log statements for production
  - [x] useSocket.ts, useApi.ts, useChat.ts, page.tsx
  - [x] GoogleLoginBtn.tsx, AuthProvider.tsx, useAudioPlayer.ts
  - [x] supabase.ts

### Environment Variable Validation
- [x] Add validation utility (lib/env.ts)
  - [x] Type-safe access to all environment variables
  - [x] Feature flags (googleAuth, supabaseRealtime)
  - [x] Development vs production mode helpers

### Error Handling
- [x] Add error state to Admin Dashboard
- [x] Add connection status warning to Chat page
- [x] Add toast error notification to GoogleLoginBtn
- [x] Add retry button to Leaderboard error state
- [x] Add error state to Profile page with retry

### Accessibility (a11y)
- [x] Add aria-labels to Header (menu, notifications, chat, settings, search)
- [x] Add aria-labels to Queue page icon buttons (refresh, filter, sort)
- [x] Document aria-label prop in IconButton component
- [x] Add aria-label to RequestModal close button
- [x] Add aria-labels to NowPlaying buttons (vote, play/pause, mute, skip, heart, share, fullscreen)

---

## Completed (Jan 2026 - Session 3)

### Error Handling
- [x] Add error boundaries for critical components
  - [x] Create ErrorBoundary and InlineErrorBoundary components
  - [x] Wrap Layout children with ErrorBoundary
  - [x] Wrap NowPlaying and QueueList on home page
  - [x] Wrap Chat component on chat page
  - [x] Wrap QueueList on queue page

### Accessibility (a11y)
- [x] Add aria-label to Chat textarea
- [x] Add aria-busy to loading spinners
  - [x] Profile page loading state
  - [x] Leaderboard page loading state
  - [x] Queue page loading state
  - [x] Admin page activity loading state
  - [x] Chat component loading state

---

## Completed (Jan 2026 - Session 4)

### Loading States
- [x] Add loading indicator for NowPlaying song changes
  - [x] Add isLoading and isTransitioning state
  - [x] Show loading overlay during song transitions

### Feature Completion
- [x] Implement Skip button in NowPlaying (with onSkip callback)
- [x] Implement Share button functionality (Web Share API with clipboard fallback)

### Type Safety
- [x] Create MusicProvider enum for provider selection in RequestModal
  - [x] Add PROVIDER_INFO with labels and descriptions

### Performance
- [x] Optimize NowPlaying visualizer with useCallback for random values

### UI/UX Polish
- [x] Add character limit feedback during typing in RequestModal
  - [x] Color-coded counter (red at limit, yellow at 400+)
  - [x] Shows remaining characters when approaching limit

---

## Completed (Jan 2026 - Session 5)

### Feature Completion
- [x] Implement Skip back button in AudioPlayer
  - [x] Add onSkipBack and onSkipForward props
  - [x] Implement buffer seek for skip back (-10 seconds)
  - [x] Enable/disable forward skip based on callback

### Type Safety
- [x] Validate socket event data types
  - [x] Add type guard functions for NowPlaying, SongRequest, etc.
  - [x] Validate incoming socket data before state updates
  - [x] Log invalid data in development mode
- [x] Fix unsafe type assertions in AuthProvider
  - [x] Create parseUserTier and isValidUserTier functions
  - [x] Add AuthApiResponse interface for API responses
  - [x] Replace `as UserTier` casts with safe parsing

### Performance
- [x] Share status colors/labels via shared types
  - [x] Use STATUS_COLORS and STATUS_LABELS from @/types
  - [x] Add STATUS_ICON_NAMES constant
  - [x] Remove duplicate definitions from QueueList

### UI/UX Polish
- [x] Standardize spinner styles across components
  - [x] Create Spinner and SpinnerWithLabel components
  - [x] Export from @/components/ui

---

## Pending

### Low Priority

#### Performance
- [ ] Add virtualization for long chat message lists
- [ ] Optimize form state for large tag lists in RequestModal

#### UI/UX Polish
- [ ] Improve error messages to be more user-friendly
- [ ] Add confirmation dialogs for destructive actions

#### Backend TODOs
- [ ] channels/route.ts:137 - Initialize Liquidsoap and Icecast
- [ ] moderation/pending/route.ts:10 - Get authenticated user from session
- [ ] moderation/review/route.ts:10 - Get authenticated user from session
- [ ] moderation/review/route.ts:101 - Send notification to user
- [ ] music_provider.py:299 - Stable Audio API integration
- [ ] telegram_handlers.py:114 - Daily limit check

---

## API Hooks Reference

### New Hooks Added (Jan 2026)

| Hook | File | Purpose |
|------|------|---------|
| `useSearch` | useApi.ts | Search songs, users, queue items with debouncing |
| `useSystemHealth` | useApi.ts | Get system health status for admin dashboard |
| `useRecentActivity` | useApi.ts | Get recent activity feed for admin dashboard |
| `useTodayStats` | useApi.ts | Get today's statistics for admin dashboard |

### Existing Hooks Updated

| Hook | Update |
|------|--------|
| `useQueue` | Now used in Queue page (was mock) |
| `useQueueStats` | Now used in Queue page (was mock) |
| `useLeaderboard` | Now used in Leaderboard page (was mock) |
| `useAdminStats` | Now used in Admin page (was mock) |
| `useVote` | Connected to Queue page with auth |
| `useSubmitRequest` | Connected to Queue page with auth |
| `useLinkTelegram` | Connected with toast notifications |

---

## Notes

- All frontend mock data has been replaced with real API calls
- Toast notifications now work via sonner library
- Search is debounced (300ms) and requires minimum 2 characters
- Admin dashboard shows loading states while fetching data
- Queue page requires authentication to submit requests
