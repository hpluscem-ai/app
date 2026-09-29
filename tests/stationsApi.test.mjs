import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import ts from 'typescript';
import Supercluster from 'supercluster';
import * as authApi from '../utils/authApi.ts';
import * as mapStations from '../data/mapStations.ts';
import { getWebDirectionsUrl } from '../utils/mapDirections.ts';

const source = ts.transpileModule(readFileSync(new URL('../utils/stationsApi.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
new Function('require', 'exports', source)((name) => {
  if (name === './authApi') return authApi;
  assert.equal(name, '../data/mapStations');
  return mapStations;
}, api);
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv }; });

const station = {
  id: 'station-1', businessName: '실제 주유소', pole: 'GSC',
  roadAddress: '서울시 중구 도로 1', note: null,
  latitude: 0, longitude: 0, coordinateVerified: false, active: true,
  devices: [
    { id: 'device-1', model: 'HEUD-SELF-05', capacityLiters: 2500, active: true },
    { id: 'device-2', model: 'ST2140S', capacityLiters: 1400, active: false },
  ],
};

test('map bounds clamp poles, preserve antimeridian coverage and reject invalid regions', () => {
  assert.deepEqual(api.getMapBounds({ latitude: 0, longitude: 0, latitudeDelta: 2, longitudeDelta: 2 }), [-1, -1, 1, 1]);
  assert.deepEqual(api.getMapBounds({ latitude: 89, longitude: 179, latitudeDelta: 8, longitudeDelta: 8 }), [175, 85, -177, 90]);
  assert.deepEqual(api.getMapBounds({ latitude: -89, longitude: -179, latitudeDelta: 8, longitudeDelta: 8 }), [177, -90, -175, -85]);
  assert.deepEqual(api.getMapBounds({ latitude: 0, longitude: 0, latitudeDelta: 200, longitudeDelta: 360 }), [-180, -90, 180, 90]);
  for (const invalid of [{ latitude: 91 }, { longitude: Infinity }, { latitudeDelta: 0 }, { longitudeDelta: NaN }]) {
    assert.equal(api.getMapBounds({ latitude: 0, longitude: 0, latitudeDelta: 2, longitudeDelta: 2, ...invalid }), undefined);
  }
});

test('map API uses native/web credentials, only bounds, and real coordinates with every device', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  for (const session of [{ token: 'native-token' }, { credentials: 'include' }]) {
    globalThis.fetch = async (url, options) => {
      const target = new URL(url);
      assert.equal(target.pathname, '/api/v1/stations/map');
      assert.deepEqual([...target.searchParams.keys()], ['south', 'west', 'north', 'east']);
      assert.deepEqual([...target.searchParams.values()].map(Number), [-1e-8, 175, 90, -177]);
      assert.ok([...target.searchParams.values()].every((value) => /^-?\d+(?:\.\d+)?$/.test(value)));
      assert.equal(options.method, 'GET');
      assert.equal(options.body, undefined);
      assert.equal(options.credentials, session.credentials ?? 'omit');
      assert.equal(options.headers.Authorization, session.token ? `Bearer ${session.token}` : undefined);
      return Response.json([station, { ...station, id: 'missing', latitude: null }, { ...station, id: 'inactive', active: false }]);
    };
    assert.deepEqual(await api.getMapStations([175, -1e-8, -177, 90], session), [{
      id: station.id, businessName: station.businessName, pole: 'GSC',
      roadAddress: station.roadAddress, note: undefined,
      coordinate: { latitude: 0, longitude: 0 }, coordinateVerified: false,
      devices: [{ model: 'HEUD-SELF-05', capacity: '2,500L' }, { model: 'ST2140S', capacity: '1,400L' }],
    }]);
  }
  assert.equal(mapStations.hasMapCoordinate(station), true);
  assert.equal(mapStations.hasMapCoordinate({ latitude: null, longitude: 0 }), false);
  assert.equal(mapStations.hasMapCoordinate({ latitude: 0, longitude: 181 }), false);
});

