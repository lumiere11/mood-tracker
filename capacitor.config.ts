import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.mood.tracker',
  appName: 'Estrés',
  webDir: 'dist',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_stress', iconColor: '#4f7cac' },
  },
};

export default config;
