import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deliveryAgentsService } from '../services/delivery-agents.service';
import type { AgentStatus } from '../types/delivery-agents.types';

export const deliveryAgentKeys = {
  all: ['delivery-agents'] as const,
  list: (statuses: AgentStatus[] | undefined, search: string, page: number) => ['delivery-agents', 'list', statuses, search, page] as const,
  detail: (userId: string) => ['delivery-agents', 'detail', userId] as const,
};

export const useDeliveryAgents = (statuses: AgentStatus[] | undefined, search: string, page: number) =>
  useQuery({
    queryKey: deliveryAgentKeys.list(statuses, search, page),
    queryFn: () => deliveryAgentsService.list({ statuses, search: search || undefined, page, pageSize: 25 }),
    placeholderData: keepPreviousData,
  });

export const useDeliveryAgent = (userId: string) => useQuery({ queryKey: deliveryAgentKeys.detail(userId), queryFn: () => deliveryAgentsService.get(userId) });

export function useDeliveryAgentAction<A extends 'decide' | 'suspend' | 'reinstate'>(action: A) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<(typeof deliveryAgentsService)[A]>[0]) => (deliveryAgentsService[action] as (i: typeof input) => Promise<unknown>)(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: deliveryAgentKeys.all }),
  });
}
