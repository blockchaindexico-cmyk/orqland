import { createFileRoute } from '@tanstack/react-router';
import { DeliveryAgentsList } from '@/feature/deliveryAgents/components/DeliveryAgentsList';

export const Route = createFileRoute('/delivery-agents/')({ component: DeliveryAgentsList });
