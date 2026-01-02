---
name: nextjs-development
description: Optimize and develop Next.js applications with API routes, middleware, and deployment. Use for Next.js feature development, API route creation, middleware setup, and performance optimization.
---

# Next.js Development

## Instructions

1. Work with App Router structure (Next.js 14+)
2. Create API routes in `/app/api`
3. Use Server Components by default
4. Implement middleware for authentication/logging
5. Optimize images and fonts automatically
6. Use dynamic imports for code splitting
7. Configure environment variables in `.env.local`
8. Implement proper TypeScript types

## Key files to review

- `next.config.ts` - Build configuration
- `app/` - Application structure
- `public/` - Static assets
- `middleware.ts` - Request/response interception
- `package.json` - Dependencies and scripts

## Best practices

- Use `use client` directive only when needed (for state, effects, browser APIs)
- Implement loading states with `loading.tsx`
- Handle errors with `error.tsx`
- Use React Suspense for streaming SSR
- Optimize images with Next.js Image component
- Implement proper SEO with metadata

## For AI Radio Station project

- Build real-time audio player with HTML5 Audio API
- Create WebSocket connection for live chat
- Implement Stripe payment integration for premium subscriptions
- Set up Server-Sent Events (SSE) for queue updates
- Configure CORS for API routes accessing Icecast stream
