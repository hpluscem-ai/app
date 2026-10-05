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
  new Function('require', 'exports', 'localStorage', source)(name => { assert.ok(name in imports, `unexpected import ${name}`); return imports[name]; }, exports, imports.localStorage);
  return exports;
}
const api = load('../utils/mileageApi.ts', { './authApi': authApi });
const native = { Keyboard: { dismiss() {} }, StyleSheet: { create: x => x, absoluteFill: { position: 'absolute' } }, Platform: { OS: 'web' }, View: 'View', Text: 'Text', Image: 'Image', Modal: 'Modal', Pressable: 'Pressable' };
function mount(path, extras = {}, params = {}, renderHistory = false) {
  let index = 0, dirty = true, focused = true, mounted = true, tree;
  const slots = [], effects = [], navigation = [], calls = [], details = [], photos = [], preparations = [], summaries = [];
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
    'react-native': native,
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    '@expo/ui/community/datetime-picker': { default: 'DateTimePicker' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }), SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    '../../constants/theme': { colors: {}, typography: {}, webAppFrame: {} },
    '../../components/AppScreen': { AppScreen: 'AppScreen' },
    '../../components/AppBar': { AppBar: 'AppBar' },
    '../../components/AuthProvider': { useAuth: () => auth },
    '../../components/NoticeModal': { NoticeModal: 'NoticeModal' },
    '../../components/mileage': { MileagePhotoForm: 'MileagePhotoForm', UploadCard: 'UploadCard' },
    '../../constants/assets': { imageSources: { mileagePhotoGuide: 'guide.png' } },
    '../../utils/mileagePhotoGuide': { hasConfirmedMileagePhotoGuide: () => true, confirmMileagePhotoGuide() {} },
    '../../components/mileage/UploadCard': { UploadCard: 'UploadCard' },
    '../../components/icons/MileageWaterJugIcon': { MileageWaterJugIcon: 'WaterJug' },
    '../../utils/authApi': authApi,
    '../../utils/mileageApi': { ...api, resubmitMileageApplication: (id, input, session, signal) => pending(calls, { id, input, session, signal }), getMileageSummary: (query, session) => pending(summaries, { query, session }), createMileageApplication: (input, session, signal) => pending(calls, { input, session, signal }), getMileageApplications: (query, session, signal) => pending(calls, { query, session, signal }), getMileageApplication: (id, session, signal) => pending(details, { id, session, signal }), getMileagePhoto: (id, kind, session, signal) => pending(photos, { id, kind, signal }) },
    '../../utils/mileagePhotos': { prepareMileageResubmission: (selection, submissionVersion) => pending(preparations, { selection, submissionVersion }), prepareMileageSubmission: selection => pending(preparations, { selection }), mileagePhotoPreview: async blob => blob },
    ...extras,
  };
  const module = load(path, imports);
  const route = module.default ?? module.MileagePhotoForm;
  const component = () => {
    const tree = route(extras.formProps);
    if (!renderHistory) return tree;
    const history = nodes(tree).find(node => node.type?.name === 'MileageHistory');
    return history.type(history.props);
  };
  const page = {
    calls, preparations, details, photos, navigation, auth, summaries,
    render(runEffects = true) { let count = 0; do { assert.ok(count++ < 25); dirty = false; index = 0; tree = component(); while (runEffects && effects.length) effects.shift()(); } while (dirty); return tree; },
    get(type) { return nodes(page.render()).find(n => n.type === type || n.type?.name === type)?.props; },
    blur() { focused = false; page.render(); }, focus() { focused = true; page.render(); },
    unmount() { for (const item of slots) item?.cleanup?.(); mounted = false; },
    async flush() { await new Promise(r => setImmediate(r)); page.render(); },
  };
  page.render(); return page;
}
const id = '11111111-1111-4111-8111-111111111111';
const item = (id, status = 'pending') => ({ id, status, submittedAt: '2026-09-22T03:00:00Z', mileageAmount: null });

