import { graphqlClient } from '@/lib/graphqlClient';
import * as Q from '../graphql/support.graphql';
import type { SupportTicket } from '../types/support.types';

export const supportService = {
  async list(filter: { statuses?: string[]; categories?: string[]; search?: string; page: number; pageSize: number }) {
    return (await graphqlClient.request<{ platformSupportTickets: { items: SupportTicket[]; total: number } }>(Q.SUPPORT_TICKETS, { filter })).platformSupportTickets;
  },
  async get(ticketId: string): Promise<SupportTicket> {
    return (await graphqlClient.request<{ platformSupportTicket: SupportTicket }>(Q.SUPPORT_TICKET, { ticketId })).platformSupportTicket;
  },
  reply: (input: { ticketId: string; body: string; internal: boolean }) => graphqlClient.request(Q.REPLY_AS_SUPPORT, { input }),
  update: (input: { ticketId: string; status?: string; priority?: string; assignedTeam?: string }) => graphqlClient.request(Q.UPDATE_TICKET, { input }),
};
