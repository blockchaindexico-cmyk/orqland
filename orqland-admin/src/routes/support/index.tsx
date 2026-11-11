import { createFileRoute } from '@tanstack/react-router';
import { SupportQueue } from '@/feature/support/components/SupportQueue';

export const Route = createFileRoute('/support/')({ component: SupportQueue });
