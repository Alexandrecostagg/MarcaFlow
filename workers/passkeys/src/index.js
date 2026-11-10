import { firebasePasskeyRoute } from './security/firebase.mjs';
import { withBrowserPolicy } from './security/browser-policy.mjs';
export { PasskeyState } from './security/durable-store.mjs';
export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith('/auth/passkeys/')) {
      return withBrowserPolicy(new Response('Not Found', { status: 404 }));
    }
    return withBrowserPolicy(await firebasePasskeyRoute(request, env, {
      projectId: env.FIREBASE_PROJECT_ID,
      credential: env.PASSKEY_FIREBASE_SERVICE_ACCOUNT,
    }));
  },
};
