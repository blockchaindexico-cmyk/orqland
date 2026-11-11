export const humanize = (value: string | null | undefined) => (value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

/** Readable message from graphql-request errors. */
export function gqlErrorMessage(error: unknown): string {
  const response = (error as { response?: { errors?: { message: string }[] } })?.response;
  return response?.errors?.[0]?.message ?? (error as Error)?.message ?? 'Something went wrong';
}
