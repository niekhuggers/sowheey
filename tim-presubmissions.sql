-- Tim's Pre-Submissions for All Questions
-- Run this SQL on your Vercel PostgreSQL database

-- First, get the necessary IDs
-- You'll need to replace these with your actual IDs from the database

-- Get participant IDs (run first to get these values):
-- SELECT id, name FROM "Participant" WHERE "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024') ORDER BY name;

-- Get question IDs (run first to get these values):
-- SELECT id, text, sortOrder FROM "Question" WHERE "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024') ORDER BY sortOrder;

-- Then use this template, replacing the IDs:

-- Delete existing pre-submissions for Tim first
DELETE FROM "PreSubmission" 
WHERE "participantId" = (
  SELECT id FROM "Participant" 
  WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')
);

-- Insert Tim's answers
-- Question 1: Wie gaan nooit trouwen? → Stijn, Keith, Tim
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 0 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Keith' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 2: Wie heeft de minste ambitie? → Maurits, Stijn, Keith
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 1 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Maurits' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Keith' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 3: Wie zegt het vaakst last minute af? → Maurits, Casper, Thijs
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 2 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Maurits' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Casper' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Thijs' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 4: Wie zijn gedoemd om irritante kinderen te krijgen? → Tijn, Stijn, Joep
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 3 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Tijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 5: Wie belanden later in de gevangenis? → Joep, Stijn, Niek
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 4 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Niek' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 6: Wie denken dat ze slim zijn, maar zijn het niet? → Keith, Stijn, Tijn
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 5 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Keith' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Tijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 7: Wie zijn het irritantst als ze dronken zijn? → Keith, Maurits, Joep
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 6 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Keith' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Maurits' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 8: Wie verlaat altijd als laatste het huis? → Merijn, Keith, Niek
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 7 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Merijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Keith' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Niek' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 9: Wie heeft het grootste ego zonder reden? → Stijn, Joep, Tim
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 8 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 10: Wie gebruikt het meeste drugs? → Niek, Stijn, Sunny
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 9 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Niek' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Sunny' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 11: Wie zou stand-up comedian kunnen zijn? → Joep, Casper, Rutger
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 10 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Casper' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Rutger' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 12: Wie trouwt met een veel jongere partner? → Joep, Stijn, Tijn
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 11 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Stijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Tijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 13: Wie zou je peetoom van je kind maken? → Yanick, Maurits, Merijn
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 12 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Yanick' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Maurits' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Merijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 14: Wie poept het meest? → Tijn, Casper, Joep
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 13 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Tijn' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Casper' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Joep' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Question 15: FMK: Aylin, Keone, Ceana → Ceana, Aylin, Keone (F, M, K)
-- Note: For FMK, we need to create special participant records or use existing ones
-- This assumes Aylin, Keone, Ceana are in the Participant table
INSERT INTO "PreSubmission" (
  id, "roomId", "participantId", "questionId", 
  "rank1ParticipantId", "rank2ParticipantId", "rank3ParticipantId",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM "Room" WHERE code = 'WEEKEND2024'),
  (SELECT id FROM "Participant" WHERE name = 'Tim' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Question" WHERE "sortOrder" = 14 AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Ceana' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Aylin' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  (SELECT id FROM "Participant" WHERE name = 'Keone' AND "roomId" = (SELECT id FROM "Room" WHERE code = 'WEEKEND2024')),
  NOW(),
  NOW()
);

-- Verify Tim's submissions
SELECT 
  p.name as person,
  q.text as question,
  q.sortOrder,
  p1.name as rank1,
  p2.name as rank2,
  p3.name as rank3
FROM "PreSubmission" ps
JOIN "Participant" p ON ps."participantId" = p.id
JOIN "Question" q ON ps."questionId" = q.id
JOIN "Participant" p1 ON ps."rank1ParticipantId" = p1.id
JOIN "Participant" p2 ON ps."rank2ParticipantId" = p2.id
JOIN "Participant" p3 ON ps."rank3ParticipantId" = p3.id
WHERE p.name = 'Tim'
ORDER BY q.sortOrder;

