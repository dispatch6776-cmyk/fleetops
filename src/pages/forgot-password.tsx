import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { SetupRequired } from '@/features/auth/components/setup-required';
import { sendPasswordReset } from '@/features/auth/api/auth.api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schemas';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ErrorState } from '@/components/common/error-state';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    try {
      await sendPasswordReset(values.email);
      setSentTo(values.email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send the reset email.');
    }
  }

  return (
    <AuthLayout
      title={sentTo ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        sentTo
          ? 'If an account exists for that address, a reset link is on its way.'
          : 'Enter your email and we will send you a secure link to choose a new password.'
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to sign in
        </Link>
      }
    >
      {!isSupabaseConfigured ? (
        <SetupRequired />
      ) : sentTo ? (
        <div className="space-y-4 rounded-xl border border-success/40 bg-success-soft/50 p-5">
          <div className="flex items-center gap-2 text-success">
            <MailCheck className="size-5" aria-hidden />
            <p className="text-sm font-semibold">Reset link sent</p>
          </div>
          <p className="text-sm text-muted-foreground">
            We sent instructions to <span className="font-medium text-foreground">{sentTo}</span>.
            The link expires in one hour. Check your spam folder if it does not arrive within a few
            minutes.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSentTo(null)}>
            Use a different address
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError ? <ErrorState title="Request failed" description={formError} className="p-4" /> : null}

          <FormField label="Email address" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            {!isSubmitting ? <Send /> : null}
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
