import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { PasswordField } from '@/features/auth/components/password-field';
import { SetupRequired } from '@/features/auth/components/setup-required';
import { signIn } from '@/features/auth/api/auth.api';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/auth.store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ErrorState } from '@/components/common/error-state';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const remember = watch('remember');

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await signIn(values);
      await refreshProfile();
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
      setFormError(message);
    }
  }

  return (
    <AuthLayout
      title="Sign in to FleetOps"
      subtitle="Use the email address your account was created with."
      footer={
        <span>
          Need an account? Ask the fleet owner to invite you from the admin panel.
        </span>
      }
    >
      {!isSupabaseConfigured ? (
        <SetupRequired />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError ? <ErrorState title="Could not sign in" description={formError} className="p-4" /> : null}

          <FormField label="Email address" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              startIcon={<Mail />}
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            required
            action={
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            }
          >
            <PasswordField
              id="password"
              placeholder="Enter your password"
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => setValue('remember', checked === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
              Keep me signed in on this device
            </Label>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            {!isSubmitting ? <LogIn /> : null}
            Sign in
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Protected by role-based access control. Every sign-in is recorded in the audit log.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
