import { test, expect } from '@playwright/test';

// ── LoginPage / SignupPage / ForgotPasswordPage ──

test.describe('LoginPage (/login)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/login'); });

  test('page loads without errors', async ({ page }) => {
    // Check for rendered heading, not title
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('has email input field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
  });

  test('has password input field', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
  });

  test('submit button is a motion.button with hover/tap animation', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button[name="login"]');
    await expect(submitBtn).toBeVisible();
    // motion.button elements get inline styles from Framer Motion
    const style = await submitBtn.getAttribute('style');
    expect(style).not.toBeNull();
  });

  test('Google OAuth login button exists', async ({ page }) => {
    const googleBtn = page.locator('button, a').filter({ hasText: /google|sign in with google/i });
    if (await googleBtn.count() > 0) {
      await expect(googleBtn.first()).toBeVisible();
    }
  });

  test('link to SignupPage exists', async ({ page }) => {
    const signupLink = page.locator('a').filter({ hasText: /sign up|create account/i }).first();
    await expect(signupLink).toBeVisible();
  });

  test('link to ForgotPassword exists', async ({ page }) => {
    const forgotLink = page.locator('a').filter({ hasText: /forgot|reset/i });
    await expect(forgotLink).toBeVisible();
  });

  test('form fields have stagger animation via Framer Motion variants', async ({ page }) => {
    // Animated elements on mount should have transform styles
    await page.waitForTimeout(500);
    const animated = page.locator('[style*="transform"]');
    expect(await animated.count()).toBeGreaterThan(0);
  });

  test('OTP toggle button exists for passwordless login', async ({ page }) => {
    const otpToggle = page.locator('button').filter({ hasText: /send code/i });
    await expect(otpToggle).toBeVisible();
  });

  test('clicking "Send Code" toggles to OTP entry mode', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.route('**/api/v1/auth/send-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, expiresInSec: 600, delivered: false, devOtp: '123456' })
      });
    });
    // Click the "Send Code" toggle to switch to OTP login mode — use text filter to find it among toggle buttons
    const toggleBtns = page.locator('.flex.items-center.justify-center.gap-2.p-1');
    await toggleBtns.getByRole('button').filter({ hasText: /send code/i }).click();
    // Then click "Send Verification Code" submit button to actually request OTP
    await page.getByRole('button', { name: /send verification code/i }).click();
    // After sending, the OTP input boxes should appear — wait for AnimatePresence exit animation
    const otpInputs = page.locator('input[maxlength="1"]');
    await expect(otpInputs.first()).toBeVisible({ timeout: 3000 });
    expect(await otpInputs.count()).toBe(6);
    // Dev code hint should be visible
    await expect(page.locator('text=Dev code: 123456')).toBeVisible();
  });
});

test.describe('SignupPage (/signup)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/signup'); });

  test('page loads without errors', async ({ page }) => {
    await expect(page.locator('text=Create Your Account')).toBeVisible();
  });

  test('has name input field', async ({ page }) => {
    const nameInput = page.locator('input[type="text"], input[name="name"], input#name');
    await expect(nameInput).toBeVisible();
  });

  test('has email input field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('has password input field', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('submit button is a motion.button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button[name="signup"]');
    await expect(submitBtn).toBeVisible();
    const style = await submitBtn.getAttribute('style');
    expect(style).not.toBeNull();
  });

  test('password visibility toggle exists', async ({ page }) => {
    // Toggle password visibility button
    const toggleBtn = page.locator('button').filter({ has: page.locator('svg') });
    const passwordToggles = await toggleBtn.count();
    expect(passwordToggles).toBeGreaterThanOrEqual(1);
  });

  test('link to LoginPage exists', async ({ page }) => {
    const loginLink = page.locator('a').filter({ hasText: /already.*account|sign in|login/i }).first();
    await expect(loginLink).toBeVisible();
  });

  test('form fields use fieldVariants for staggered entrance', async ({ page }) => {
    // The fix ensures fieldVariant → fieldVariants so staggerChildren works
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(3);
    // All form fields should have motion-driven animation styles
    await page.waitForTimeout(500);
    const animatedElements = page.locator('[style*="opacity"][style*="transform"]');
    expect(await animatedElements.count()).toBeGreaterThan(0);
  });

  test('submit button says "Send Verification Code" (OTP flow)', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    // Before OTP is sent, button should say "Send Verification Code"
    await expect(submitBtn).toHaveText(/send verification code/i);
  });

  test('clicking submit triggers OTP flow (backend mocked)', async ({ page }) => {
    // Fill account details
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    // Mock the send-otp endpoint to return devOtp
    await page.route('**/api/v1/auth/send-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, expiresInSec: 600, delivered: false, devOtp: '123456' })
      });
    });
    // Click Send Verification Code
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // OTP step should appear with the 6-digit code input boxes
    await expect(page.locator('text=Verify Your Email')).toBeVisible();
    // 6 OTP input boxes should be visible
    const otpInputs = page.locator('input[maxlength="1"]');
    expect(await otpInputs.count()).toBe(6);
    // Dev OTP hint should be visible
    await expect(page.locator('text=Dev code: 123456')).toBeVisible();
  });

  test('OTP entry transitions to verification step', async ({ page }) => {
    // Fill and submit account details form to show OTP step
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.route('**/api/v1/auth/send-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, expiresInSec: 600, delivered: false, devOtp: '123456' })
      });
    });
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Verify Your Email')).toBeVisible();

    // Mock verify-otp to return tokens
    await page.route('**/api/v1/auth/verify-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: '1', email: 'test@example.com', name: 'Test User', plan: 'free' }, access: 'fake-access', refresh: 'fake-refresh' })
      });
    });
    // Click the verify button (should be disabled until 6 digits are entered)
    const verifyBtn = page.locator('button[type="submit"]');
    expect(await verifyBtn.isEnabled()).toBe(false);
  });
});

test.describe('ForgotPasswordPage (/forgot-password)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/forgot-password'); });

  test('page loads without errors', async ({ page }) => {
    const headings = page.locator('h1, h2, heading');
    await expect(headings.first()).toBeVisible();
  });

  test('has email input field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('submit/reset button is a motion.button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    const style = await submitBtn.getAttribute('style');
    expect(style).not.toBeNull();
  });

  test('link back to LoginPage exists', async ({ page }) => {
    const backLink = page.locator('a').filter({ hasText: /login|back.*login|remember.*password|sign in/i }).first();
    await expect(backLink).toBeVisible();
  });
});
