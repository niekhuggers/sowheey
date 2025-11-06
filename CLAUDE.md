# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# IMPORTANT: Requires TWO terminals for development
pnpm dev           # Terminal 1: Next.js app on :3000
pnpm socket        # Terminal 2: Socket.IO server on :3001

# Database management
pnpm db:push       # Push schema changes (development)
pnpm db:migrate    # Create migration (production)
pnpm db:studio     # View/edit database with Prisma Studio

# Testing & Quality
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright)
pnpm lint          # ESLint
pnpm build         # Production build
```

## Critical Architecture Understanding

### Dual Server Requirement
**This is a dual-server application** - both servers must run simultaneously:
- **Next.js App** (port 3000): Handles routing, API routes, static pages
- **Socket.IO Server** (port 3001): Real-time game communication at `/server/socket.ts`

### Database Model Complexity
Key relationship to understand for debugging:
- **PreSubmission model** has complex foreign key relations: `rank1ParticipantId`, `rank2ParticipantId`, `rank3ParticipantId` all reference different participants
- **Device pairing** supports both individual participants AND teams (nullable foreign keys)
- **Round states** follow strict progression: `WAITING` → `OPEN` → `CLOSED` → `REVEALED`

### Game Flow & Special Features
- **F/M/K Questions**: Special question type with `fixedOptions` array (handled in `/components/game/mobile-ranking.tsx`)
- **Community Scoring**: Scoring algorithm in `/lib/utils.ts` - +1 for top 3, +2 additional for exact position
- **Weekend Mode**: Simplified interface with hardcoded participants and different routing
- **Dutch Language**: Questions in `/lib/default-questions.ts` are Dutch-focused for friend groups

## Socket.IO Communication Patterns

### Critical Events to Understand
```typescript
// Host actions require token validation
socket.emit('host-action', { roomId, hostToken, action: 'start-round', questionId })

// Submissions can be individual OR team-based
socket.emit('submit-ranking', { 
  roomCode, roundId, 
  participantId?: string,  // Individual mode
  teamId?: string,         // Team mode
  rankings: { rank1Id, rank2Id, rank3Id }
})
```

### Connection Management
- All real-time logic in `/server/socket.ts`
- Rooms isolated by Socket.IO room system
- Device tokens for reconnection handling
- Host token validation for all admin actions

## Key File Locations

### Game Logic Components
- `/components/game/mobile-ranking.tsx` - Core drag & drop ranking component (handles F/M/K and regular questions)
- `/lib/utils.ts` - Scoring calculations and game utilities
- `/server/socket.ts` - All real-time Socket.IO event handling
- `/app/admin/page.tsx` - Admin dashboard with pre-fill functionality and test room creation

### Database & Types
- `/prisma/schema.prisma` - Database schema with complex relationships
- `/lib/types.ts` - TypeScript interfaces for game state
- `/lib/default-questions.ts` - Dutch question templates

### API Routes Pattern
- `/app/api/rooms/route.ts` - Room creation with participants and questions
- `/app/api/pre-submissions/route.ts` - Pre-event ranking storage/retrieval

## Environment Setup
```bash
# Required environment variables
DATABASE_URL="file:./dev.db"                        # SQLite for dev
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"      # Socket.IO server
SOCKET_PORT=3001                                     # Socket server port
NEXT_PUBLIC_APP_URL="http://localhost:3000"         # For QR codes
```

## Common Development Patterns

### Debugging Socket.IO Issues
```typescript
// Check Socket.IO events in browser DevTools Network tab
// Server logs show connection/disconnection events
// Use pnpm db:studio to inspect database state during testing
```

### Mobile Ranking Component Usage
```typescript
// The mobile-ranking component handles both regular and F/M/K questions
const isSpecialQuestion = question.type === 'fmk'
const availableOptions = isSpecialQuestion 
  ? question.fixedOptions || []
  : participants.map(p => p.id)
```

### Team vs Individual Submission Handling
```typescript
// Socket events support both modes - check for participantId OR teamId
socket.on('submit-ranking', async (data: {
  participantId?: string;  // Individual play
  teamId?: string;         // Team play
  // ... rest of data
}) => {
  // Handle both cases in server/socket.ts
})
```

### Admin Interface Patterns
- **Weekend Game**: Uses fixed room code "WEEKEND2024" with pre-configured participants
- **Test Room**: Creates random room code with sample participants for testing
- **Pre-fill Logic**: Complex F/M/K handling in admin dashboard with proper target/action separation

## Recent Architecture Changes & Bug Fixes

### F/M/K Implementation Standardization
- **Issue**: Multiple competing F/M/K implementations across components
- **Solution**: Standardized on `MobileRanking` component with `type: 'fmk'` detection
- **Key Files**: `/components/game/mobile-ranking.tsx`, `/app/play/page.tsx`

### Database Persistence Issues
- **Issue**: Admin page was only saving to localStorage, losing data on logout
- **Solution**: Integrated admin interface with database via API routes
- **Key Files**: `/app/admin/page.tsx`, `/app/api/pre-submissions/route.ts`

### Socket.IO Team vs Individual Data Mismatch
- **Issue**: Teams were sending team IDs as participant IDs in socket events
- **Solution**: Updated socket handler to accept both `participantId` and `teamId`
- **Key Files**: `/server/socket.ts`

### Admin F/M/K Selection Logic
- **Issue**: Confusing variable naming and incorrect data structure handling
- **Solution**: Clear separation between targets (Aylin/Keone/Ceana) and actions (F/M/K)
- **Key Files**: `/app/admin/page.tsx` (lines 600-650 region)

## Troubleshooting Common Issues

### Socket Connection Problems
- Check `NEXT_PUBLIC_SOCKET_URL` environment variable matches Socket.IO server port
- Ensure both `pnpm dev` AND `pnpm socket` are running simultaneously
- Clear browser localStorage if pairing fails

### Database Issues
- Run `pnpm db:push` after schema changes
- Use `pnpm db:studio` to inspect database state
- Check that DATABASE_URL points to correct file

### F/M/K Question Issues
- F/M/K questions use `type: 'fmk'` and `fixedOptions` array
- Admin interface has separate logic for F/M/K target/action selection
- Mobile ranking component auto-detects question type

### Team vs Individual Submission Confusion
- Socket events accept EITHER `participantId` OR `teamId` (not both)
- Device pairing supports both modes with nullable foreign keys
- Check `/server/socket.ts` for current handling logic