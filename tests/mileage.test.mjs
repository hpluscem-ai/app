import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as authApi from '../utils/authApi.ts';

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
function load(path, imports) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', source)(name => { assert.ok(name in imports, `unexpected import ${name}`); return imports[name]; }, exports);
  return exports;
}
const api = load('../utils/mileageApi.ts', { './authApi': authApi });
function mount(path, extras = {}, params = {}, renderHistory = false) {
  let index = 0, dirty = true, focused = true, mounted = true, tree;
  const slots = [], effects = [], navigation = [], calls = [], details = [], photos = [], preparations = [];
  const slot = init => { const key = index++; if (!(key in slots)) slots[key] = init(); return key; };
  const changed = (old, deps) => !old || deps.some((value, i) => old.deps[i] !== value);
  const react = {
    useState(init) { const i = slot(() => typeof init === 'function' ? init() : init); return [slots[i], value => { assert.ok(mounted); const next = typeof value === 'function' ? value(slots[i]) : value; if (next !== slots[i]) { slots[i] = next; dirty = true; } }]; },
    useRef(value) { return slots[slot(() => ({ current: value }))]; },
    useCallback(fn, deps) { const i = slot(() => null); if (changed(slots[i], deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = slot(() => null), old = slots[i]; if (changed(old, deps)) { slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const auth = { state: { status: 'signedIn', user: { id: 'user-1', name: '실제기사' } }, request: action => action({ token: 'session' }) };
  const pending = (target, payload) => { const d = deferred(); target.push({ ...payload, ...d }); return d.promise; };
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'expo-router': { useFocusEffect: fn => react.useEffect(() => focused ? fn() : undefined, [fn, focused]), useRouter: () => ({ push: url => navigation.push(url), replace: url => navigation.push(url) }), useLocalSearchParams: () => params, Stack: { Screen: 'Stack.Screen' }, Redirect: 'Redirect' },
    'react-native': { Keyboard: { dismiss() {} }, StyleSheet: { create: x => x }, Platform: { OS: 'web' }, View: 'View', Text: 'Text' },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../../constants/theme': { colors: {}, typography: {}, webAppFrame: {} },
    '../../components/AppScreen': { AppScreen: 'AppScreen' },
    '../../components/AuthProvider': { useAuth: () => auth },
    '../../components/NoticeModal': { NoticeModal: 'NoticeModal' },
    '../../components/mileage/MileagePhotoForm': { MileagePhotoForm: 'MileagePhotoForm' },
    '../../components/mileage/UploadCard': { UploadCard: 'UploadCard' },
    '../../components/icons/MileageWaterJugIcon': { MileageWaterJugIcon: 'WaterJug' },
    '../../utils/alerts': { useAlerts: () => ({ showMileageReRegistrationServerPendingAlert: () => navigation.push('resubmit-pending') }) },
    '../../utils/authApi': authApi,
    '../../utils/mileageApi': { ...api, createMileageApplication: (input, session, signal) => pending(calls, { input, session, signal }), getMileageApplications: (query, session, signal) => pending(calls, { query, session, signal }), getMileageApplication: (id, session, signal) => pending(details, { id, session, signal }), getMileagePhoto: (id, kind, session, signal) => pending(photos, { id, kind, signal }) },
    '../../utils/mileagePhotos': { prepareMileageSubmission: selection => pending(preparations, { selection }), mileagePhotoPreview: async blob => blob },
    ...extras,
  };
  const route = load(path, imports).default;
  const component = () => {
    const tree = route();
    if (!renderHistory) return tree;
    const history = nodes(tree).find(node => node.type?.name === 'MileageHistory');
    return history.type(history.props);
  };
  const page = {
    calls, preparations, details, photos, navigation, auth,
    render() { let count = 0; do { assert.ok(count++ < 25); dirty = false; index = 0; tree = component(); while (effects.length) effects.shift()(); } while (dirty); return tree; },
    get(type) { return nodes(page.render()).find(n => n.type === type || n.type?.name === type)?.props; },
    blur() { focused = false; page.render(); }, focus() { focused = true; page.render(); },
    unmount() { for (const item of slots) item?.cleanup?.(); mounted = false; },
    async flush() { await new Promise(r => setImmediate(r)); page.render(); },
  };
  page.render(); return page;
}
const id = '11111111-1111-4111-8111-111111111111';
const item = (id, status = 'pending') => ({ id, status, submittedAt: '2026-09-22T03:00:00Z', mileageAmount: null });

test('new application locks double submits, reuses prepared bytes after failure and only navigates on confirmed success', async () => {
  const page = mount('../app/mileage/apply.tsx');
  const selection = { receipt: {}, dashboard: {} };
  const first = page.get('MileagePhotoForm').onValidSubmit(selection);
  void page.get('MileagePhotoForm').onValidSubmit(selection);
  assert.equal(page.preparations.length, 1);
  let disposed = 0;
  const prepared = { key: id, dispose: () => disposed++ };
  page.preparations[0].resolve(prepared); await page.flush();
  page.calls[0].reject(new authApi.AuthApiError('결과 확인 불가', 'NETWORK_ERROR')); await first; await page.flush();
  assert.equal(page.navigation.length, 0);
  assert.equal(disposed, 0);
  page.get('NoticeModal').onConfirm();
  const second = page.get('MileagePhotoForm').onValidSubmit(selection); await page.flush();
  assert.equal(page.preparations.length, 1);
  assert.equal(page.calls[1].input, prepared);
  page.calls[1].resolve({ id }); await second; await page.flush();
  assert.equal(disposed, 1);
  assert.equal(page.navigation.length, 0);
  assert.equal(page.get('MileagePhotoForm').locked, true);
  const confirm = page.get('NoticeModal').onConfirm;
  confirm(); confirm();
  assert.deepEqual(page.navigation, ['/mileage']);
  page.unmount();
});

test('leaving during preparation or submission discards late success and cleans only prepared files', async () => {
  for (const stage of ['preparation', 'submission']) {
    const page = mount('../app/mileage/apply.tsx');
    let disposed = 0;
    const job = page.get('MileagePhotoForm').onValidSubmit({ receipt: {}, dashboard: {} });
    if (stage === 'submission') { page.preparations[0].resolve({ key: id, dispose: () => disposed++ }); await page.flush(); }
    page.blur();
    if (stage === 'preparation') page.preparations[0].resolve({ key: id, dispose: () => disposed++ });
    else { assert.equal(page.calls[0].signal.aborted, true); page.calls[0].resolve({ id }); }
    await job; await page.flush();
    assert.equal(disposed, 1); assert.equal(page.navigation.length, 0); assert.equal(page.get('NoticeModal').visible, false);
    page.unmount();
  }
});

test('list paginates, distinguishes failures from empty success and drops stale filter/session responses', async () => {
  const page = mount('../app/mileage/index.tsx');
  const first = page.calls[0];
  first.resolve({ items: [item(id)], nextCursor: 'page2' }); await page.flush();
  assert.equal(page.get('MileageHistory').items[0].mileage, null);
  page.get('AppScreen').onEndReached(); page.get('AppScreen').onEndReached();
  assert.equal(page.calls.length, 2);
  assert.equal(page.calls[1].query.cursor, 'page2');
  page.calls[1].reject(new authApi.AuthApiError('일시 오류')); await page.flush();
  assert.equal(page.get('MileageHistory').items.length, 1);
  page.get('AppScreen').onEndReached(); assert.equal(page.calls.length, 2);
  page.get('NoticeModal').onConfirm();
  const stale = page.calls[2];
  assert.equal(page.get('MileageHistory').onQueryChange({ period: 'custom', sort: 'oldest', startDate: '2026. 09. 01', endDate: '2026. 09. 22' }), true);
  await page.flush();
  assert.equal(stale.signal.aborted, true);
  stale.resolve({ items: [item('stale')], nextCursor: null });
  page.calls.at(-1).resolve({ items: [], nextCursor: null }); await page.flush();
  assert.deepEqual(page.get('MileageHistory').items, []);
  page.blur(); page.focus(); const oldUser = page.calls.at(-1);
  page.auth.state = { status: 'signedIn', user: { id: 'user-2' } }; page.render();
  oldUser.resolve({ items: [item('private-old-user')], nextCursor: null }); await page.flush();
  assert.equal(page.get('MileageHistory').items, undefined);
  page.unmount();
});

test('detail uses server status, protects photos and revokes previews on leaving', async () => {
  const page = mount('../app/mileage/[status].tsx', {}, { id, status: 'pending' });
  page.details[0].resolve({ ...item(id, 'rejected'), rejectionReason: '실제 반려 사유', photos: { receipt: 'path', meter: 'path' } }); await page.flush();
  let disposed = 0;
  page.photos[0].resolve({ uri: 'blob:receipt', dispose: () => disposed++ }); await page.flush();
  page.photos[1].resolve({ uri: 'blob:meter', dispose: () => disposed++ }); await page.flush();
  assert.equal(page.get('MileagePhotoForm').intro, '실제 반려 사유');
  assert.equal(page.get('MileagePhotoForm').existingImages.dashboard.uri, 'blob:meter');
  assert.match(page.get('Stack.Screen').options.title, /반려$/);
  page.get('MileagePhotoForm').onValidSubmit(); assert.deepEqual(page.navigation, ['resubmit-pending']);
  page.blur(); assert.equal(disposed, 2); page.unmount();
});

test('photo preparation enforces format/size, converts only past thresholds, and cleans owned copies', async () => {
  const conversions = [], removed = [], files = new Map(); let sequence = 0, failRender = false;
  class File {
    constructor(...parts) { this.uri = parts.join('/'); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri) ?? 1024; }
    copy(target) { files.set(target.uri, this.size); }
    delete() { removed.push(this.uri); files.delete(this.uri); }
  }
  const photos = load('../utils/mileagePhotos.ts', {
    'expo-crypto': { randomUUID: () => `uuid-${++sequence}` },
    'expo-file-system': { File, Paths: { cache: 'cache' } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate(uri) {
      const conversion = { uri }; conversions.push(conversion);
      return { resize(size) { conversion.resize = size; }, release() {}, async renderAsync() {
        if (failRender) throw new Error('bad decoder');
        return { release() {}, async saveAsync(options) { conversion.options = options; const uri = `cache/converted-${sequence++}.jpg`; files.set(uri, 1024); return { uri, width: 4096, height: 2048 }; } };
      } };
    } } },
    'react-native': { Platform: { OS: 'ios' } }, './authApi': authApi,
  });
  const image = { uri: 'picker/original.jpg', fileName: 'original.jpg', mimeType: 'image/jpeg', fileSize: 10*1024*1024, width: 4096, height: 2048 };
  const first = await photos.prepareMileageSubmission({ receipt: image, dashboard: image });
  assert.equal(conversions.length, 0); assert.notEqual(first.receipt.uri, image.uri);
  first.dispose(); assert.equal(removed.length, 2); assert.ok(!removed.includes(image.uri));
  const second = await photos.prepareMileageSubmission({ receipt: { ...image, fileSize: image.fileSize+1 }, dashboard: { ...image, height: 4097 } });
  assert.equal(conversions.length, 2); assert.equal(conversions[0].resize, undefined);
  assert.deepEqual(conversions[1].resize, { height: 4096 });
  assert.deepEqual(conversions[0].options, { compress: .9, format: 'jpeg' });
  second.dispose(); assert.equal(removed.length, 4);
  for (const [asset, code] of [[{ ...image, mimeType:'image/webp' }, 'UNSUPPORTED_PHOTO_TYPE'], [{ ...image, fileSize: 50*1024*1024+1 }, 'PHOTO_TOO_LARGE'], [{ ...image, fileSize: undefined }, 'PHOTO_SIZE_UNAVAILABLE'], [{ ...image, width: 0 }, 'INVALID_PHOTO']]) {
    assert.throws(() => photos.validateMileagePhoto(asset), { code });
  }
  assert.equal(photos.validateMileagePhoto({ ...image, fileSize: 50*1024*1024 }), 'image/jpeg');
  failRender = true;
  await assert.rejects(photos.prepareMileageSubmission({ receipt: image, dashboard: { ...image, width: 5000 } }), { code: 'PHOTO_PREPARATION_FAILED' });
  assert.equal(files.size, 0, 'partial preparation must release the first copied photo');
});


test('invalid dates close the filter before the existing error notice and keep applied labels', () => {
  const page = mount('../app/mileage/index.tsx', {}, {}, true);
  nodes(page.render()).find(node => node.props?.accessibilityLabel === '최근 3개월, 최신순').props.onPress();
  page.get('MileageFilterSheet').onSelectPeriod('custom');
  page.get('MileageFilterSheet').onChangeCustomStartDate('2026. 02. 29');
  page.get('MileageFilterSheet').onChangeCustomEndDate('2026. 03. 01');
  page.get('MileageFilterSheet').onClose();
  assert.equal(page.get('MileageFilterSheet').visible, false);
  assert.ok(nodes(page.render()).some(node => node.props?.accessibilityLabel === '최근 3개월, 최신순'));
  assert.equal(page.calls.length, 1, 'invalid dates must not issue a new query');
  page.unmount();
});
