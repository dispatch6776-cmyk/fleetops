import { passwordStrength } from '../schemas';
import { cn } from '@/lib/utils';

const TONES = [
  'bg-muted',
  'bg-danger',
  'bg-warning',
  'bg-info',
  'bg-success',
];

export function PasswordStrength({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              step <= score ? TONES[score] : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{label}</span>
      </p>
    </div>
  );
}
