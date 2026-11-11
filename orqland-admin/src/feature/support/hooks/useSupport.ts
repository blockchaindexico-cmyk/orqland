import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supportService } from '../services/support.service';

export const supportKeys = { all: ['support'] as const };

export const useSupportTickets = (statuses: string[] | undefined, category: string, search: string, page: number) =>
  useQuery({
    queryKey: ['support', 'list', statuses, category, search, page],
    queryFn: () => supportService.list({ statuses, categories: category ? [category] : undefined, search: search || undefined, page, pageSize: 25 }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

export const useSupportTicket = (ticketId: string) =>
  useQuery({ queryKey: ['support', 'detail', ticketId], queryFn: () => supportService.get(ticketId), refetchInterval: 20_000 });

export function useSupportAction<A extends 'reply' | 'update'>(action: A) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<(typeof supportService)[A]>[0]) => (supportService[action] as (i: typeof input) => Promise<unknown>)(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
