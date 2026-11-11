import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({ reason: z.string().trim().min(3, 'Give a reason (at least 3 characters) — it is kept in the audit trail').max(500) });

/** Every platform decision records a reason (audit trail, shown to the agent where relevant). */
export function ReasonDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
}) {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });
  useEffect(() => {
    if (!props.open) form.reset({ reason: '' });
  }, [props.open, form]);
  const error = form.formState.errors.reason?.message;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <form noValidate onSubmit={form.handleSubmit((v) => props.onConfirm(v.reason))} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            <DialogDescription>{props.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="admin-reason" className="text-xs font-medium">
              Reason
            </label>
            <Textarea id="admin-reason" aria-invalid={error ? true : undefined} aria-describedby={error ? 'admin-reason-error' : undefined} placeholder="Recorded in the audit trail" {...form.register('reason')} />
            {error && (
              <p id="admin-reason-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          {props.error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
              {props.error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              Back
            </Button>
            <Button type="submit" variant={props.destructive ? 'destructive' : 'default'} disabled={props.pending}>
              {props.pending ? 'Saving…' : props.confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
