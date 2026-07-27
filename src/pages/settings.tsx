import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Monitor, Moon, Palette, Save, Sun, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/page-header';
import { PasswordField } from '@/features/auth/components/password-field';
import { PasswordStrength } from '@/features/auth/components/password-strength';
import { updateOwnProfile, updatePassword } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';
import {
  profileSchema,
  resetPasswordSchema,
  type ProfileInput,
  type ResetPasswordInput,
} from '@/features/auth/schemas';
import { useTheme } from '@/hooks/use-theme';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/permissions';
import { formatDateTime } from '@/lib/format';
import { initials, cn } from '@/lib/utils';
import type { ThemePreference } from '@/stores/theme.store';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Match system', icon: Monitor },
];

export default function SettingsPage() {
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const { theme, setTheme } = useTheme();
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  });

  const passwordForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    profileForm.reset({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' });
  }, [profile, profileForm]);

  async function saveProfile(values: ProfileInput) {
    try {
      await updateOwnProfile({ full_name: values.full_name, phone: values.phone || null });
      await refreshProfile();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your profile');
    }
  }

  async function savePassword(values: ResetPasswordInput) {
    setSavingPassword(true);
    try {
      await updatePassword(values.password);
      passwordForm.reset({ password: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change your password');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, appearance and account security." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <UserRound />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>
                Shown to teammates on work orders, uploads and the audit trail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                  <AvatarFallback className="text-base">
                    {initials(profile?.full_name ?? profile?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium">{profile?.full_name ?? profile?.email}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  {profile ? (
                    <Badge variant="neutral" title={ROLE_DESCRIPTIONS[profile.role]}>
                      {ROLE_LABELS[profile.role]}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <form
                onSubmit={profileForm.handleSubmit(saveProfile)}
                className="grid gap-4 sm:grid-cols-2"
                noValidate
              >
                <FormField
                  label="Full name"
                  htmlFor="full_name"
                  required
                  error={profileForm.formState.errors.full_name?.message}
                >
                  <Input id="full_name" {...profileForm.register('full_name')} />
                </FormField>
                <FormField
                  label="Phone"
                  htmlFor="phone"
                  error={profileForm.formState.errors.phone?.message}
                >
                  <Input id="phone" type="tel" {...profileForm.register('phone')} />
                </FormField>
                <div className="sm:col-span-2">
                  <Button type="submit" loading={profileForm.formState.isSubmitting}>
                    <Save />
                    Save profile
                  </Button>
                </div>
              </form>

              {profile ? (
                <p className="text-xs text-muted-foreground">
                  Account created {formatDateTime(profile.created_at)}
                  {profile.last_seen_at ? ` · last active ${formatDateTime(profile.last_seen_at)}` : ''}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Applies instantly and is remembered on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={theme === option.value}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all',
                      theme === option.value
                        ? 'border-primary bg-primary/5 shadow-glow'
                        : 'border-border hover:bg-secondary/60',
                    )}
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                      <option.icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-sm font-medium">{option.label}</span>
                    <span
                      className={cn(
                        'h-12 w-full rounded-lg border',
                        option.value === 'light' && 'border-zinc-200 bg-white',
                        option.value === 'dark' && 'border-zinc-800 bg-[hsl(222_47%_7%)]',
                        option.value === 'system' &&
                          'border-zinc-400 bg-gradient-to-r from-white to-[hsl(222_47%_7%)]',
                      )}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                You stay signed in on this device. Other sessions keep their tokens until they
                expire.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit(savePassword)}
                className="max-w-sm space-y-4"
                noValidate
              >
                <FormField
                  label="New password"
                  htmlFor="new_password"
                  required
                  error={passwordForm.formState.errors.password?.message}
                  hint="At least 10 characters with upper case, lower case and a number."
                >
                  <PasswordField
                    id="new_password"
                    autoComplete="new-password"
                    {...passwordForm.register('password')}
                  />
                </FormField>

                <PasswordStrength value={passwordForm.watch('password') ?? ''} />

                <FormField
                  label="Confirm password"
                  htmlFor="confirm_password"
                  required
                  error={passwordForm.formState.errors.confirmPassword?.message}
                >
                  <PasswordField
                    id="confirm_password"
                    autoComplete="new-password"
                    {...passwordForm.register('confirmPassword')}
                  />
                </FormField>

                <Button type="submit" loading={savingPassword}>
                  <KeyRound />
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
