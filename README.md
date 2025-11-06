# Ranking the Stars

An interactive ranking game where participants rank each other across different categories. Features pre-event submissions, live gameplay with mobile devices, team play, and real-time scoring.

## Features

### Pre-Event Management
- **Roster Management**: Host adds participants with names and avatars
- **Pre-Event Submissions**: Each participant gets a unique invite link to submit rankings for all questions before the event
- **Invite Links**: QR codes and copyable links for easy distribution

### Live Gameplay
- **Device Pairing**: Participants join with mobile devices using room codes
- **Individual Play**: Participants can play as individuals
- **Team Play**: Host can create teams and generate pairing codes for team devices
- **Real-time Updates**: Live scoring and round management via Socket.IO

### Game Mechanics
- **Community Scoring**: The "correct" answer is determined by collective participant rankings
- **Scoring System**: 
  - +1 point for having someone in the community top 3
  - +2 additional points for having them in the exact correct position
- **Multiple Rounds**: Host controls round flow (open → closed → revealed)

### Technology Choice: Socket.IO

This implementation uses **Socket.IO** for real-time communication instead of Supabase Realtime because:

1. **Full Control**: Complete control over real-time logic and game state
2. **Custom Events**: Tailored events for game-specific actions (submissions, reveals, etc.)
3. **Local Development**: No external dependencies for core functionality
4. **Performance**: Direct WebSocket connections with fallbacks
5. **Flexibility**: Easy to extend with custom game features

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository>
cd ranking-the-stars
pnpm install
```

2. **Set up environment**:
```bash
cp .env.example .env
```

3. **Initialize database**:
```bash
pnpm db:push
```

4. **Start development servers**:
```bash
# Terminal 1: Next.js app
pnpm dev

# Terminal 2: Socket.IO server
pnpm socket
```

The app will be available at `http://localhost:3000`

## Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev, PostgreSQL for prod

# Socket.IO
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001

# Optional: App URL for QR codes
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Game Flow

### 1. Pre-Event Setup

1. **Host creates room** at `/host`
2. **Add participants** to roster with names and optional avatars
3. **Generate invite links** - each participant gets a unique QR code/link
4. **Participants submit rankings** at `/pre?room=CODE&token=TOKEN`
   - Mobile-optimized drag & drop interface
   - All questions answered before event
   - Can save progress and return later

### 2. Live Event

1. **Participants join** via `/join?room=CODE`
   - Choose to join as individual or team device
   - Individual: select name from roster
   - Team: enter 6-character pairing code from host

2. **Host manages game** from host dashboard:
   - Create teams by dragging participants
   - Generate team pairing codes
   - Start rounds by selecting questions
   - Control round flow (open → close → reveal)

3. **Live gameplay**:
   - Participants rank others via drag & drop on mobile
   - Real-time submission tracking
   - Community results calculated automatically
   - Individual and team scores updated live

### 3. Scoring & Results

- **Round Scoring**: Based on how well individual rankings match community consensus
- **Aggregate Scoring**: Total points across all rounds
- **Team Scoring**: Sum of team members' individual scores
- **Live Leaderboard**: Toggle between individual and team views

## API Endpoints

### Rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms?code=XXX` - Get room details

### Participants
- `POST /api/participants` - Add participant to roster
- `GET /api/participants?roomCode=XXX` - Get room participants

### Pre-Event Submissions
- `POST /api/pre-submissions` - Submit pre-event rankings
- `GET /api/pre-submissions?inviteToken=XXX&roomCode=XXX` - Get participant's submissions

### Teams
- `POST /api/teams` - Create team
- `GET /api/teams?roomId=XXX` - Get room teams

### Scoring
- `POST /api/rounds/{id}/calculate` - Calculate round results
- `GET /api/scores?roomCode=XXX` - Get current scores

## Socket.IO Events