test('balance follows the selected period, refreshes on focus and stays independent of sort and pages', async () => {
  const page = mount('../app/mileage/index.tsx');
  assert.equal(page.summaries.length, 1);
  assert.deepEqual(page.summaries[0].session, { token: 'session' });
  assert.deepEqual(page.summaries[0].query, { createdFrom: page.calls[0].query.createdFrom, createdBefore: page.calls[0].query.createdBefore });
  assert.equal(page.get('MileageBalanceCard').balance, undefined);
  const card = () => {
    const node = nodes(page.render()).find(n => n.type?.name === 'MileageBalanceCard');
    return node.type(node.props);
  };
  assert.ok(nodes(card()).some(n => n.type === 'Text' && n.props.children === '-'));
  page.summaries[0].resolve({ accumulatedMileage: 0 }); await page.flush();
  assert.equal(page.get('MileageBalanceCard').balance, 0);
  assert.equal(card().props.accessibilityLabel, '누적 마일리지 0마일');
  assert.ok(nodes(card()).some(n => n.type === 'Text' && n.props.children === '0'));
  assert.ok(nodes(card()).some(n => n.type === 'Text' && n.props.children === '다음달 10일 제휴사를 통해 정산돼요'));
  page.calls[0].resolve({ items: [{ ...item(id, 'approved'), mileageAmount: 300 }], nextCursor: 'next' }); await page.flush();
  page.get('AppScreen').onEndReached();
  page.calls[1].resolve({ items: [{ ...item('second', 'approved'), mileageAmount: 400 }], nextCursor: null }); await page.flush();
  page.get('MileageHistory').onQueryChange({ ...page.get('MileageHistory').appliedFilter, sort: 'oldest' }); await page.flush();
  assert.equal(page.summaries.length, 1);
  assert.equal(page.get('MileageBalanceCard').balance, 0);
  page.get('MileageHistory').onQueryChange({ period: 'oneMonth', sort: 'oldest', startDate: '', endDate: '' }); await page.flush();
  assert.equal(page.summaries.length, 2);
  assert.deepEqual(page.summaries[1].query, { createdFrom: page.calls.at(-1).query.createdFrom, createdBefore: page.calls.at(-1).query.createdBefore });
  assert.equal(page.get('MileageBalanceCard').balance, undefined);
  page.summaries[1].resolve({ accumulatedMileage: 1500 }); await page.flush();
  assert.equal(page.get('MileageBalanceCard').balance, 1500);
  page.blur(); assert.equal(page.get('MileageBalanceCard').balance, undefined);
  page.focus(); assert.equal(page.summaries.length, 3);
  page.summaries[2].resolve({ accumulatedMileage: 74910 }); await page.flush();
  assert.equal(page.get('MileageBalanceCard').balance, 74910);
  assert.equal(card().props.accessibilityLabel, '누적 마일리지 74,910마일');
  page.unmount();
});

test('period changes hide the previous total immediately and discard late period responses', async () => {
  for (const result of ['success', 'error']) {
    const page = mount('../app/mileage/index.tsx');
    page.summaries[0].resolve({ accumulatedMileage: 5000 }); await page.flush();
    page.get('MileageHistory').onQueryChange({ period: 'custom', sort: 'latest', startDate: '2026. 08. 01', endDate: '2026. 08. 31' });
    const firstFrame = page.render(false);
    assert.equal(nodes(firstFrame).find(n => n.type?.name === 'MileageBalanceCard').props.balance, undefined);
    page.render();
    const previous = page.summaries[1];
    page.get('MileageHistory').onQueryChange({ period: 'custom', sort: 'latest', startDate: '2026. 09. 01', endDate: '2026. 09. 30' }); await page.flush();
    page.summaries[2].resolve({ accumulatedMileage: 1000 }); await page.flush();
    if (result === 'success') previous.resolve({ accumulatedMileage: 9999 });
    else previous.reject(new authApi.AuthApiError('이전 기간 오류'));
    await page.flush();
    assert.equal(page.get('MileageBalanceCard').balance, 1000);
    assert.equal(page.get('NoticeModal').visible, false);
    page.unmount();
  }
});

