import { Link } from '@tanstack/react-router';
import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/ui/status-pill';
import { formatDateTime, gqlErrorMessage, humanize } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useSupportAction, useSupportTicket } from '../hooks/useSupport';
import { SUPPORT_TEAMS, TICKET_PRIORITIES, TICKET_STATUSES } from '../types/support.types';
import { PRIORITY_TONE, TICKET_STATUS_TONE } from './SupportTicketColumns';

export function SupportTicketDetail({ ticketId }: { ticketId: string }) {
  const { data: t } = useSupportTicket(ticketId);
  const reply = useSupportAction('reply');
  const update = useSupportAction('update');
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  if (!t) return <Skeleton className="h-96 w-full" />;
  const select = 'h-9 w-full rounded-md border border-input bg-card px-2 text-sm';

  return (
    <div className="max-w-6xl space-y-5">
      <Link to="/support" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Support
      </Link>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{t.subject}</h1>
              <StatusPill status={t.status} tones={TICKET_STATUS_TONE} />
              <StatusPill status={t.priority} tones={PRIORITY_TONE} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{t.ticketNumber}</span> · {humanize(t.category)} · {t.raisedByName} (<span className="font-mono">{t.raisedByOrqUserId}</span>) · {formatDateTime(t.createdAt)}
            </p>
            {(t.relatedTaskNumber || t.relatedEarningId || t.relatedPeriodMonth) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Linked: {[t.relatedTaskNumber && `delivery ${t.relatedTaskNumber}`, t.relatedEarningId && 'earning (under review)', t.relatedPeriodMonth && `statement ${t.relatedPeriodMonth}`].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap text-sm">{t.description}</p>
          </div>

          <div className="space-y-3">
            {t.messages?.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'rounded-lg border px-4 py-3 text-sm',
                  m.isInternal ? 'border-dashed border-warning/60 bg-warning/5' : m.authorRole === 'AGENT' ? 'border-border bg-card' : 'border-foreground/20 bg-muted/60',
                )}
              >
                <p className="mb-1 text-xs text-muted-foreground">
                  {m.isInternal ? 'Internal note · ' : ''}
                  {m.authorName ?? humanize(m.authorRole)} · {formatDateTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.attachmentUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="block truncate text-xs underline">{u}</a>
                ))}
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={internal ? 'Internal note (not visible to the agent)' : 'Reply to the agent'} />
            {reply.error && <p className="text-sm text-destructive">{gqlErrorMessage(reply.error)}</p>}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note
              </label>
              <Button disabled={!body.trim() || reply.isPending} onClick={() => reply.mutate({ ticketId, body: body.trim(), internal }, { onSuccess: () => setBody('') })}>
                <Send /> {internal ? 'Add note' : 'Send reply'}
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-border bg-card p-4 lg:self-start">
          <label className="block space-y-1 text-xs font-medium text-text-secondary">
            Status
            <select className={select} value={t.status} onChange={(e) => update.mutate({ ticketId, status: e.target.value })}>
              {TICKET_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-text-secondary">
            Priority
            <select className={select} value={t.priority} onChange={(e) => update.mutate({ ticketId, priority: e.target.value })}>
              {TICKET_PRIORITIES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-text-secondary">
            Team
            <select className={select} value={t.assignedTeam ?? ''} onChange={(e) => update.mutate({ ticketId, assignedTeam: e.target.value })}>
              <option value="">Unassigned</option>
              {SUPPORT_TEAMS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </label>
          {update.error && <p className="text-sm text-destructive">{gqlErrorMessage(update.error)}</p>}
          {t.relatedEarningId && <p className="text-xs text-muted-foreground">Earnings dispute: the workspace re-approves the earning from Delivery → Costs once agreed.</p>}
          {t.resolvedAt && <p className="text-xs text-muted-foreground">Resolved {formatDateTime(t.resolvedAt)}</p>}
        </aside>
      </div>
    </div>
  );
}
