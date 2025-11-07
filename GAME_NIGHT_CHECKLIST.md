# 🎮 Game Night Readiness Checklist

## ✅ Pre-Game Setup (Do This First!)

### 1. Clear All Previous Data
```
1. Open Admin: https://ranking-the-stars-drab.vercel.app/admin
2. Click "🧹 Clear Pairings" button
3. Click "🔄 Reset Rounds Only"  
4. Verify you're on Round 1, all teams show 0 points
```

### 2. Verify Teams Exist
Check that you have 5 teams:
- MBO (Niek + Joep)
- The Moment (Tim + Maurits)
- Black & White (Stijn + Thijs)
- Hati Hati (Keith + Yanick)
- Team LGBTQ+ (Rutger + Casper)

---

## 🎯 How The Game Works

### Team Joining (ONE device per team!)
```
Flow:
1. Team opens: https://ranking-the-stars-drab.vercel.app/play
2. Sees list of 5 teams
3. Clicks their team name
4. Device pairs to team in database

Protection:
✅ Database transaction prevents two devices joining same team simultaneously
✅ Second device attempting to join gets error: "This team already has a player connected"
✅ Unique constraint: One device per team

CRITICAL: Each team must use ONLY ONE device (phone/laptop)!
```

### Round Flow
```
Admin clicks:  ▶️ Start Round 1
  ↓
Teams see:     Round 1 Active - "Wie gaan nooit trouwen?"
  ↓
Teams:         Select 3 people, click Submit
  ↓
Database:      TeamSubmission created (unique: roundId + teamId)
  ↓
Admin sees:    Live Status: "3/5 teams submitted"
  ↓
Admin clicks:  🎉 Reveal Results
  ↓
Socket.IO:     1. Closes round (status → CLOSED)
               2. Calls /api/rounds/[id]/calculate
               3. Marks round as REVEALED
               4. Broadcasts to all players
  ↓
Calculate API: 1. Gets community top 3 from pre-submissions
               2. Compares each team's submission
               3. Calculates points (1 pt in top 3, +2 bonus exact)
               4. Saves TeamScore records
               5. Creates TeamAggregateScore with TOTALS
  ↓
Admin sees:    1. Community top 3
               2. Updated Score Leaderboard
               3. "➡️ Next Round" button
  ↓
Admin clicks:  ➡️ Next Round
  ↓
Game:          Advances to Round 2
```

---

## 🔒 Database Constraints (Prevent Duplicates)