test('balance discards late successes and failures after blur, account changes and unmount', async () => {
  for (const result of ['success', 'error']) {
    const page = mount('../app/mileage/index.tsx');
    assert.equal(page.summaries.length, 1);
    const settle = pending => result === 'success'
      ? pending.resolve({ accumulatedMileage: 999 })
      : pending.reject(new authApi.AuthApiError('이전 계정 오류'));
    page.blur(); settle(page.summaries[0]); await page.flush();
    assert.equal(page.get('MileageBalanceCard').balance, undefined);
    assert.equal(page.get('NoticeModal').visible, false);
    page.focus();
    const oldUser = page.summaries.at(-1);
    page.auth.state = { status: 'signedIn', user: { id: 'user-2' } }; page.render();
    settle(oldUser); await page.flush();
    assert.equal(page.get('MileageBalanceCard').balance, undefined);
    assert.equal(page.get('NoticeModal').visible, false);
    page.summaries.at(-1).resolve({ accumulatedMileage: 20 }); await page.flush();
    assert.equal(page.get('MileageBalanceCard').balance, 20);
    page.auth.state = { status: 'signedIn', user: { id: 'user-3' } };
    const firstFrame = page.render(false);
    assert.equal(nodes(firstFrame).find(n => n.type?.name === 'MileageBalanceCard').props.balance, undefined);
    page.render();
    assert.equal(page.get('MileageBalanceCard').balance, undefined);
    const last = page.summaries.at(-1);
    page.unmount(); settle(last); await new Promise(resolve => setImmediate(resolve));
  }
});

test('simultaneous history and summary failures keep both retries and suppress duplicate summary requests', async () => {
  for (const first of ['history', 'summary']) {
    const page = mount('../app/mileage/index.tsx');
    assert.equal(page.summaries.length, 1);
    const failures = {
      history: () => page.calls[0].reject(new authApi.AuthApiError('내역 오류')),
      summary: () => page.summaries[0].reject(new authApi.AuthApiError('잔액 오류')),
    };
    failures[first](); await page.flush();
    failures[first === 'history' ? 'summary' : 'history'](); await page.flush();
    assert.equal(page.get('MileageBalanceCard').balance, undefined);
    const seen = [];
    for (let i = 0; i < 2; i++) {
      const notice = page.get('NoticeModal');
      assert.equal(notice.visible, true);
      assert.equal(notice.confirmLabel, '다시 시도');
      seen.push(notice.message);
      notice.onConfirm();
      if (notice.message === '잔액 오류') notice.onConfirm();
    }
    assert.deepEqual(seen.sort(), ['내역 오류', '잔액 오류']);
    assert.equal(page.calls.length, 2);
    assert.equal(page.summaries.length, 2);
    page.calls[1].resolve({ items: [], nextCursor: null });
    page.summaries[1].resolve({ accumulatedMileage: 0 }); await page.flush();
    assert.deepEqual(page.get('MileageHistory').items, []);
    assert.equal(page.get('MileageBalanceCard').balance, 0);
    assert.equal(page.get('NoticeModal').visible, false);
    page.unmount();
  }
});

test('summary failures and retry callbacks belong to their selected period and account', async () => {
  const page = mount('../app/mileage/index.tsx');
  assert.equal(page.summaries.length, 1);
  page.summaries[0].reject(new authApi.AuthApiError('잔액 오류')); await page.flush();
  const oldRetry = page.get('NoticeModal').onConfirm;
  page.get('MileageHistory').onQueryChange({ period: 'oneMonth', sort: 'latest', startDate: '', endDate: '' }); await page.flush();
  assert.equal(page.get('NoticeModal').visible, false);
  page.calls.at(-1).resolve({ items: [], nextCursor: null }); await page.flush();
  page.summaries[1].resolve({ accumulatedMileage: 40 }); await page.flush();
  oldRetry(); await page.flush();
  assert.equal(page.summaries.length, 2);
  assert.equal(page.get('MileageBalanceCard').balance, 40);
  page.blur(); page.focus();
  page.summaries[2].reject(new authApi.AuthApiError('이전 계정 오류')); await page.flush();
  const oldAccountRetry = page.get('NoticeModal').onConfirm;
  page.auth.state = { status: 'signedIn', user: { id: 'user-2' } }; page.render();
  page.summaries[3].resolve({ accumulatedMileage: 50 }); await page.flush();
  oldAccountRetry(); await page.flush();
  assert.equal(page.summaries.length, 4);
  assert.equal(page.get('MileageBalanceCard').balance, 50);
  page.unmount();
});

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
  assert.equal(page.get('MileagePhotoForm').locked, false);
  page.blur(); assert.equal(disposed, 2); page.unmount();
});

