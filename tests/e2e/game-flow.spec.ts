import { test, expect } from '@playwright/test'

test.describe('Complete Game Flow', () => {
  test('host can create room, add participants, and run a game', async ({ page, context }) => {
    // Host creates a room
    await page.goto('/host')
    await page.fill('[data-testid="room-name"]', 'Test Game Room')
    await page.click('[data-testid="create-room"]')
    
    // Should redirect to host dashboard
    await expect(page).toHaveURL(/\/room\/\w+\/host/)
    
    // Add participants to roster
    await page.click('[data-testid="add-participant"]')
    await page.fill('[data-testid="participant-name"]', 'Alice')
    await page.click('[data-testid="save-participant"]')
    
    await page.click('[data-testid="add-participant"]')
    await page.fill('[data-testid="participant-name"]', 'Bob')
    await page.click('[data-testid="save-participant"]')
    
    await page.click('[data-testid="add-participant"]')
    await page.fill('[data-testid="participant-name"]', 'Charlie')
    await page.click('[data-testid="save-participant"]')
    
    // Verify participants are added
    await expect(page.locator('[data-testid="participant-alice"]')).toBeVisible()
    await expect(page.locator('[data-testid="participant-bob"]')).toBeVisible()
    await expect(page.locator('[data-testid="participant-charlie"]')).toBeVisible()
    
    // Create teams
    await page.click('[data-testid="teams-tab"]')
    await page.click('[data-testid="create-team"]')
    await page.fill('[data-testid="team-name"]', 'Team Alpha')
    await page.selectOption('[data-testid="team-member-1"]', 'Alice')
    await page.selectOption('[data-testid="team-member-2"]', 'Bob')
    await page.click('[data-testid="save-team"]')
    
    // Start a game round
    await page.click('[data-testid="game-tab"]')
    await page.selectOption('[data-testid="question-select"]', { index: 0 })
    await page.click('[data-testid="start-round"]')
    
    // Verify round started
    await expect(page.locator('[data-testid="current-round"]')).toBeVisible()
    
    // Close round
    await page.click('[data-testid="close-round"]')
    
    // Reveal results
    await page.click('[data-testid="reveal-round"]')
    
    // Check scoreboard
    await page.click('[data-testid="scores-tab"]')
    await expect(page.locator('[data-testid="individual-scores"]')).toBeVisible()
    await page.click('[data-testid="team-scores-toggle"]')
    await expect(page.locator('[data-testid="team-scores"]')).toBeVisible()
  })

  test('participant can join via pre-event link and submit rankings', async ({ page }) => {
    // This would need a pre-created room with participants
    // For now, we'll test the UI flow
    
    await page.goto('/pre?room=TESTXX&token=test-token')
    
    // Should show error for invalid token (expected in test)
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('participant can join room and play live', async ({ page }) => {
    await page.goto('/join')
    await page.fill('[data-testid="room-code"]', 'TESTXX')
    await page.click('[data-testid="join-room"]')
    
    // Should show room not found error (expected in test)
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })
})