# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Workflow
```bash
# Development (requires 2 terminals)
npm run dev        # Terminal 1: Next.js app (port 3000)
npm run socket     # Terminal 2: Socket.IO server (port 3001)

# Database management
npm run db:push    # Sync Prisma schema to database (development)
npm run db:migrate # Create migration (production)
npm run db:studio  # Open Prisma Studio database GUI

# Railway deployment
npm run railway:setup  # Set up database tables in production
npm run build         # Build for production
npm run start         # Start production server

# Testing
npm test             # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
npm run lint         # ESLint
```

## Architecture Overview

**Ranking the Stars** is a two-phase interactive ranking game application with real-time multiplayer features.

### Core Architecture
- **Next.js 14** full-stack app with App Router and TypeScript
- **Dual-server setup**: Next.js app (3000) + separate Socket.IO server (3001)
- **Prisma ORM** with SQLite (dev) / PostgreSQL (production)
- **Real-time communication** via Socket.IO for live gameplay
- **Mobile-first design** with touch-optimized interfaces

### Database Design Philosophy
The schema supports a **two-phase game flow**:
1. **Pre-Event Phase**: Participants submit rankings via unique invite links (`PreSubmission` table)
2. **Live Event Phase**: Real-time gameplay with device pairing and live scoring (`Submission`, `Score` tables)

Key relationships:
- `Room` → `Participant` → `PreSubmission` (pre-event data)
- `Room` → `Team` → `TeamMember` (team organization)
- `Round` → `Submission` → `Score` (live gameplay data)
- `Device` tokens handle mobile device persistence and pairing

### Scoring Algorithm
The app implements **community-based scoring** where the "correct" answer is determined by collective participant rankings:
- Community ranking = weighted average of all pre-submissions
- Individual scores = points for matching community consensus
- Located in `/lib/utils.ts` - `calculateCommunityRanking()` and `calculateScore()`

## Key Patterns & Conventions

### API Route Structure
```
/api/rooms              # Room CRUD with host token validation
/api/participants       # Roster management
/api/pre-submissions    # Pre-event ranking submissions
/api/teams             # Team creation and management
/api/rounds/[id]/calculate  # Server-side scoring calculations
```

All API routes use:
- **Zod validation** for request schemas
- **Prisma transactions** for data consistency
- **Host token authorization** for admin actions
- **UUID tokens** for security (invite tokens, device tokens, etc.)

### Socket.IO Event Architecture
**Client → Server Events:**
- `join-room` - Device joins with room code and device token
- `host-action` - Administrative actions (add participant, start round, etc.)
- `submit-ranking` - Live round submissions
- `pair-device` - Pair mobile device to participant or team

**Server → Client Events:**
- `room-state` - Complete room state broadcasts
- `round-started/closed/revealed` - Round lifecycle events
- `participant-added/updated/deleted` - Roster change notifications
- `device-paired` - Confirmation of successful device pairing

### Frontend Page Organization
```
/host          # Room creation and admin dashboard
/play          # Live gameplay interface (mobile-optimized)
/pre           # Pre-event submission interface (invite link destination)
/team/[code]/[teamId]  # Team-specific gameplay
/weekend       # Hardcoded "WEEKEND2024" game mode
/simple        # Alternative simplified game variant
```

### Component Architecture
- **UI Components** (`/components/ui/`) - Reusable primitives following shadcn/ui patterns
- **Host Components** (`/components/host/`) - Admin dashboard components with real-time state
- **Game Components** (`/components/game/`) - Mobile-optimized ranking interfaces with drag & drop

### Mobile Device Handling
The app has sophisticated mobile device management:
- **Device tokens** (UUID) persist across page reloads
- **Device pairing codes** (6-char) for temporary team pairing
- **localStorage integration** for offline persistence
- **Touch-optimized ranking** interfaces

## Development Considerations

### Environment Variables
```bash
DATABASE_URL                 # Prisma database connection
NEXT_PUBLIC_SOCKET_URL      # Socket.IO server URL for client
SOCKET_PORT                 # Socket.IO server port
NEXT_PUBLIC_APP_URL         # Base URL for QR code generation
```

### Testing Strategy
- **Unit tests** focus on scoring logic and utility functions
- **E2E tests** cover complete game flows from host setup to participant gameplay
- **Real device testing** required for mobile touch interactions

### Security Principles
- **All scoring calculated server-side** to prevent tampering
- **Host token validation** for administrative actions
- **UUID tokens** for all authentication (not sequential IDs)
- **No sensitive tokens exposed** to client-side code
- **Team pairing codes expire** after 1 minute

### Common Development Patterns
- **Real-time state management** via Socket.IO events, not polling
- **Optimistic updates** with server reconciliation
- **Mobile-first responsive design** with touch interactions
- **Local storage fallbacks** for offline functionality

### Railway Deployment Notes
- App uses **PostgreSQL in production** (not SQLite)
- **Separate Socket.IO server deployment** required
- **Database setup** via `railway:setup` script after deployment
- **Environment variables auto-injected** by Railway services

## Special Game Features

### Weekend Mode
- Hardcoded `WEEKEND2024` room with pre-configured participants
- Auto-creates room and participants on first visit
- Simplified interface optimized for friend group events
- Dutch language questions targeting social dynamics

### F/M/K Questions
- Special question type with `fixedOptions` array
- Handled by `MobileRanking` component with `type: 'fmk'` detection
- Admin interface has specialized F/M/K selection logic
- Targets (Aylin/Keone/Ceana) vs Actions (F/M/K) separation

### Community Scoring Algorithm
```typescript
// Scoring logic in /lib/utils.ts
// +1 point for having someone in community top 3
// +2 additional points for exact position match
// Community ranking determined by weighted average of pre-submissions
```

## Troubleshooting Common Issues

### Socket Connection Problems
- Verify `NEXT_PUBLIC_SOCKET_URL` points to correct Socket.IO server
- Check CORS configuration in `server/socket.ts`
- Ensure both Next.js and Socket.IO servers are running in development

### Database Issues
- Run `npm run db:push` to sync schema changes
- Use `npm run db:studio` to inspect data
- Check Prisma connection logs for authentication issues

### Mobile Device Pairing
- Clear localStorage if pairing fails
- Verify device token generation and persistence
- Check that room codes are case-sensitive

### Scoring Calculation Errors
- Ensure all participants have submitted before calculating
- Verify round status is 'CLOSED' before revealing results
- Review community ranking algorithm in `lib/utils.ts`

## Recent Architecture Changes

### localStorage to Database Migration (November 2024)
- **Removed localStorage fallbacks** - All game data now database-first
- **Socket.IO integration** - Admin and play interfaces now communicate via real-time Socket.IO events
- **Critical localStorage kept**: `hostToken`, `deviceToken`, `roomCode`, `selectedTeamId` for authentication/session
- **Migration status**: Pre-filled answers and game state moved to database, team submissions pending

### PostgreSQL Migration
- Schema updated from SQLite to PostgreSQL for Railway deployment
- `railway:setup` command runs `prisma db push` to create tables
- Environment variables auto-injected by Railway services
- Production deployment requires PostgreSQL connection string

### Known Issues & TODOs
- **FMK Questions**: Special handling needed for F/M/K questions with fixed options (Aylin/Keone/Ceana) that aren't participants
- **Admin API**: `/api/admin/pre-submissions` created for admin panel to save pre-submissions without invite tokens
- **Socket.IO Events**: Admin panel sends `start-round`, `reveal-results`, `next-round`, `complete-game` actions
- **TypeScript**: Some `any` types remain in Socket.IO event handlers for quick fixes