async function rejectedPage(platform = 'web', params = { id, status: 'rejected' }) {
  const page = mount('../app/mileage/[status].tsx', { 'react-native': { ...native, Platform: { OS: platform } } }, params);
  page.details[0].resolve({ ...item(id, params.status), submissionVersion: 'a'.repeat(64), photos: { receipt: 'path', meter: 'path' } }); await page.flush();
  for (let i = 0; i < 2; i++) { page.photos[i].resolve({ uri: `blob:${i}`, dispose() {} }); await page.flush(); }
  return page;
}

test('native photos open from pending and rejected detail without fetching, and all close paths preserve the form', async () => {
  for (const platform of ['ios', 'android']) for (const status of ['pending', 'rejected']) {
    const page = await rejectedPage(platform, { id, status });
    const open = page.get(status === 'pending' ? 'UploadCard' : 'MileagePhotoForm').onPreview;
    assert.equal(typeof open, 'function');
    for (const close of ['appbar', 'system', 'accessibility']) {
      open('blob:0', '요소수 영수증');
      assert.equal(page.get('Modal').visible, true);
      assert.equal(page.get('Image').source.uri, 'blob:0');
      assert.equal(page.get('Image').resizeMode, 'contain');
      assert.equal(page.get('AppBar').title, '요소수 영수증');
      if (close === 'appbar') page.get('AppBar').onBack();
      else if (close === 'system') page.get('Modal').onRequestClose();
      else page.get('SafeAreaView').onAccessibilityEscape();
      assert.equal(page.get('Modal'), undefined);
      assert.equal(page.get('Image'), undefined);
    }
    assert.equal(page.photos.length, 2);
    assert.equal(page.details.length, 1);
    assert.deepEqual(page.navigation, []);
    if (status === 'rejected') assert.equal(page.get('MileagePhotoForm').existingImages.receipt.uri, 'blob:0');
    page.unmount();
  }
});

test('native enlargement releases images on selection, submission, blur, account and application changes', async () => {
  for (const change of ['selection', 'submission', 'blur', 'account', 'application', 'error']) {
    const params = { id, status: 'rejected' };
    const page = await rejectedPage('ios', params);
    const open = page.get('MileagePhotoForm').onPreview;
    assert.equal(typeof open, 'function');
    open('blob:0', '요소수 영수증');
    assert.equal(page.get('Image').source.uri, 'blob:0');
    if (change === 'selection') page.get('MileagePhotoForm').onSelectionChange();
    if (change === 'submission') void page.get('MileagePhotoForm').onValidSubmit({ receipt: {}, dashboard: null });
    if (change === 'blur') page.blur();
    if (change === 'account') page.auth.state = { status: 'signedIn', user: { id: 'user-2' } };
    if (change === 'application') params.id = '22222222-2222-4222-8222-222222222222';
    if (change === 'error') page.get('Image').onError();
    assert.equal(nodes(page.render(false)).some(node => node.type === 'Modal'), false);
    page.render();
    if (['blur', 'account', 'application', 'submission', 'error'].includes(change)) {
      open('blob:0', '요소수 영수증');
      assert.equal(page.get('Modal'), undefined);
    }
    if (change === 'error') assert.equal(page.get('NoticeModal').confirmLabel, '다시 시도');
    if (change === 'blur') {
      page.focus();
      open('blob:0', '요소수 영수증');
      assert.equal(page.get('Modal'), undefined);
    }
    page.unmount();
  }
});

test('photo enlargement leaves web detail and new applications unchanged', async () => {
  for (const status of ['pending', 'rejected']) {
    const page = await rejectedPage('web', { id, status });
    assert.equal(page.get(status === 'pending' ? 'UploadCard' : 'MileagePhotoForm').onPreview, undefined);
    assert.equal(page.get('Modal'), undefined);
    page.unmount();
  }
  const page = mount('../app/mileage/apply.tsx');
  assert.equal(page.get('MileagePhotoForm').onPreview, undefined);
  page.unmount();
});

test('closed photo callbacks cannot close a newer photo or show a stale image error', async () => {
  const page = await rejectedPage('ios');
  page.get('MileagePhotoForm').onPreview('blob:0', '요소수 영수증');
  const oldError = page.get('Image').onError;
  const oldClose = page.get('Modal').onRequestClose;
  oldClose(); page.render(); oldError();
  assert.equal(page.get('NoticeModal').visible, false);
  page.get('MileagePhotoForm').onPreview('blob:1', '요소수 계기판');
  oldClose(); oldError();
  assert.equal(page.get('Image').source.uri, 'blob:1');
  assert.equal(page.get('NoticeModal').visible, false);
  page.unmount();
});

