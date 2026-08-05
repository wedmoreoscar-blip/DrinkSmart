import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drinksmart.app',
  appName: 'DrinkSmart',
  webDir: 'dist',
  server: {
    // TODO: Set to your production URL before building native bundles
    cleartext: true,
  },
};

export default config;