test('empty success is distinct from invalid payloads, HTTP failures and connection failures', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const bounds = [-180, -90, 180, 90];
  globalThis.fetch = async () => Response.json([]);
  assert.deepEqual(await api.getMapStations(bounds, {}), []);
  for (const data of [null, {}, [null], [{ ...station, latitude: 91 }], [{ ...station, longitude: '0' }],
    [{ ...station, coordinateVerified: undefined }], [{ ...station, businessName: '' }],
    [{ ...station, devices: [{ model: 'test', capacityLiters: 0 }] }]]) {
    globalThis.fetch = async () => Response.json(data);
    await assert.rejects(api.getMapStations(bounds, {}), { code: 'INVALID_RESPONSE' });
  }
  for (const [status, code] of [[401, 'INVALID_SESSION'], [500, 'INTERNAL_SERVER_ERROR']]) {
    globalThis.fetch = async () => Response.json({ code, message: '서버 안내' }, { status });
    await assert.rejects(api.getMapStations(bounds, {}), { code, status, message: '서버 안내' });
  }
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(api.getMapStations(bounds, {}), { code: 'NETWORK_ERROR' });
  globalThis.fetch = async () => assert.fail('invalid bounds must not send a request');
  for (const invalid of [[0, 1, 0, -1], [181, 0, 0, 1], [0, 0, NaN, 1]]) {
    await assert.rejects(api.getMapStations(invalid, {}), { code: 'INVALID_MAP_BOUNDS' });
  }
});

