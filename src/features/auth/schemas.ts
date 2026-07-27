import { z } from 'zod';

const email = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .transform((value) => value.trim().toLowerCase());

/**
 * Password rules match the Supabase project defaults plus a complexity check.
 * Supabase enforces its own minimum server-side; this is the client mirror.
 */
const password = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Passwords are limited to 72 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().default(true),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const inviteUserSchema = z.object({
  email,
  fullName: z.string().min(2, 'Enter the person’s name').max(80),
  role: z.enum(['owner', 'admin', 'maintenance', 'mechanic', 'viewer']),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Enter your name').max(80),
  phone: z
    .string()
    .max(24)
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || /^[\d\s()+.-]{7,}$/.test(value), 'Enter a valid phone number'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/** Strength score 0–4 for the password meter. */
export function passwordStrength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: 'Empty' };
  let score = 0;
  if (value.length >= 10) score += 1;
  if (value.length >= 14) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  return { score, label: labels[score] };
}
