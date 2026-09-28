import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const otpSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  otp: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export const permissionModeSchema = z.enum(['plan', 'build', 'edit', 'yolo']);

export const settingsPermissionsSchema = z.object({
  permissionMode: permissionModeSchema,
  autoApproveHighRisk: z.boolean(),
  allowShellAll: z.boolean(),
  requireEditApproval: z.boolean(),
  networkTimeout: z.number().int().min(30000).max(600000),
});

export const settingsAppearanceSchema = z.object({
  accentColor: z.enum(['emerald', 'blue', 'purple', 'amber', 'red', 'teal']),
  colorTheme: z.enum(['dark', 'light', 'system']),
});

export const settingsWatchDefaultsSchema = z.object({
  intervalMs: z.number().int().min(5000).max(120000),
  autoFix: z.boolean(),
});

export const settingsGodModeDefaultsSchema = z.object({
  concurrency: z.number().int().min(1).max(8),
  deployTarget: z.string(),
  skipTests: z.boolean(),
});

export const networkWhitelistDomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required').regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Enter a valid domain'),
});

export const apiKeySchema = z.object({
  providerId: z.string().min(1, 'Provider is required'),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SettingsPermissionsInput = z.infer<typeof settingsPermissionsSchema>;
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
