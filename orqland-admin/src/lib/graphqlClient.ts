// [HOST SHIM] Exists in the main codebase — do not copy.
// The real client uses the admin-token exchange flow. This harness sends `Bearer dev:<platform admin id>`.
import { GraphQLClient } from 'graphql-request';

const DEV_ADMIN_ID = '00000000-0000-4000-8000-000000000005';

export const graphqlClient = new GraphQLClient(import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql', {
  requestMiddleware: async (request) => {
    const headers = new Headers(request.headers as HeadersInit);
    headers.set('Authorization', `Bearer dev:${DEV_ADMIN_ID}`);
    return { ...request, headers };
  },
});
