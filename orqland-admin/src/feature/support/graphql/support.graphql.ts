import { gql } from 'graphql-request';

const TICKET = `id ticketNumber raisedByUserId raisedByName raisedByOrqUserId category subject description priority status assignedTeam relatedTaskNumber relatedEarningId relatedPeriodMonth resolvedAt createdAt updatedAt messageCount`;

export const SUPPORT_TICKETS = gql`query PlatformSupportTickets($filter: SupportTicketsFilterInput!) { platformSupportTickets(filter: $filter) { total items { ${TICKET} } } }`;
export const SUPPORT_TICKET = gql`query PlatformSupportTicket($ticketId: ID!) {
  platformSupportTicket(ticketId: $ticketId) { ${TICKET} messages { id authorRole authorName body attachmentUrls isInternal createdAt } }
}`;
export const REPLY_AS_SUPPORT = gql`mutation ReplyToSupportTicketAsSupport($input: ReplySupportTicketInput!) { replyToSupportTicketAsSupport(input: $input) { id } }`;
export const UPDATE_TICKET = gql`mutation UpdateSupportTicket($input: UpdateSupportTicketInput!) { updateSupportTicket(input: $input) { id status priority assignedTeam } }`;
