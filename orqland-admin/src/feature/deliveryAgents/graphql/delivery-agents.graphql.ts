import { gql } from 'graphql-request';

const AGENT = `phone email activeConnections completedDeliveries createdAt
  profile {
    userId orqUserId displayName agentStatus availability licenceNumberLast4 licenceStatus licenceValidTo licenceNextDueAt
    vehicleNumberMasked vehicleCategory vehicleStatus vehicleRcValidTo vehicleNextDueAt lastFailureReason suspendedReason activatedAt
    eligibleForAssignments kycAlerts licenceFrontFileId licenceBackFileId vehicleRcFileId verifications { id checkType trigger status mismatchFields requestedAt completedAt }
  }`;

export const PLATFORM_AGENTS = gql`query PlatformDeliveryAgents($filter: PlatformAgentsFilterInput!) { platformDeliveryAgents(filter: $filter) { total page pageSize items { ${AGENT} } } }`;
export const PLATFORM_AGENT = gql`query PlatformDeliveryAgent($userId: ID!) { platformDeliveryAgent(userId: $userId) { ${AGENT} } }`;
export const DECIDE_REVIEW = gql`mutation DecideDeliveryAgentReview($input: AdminReviewDecisionInput!) { decideDeliveryAgentReview(input: $input) { userId agentStatus } }`;
export const SUSPEND_AGENT = gql`mutation SuspendDeliveryAgent($input: AdminAgentActionInput!) { suspendDeliveryAgent(input: $input) { userId agentStatus } }`;
export const REINSTATE_AGENT = gql`mutation ReinstateDeliveryAgent($input: AdminAgentActionInput!) { reinstateDeliveryAgent(input: $input) { userId agentStatus } }`;
