import { Link } from '@tanstack/react-router';
import { ArrowLeft, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeliveryAgent, useDeliveryAgentAction } from '../hooks/useDeliveryAgents';
import { KycDocumentViewer } from './KycDocumentViewer';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { StatusPill } from '@/components/ui/status-pill';
import { formatDate, formatDateTime, gqlErrorMessage, humanize } from '@/utils/format';
import { AGENT_STATUS_TONE, CHECK_TONE } from '../types/status-tones';

type Decision = 'approve' | 'reject' | 'suspend' | 'reinstate';

const MISMATCH_LABEL: Record<string, string> = {
  holder_name: 'Name on the licence differs from the Orqland profile name',
  vehicle_category: 'Declared vehicle type differs from the registration record',
};

/** One agent: verification evidence (redacted), history and platform decisions. */
export function DeliveryAgentReview({ userId }: { userId: string }) {
  const { data: agent } = useDeliveryAgent(userId);
  const decide = useDeliveryAgentAction('decide');
  const suspend = useDeliveryAgentAction('suspend');
  const reinstate = useDeliveryAgentAction('reinstate');
  const [decision, setDecision] = useState<Decision | null>(null);
  if (!agent) return <Skeleton className="h-96 w-full" />;
  const p = agent.profile;
  const mutation = decision === 'suspend' ? suspend : decision === 'reinstate' ? reinstate : decide;
  const mismatches = [...new Set(p.verifications.flatMap((v) => v.mismatchFields))];

  const confirm = (reason: string) => {
    const done = { onSuccess: () => setDecision(null) };
    if (decision === 'approve' || decision === 'reject') decide.mutate({ userId, approve: decision === 'approve', reason }, done);
    else if (decision === 'suspend') suspend.mutate({ userId, reason }, done);
    else if (decision === 'reinstate') reinstate.mutate({ userId, reason }, done);
  };

  const dialogs: Record<Decision, { title: string; description: string; confirm: string; destructive?: boolean }> = {
    approve: { title: 'Approve this agent?', description: 'Only approve after confirming the mismatch with supporting evidence. The agent gets the Delivery Agent role immediately.', confirm: 'Approve' },
    reject: { title: 'Reject this application?', description: 'The Orqland account is not affected. The agent can correct the details and apply again.', confirm: 'Reject', destructive: true },
    suspend: { title: 'Suspend this agent platform-wide?', description: 'The agent goes offline, open offers are withdrawn and no new deliveries are offered. Active deliveries can be completed.', confirm: 'Suspend', destructive: true },
    reinstate: { title: 'Reinstate this agent?', description: 'Status returns to Active if verification is still valid, otherwise KYC blocked.', confirm: 'Reinstate' },
  };

  return (
    <div className="max-w-5xl space-y-6">
      <Link to="/delivery-agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Delivery agents
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          {p.eligibleForAssignments ? <ShieldCheck className="size-8 text-success" /> : <ShieldAlert className="size-8 text-warning" />}
          <div>
            <h1 className="text-xl font-semibold">{p.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{p.orqUserId}</span> · {agent.phone ?? 'no phone'} · {agent.email ?? 'no email'}
            </p>
            <div className="mt-1 flex gap-2">
              <StatusPill status={p.agentStatus} tones={AGENT_STATUS_TONE} />
              <span className="text-xs text-muted-foreground">
                {agent.activeConnections} workspaces · {agent.completedDeliveries} delivered · applied {formatDate(agent.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {p.agentStatus === 'MANUAL_REVIEW' && (
            <>
              <Button onClick={() => setDecision('approve')}>Approve</Button>
              <Button variant="outline" onClick={() => setDecision('reject')}>Reject</Button>
            </>
          )}
          {p.agentStatus === 'SUSPENDED' && <Button onClick={() => setDecision('reinstate')}>Reinstate</Button>}
          {['ACTIVE', 'KYC_BLOCKED'].includes(p.agentStatus) && (
            <Button variant="destructive" onClick={() => setDecision('suspend')}>Suspend</Button>
          )}
        </div>
      </div>

      {(p.lastFailureReason || p.suspendedReason || mismatches.length > 0) && (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
          {mismatches.map((m) => <p key={m}>• {MISMATCH_LABEL[m] ?? humanize(m)}</p>)}
          {p.lastFailureReason && <p className="text-muted-foreground">{p.lastFailureReason}</p>}
          {p.suspendedReason && <p>Suspended: {p.suspendedReason}</p>}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: 'Driving licence', status: p.licenceStatus, doc: `•••• ${p.licenceNumberLast4}`, validTo: p.licenceValidTo, due: p.licenceNextDueAt },
          { label: 'Vehicle registration', status: p.vehicleStatus, doc: `${humanize(p.vehicleCategory)} · ${p.vehicleNumberMasked}`, validTo: p.vehicleRcValidTo, due: p.vehicleNextDueAt },
        ].map((c) => (
          <div key={c.label} className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.label}</p>
              <StatusPill status={c.status} tones={CHECK_TONE} />
            </div>
            <p className="flex justify-between"><span className="text-muted-foreground">Document</span><span className="font-mono text-xs">{c.doc}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Valid until</span>{formatDate(c.validTo)}</p>
            <p className="flex justify-between"><span className="text-muted-foreground">Next re-verification</span>{formatDate(c.due)}</p>
          </div>
        ))}
      </div>

      <KycDocumentViewer
        documents={[
          { label: 'Licence — front', fileId: p.licenceFrontFileId },
          { label: 'Licence — back', fileId: p.licenceBackFileId },
          { label: 'Registration certificate', fileId: p.vehicleRcFileId },
        ]}
      />

      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Verification history</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
          {p.verifications.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span>
                {v.checkType === 'DRIVING_LICENCE' ? 'Licence' : 'Vehicle'} · {humanize(v.trigger)}
                {v.mismatchFields.length > 0 && <span className="text-warning"> · mismatch: {v.mismatchFields.join(', ')}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{formatDateTime(v.requestedAt)}</span>
                <StatusPill status={v.status} tones={CHECK_TONE} />
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Licence and vehicle numbers are encrypted at rest and never displayed in full.</p>
      </div>

      {decision && (
        <ReasonDialog
          open
          onOpenChange={(o) => !o && setDecision(null)}
          title={dialogs[decision].title}
          description={dialogs[decision].description}
          confirmLabel={dialogs[decision].confirm}
          destructive={dialogs[decision].destructive}
          pending={mutation.isPending}
          error={mutation.error ? gqlErrorMessage(mutation.error) : null}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
