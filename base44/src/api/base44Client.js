import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6863dd8680008db44351af45", 
  requiresAuth: true // Ensure authentication is required for all operations
});