### Client → Server
- `join-room` - Join room with device token
- `host-action` - Host actions (add participant, start round, etc.)
- `submit-ranking` - Submit live round ranking
- `pair-device` - Pair device to participant or team

### Server → Client
- `room-state` - Current room state and participants
- `round-started` - New round began
- `round-closed` - Round closed for submissions
- `round-revealed` - Round results revealed
- `participant-added/updated/deleted` - Roster changes
- `device-paired` - Device successfully paired

## Database Schema

### Core Models
- **Room**: Game session with settings and tokens
- **Participant**: Roster entries with invite tokens
- **PreSubmission**: Pre-event rankings per participant per question
- **Device**: Mobile device connections with pairing info
- **Team**: Duo teams with members
- **TeamPairingCode**: Temporary codes for team device pairing

### Game Models
- **Question**: Ranking questions for the room
- **Round**: Individual game rounds with status
- **Submission**: Live round submissions
- **Score**: Individual round scores
- **AggregateScore**: Total scores per participant
- **TeamAggregateScore**: Total scores per team

## Security Features

- **UUID Tokens**: Invite tokens and device tokens are UUID v4
- **Host Authorization**: Host actions require host token validation
- **Token Expiration**: Team pairing codes expire after 1 minute
- **Rate Limiting**: Built into API routes
- **Server Authority**: All scoring calculated server-side
- **No Secrets in Client**: Sensitive tokens never exposed to client

## Development

### Running Tests

```bash
# Unit tests (scoring logic)
pnpm test

# E2E tests (full game flow)
pnpm test:e2e
```

### Database Management

```bash
# Push schema changes (dev)
pnpm db:push

# Create migration (prod)
pnpm db:migrate

# View data
pnpm db:studio
```

### Code Structure

```
app/                 # Next.js App Router
├── host/           # Host room creation
├── join/           # Join room flow  
├── pre/            # Pre-event submissions
├── play/           # Live gameplay
├── room/           # Room-specific pages
└── api/            # API routes

components/
├── ui/             # Basic UI components
├── host/           # Host dashboard components
└── game/           # Game-specific components

lib/
├── prisma.ts       # Database client
├── socket-client.ts # Socket.IO client utils
├── utils.ts        # Scoring and utility functions
└── types.ts        # TypeScript interfaces

server/
└── socket.ts       # Socket.IO server

tests/
├── unit/           # Unit tests
└── e2e/            # Playwright E2E tests
```

## Production Deployment

### Environment Setup
1. **Database**: Switch to PostgreSQL
   ```bash
   DATABASE_URL="postgresql://user:pass@host:5432/ranking_stars"
   ```

2. **Socket Server**: Deploy Socket.IO server separately
   ```bash
   NEXT_PUBLIC_SOCKET_URL="wss://your-socket-server.com"
   ```

3. **Build and Deploy**:
   ```bash
   pnpm build
   pnpm start
   ```

### Hosting Recommendations
- **App**: Vercel, Netlify, or any Node.js host
- **Database**: Supabase, PlanetScale, or managed PostgreSQL
- **Socket Server**: Railway, Render, or any WebSocket-capable host

## Troubleshooting

### Common Issues

1. **Socket connection fails**:
   - Check `NEXT_PUBLIC_SOCKET_URL` environment variable
   - Ensure Socket.IO server is running on correct port
   - Verify CORS settings in socket.ts

2. **Database connection issues**:
   - Run `pnpm db:push` to sync schema
   - Check `DATABASE_URL` format
   - Ensure database file permissions (SQLite)

3. **Mobile device pairing fails**:
   - Clear localStorage and try again
   - Check device token generation
   - Verify room code is correct

4. **Scoring calculation errors**:
   - Check that all required participants submitted
   - Verify round status is 'CLOSED' before revealing
   - Review scoring logic in utils.ts

### Development Tips

- Use browser dev tools to inspect Socket.IO events
- Check database with `pnpm db:studio`
- Monitor server logs for Socket.IO connections
- Test on actual mobile devices for touch interactions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details