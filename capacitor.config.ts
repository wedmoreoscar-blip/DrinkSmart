import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drinksmart.app',
  appName: 'DrinkSmart',
  webDir: 'dist',
  server: {
    // A native build serves the bundled `dist` from the webview, so there is no
    // `url` here and there must never be one: pointing a shipped app at a dev
    // server is how a build ends up depending on a machine that is not the
    // user's. `cleartext: true` was removed with it — it permitted plain HTTP
    // and had no purpose once nothing is fetched over the network to boot.
    //
    // `https` is Capacitor's own Android default and is restated deliberately.
    // It makes the webview a *secure origin*, which is what `crypto.randomUUID`,
    // service workers and the clipboard API all require. Serving over `http`
    // silently removes those: `Add 1` failed for exactly that reason over LAN
    // HTTP on 2026-08-17 (see `src/lib/uuid.ts`), and a native build must not
    // reintroduce the condition.
    androidScheme: 'https',
  },
};

export default config;
