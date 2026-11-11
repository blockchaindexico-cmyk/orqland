import { cn } from '@/lib/utils';
import { humanize } from '@/utils/format';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'muted';
const DOT: Record<Tone, string> = { neutral: 'bg-muted-foreground/60', info: 'bg-foreground', success: 'bg-success', warning: 'bg-warning', danger: 'bg-destructive', muted: 'bg-border' };

/** Consistent status label: neutral pill + dot + text (never colour alone). */
export function StatusPill({ status, tones, label }: { status: string; tones: Record<string, Tone>; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-text-secondary">
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[tones[status] ?? 'neutral'])} />
      {label ?? humanize(status)}
    </span>
  );
}