const tick = () => new Promise((resolve) => setImmediate(resolve));
const nodes = (tree) => !tree || typeof tree !== 'object' ? [] :
  [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const displayed = (id, overrides = {}) => ({
  id, businessName: id, pole: 'GSC', roadAddress: '서울시 중구 도로 1',
  coordinate: { latitude: 37.5665, longitude: 126.978 },
  coordinateVerified: false, devices: [{ model: 'model', capacity: '2,500L' }], ...overrides,
});

function hookHarness() {
  const slots = [], pendingEffects = [];
  let index = 0, dirty = false, mounted = true;
  const slot = (initial) => { const key = index++; if (!(key in slots)) slots[key] = initial; return key; };
  const changed = (previous, dependencies) => !previous || dependencies.some((value, i) => value !== previous.dependencies[i]);
  const react = {
    useState(initial) {
      const key = slot(initial);
      return [slots[key], (value) => {
        assert.ok(mounted, 'must not update an unmounted route');
        const next = typeof value === 'function' ? value(slots[key]) : value;
        if (next !== slots[key]) { slots[key] = next; dirty = true; }
      }];
    },
    useRef(initial) { return slots[slot({ current: initial })]; },
    useMemo(callback, dependencies) {
      const key = slot(null);
      if (changed(slots[key], dependencies)) slots[key] = { value: callback(), dependencies };
      return slots[key].value;
    },
    useCallback(callback, dependencies) { return react.useMemo(() => callback, dependencies); },
    useEffect(callback, dependencies) {
      const key = slot(null), previous = slots[key];
      if (changed(previous, dependencies)) {
        slots[key] = { dependencies, cleanup: previous?.cleanup };
        pendingEffects.push(() => { slots[key].cleanup?.(); slots[key].cleanup = callback(); });
      }
    },
  };
  return {
    react,
    render(component) {
      let renders = 0, tree;
      do {
        assert.ok(renders++ < 20, 'render effects must settle');
        dirty = false; index = 0; tree = component();
        while (pendingEffects.length) pendingEffects.shift()();
      } while (dirty);
      return tree;
    },
    unmount() { for (const item of slots) item?.cleanup?.(); mounted = false; },
  };
}

// Exercise the real route handlers and supercluster index with controlled focus and HTTP timing.
function mountMap(preserveNotice = false) {
  const requests = [], details = [], errors = [], retries = [], links = [];
  const hooks = hookHarness(), react = hooks.react;
  let focused = true, tree, activeNotice;
  const auth = {
    state: { status: 'signedIn', user: { id: 'driver-1' } },
    request: (action) => action({ token: 'test-session' }),
  };
  const alerts = {
    showAuthErrorAlert(message, onConfirm) {
      if (preserveNotice && activeNotice) return;
      activeNotice = onConfirm;
      errors.push(message);
      retries.push(() => { activeNotice = undefined; onConfirm?.(); });
    },
    showTmapOpenFailedAlert: () => errors.push('tmap'),
  };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-linking': { openURL: async (url) => { links.push(url); } },
    'expo-location': { requestForegroundPermissionsAsync: async () => ({ status: 'denied' }), PermissionStatus: { GRANTED: 'granted' } },
    'expo-router': { useFocusEffect: (callback) => react.useEffect(() => focused ? callback() : undefined, [callback, focused]) },
    'react-native': { Platform: { OS: 'web' }, StyleSheet: { create: (value) => value }, View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    supercluster: Supercluster,
    '../components/AppScreen': { AppScreen: 'AppScreen' },
    '../components/AuthProvider': { useAuth: () => auth },
    '../components/map': { MapCanvas: 'MapCanvas', StationSheet: 'StationSheet', STATION_SHEET_COLLAPSED_HEIGHT: 136 },
    '../constants/theme': { colors: {}, typography: {} },
    '../data/mapStations': mapStations,
    '../utils/alerts': { useAlerts: () => alerts },
    '../utils/authApi': authApi,
    '../utils/mapDirections': { getWebDirectionsUrl },
    '../utils/stationsApi': {
      getMapBounds: api.getMapBounds,
      getMapStations: (bounds, session) => new Promise((resolve, reject) => requests.push({ bounds, session, resolve, reject })),
      getMapStation: (id, session) => new Promise((resolve, reject) => details.push({ id, session, resolve, reject })),
    },
  };
  const route = {};
  const source = ts.transpileModule(readFileSync(new URL('../app/map.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', source)((name) => {
    assert.ok(imports[name], `Unexpected import ${name}`);
    return imports[name];
  }, route);
  const page = {
    requests, details, errors, retries, links, auth,
    render() {
      tree = hooks.render(route.default);
      return tree;
    },
    map() { return nodes(page.render()).find((node) => node.type === 'MapCanvas').props; },
    sheet() { return nodes(page.render()).find((node) => node.type === 'StationSheet')?.props; },
    blur() { focused = false; page.render(); },
    focus() { focused = true; page.render(); },
    unmount: hooks.unmount,
    async flush() { await tick(); page.render(); await tick(); page.render(); },
  };
  page.render();
  nodes(tree).find((node) => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { height: 600 } } });
  page.render();
  return page;
}

test('map ignores stale viewport, focus and session responses and preserves data on failure', async () => {
  const page = mountMap();
  const original = page.requests.at(-1);
  page.map().onRegionChangeComplete({ latitude: 37.56, longitude: 126.97, latitudeDelta: 1, longitudeDelta: 1 });
  page.render();
  page.requests.at(-1).resolve([displayed('current')]);
  await page.flush();
  original.resolve([displayed('stale')]);
  await page.flush();
  assert.deepEqual(page.map().markers.map((marker) => marker.id), ['current']);
  page.blur(); page.focus();
  page.requests.at(-1).reject(new authApi.AuthApiError('서버 장애', 'INTERNAL_SERVER_ERROR', 500));
  await page.flush();
  assert.deepEqual(page.errors, ['서버 장애']);
  assert.equal(page.map().markers[0].id, 'current');
  page.blur(); page.focus();
  const left = page.requests.at(-1);
  page.blur(); left.reject(new Error('late background error'));
  await page.flush();
  assert.equal(page.errors.length, 1);
  page.focus();
  const previousSession = page.requests.at(-1);
  page.auth.state = { status: 'signedIn', user: { id: 'driver-2' } };
  page.render();
  previousSession.resolve([displayed('old-account')]);
  await page.flush();
  assert.deepEqual(page.map().markers, []);
  const last = page.requests.at(-1);
  page.unmount(); last.resolve([displayed('after-unmount')]);
  await tick();
});

test('station refresh updates the selected sheet, permits real unverified directions and closes removed records', async () => {
  const page = mountMap();
  page.requests.at(-1).resolve([displayed('station')]);
  await page.flush();
  page.map().onMarkerPress('station');
  const selected = page.sheet().content.station;
  await page.sheet().onDirections(selected);
  assert.equal(new URL(page.links[0]).searchParams.get('eText'), 'GSC station');
  page.blur(); page.focus();
  page.requests.at(-1).resolve([displayed('station', { businessName: '수정 이름' })]);
  await page.flush();
  assert.equal(page.sheet().content.station.businessName, '수정 이름');
  await page.sheet().onDirections(selected);
  assert.equal(page.links.length, 1, 'stale sheet records must not start directions');
  page.blur(); page.focus(); page.requests.at(-1).resolve([]);
  await page.flush();
  assert.equal(page.sheet().visible, true, 'a viewport miss alone must not close selection');
  page.details.at(-1).resolve(null);
  await page.flush();
  assert.deepEqual(page.map().markers, []);
  assert.equal(page.sheet().visible, false);
  page.sheet().onHidden();
  assert.equal(page.sheet(), undefined);
  page.unmount();
});

test('cluster refresh revalidates missing records and never reuses a stale selected cluster ID', async () => {
  const page = mountMap();
  page.requests.at(-1).resolve([displayed('a'), displayed('b')]);
  await page.flush();
  const cluster = page.map().markers[0];
  assert.equal(cluster.count, 2);
  page.map().onMarkerPress(cluster.id);
  assert.equal(page.map().markers[0].selected, true);
  assert.equal(page.sheet().content.kind, 'cluster');
  page.blur(); page.focus();
  page.requests.at(-1).resolve([displayed('b', { businessName: 'updated b' }), displayed('c')]);
  await page.flush();
  assert.equal(page.details.at(-1).id, 'a');
  page.details.at(-1).resolve(null);
  await page.flush();
  assert.equal(page.map().markers[0].selected, false);
  assert.deepEqual(page.sheet().content.stations.map((station) => station.id), ['b']);
  assert.equal(page.sheet().content.stations[0].businessName, 'updated b');
  page.unmount();
});

test('detail requests distinguish missing/inactive/no-coordinate stations from failures', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/v1/stations/id%2Fwith%20space');
    assert.equal(options.credentials, 'include');
    return Response.json({ ...station, id: 'id/with space' });
  };
  const detail = await api.getMapStation('id/with space', { credentials: 'include' });
  assert.equal(detail.roadAddress, station.roadAddress);
  assert.equal(Object.hasOwn(detail, 'area'), false);
  assert.equal(Object.hasOwn(detail, 'siteType'), false);
  for (const data of [{ ...station, active: false }, { ...station, longitude: null }]) {
    globalThis.fetch = async () => Response.json(data);
    assert.equal(await api.getMapStation(station.id, {}), null);
  }
  globalThis.fetch = async () => Response.json({ code: 'STATION_NOT_FOUND' }, { status: 404 });
  assert.equal(await api.getMapStation(station.id, {}), null);
  globalThis.fetch = async () => Response.json(station);
  await assert.rejects(api.getMapStation('different-id', {}), { code: 'INVALID_RESPONSE' });
  for (const [status, code] of [[500, 'INTERNAL_SERVER_ERROR'], [401, 'INVALID_SESSION'], [404, 'OTHER_NOT_FOUND']]) {
    globalThis.fetch = async () => Response.json({ code }, { status });
    await assert.rejects(api.getMapStation(station.id, {}), { status, code });
  }
});

