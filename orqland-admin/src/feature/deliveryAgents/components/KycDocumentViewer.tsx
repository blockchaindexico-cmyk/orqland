import { useQueries } from '@tanstack/react-query';
import { FileLock2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { kycDocumentsService } from '../services/kyc-documents.service';

interface Doc {
  label: string;
  fileId: string | null;
}

/**
 * Licence front/back and RC images for the reviewer. Documents load only after an explicit click,
 * because each view is audited (guide §10: "View full KYC documents — only specifically authorised personnel").
 */
export function KycDocumentViewer({ documents }: { documents: Doc[] }) {
  const [revealed, setRevealed] = useState(false);
  const [zoom, setZoom] = useState<{ label: string; url: string } | null>(null);
  const available = documents.filter((d): d is Doc & { fileId: string } => !!d.fileId);
  const results = useQueries({
    queries: available.map((d) => ({ queryKey: ['kyc-document', d.fileId], queryFn: () => kycDocumentsService.load(d.fileId), enabled: revealed, staleTime: Infinity, retry: false })),
  });

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-labelledby="kyc-docs-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="kyc-docs-title" className="flex items-center gap-2 text-sm font-semibold">
            <FileLock2 className="size-4" /> Submitted documents
          </h2>
          <p className="text-xs text-muted-foreground">Visible to platform KYC reviewers only. Opening them is recorded in the audit log.</p>
        </div>
        {!revealed && available.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setRevealed(true)}>
            Show documents
          </Button>
        )}
      </div>
      {available.length === 0 ? (
        <p className="text-sm text-muted-foreground">No document images were uploaded with this application.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {available.map((d, i) => {
            const r = results[i];
            return (
              <figure key={d.fileId} className="space-y-1.5">
                <figcaption className="text-xs font-medium">{d.label}</figcaption>
                {!revealed ? (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">Hidden</div>
                ) : r?.isLoading ? (
                  <Skeleton className="aspect-[16/10] w-full" />
                ) : r?.error ? (
                  <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                    {(r.error as Error).message}
                  </p>
                ) : r?.data?.mimeType === 'application/pdf' ? (
                  <a href={r.data.url} target="_blank" rel="noreferrer" className="flex aspect-[16/10] items-center justify-center rounded-md border border-border text-sm underline">
                    Open PDF
                  </a>
                ) : r?.data ? (
                  <button type="button" onClick={() => setZoom({ label: d.label, url: r.data!.url })} className="block w-full overflow-hidden rounded-md border border-border focus-visible:outline-2 focus-visible:outline-foreground">
                    <img src={r.data.url} alt={d.label} className="aspect-[16/10] w-full object-cover" />
                  </button>
                ) : null}
              </figure>
            );
          })}
        </div>
      )}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{zoom?.label}</DialogTitle>
          {zoom && <img src={zoom.url} alt={zoom.label} className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
