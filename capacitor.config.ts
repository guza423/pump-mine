import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.performance.training',
  appName: 'OUTMOVE',
  webDir: 'dist',
  backgroundColor: '#04060c',
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK', initialViewportFitValueHint: 'cover' },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
  },
};

export default config;