test('native preview and removal are sibling touch targets and empty cards keep choosing photos', () => {
  for (const platform of ['ios', 'android', 'web']) {
    const card = load('../components/mileage/UploadCard.tsx', {
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'react-native': { ...native, Platform: { OS: platform } },
      '../../constants/theme': { colors: {}, typography: {} },
      '../icons/CloseIcon': { CloseIcon: 'CloseIcon' },
      '../icons/DashboardIcon': { DashboardIcon: 'DashboardIcon' },
      '../icons/ReceiptIcon': { ReceiptIcon: 'ReceiptIcon' },
    }).UploadCard;
    const opened = []; let removed = 0, chosen = 0;
    const props = { error: false, kind: 'receipt', image: { uri: 'selected:receipt' }, onPreview: (...args) => opened.push(args), onRemove: () => removed++, onChoose: () => chosen++ };
    const tree = card(props);
    const preview = nodes(tree).find(node => node.props?.accessibilityLabel === '요소수 영수증 크게 보기');
    const remove = nodes(tree).find(node => node.props?.accessibilityLabel === '요소수 영수증 사진 삭제');
    if (platform === 'web') assert.equal(preview, undefined);
    else {
      assert.ok(preview);
      assert.equal(nodes(preview).includes(remove), false);
      preview.props.onPress();
      assert.deepEqual(opened, [['selected:receipt', '요소수 영수증']]);
      assert.equal(removed, 0);
      const disabled = nodes(card({ ...props, disabled: true })).find(node => node.props?.accessibilityLabel === '요소수 영수증 크게 보기');
      assert.equal(disabled.props.disabled, true);
    }
    remove.props.onPress(); assert.equal(removed, 1);
    const empty = card({ ...props, image: null });
    nodes(empty).find(node => node.type === 'Pressable').props.onPress();
    assert.equal(chosen, 1);
    assert.equal(nodes(empty).some(node => node.props?.accessibilityLabel === '요소수 영수증 크게 보기'), false);
  }
});

test('rejected detail submits selected photos once and preserves key/bytes for retry', async () => {
  const page = await rejectedPage();
  const selection = { receipt: null, dashboard: { uri: 'replacement' } };
  let disposed = 0;
  const input = { key: 'new-key', submissionVersion: 'a'.repeat(64), meter: { uri: 'prepared' }, dispose: () => disposed++ };
  const first = page.get('MileagePhotoForm').onValidSubmit(selection);
  void page.get('MileagePhotoForm').onValidSubmit(selection);
  assert.equal(page.preparations.length, 1);
  assert.equal(page.preparations[0].selection, selection);
  assert.equal(page.preparations[0].submissionVersion, input.submissionVersion);
  page.preparations[0].resolve(input); await page.flush();
  page.calls[0].reject(new authApi.AuthApiError('연결 실패', 'NETWORK_ERROR')); await first; await page.flush();
  assert.equal(disposed, 0); assert.equal(page.get('NoticeModal').message, '연결 실패');
  page.get('NoticeModal').onConfirm();
  const second = page.get('MileagePhotoForm').onValidSubmit(selection); await page.flush();
  assert.equal(page.preparations.length, 1);
  assert.equal(page.calls[1].input, input); assert.equal(page.calls[1].id, id);
  page.calls[1].resolve({ ...item(id), submissionVersion: 'b'.repeat(64) }); await second; await page.flush();
  assert.equal(disposed, 1); assert.equal(page.get('MileagePhotoForm').locked, true);
  assert.deepEqual(page.navigation, []);
  const confirm = page.get('NoticeModal').onConfirm;
  confirm(); confirm(); assert.deepEqual(page.navigation, ['/mileage']);
  page.unmount();
});