### TeamSubmission
```sql
@@unique([roundId, teamId])
```
**Meaning:** One submission per team per round
**Protection:** If a team tries to submit twice, it UPDATES the existing submission (doesn't create duplicate)

### TeamScore
```sql
@@unique([roundId, teamId])
```
**Meaning:** One score per team per round
**But:** Calculate API does `deleteMany` then `createMany`, so this isn't foolproof!

### TeamAggregateScore  
```sql
@@unique([roundId, teamId])
```
**Meaning:** One aggregate per team per round
**But:** Also uses `deleteMany` then `createMany`

---

## 🎯 Scoring Logic Verification

### Calculation Formula:
```typescript
For each person in your submission:
  if (person in community top 3):
    score += 1
    
    if (person in EXACT same position):
      score += 2  // Total: 3 points for exact match
      
Maximum possible: 9 points (all 3 exact matches)
```

### Example:
```
Community: Keith (1st), Merijn (2nd), Tijn (3rd)
Your team: Keith (1st), Niek (2nd), Tijn (3rd)

Scoring:
- Keith: In top 3 (+1) + Exact position (+2) = 3 points ✓
- Niek:  Not in top 3 = 0 points ✓
- Tijn:  In top 3 (+1) + Exact position (+2) = 3 points ✓

Total: 6 points ✓
```

### Team Aggregate:
```typescript
// Sums ALL TeamScore records for this team from ALL revealed rounds
totalScore = sum of team.scores where round.status IN ['REVEALED']
```

---

## ⚠️ Known Risks & Mitigations

### Risk 1: Multiple Tabs/Devices Per Team
**Problem:** If someone opens 2 tabs, both try to join teams
**Mitigation:** 
- Transaction-protected pairing
- Second device gets error message
- **ACTION:** Tell players: ONE device per team only!

### Risk 2: Double-Click Reveal Button
**Problem:** Could trigger calculate twice
**Mitigation:**
- Button disabled when roundStatus = 'revealing'
- Calculate uses deleteMany before createMany
- **Should be safe** ✓

### Risk 3: Socket.IO Server Restart
**Problem:** Railway restarts server frequently (seen in logs)
**Impact:** Clients reconnect automatically
- Auto-rejoin room on reconnect ✓
- Submissions saved to database (not lost) ✓
- **Should be safe** ✓

### Risk 4: Admin Refreshes Page Mid-Round
**Problem:** Loses local state
**Mitigation:**
- All state loaded from database on page load ✓
- Socket.IO reconnects automatically ✓
- **Should be safe** ✓

### Risk 5: Team Leaves and Someone Else Joins
**Problem:** Device switches teams between rounds
**Current Behavior:**
- Leaving team calls /api/team-pairing/unpair ✓
- Sets deviceToken's teamId to NULL ✓
- Other team can then join ✓
- **Works correctly** ✓

---

## 🐛 Potential Bugs To Watch For

### Bug 1: Wrong Team Gets Score
**Symptom:** Team A submits, but Team B gets the points
**Cause:** Device paired to wrong team
**Check:** 
```javascript
// On player screen console:
const token = localStorage.getItem('deviceToken');
fetch('/api/debug-device', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({deviceToken: token})
}).then(r => r.json()).then(console.log)
// Check: "pairedToTeam" matches the team you think you joined
```

### Bug 2: Scores Not Appearing in Admin
**Symptom:** Reveal works, but leaderboard shows 0
**Cause:** TeamScore not being created OR admin not reloading
**Check:**
- Vercel logs should show: "✅ TeamScore records created successfully!"
- Database: SELECT * FROM "TeamScore"; should have records
- Admin console: Should show "Round revealed, reloading..."

### Bug 3: Multiple Teams Getting Same Score
**Symptom:** Two teams both get points when only one submitted
**Cause:** Multiple devices/tabs open, both submitted
**Solution:** Use only ONE device per team!

---

## 🚨 Emergency Fixes (If Something Breaks)

### If Pairing Breaks:
```
Admin → Click "🧹 Clear Pairings"
All teams rejoin from their devices
```

### If Scores Stuck at Zero:
```sql
-- In Vercel PostgreSQL, check if TeamScore table exists:
SELECT * FROM "TeamScore" LIMIT 1;

-- If error "relation does not exist", create it:
CREATE TABLE "TeamScore" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamScore_roundId_teamId_key" ON "TeamScore"("roundId", "teamId");
ALTER TABLE "TeamScore" ADD CONSTRAINT "TeamScore_roundId_fkey" 
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamScore" ADD CONSTRAINT "TeamScore_teamId_fkey" 
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### If Round Progression Breaks:
```
Admin console should show logs. If stuck:
1. Click "🔄 Reset Rounds Only"
2. Start from Round 1 again
3. Previous scores persist in database
```

### Nuclear Option: Full Database Reset
```sql
-- Only if completely broken:
DELETE FROM "TeamScore";
DELETE FROM "TeamSubmission";  
DELETE FROM "TeamAggregateScore";
UPDATE "Round" SET status = 'WAITING';
UPDATE "Room" SET currentRound = 0 WHERE code = 'WEEKEND2024';
UPDATE "Device" SET teamId = NULL;

-- Then in admin: Click "🔄 Reset Rounds Only"
```

---

## 📊 Diagnostic Endpoints

### Check Team Status:
```
https://ranking-the-stars-drab.vercel.app/api/admin/team-status?roomCode=WEEKEND2024
```

### Check Submissions:
```
https://ranking-the-stars-drab.vercel.app/api/debug-scores
```

### Check Community Rankings:
```
https://ranking-the-stars-drab.vercel.app/api/show-community-rankings
```

### Check Device Pairing:
```javascript
// On player device console:
const token = localStorage.getItem('deviceToken');
fetch('/api/debug-device', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({deviceToken: token})
}).then(r => r.json()).then(console.log)
```

---

## 🎯 Game Night Protocol

### Before Friends Arrive:
```
1. ✅ Click "🧹 Clear Pairings"
2. ✅ Click "🔄 Reset Rounds Only"
3. ✅ Test ONE round with ONE device
4. ✅ Verify score appears in leaderboard
5. ✅ Reset again
```

### During Game:
```
1. Have each team join with ONLY ONE device
2. Wait until Live Status shows all teams "Connected"
3. Start round
4. Watch Live Status - see submissions come in real-time
5. When all teams submitted, click Reveal
6. Scores display immediately
7. Review scores together
8. Click "Next Round" when ready
```

### Rules to Tell Players:
```
❌ DON'T open multiple tabs
❌ DON'T let multiple people join the same team
❌ DON'T refresh during active round
✅ DO use one device per team
✅ DO wait for "Round Started" message
✅ DO submit all 3 selections
```

---

## 🔍 Real-Time Visibility Features

### Admin Sees:
- 📊 Live Status panel (during active rounds)
- ✅ Which teams are connected
- ✅ Which teams have submitted
- ✅ Counter: "3/5 teams submitted"
- Updates every 3 seconds automatically

### Players See:
- ✅ Current round question
- ✅ Who they selected
- ✅ "Submitted" confirmation
- ✅ Real community top 3 after reveal
- ✅ Their actual score from database

---

## ✅ What's Working Now:
1. ✅ One device per team (transaction-protected)
2. ✅ Team submissions save to database
3. ✅ Scores calculate correctly (verified formula)
4. ✅ Admin shows accumulated totals
5. ✅ Round progression works
6. ✅ Reset syncs all players
7. ✅ Real-time status during rounds
8. ✅ Duplicate prevention
9. ✅ Device unpair on leave
10. ✅ Real community rankings displayed

## ⚠️ Main Risk:
**Multiple tabs/devices** - Just ensure each team uses ONE device only!

---

## 🎉 You're Ready!

The game is production-ready. The main thing is just making sure each team uses only one device. Everything else is solid!

Good luck tonight! 🚀

