import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kataru.app',
  appName: 'Kataru',
  webDir: 'out',
  server: {
    // iOS実機開発時: Next.js devサーバーからライブリロード
    // url: 'http://10.253.56.71:3000',
    // cleartext: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0A0E1A',
  },
};

export default config;
