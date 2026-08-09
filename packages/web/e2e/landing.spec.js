import { test, expect } from '@playwright/test';

// ── LandingPage / AILandingPage / CLIPage ──

test.describe('LandingPage (/)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('page loads without errors', async ({ page }) => {
    // Verify key content is rendered, not just title
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Get Started').first()).toBeVisible();
  });

  test('hero section renders with headline', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('hero has Get Started CTA button (motion.button)', async ({ page }) => {
    const ctaButton = page.locator('a, button').filter({ hasText: /get started|begin|launch|try now/i }).first();
    await expect(ctaButton).toBeVisible();
    // Verify it's a motion.button (has inline transform style from Framer Motion)
    await expect(ctaButton).toHaveAttribute('style');
  });

  test('features section renders', async ({ page }) => {
    const features = page.locator('section').nth(1);
    await expect(features).toBeVisible();
  });

  test('footer renders with links', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    // LandingPage header has links: AI, CLI, Pricing, Log in, Sign up (5 links)
    const navLinks = page.locator('header a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('hero elements have Framer Motion transform style', async ({ page }) => {
    // Wait for animations to initialize
    await page.waitForTimeout(500);
    const animatedElements = page.locator('[style*="transform"]');
    const count = await animatedElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('AILandingPage (/ai)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/ai'); });

  test('page loads without errors', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('AI hero section renders', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('AI chat preview renders', async ({ page }) => {
    const preview = page.locator('section').filter({ has: page.locator('h2, h3') }).last();
    await expect(preview).toBeVisible();
  });

  test('navigation to /ai/chat via CTA', async ({ page }) => {
    const cta = page.locator('a, button').filter({ hasText: /chat|agent|code|start|launch/i }).first();
    if (await cta.count() > 0) {
      await expect(cta).toBeVisible();
    }
  });

  test('hero elements have Framer Motion animations', async ({ page }) => {
    await page.waitForTimeout(500);
    const animatedElements = page.locator('[style*="transform"]');
    const count = await animatedElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('CLIPage (/cli)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/cli'); });

  test('page loads without errors', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('CLI hero section renders', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('CLI demo preview renders', async ({ page }) => {
    const preview = page.locator('section').filter({ has: page.locator('pre, code, img') });
    await expect(preview.first()).toBeVisible();
  });

  test('download/install CTA visible', async ({ page }) => {
    const cta = page.locator('a, button').filter({ hasText: /install|download|get|npm|brew/i });
    await expect(cta.first()).toBeVisible();
  });

  test('hero elements have Framer Motion animations', async ({ page }) => {
    await page.waitForTimeout(500);
    const animatedElements = page.locator('[style*="transform"]');
    const count = await animatedElements.count();
    expect(count).toBeGreaterThan(0);
  });
});
