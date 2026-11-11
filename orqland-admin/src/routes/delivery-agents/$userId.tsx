import { createFileRoute } from '@tanstack/react-router';
import { DeliveryAgentReview } from '@/feature/deliveryAgents/components/DeliveryAgentReview';

export const Route = createFileRoute('/delivery-agents/$userId')({
  component: function DeliveryAgentRoute() {
    const { userId } = Route.useParams();
    return <DeliveryAgentReview userId={userId} />;
  },
});
