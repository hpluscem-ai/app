import appJson from './app.json';

export default {
  ...appJson.expo,
  plugins: [
    ...appJson.expo.plugins,
    ['@mj-studio/react-native-naver-map', {
      client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? '',
    }],
    ['expo-build-properties', {
      android: { extraMavenRepos: ['https://repository.map.naver.com/archive/maven'] },
    }],
  ],
};
