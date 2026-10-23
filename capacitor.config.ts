import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.performance.training',
  appName: 'PERFORMANCE',
  webDir: 'dist',
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK' },
  },
};

export default config;
