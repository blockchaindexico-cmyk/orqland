import { createFileRoute } from '@tanstack/react-router';
import { SupportTicketDetail } from '@/feature/support/components/SupportTicketDetail';

export const Route = createFileRoute('/support/$ticketId')({
  component: function SupportTicketRoute() {
    const { ticketId } = Route.useParams();
    return <SupportTicketDetail ticketId={ticketId} />;
  },
});
