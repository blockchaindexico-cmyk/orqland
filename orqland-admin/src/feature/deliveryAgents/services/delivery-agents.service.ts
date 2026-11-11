import { graphqlClient } from '@/lib/graphqlClient';
import * as Q from '../graphql/delivery-agents.graphql';
import type { AgentStatus, PlatformAgent } from '../types/delivery-agents.types';

export const deliveryAgentsService = {
  async list(filter: { statuses?: AgentStatus[]; search?: string; page: number; pageSize: number }) {
    return (await graphqlClient.request<{ platformDeliveryAgents: { items: PlatformAgent[]; total: number } }>(Q.PLATFORM_AGENTS, { filter })).platformDeliveryAgents;
  },
  async get(userId: string): Promise<PlatformAgent> {
    return (await graphqlClient.request<{ platformDeliveryAgent: PlatformAgent }>(Q.PLATFORM_AGENT, { userId })).platformDeliveryAgent;
  },
  decide: (input: { userId: string; approve: boolean; reason: string }) => graphqlClient.request(Q.DECIDE_REVIEW, { input }),
  suspend: (input: { userId: string; reason: string }) => graphqlClient.request(Q.SUSPEND_AGENT, { input }),
  reinstate: (input: { userId: string; reason: string }) => graphqlClient.request(Q.REINSTATE_AGENT, { input }),
};
