# Palette's Journal

## 2024-05-21 - Accessibility for Chat Interactions
**Learning:** Chat interfaces often rely on visual cues (icons, placeholders) that are invisible to screen readers. Icon-only buttons and inputs without visible labels are common offenders.
**Action:** Always add `aria-label` to icon-only buttons (like "Send") and inputs relying solely on placeholders. Use `role="status"` with `aria-live` for connection states so users know when they are online/offline.
