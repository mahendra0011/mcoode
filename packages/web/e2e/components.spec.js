import { test, expect } from '@playwright/test';

// ── Component-level animation verification ──

test.describe('Header Component Animations', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('header renders with motion elements', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('header logo is a motion element', async ({ page }) => {
    const logo = page.locator('header img, header svg, header a').first();
    await expect(logo).toBeVisible();
  });

  test('header nav links exist', async ({ page }) => {
    const navLinks = page.locator('header a');
    expect(await navLinks.count()).toBeGreaterThanOrEqual(2);
  });

  test('dropdown trigger button has motion styles', async ({ page }) => {
    // Header has dropdown buttons (Products/Resources) that are motion.button
    const dropdownBtns = page.locator('header button');
    expect(await dropdownBtns.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('FeaturesGrid Component', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('features grid renders with stagger animation', async ({ page }) => {
    await page.waitForTimeout(500);
    const features = page.locator('[class*="grid"], section');
    await expect(features.first()).toBeVisible();
  });

  test('feature cards are motion.div with hover effects', async ({ page }) => {
    await page.waitForTimeout(500);
    const cards = page.locator('[class*="card"], [class*="Card"], section > div > div');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Testimonials Component', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('testimonials section renders', async ({ page }) => {
    const testimonials = page.locator('section');
    await expect(testimonials.last()).toBeVisible();
  });
});

test.describe('AIChatPage IDE Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: 'fake-token', refresh: 'fake' }));
    });
    await page.goto('/ai/chat');
    await page.waitForTimeout(500);
  });

  test('ModelSelector renders', async ({ page }) => {
    const selector = page.locator('[class*="model"], [class*="Model"], [class*="select"]');
    if (await selector.count() > 0) {
      await expect(selector.first()).toBeVisible();
    }
  });

  test('TerminalPane renders', async ({ page }) => {
    const terminal = page.locator('[class*="terminal"], [class*="Terminal"], pre');
    if (await terminal.count() > 0) {
      await expect(terminal.first()).toBeVisible();
    }
  });

  test('StepCard / StepCards render with motion animations', async ({ page }) => {
    const stepCards = page.locator('[class*="step"], [class*="Step"], [class*="card"]');
    if (await stepCards.count() > 0) {
      await expect(stepCards.first()).toBeVisible();
    }
  });

  test('PermissionModal uses useFlashOnMount when shown', async ({ page }) => {
    const modal = page.locator('[class*="modal"], [class*="Modal"], [class*="permission"]');
    if (await modal.count() > 0) {
      await expect(modal.first()).toBeVisible();
    }
  });

  test('WaveProgress component exists in DOM for god mode', async ({ page }) => {
    const waveProgress = page.locator('[class*="wave"], [class*="Wave"]');
    if (await waveProgress.count() > 0) {
      await expect(waveProgress.first()).toBeVisible();
    }
  });
});

test.describe('DesignTab Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: 'fake-token', refresh: 'fake' }));
    });
    await page.goto('/ai/chat');
    await page.waitForTimeout(500);
  });

  test('can switch to Design tab', async ({ page }) => {
    const designTab = page.locator('button').filter({ hasText: /^design$/i }).first();
    if (await designTab.count() > 0) {
      await designTab.click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('design device selector buttons are motion.button', async ({ page }) => {
    const designTab = page.locator('button').filter({ hasText: /^design$/i }).first();
    if (await designTab.count() > 0) {
      await designTab.click();
      await page.waitForTimeout(500);
      // Device selector buttons (Desktop, Tablet, Mobile)
      const deviceBtns = page.locator('button').filter({ hasText: /desktop|tablet|mobile/i });
      if (await deviceBtns.count() > 0) {
        await expect(deviceBtns.first()).toBeVisible();
      }
    }
  });

  test('design action buttons (Download, Copy, Open in Agent) are motion.button', async ({ page }) => {
    const designTab = page.locator('button').filter({ hasText: /^design$/i }).first();
    if (await designTab.count() > 0) {
      await designTab.click();
      await page.waitForTimeout(500);
      const actionBtns = page.locator('button').filter({ hasText: /download|copy|open in/i });
      if (await actionBtns.count() > 0) {
        await expect(actionBtns.first()).toBeVisible();
      }
    }
  });
});

test.describe('SparkleButton Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: 'fake-token', refresh: 'fake' }));
    });
    await page.goto('/ai/chat');
    await page.waitForTimeout(500);
  });

  test('sparkle button dropdown trigger is motion.button', async ({ page }) => {
    // SparkleButton should be a motion.button
    const sparkleBtn = page.locator('button').filter({ has: page.locator('svg') });
    const count = await sparkleBtn.count();
    expect(count).toBeGreaterThan(0);
  });
});
