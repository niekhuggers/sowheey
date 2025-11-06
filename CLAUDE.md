# CLAUDE.md - Ranking the Stars

## Project Overview

**Ranking the Stars** is an interactive real-time multiplayer ranking game application built with Next.js 14, TypeScript, Socket.IO, and Prisma. The application facilitates group ranking games where participants rank each other across different categories, featuring both pre-event submissions and live gameplay with real-time scoring.

### Key Features
- **Pre-Event Management**: Roster management, participant invite links, pre-event submissions
- **Real-Time Gameplay**: Live device pairing, individual/team play, real-time updates via Socket.IO
- **Community Scoring System**: Collective participant rankings determine "correct" answers
- **Mobile-First Design**: Optimized for mobile device interactions with drag & drop interfaces
- **Weekend Mode**: Simplified version for casual friend gatherings

## Tech Stack

### Core Technologies
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Real-Time**: Socket.IO for WebSocket communication
- **Styling**: Tailwind CSS
- **UI Components**: Custom components built on Tailwind

### Development Tools
- **Testing**: Vitest (unit tests) + Playwright (E2E tests)
- **Code Quality**: ESLint
- **Database Management**: Prisma Studio
- **Development**: tsx for TypeScript execution

### Dependencies
```json
{
  "main": {
    "@prisma/client": "^5.22.0",
    "next": "14.2.23",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "qrcode.react": "^4.1.0",
    "uuid": "^11.0.4",
    "zod": "^3.23.8"
  }
}
```

## Architecture Overview

### Application Structure
```
/app/                    # Next.js App Router
├── api/                # Backend API routes
│   ├── participants/   # Participant management
│   ├── rooms/         # Room creation/management
│   ├── pre-submissions/ # Pre-event submissions
│   ├── teams/         # Team management
│   ├── scores/        # Scoring system
│   └── rounds/        # Game round management
├── host/              # Host dashboard
├── join/              # Player join flow
├── pre/               # Pre-event submission interface
├── play/              # Live gameplay interface
├── room/              # Room-specific pages
├── team/              # Team-specific pages
└── weekend/           # Weekend mode (simplified)

/components/             # React components
├── ui/                # Base UI components (Button, Card, Input)
├── host/              # Host-specific components
├── game/              # Game mechanics components
└── weekend/           # Weekend mode components

/lib/                   # Utility libraries
├── prisma.ts          # Database client
├── socket-client.ts   # Socket.IO client utilities
├── types.ts           # TypeScript interfaces
├── utils.ts           # Scoring algorithms & utilities
└── default-questions.ts # Default game questions

/server/                # Backend services
└── socket.ts          # Socket.IO server implementation

/prisma/               # Database schema & migrations
└── schema.prisma      # Database schema definition

/tests/                # Test suites
├── unit/              # Unit tests (Vitest)
└── e2e/               # End-to-end tests (Playwright)
```

### Data Architecture

#### Core Database Models
- **Room**: Game session container with codes, tokens, and settings
- **Participant**: Player roster with invite tokens and metadata
- **Device**: Mobile device connections with pairing information
- **Team**: Duo teams for collaborative gameplay
- **Question**: Ranking prompts with categories and ordering
- **Round**: Individual game rounds with status tracking
- **Submission**: Real-time ranking submissions from players
- **PreSubmission**: Pre-event rankings submitted before live gameplay
- **Score/AggregateScore**: Individual round and cumulative scoring
- **TeamAggregateScore**: Team-based scoring aggregation

#### Key Relationships
- Room → Participants (1:many)
- Room → Teams (1:many) 
- Team → TeamMembers → Participants (many:many through join table)
- Room → Questions → Rounds (1:many:many)
- Round → Submissions (1:many)
- Participant → PreSubmissions (1:many)

## Game Flow & Mechanics

### 1. Pre-Event Setup Phase
1. **Host creates room** (`/host`)
   - Generates unique room code and host token
   - Initializes default questions from `/lib/default-questions.ts`

2. **Roster Management**
   - Host adds participants with names and optional avatars
   - Each participant gets unique UUID invite token
   - QR codes generated for easy distribution

3. **Pre-Event Submissions** (`/pre`)
   - Participants access via invite links with tokens
   - Mobile-optimized drag & drop interface
   - Rankings stored in `PreSubmission` model
   - Progress saved, can return later to complete

### 2. Live Event Phase
1. **Device Pairing**
   - Participants join via room codes (`/join`)
   - Individual mode: select from roster
   - Team mode: enter 6-character pairing code

2. **Real-Time Gameplay**
   - Host controls game flow from dashboard
   - Round states: `WAITING` → `OPEN` → `CLOSED` → `REVEALED`
   - Live submission tracking via Socket.IO
   - Mobile drag & drop ranking interface

### 3. Scoring System
- **Community Consensus**: "Correct" answer determined by collective rankings
- **Point System**: 
  - +1 point for having someone in community top 3
  - +2 additional points for exact position match
- **Calculations**: Server-side in `/lib/utils.ts` scoring functions
- **Real-time Updates**: Live leaderboards for individuals and teams

## Socket.IO Communication

### Real-Time Events Architecture

#### Client → Server Events
- `join-room`: Connect device to room with room code
- `host-action`: Host dashboard actions (add participant, start round, etc.)
- `submit-ranking`: Submit live round rankings
- `pair-device`: Pair device to participant or team

#### Server → Client Events
- `room-state`: Broadcast current room state and participants
- `round-started/closed/revealed`: Round state changes
- `participant-added/updated/deleted`: Roster modifications
- `device-paired`: Successful device pairing confirmation
- `submission-received`: Ranking submission acknowledgment

