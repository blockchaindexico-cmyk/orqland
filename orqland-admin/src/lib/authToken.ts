// [HOST SHIM] Integration point — return the admin bearer token from your admin-token exchange flow.
// Used for the engine's REST document route (GraphQL already goes through graphqlClient).
const DEV_ADMIN_ID = '00000000-0000-4000-8000-000000000005';

export async function getAuthorizationHeader(): Promise<string> {
  return `Bearer dev:${DEV_ADMIN_ID}`;
}

export const ENGINE_ORIGIN = (import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql').replace(/\/graphql\/?$/, '');
