import { ENGINE_ORIGIN, getAuthorizationHeader } from '@/lib/authToken';

export interface LoadedDocument {
  url: string;
  mimeType: string;
}

/**
 * KYC documents are served only by the engine (GET /delivery/files/:id) to the owner and platform
 * reviewers; every reviewer view is written to the audit log.
 */
export const kycDocumentsService = {
  async load(fileId: string): Promise<LoadedDocument> {
    const res = await fetch(`${ENGINE_ORIGIN}/delivery/files/${fileId}`, { headers: { Authorization: await getAuthorizationHeader() } });
    if (res.status === 403) throw new Error('Your role cannot view KYC documents');
    if (res.status === 404) throw new Error('The document was removed');
    if (!res.ok) throw new Error(`The document could not be loaded (${res.status})`);
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), mimeType: blob.type };
  },
};