#### Connection Management
- Room-based Socket.IO rooms for isolation
- Device token mapping for reconnection handling
- Connection count tracking per room
- Automatic cleanup on disconnect

## Security Model

### Authentication & Authorization
- **UUID Tokens**: All sensitive operations use UUID v4 tokens
  - Host tokens for room management
  - Invite tokens for participant access
  - Device tokens for mobile pairing
- **Server-Side Validation**: All host actions require token validation
- **Token Expiration**: Team pairing codes expire after 1 minute
- **No Client Secrets**: Sensitive data never exposed to client-side

### Data Protection
- **Room Isolation**: Participants can only access their assigned room
- **Device Validation**: Submissions validated against device-participant pairing
- **Server Authority**: All scoring calculated server-side to prevent tampering

## Development Workflow

### Environment Setup
```bash
# Prerequisites
node --version  # 18+
pnpm --version  # or npm

# Setup
pnpm install
cp .env.example .env
pnpm db:push

# Development
pnpm dev      # Next.js (Terminal 1)
pnpm socket   # Socket.IO server (Terminal 2)
```

### Environment Variables
```bash
DATABASE_URL="file:./dev.db"              # SQLite dev, PostgreSQL prod
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"  # Socket.IO server
SOCKET_PORT=3001                          # Socket server port
NEXT_PUBLIC_APP_URL="http://localhost:3000"     # For QR codes
```

### Scripts
- `pnpm dev`: Start Next.js development server
- `pnpm socket`: Start Socket.IO server with watch mode
- `pnpm build`: Production build
- `pnpm db:push`: Sync database schema (development)
- `pnpm db:studio`: Open Prisma Studio
- `pnpm test`: Run unit tests (Vitest)
- `pnpm test:e2e`: Run E2E tests (Playwright)

### Testing Strategy
- **Unit Tests**: Scoring logic in `/tests/unit/scoring.test.ts`
- **E2E Tests**: Full game flow in `/tests/e2e/game-flow.spec.ts`
- **Multi-Device Testing**: Playwright mobile device simulation
- **Real-Time Testing**: Socket.IO event validation

## API Design Patterns

### REST Endpoints
- **POST /api/rooms**: Create new room with default questions
- **GET /api/rooms?code=XXX&hostToken=XXX**: Fetch room details
- **GET/POST /api/participants**: Manage participant roster
- **GET/POST /api/pre-submissions**: Handle pre-event submissions
- **POST /api/teams**: Create and manage teams
- **POST /api/rounds/[id]/calculate**: Calculate round results
- **GET /api/scores**: Retrieve current scoring state

### Error Handling
- Zod schema validation for all inputs
- Consistent error response format
- Database constraint handling
- Socket.IO error event broadcasting

### Response Patterns
```typescript
// Success response
{ data: T, message?: string }

// Error response  
{ error: string, details?: any }
```

## Deployment Architecture

### Production Considerations
1. **Database**: Switch from SQLite to PostgreSQL
2. **Socket Server**: Deploy separately from Next.js app
3. **CORS**: Configure for production domains
4. **Environment**: Set production URLs and secrets

### Recommended Hosting
- **Next.js App**: Vercel, Netlify, or Node.js compatible hosts
- **Database**: Supabase, PlanetScale, managed PostgreSQL
- **Socket.IO Server**: Railway, Render, or WebSocket-capable hosting

## Code Style & Patterns

### TypeScript Conventions
- Strict type checking enabled
- Interface definitions in `/lib/types.ts`
- Zod schemas for runtime validation
- Proper error handling with typed exceptions

### Component Patterns
- **Server Components**: Default for static content
- **Client Components**: `'use client'` for interactivity
- **Custom Hooks**: Socket.IO connection management
- **Component Composition**: Reusable UI building blocks

### Database Patterns
- **Prisma Models**: Comprehensive relations with cascade deletes
- **Unique Constraints**: Multi-column uniqueness for data integrity
- **Timestamps**: Automatic tracking of creation and updates
- **Soft Deletes**: Preserved through cascade relationships

## Troubleshooting Guide

### Common Issues
1. **Socket Connection Fails**
   - Verify `NEXT_PUBLIC_SOCKET_URL` environment variable
   - Ensure Socket.IO server running on correct port
   - Check CORS configuration

2. **Database Errors**
   - Run `pnpm db:push` to sync schema changes
   - Check DATABASE_URL format and file permissions
   - Use `pnpm db:studio` for data inspection

3. **Mobile Pairing Issues**
   - Clear localStorage and retry
   - Verify room code accuracy
   - Check device token generation

4. **Scoring Calculation Problems**
   - Ensure all required participants submitted
   - Verify round status is 'CLOSED' before revealing
   - Review scoring logic in `/lib/utils.ts`

### Debug Tools
- Browser DevTools for Socket.IO event monitoring
- Prisma Studio for database state inspection
- Server logs for Socket.IO connection tracking
- Mobile device testing for touch interactions

## Contributing Guidelines

### Development Process
1. Fork repository and create feature branch
2. Follow existing code patterns and TypeScript conventions
3. Add tests for new functionality (unit + E2E where applicable)
4. Ensure all tests pass (`pnpm test && pnpm test:e2e`)
5. Update documentation for significant changes
6. Submit pull request with clear description

### Code Quality
- ESLint configuration enforced
- TypeScript strict mode required
- Consistent naming conventions
- Comprehensive error handling
- Performance considerations for real-time features

---

This document serves as the comprehensive technical reference for the Ranking the Stars application. For specific implementation details, refer to the source code and inline comments. The architecture prioritizes real-time performance, security, and mobile-first user experience.