test('resubmission ignores preparation and request completion after blur or account changes', async () => {
  for (const stage of ['preparation', 'request']) for (const leave of ['blur', 'account']) {
    const page = await rejectedPage();
    let disposed = 0;
    const submit = page.get('MileagePhotoForm').onValidSubmit({ receipt: {}, dashboard: null });
    const input = { key: id, dispose: () => disposed++ };
    if (stage === 'request') { page.preparations[0].resolve(input); await page.flush(); }
    if (leave === 'blur') page.blur();
    else { page.auth.state = { status: 'signedIn', user: { id: 'user-2' } }; page.render(); }
    if (stage === 'preparation') page.preparations[0].resolve(input);
    else { assert.equal(page.calls[0].signal.aborted, true); page.calls[0].resolve(item(id)); }
    await submit; await page.flush();
    assert.equal(disposed, 1); assert.equal(page.get('NoticeModal').visible, false); assert.deepEqual(page.navigation, []);
    page.unmount();
  }
});

test('reselection releases the failed attempt and stale notices cannot affect a new account', async () => {
  const page = await rejectedPage();
  let disposed = 0;
  const submit = page.get('MileagePhotoForm').onValidSubmit({ receipt: {}, dashboard: null });
  page.preparations[0].resolve({ key: 'first-key', dispose: () => disposed++ }); await page.flush();
  page.calls[0].reject(new authApi.AuthApiError('실패')); await submit; await page.flush();
  page.get('NoticeModal').onConfirm();
  page.get('MileagePhotoForm').onSelectionChange(); assert.equal(disposed, 1);
  const second = page.get('MileagePhotoForm').onValidSubmit({ receipt: null, dashboard: {} });
  assert.equal(page.preparations.length, 2);
  page.preparations[1].resolve({ key: 'second-key', dispose: () => disposed++ }); await page.flush();
  assert.equal(page.calls[1].input.key, 'second-key');
  page.calls[1].resolve(item(id)); await second; await page.flush();
  const confirm = page.get('NoticeModal').onConfirm;
  page.auth.state = { status: 'signedIn', user: { id: 'user-2' } };
  const firstFrame = page.render(false);
  assert.equal(nodes(firstFrame).some(node => node.type === 'MileagePhotoForm'), false);
  assert.equal(nodes(firstFrame).find(node => node.type === 'NoticeModal').props.visible, false);
  assert.equal(nodes(firstFrame).filter(node => node.type === 'UploadCard').every(node => node.props.image === null), true);
  confirm(); page.render(); assert.deepEqual(page.navigation, []);
  page.unmount();
});

