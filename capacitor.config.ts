import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.performance.training',
  appName: 'OUTMOVE',
  webDir: 'dist',
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK' },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
  },
};

export default config;
