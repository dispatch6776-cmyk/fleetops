import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { PasswordField } from '@/features/auth/components/password-field';
import { PasswordStrength } from '@/features/auth/components/password-strength';
import { updatePassword } from '@/features/auth/api/auth.api';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas';
import { getSupabase } from '@/lib/supabase';
import { ErrorState } from '@/components/common/error-state';
import { Spinner } from '@/components/ui/spinner';

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  // Supabase exchanges the emailed code for a recovery session on load.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLinkState('invalid');
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setLinkState(data.session ? 'valid' : 'invalid');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    try {
      await updatePassword(values.password);
      toast.success('Password updated — you are signed in.');
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update the password.');
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something you have not used elsewhere. You will stay signed in on this device."
      footer={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {linkState === 'checking' ? (
        <div className="flex justify-center py-8">
          <Spinner label="Verifying your reset link" />
        </div>
      ) : linkState === 'invalid' ? (
        <ErrorState
          title="This reset link is no longer valid"
          description="Reset links expire after one hour and can only be used once. Request a new one to continue."
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError ? <ErrorState title="Update failed" description={formError} className="p-4" /> : null}

          <FormField
            label="New password"
            htmlFor="password"
            error={errors.password?.message}
            required
            hint="At least 10 characters with upper case, lower case and a number."
          >
            <PasswordField
              id="password"
              autoComplete="new-password"
              autoFocus
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>

          <PasswordStrength value={password ?? ''} />

          <FormField
            label="Confirm new password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <PasswordField
              id="confirmPassword"
              autoComplete="new-password"
              invalid={Boolean(errors.confirmPassword)}
              {...register('confirmPassword')}
            />
          </FormField>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            {!isSubmitting ? <KeyRound /> : null}
            Update password
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Passwords are hashed with bcrypt and never stored in plain text.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
