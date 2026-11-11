// [HOST SHIM] Exists in the main codebase — do not copy.
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ beforeLoad: () => redirect({ to: '/delivery-agents' }) });