test('stale submission conflict refetches current detail and releases only new prepared copies', async () => {
  const page = await rejectedPage();
  let disposed = 0;
  const submit = page.get('MileagePhotoForm').onValidSubmit({ receipt: {}, dashboard: null });
  page.preparations[0].resolve({ key: id, dispose: () => disposed++ }); await page.flush();
  page.calls[0].reject(new authApi.AuthApiError('상태 변경', 'MILEAGE_RESUBMISSION_CONFLICT', 409)); await submit; await page.flush();
  assert.equal(page.get('NoticeModal').confirmLabel, '다시 시도');
  page.get('NoticeModal').onConfirm(); await page.flush();
  assert.equal(disposed, 1); assert.equal(page.details.length, 2);
  page.unmount();
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
  const first = await photos.prepareMileageSubmission({ photoMode: 'separate', receipt: image, dashboard: image });
  assert.equal(conversions.length, 0); assert.notEqual(first.receipt.uri, image.uri);
  first.dispose(); assert.equal(removed.length, 2); assert.ok(!removed.includes(image.uri));
  const second = await photos.prepareMileageSubmission({ photoMode: 'separate', receipt: { ...image, fileSize: image.fileSize+1 }, dashboard: { ...image, height: 4097 } });
  assert.equal(conversions.length, 2); assert.equal(conversions[0].resize, undefined);
  assert.deepEqual(conversions[1].resize, { height: 4096 });
  assert.deepEqual(conversions[0].options, { compress: .9, format: 'jpeg' });
  second.dispose(); assert.equal(removed.length, 4);
  assert.equal(photos.validateMileagePhoto({ ...image, mimeType: 'image/webp' }), 'image/webp');
  for (const [asset, code] of [[{ ...image, mimeType:'image/gif' }, 'UNSUPPORTED_PHOTO_TYPE'], [{ ...image, fileSize: 50*1024*1024+1 }, 'PHOTO_TOO_LARGE'], [{ ...image, fileSize: undefined }, 'PHOTO_SIZE_UNAVAILABLE'], [{ ...image, width: 0 }, 'INVALID_PHOTO']]) {
    assert.throws(() => photos.validateMileagePhoto(asset), { code });
  }
  assert.equal(photos.validateMileagePhoto({ ...image, fileSize: 50*1024*1024 }), 'image/jpeg');
  const replacement = await photos.prepareMileageResubmission({ photoMode: 'separate', receipt: null, dashboard: image }, 'a'.repeat(64));
  assert.equal(replacement.receipt, undefined); assert.equal(replacement.submissionVersion, 'a'.repeat(64));
  assert.equal(files.size, 1); replacement.dispose(); assert.equal(files.size, 0);
  await assert.rejects(photos.prepareMileageResubmission({ photoMode: 'separate', receipt: null, dashboard: null }, 'a'.repeat(64)), { code: 'PHOTO_REQUIRED' });
  await assert.rejects(photos.prepareMileageResubmission({ photoMode: 'single', receipt: null, dashboard: image }, 'a'.repeat(64)), { code: 'PHOTO_REQUIRED' });
  const combined = await photos.prepareMileageSubmission({ photoMode: 'single', receipt: image, dashboard: null });
  assert.equal(combined.meter, undefined); assert.equal(files.size, 1); combined.dispose();
  await assert.rejects(photos.prepareMileageSubmission({ photoMode: 'separate', receipt: image, dashboard: null }), { code: 'PHOTO_REQUIRED' });
  failRender = true;
  await assert.rejects(photos.prepareMileageSubmission({ photoMode: 'separate', receipt: image, dashboard: { ...image, width: 5000 } }), { code: 'PHOTO_PREPARATION_FAILED' });
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


test('photo mode defaults to one, preserves both selections and ignores late picker results after switching', async () => {
  const submits = [], notices = [], picks = [];
  const formProps = { intro: '적립 이미지 업로드', requirement: 'both', submitLabel: '사진등록', onValidSubmit: value => submits.push(value) };
  const page = mount('../components/mileage/MileagePhotoForm.tsx', {
    formProps,
    'expo-image-picker': { launchImageLibraryAsync: () => { const pick = deferred(); picks.push(pick); return pick.promise; } },
    '../../utils/alerts': { useAlerts: () => ({ showImageSourceActions: actions => actions.onLibrary(), showAuthErrorAlert: message => notices.push(message), showMileageImagesRequiredAlert: () => notices.push('both') }) },
    '../../utils/mileagePhotos': { validateMileagePhoto: () => {} },
    '../auth/PrimaryButton': { PrimaryButton: 'PrimaryButton' },
    './UploadCard': { UploadCard: 'UploadCard' },
  });
  const cards = () => nodes(page.render()).filter(node => node.type === 'UploadCard').map(node => node.props);
  const toggle = label => nodes(page.render()).find(node => node.props?.accessibilityLabel === label).props.onPress();
  const pick = async (card, uri) => { card.onChoose(); picks.at(-1).resolve({ canceled: false, assets: [{ uri }] }); await page.flush(); };
  assert.equal(cards().length, 1); assert.equal(cards()[0].kind, 'combined');
  assert.equal(nodes(page.render()).find(node => node.props?.accessibilityLabel === '1장').props['aria-checked'], true);
  page.get('PrimaryButton').onPress(); assert.equal(submits.length, 0); assert.equal(notices.length, 1);
  await pick(cards()[0], 'combined.jpg');
  toggle('2장'); assert.equal(cards().length, 2);
  await pick(cards()[0], 'receipt.jpg');
  await pick(cards()[1], 'meter.jpg');
  page.get('PrimaryButton').onPress();
  assert.equal(submits.at(-1).photoMode, 'separate'); assert.equal(submits.at(-1).dashboard.uri, 'meter.jpg');
  toggle('1장'); assert.equal(cards()[0].image.uri, 'combined.jpg');
  page.get('PrimaryButton').onPress(); assert.equal(submits.at(-1).photoMode, 'single'); assert.equal(submits.at(-1).dashboard, null);
  cards()[0].onChoose(); toggle('2장');
  picks.at(-1).resolve({ canceled: false, assets: [{ uri: 'late.jpg' }] }); await page.flush();
  assert.equal(cards()[0].image.uri, 'receipt.jpg');
  toggle('1장'); assert.equal(cards()[0].image.uri, 'combined.jpg');
  formProps.locked = true; toggle('2장'); assert.equal(cards().length, 1);
  page.unmount();
});

test('first-use guide locks uploads, records only confirmation and stays dismissed across visits and users', () => {
  let confirmed = false;
  const extras = { '../../utils/mileagePhotoGuide': {
    hasConfirmedMileagePhotoGuide: () => confirmed,
    confirmMileagePhotoGuide: () => { confirmed = true; },
  } };
  const page = mount('../app/mileage/apply.tsx', extras);
  assert.equal(page.get('NoticeModal').accessibilityLabel, '사진 등록 방법');
  assert.equal(page.get('NoticeModal').visible, true);
  assert.equal(page.get('MileagePhotoForm').locked, true);
  page.get('MileagePhotoForm').onValidSubmit({});
  assert.equal(page.preparations.length, 0);
  const lateConfirm = page.get('NoticeModal').onConfirm;
  page.blur(); lateConfirm(); assert.equal(confirmed, false);
  page.focus(); assert.equal(page.get('NoticeModal').visible, true);
  page.get('NoticeModal').onRequestClose(); assert.equal(confirmed, false);
  page.blur(); page.focus(); page.get('NoticeModal').onConfirm();
  assert.equal(confirmed, true); assert.equal(page.get('MileagePhotoForm').locked, false);
  page.blur(); page.focus(); assert.equal(page.get('NoticeModal').visible, false);
  page.auth.state.user.id = 'another-user'; assert.equal(page.get('NoticeModal').visible, false);
  page.unmount();
  const reopened = mount('../app/mileage/apply.tsx', extras);
  assert.equal(reopened.get('NoticeModal').visible, false); reopened.unmount();
});

test('manual guide reopens after confirmation and blocks submission while visible', () => {
  let confirmations = 0;
  const page = mount('../app/mileage/apply.tsx', { '../../utils/mileagePhotoGuide': {
    hasConfirmedMileagePhotoGuide: () => true,
    confirmMileagePhotoGuide: () => { confirmations += 1; },
  } });
  assert.equal(page.get('NoticeModal').visible, false);
  assert.equal(page.get('MileagePhotoForm').locked, false);

  page.get('MileagePhotoForm').onOpenGuide();
  assert.equal(page.get('NoticeModal').visible, true);
  assert.equal(page.get('MileagePhotoForm').locked, true);
  page.get('MileagePhotoForm').onValidSubmit({});
  assert.equal(page.preparations.length, 0);
  assert.deepEqual(page.navigation, []);

  page.get('NoticeModal').onRequestClose();
  assert.equal(page.get('NoticeModal').visible, false);
  assert.equal(page.get('MileagePhotoForm').locked, false);
  assert.equal(confirmations, 0);

  page.get('MileagePhotoForm').onOpenGuide();
  assert.equal(page.get('NoticeModal').visible, true);
  assert.equal(page.get('MileagePhotoForm').locked, true);
  assert.equal(page.preparations.length, 0);
  assert.deepEqual(page.navigation, []);
  page.unmount();
});

test('guide confirmation persists on web and native and storage failures do not block this run', () => {
  for (const os of ['web', 'ios', 'android']) {
    let stored = false, unavailable = false;
    const imports = {
      'react-native': { Platform: { OS: os } },
      'expo-file-system': { Paths: { document: 'documents' }, File: class {
        get exists() { if (unavailable) throw new Error('unavailable'); return stored; }
        write(value) { if (unavailable) throw new Error('unavailable'); assert.equal(value, '1'); stored = true; }
      } },
      localStorage: {
        getItem() { if (unavailable) throw new Error('unavailable'); return stored ? '1' : null; },
        setItem(_key, value) { if (unavailable) throw new Error('unavailable'); assert.equal(value, '1'); stored = true; },
      },
    };
    let guide = load('../utils/mileagePhotoGuide.ts', imports);
    assert.equal(guide.hasConfirmedMileagePhotoGuide(), false); guide.confirmMileagePhotoGuide();
    assert.equal(load('../utils/mileagePhotoGuide.ts', imports).hasConfirmedMileagePhotoGuide(), true);
    stored = false; unavailable = true; guide = load('../utils/mileagePhotoGuide.ts', imports);
    assert.equal(guide.hasConfirmedMileagePhotoGuide(), false);
    assert.doesNotThrow(() => guide.confirmMileagePhotoGuide());
    assert.equal(guide.hasConfirmedMileagePhotoGuide(), true);
  }
});