function mountSheet(props) {
  const hooks = hookHarness(), animations = [];
  const jsx = (type, props) => ({ type, props });
  class Value {
    listeners = new Set();
    addListener(listener) { this.listeners.add(listener); return listener; }
    removeListener(listener) { this.listeners.delete(listener); }
    setValue(value) { for (const listener of this.listeners) listener({ value }); }
  }
  const imports = {
    react: hooks.react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      AccessibilityInfo: { addEventListener: () => ({ remove() {} }), isReduceMotionEnabled: async () => false },
      Animated: { Value, View: 'AnimatedView', timing: (value, options) => ({
        start(callback) { animations.push(options.toValue); value.setValue(options.toValue); callback?.({ finished: true }); },
      }) },
      PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
      Platform: { OS: 'web' }, StyleSheet: { create: (value) => value },
      Pressable: 'Pressable', View: 'View', Text: 'Text', ScrollView: 'ScrollView',
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../../constants/theme': { colors: {}, typography: {} },
    '../../data/mapStations': mapStations,
    '../icons/DirectionsIcon': { DirectionsIcon: 'DirectionsIcon' },
  };
  const component = {};
  const source = ts.transpileModule(readFileSync(new URL('../components/map/StationSheet.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', source)((name) => {
    assert.ok(imports[name], `Unexpected import ${name}`);
    return imports[name];
  }, component);
  const render = () => hooks.render(() => component.StationSheet(props));
  return {
    animations,
    expanded: () => render().props.accessibilityViewIsModal,
    handle() {
      const button = nodes(render()).find((node) => node.type === 'Pressable');
      return { button: button.props, bar: nodes(button).find((node) => node.type === 'View').props };
    },
    toggle() { nodes(render()).find((node) => node.type === 'Pressable').props.onPress(); render(); },
    update(next) { props = next; render(); },
    unmount: hooks.unmount,
  };
}

test('single and cluster selection keep a short visible handle with a wide press target', async () => {
  for (const [stations, expanded] of [
    [[displayed('a')], false],
    [[displayed('a'), displayed('b')], true],
  ]) {
    const page = mountMap();
    page.requests.at(-1).resolve(stations);
    await page.flush();
    page.map().onMarkerPress(page.map().markers[0].id);
    const sheet = mountSheet(page.sheet());
    const { button, bar } = sheet.handle();
    assert.equal(button.style.width, '100%');
    assert.equal(button.style.height, 4);
    assert.equal(button.hitSlop, 12);
    assert.equal(bar.style.width, 64);
    assert.equal(bar.style.height, 4);
    assert.equal(bar.style.alignSelf, 'center');
    assert.equal(sheet.expanded(), expanded);
    sheet.toggle();
    assert.equal(sheet.expanded(), !expanded);
    sheet.toggle();
    assert.equal(sheet.expanded(), expanded);
    sheet.unmount(); page.unmount();
  }
});

test('actual StationSheet preserves expansion on surrounding/data refresh and resets on deliberate reselection', async () => {
  const page = mountMap();
  page.requests.at(-1).resolve([displayed('a')]);
  await page.flush();
  page.map().onMarkerPress('a');
  const sheet = mountSheet(page.sheet());
  assert.equal(sheet.expanded(), false);
  sheet.toggle();
  assert.equal(sheet.expanded(), true);
  const animationCount = sheet.animations.length;
  for (const data of [
    [displayed('a'), displayed('surrounding', { coordinate: { latitude: 38, longitude: 127.4 } })],
    [displayed('a', { businessName: 'updated a' })],
  ]) {
    page.blur(); page.focus(); page.requests.at(-1).resolve(data);
    await page.flush();
    sheet.update(page.sheet());
    assert.equal(sheet.expanded(), true);
    assert.equal(sheet.animations.length, animationCount);
  }
  page.map().onMarkerPress('a');
  sheet.update(page.sheet());
  assert.equal(sheet.expanded(), false);
  sheet.unmount(); page.unmount();
});

test('panning retains the selected cluster and its collapsed state while detail confirms offscreen members', async () => {
  const page = mountMap(), original = [displayed('a'), displayed('b')];
  page.requests.at(-1).resolve(original);
  await page.flush();
  page.map().onMarkerPress(page.map().markers[0].id);
  const sheet = mountSheet(page.sheet());
  assert.equal(sheet.expanded(), true);
  sheet.toggle();
  const selectedKey = page.sheet().selectionKey;
  page.map().onRegionChangeComplete({ latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 });
  page.render(); page.requests.at(-1).resolve([]);
  await page.flush();
  assert.equal(page.sheet().visible, true);
  assert.deepEqual(page.sheet().content.stations.map((station) => station.id), ['a', 'b']);
  assert.deepEqual(page.details.map((request) => request.id), ['a', 'b']);
  for (const detail of page.details) detail.resolve(displayed(detail.id, { businessName: `updated ${detail.id}` }));
  await page.flush();
  sheet.update(page.sheet());
  assert.equal(page.sheet().selectionKey, selectedKey);
  assert.equal(sheet.expanded(), false);
  assert.equal(page.sheet().content.stations[0].businessName, 'updated a');
  page.map().onRegionChangeComplete({ latitude: 37.5665, longitude: 126.978, latitudeDelta: 1.1, longitudeDelta: 1.1 });
  page.render(); page.requests.at(-1).resolve(original);
  await page.flush();
  assert.equal(page.map().markers[0].selected, true);
  sheet.unmount(); page.unmount();
});

test('detail failure retains selected data and a late completion cannot reopen a closed sheet', async () => {
  const page = mountMap();
  page.requests.at(-1).resolve([displayed('a')]);
  await page.flush(); page.map().onMarkerPress('a'); page.render();
  page.map().onRegionChangeComplete({ latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 });
  page.render(); page.requests.at(-1).resolve([]);
  await page.flush();
  page.details.at(-1).reject(new authApi.AuthApiError('서버 장애', 'INTERNAL_SERVER_ERROR', 500));
  await page.flush();
  assert.equal(page.sheet().visible, true);
  assert.equal(page.sheet().content.station.id, 'a');
  assert.deepEqual(page.errors, ['서버 장애']);
  page.retries.at(-1)(); page.render();
  const pending = page.details.at(-1);
  page.sheet().onRequestClose(); page.render();
  page.sheet().onHidden(); page.render();
  pending.resolve(displayed('a'));
  await page.flush();
  assert.equal(page.sheet(), undefined);
  page.unmount();
});

test('map retries only in the active focus and leaves invalid-session handling to AuthProvider', async () => {
  const page = mountMap();
  page.requests.at(-1).reject(new authApi.AuthApiError('실패', 'NETWORK_ERROR'));
  await page.flush();
  page.retries.at(-1)(); page.render();
  assert.equal(page.requests.length, 2);
  page.requests.at(-1).reject(new authApi.AuthApiError('실패', 'NETWORK_ERROR'));
  await page.flush();
  page.blur(); page.retries.at(-1)(); page.render();
  assert.equal(page.requests.length, 2);
  page.focus(); page.requests.at(-1).reject(new authApi.AuthApiError('만료', 'INVALID_SESSION', 401));
  await page.flush();
  assert.equal(page.errors.length, 2);
  page.unmount();
});

test('a protected error notice retries the latest bounds after the failed request was superseded', async () => {
  const page = mountMap(true);
  page.requests.at(-1).reject(new authApi.AuthApiError('첫 실패', 'NETWORK_ERROR'));
  await page.flush();
  page.map().onRegionChangeComplete({ latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 });
  page.render();
  page.requests.at(-1).reject(new authApi.AuthApiError('다음 실패', 'NETWORK_ERROR'));
  await page.flush();
  assert.deepEqual(page.errors, ['첫 실패'], 'the existing noncancelable notice rejects replacement');
  const count = page.requests.length;
  page.retries[0](); page.render();
  assert.equal(page.requests.length, count + 1);
  assert.deepEqual(page.requests.at(-1).bounds, [-0.5, -0.5, 0.5, 0.5]);
  page.unmount();
});

test('native marker snapshots remount for label/count updates and receive coordinate changes', () => {
  const source = ts.transpileModule(readFileSync(new URL('../components/map/MapCanvas.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const jsx = (type, props, key) => ({ type, props, key });
  const imports = {
    react: { useRef: (current) => ({ current }), useImperativeHandle() {} },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { StyleSheet: { absoluteFill: {} } },
    'react-native-maps': 'MapView',
    './StationMarker': { StationMarker: 'StationMarker' },
  };
  const component = {};
  new Function('require', 'exports', source)((name) => imports[name], component);
  const marker = { id: 'a', selected: false, label: 'old', coordinate: { latitude: 0, longitude: 0 } };
  const render = (overrides) => nodes(component.MapCanvas({ markers: [{ ...marker, ...overrides }] }))
    .find((node) => node.type === 'StationMarker');
  assert.notEqual(render().key, render({ label: 'new' }).key);
  assert.notEqual(render({ count: 2 }).key, render({ count: 3 }).key);
  assert.deepEqual(render({ coordinate: { latitude: 1, longitude: 2 } }).props.coordinate, { latitude: 1, longitude: 2 });
});
