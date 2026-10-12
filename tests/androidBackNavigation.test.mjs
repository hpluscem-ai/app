import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function mount({
  canGoBack = false,
  pathname = '/map',
  platform = 'android',
  status = 'signedIn',
} = {}) {
  const effects = [];
  const listeners = [];
  const navigation = [];
  const router = {
    back: () => navigation.push('back'),
    canGoBack: () => canGoBack,
    replace: (href) => navigation.push(href),
  };
  const Stack = () => null;
  Stack.Screen = () => null;
  Stack.Protected = ({ children }) => children;
  const jsx = (type, props) =>
    typeof type === 'function' ? type(props ?? {}) : { type, props: props ?? {} };
  const imports = {
    react: { useEffect: (effect) => effects.push(effect) },
    'react/jsx-runtime': { Fragment: Symbol('Fragment'), jsx, jsxs: jsx },
    '@sentry/react-native': { init() {}, setTag() {}, wrap: (component) => component },
    'expo-font': { useFonts: () => [true, false] },
    'expo-router': { Stack, usePathname: () => pathname, useRouter: () => router },
    'expo-router/head': () => null,
    'expo-splash-screen': {
      hideAsync: async () => {},
      preventAutoHideAsync: async () => {},
    },
    'expo-status-bar': { StatusBar: () => null },
    'expo-updates': { isEmbeddedLaunch: false, updateId: null },
    'react-native': {
      BackHandler: {
        addEventListener: (_event, listener) => {
          listeners.push(listener);
          return { remove() {} };
        },
      },
      Platform: { OS: platform },
      StyleSheet: { create: (value) => value },
      View: ({ children }) => children,
    },
    'react-native-paper': { PaperProvider: ({ children }) => children },
    'react-native-safe-area-context': {
      SafeAreaProvider: ({ children }) => children,
    },
    '../components/AppBar': { AppBar: () => null },
    '../components/AuthProvider': {
      AuthProvider: ({ children }) => children,
      useAuth: () => ({ state: { status, user: status === 'signedIn' ? {} : null } }),
    },
    '../components/NoticeProvider': { NoticeProvider: ({ children }) => children },
    '../constants/theme': { typography: { screenTitle: {} }, webAppFrame: {} },
    '../constants/webMetadata': { getWebMetadata: () => ({ title: '', url: '' }) },
  };
  const exports = {};

  new Function('require', 'exports', 'process', '__DEV__', source)(
    (name) => {
      if (name.includes('../assets/fonts/')) return 1;
      assert.ok(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
    exports,
    { env: {} },
    true,
  );

  exports.default();
  effects.forEach((effect) => effect());
  return { listeners, navigation };
}

test('Android Back pops history, otherwise returns signed-in users to mileage', () => {
  const withHistory = mount({ canGoBack: true });
  assert.equal(withHistory.listeners.length, 1);
  assert.equal(withHistory.listeners[0](), true);
  assert.deepEqual(withHistory.navigation, ['back']);

  const withoutHistory = mount();
  assert.equal(withoutHistory.listeners[0](), true);
  assert.deepEqual(withoutHistory.navigation, ['/mileage']);

  const onMileage = mount({ pathname: '/mileage' });
  assert.equal(onMileage.listeners[0](), true);
  assert.deepEqual(onMileage.navigation, []);
});

test('the Android fallback does not change signed-out or iOS navigation', () => {
  assert.equal(mount({ status: 'signedOut' }).listeners.length, 0);
  assert.equal(mount({ platform: 'ios' }).listeners.length, 0);
});
