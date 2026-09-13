import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const source = compile('../app/reset-password.tsx');
const apiSource = compile('../utils/authApi.ts');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const nodes = (tree) => !tree || typeof tree !== 'object' ? [] :
  [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const tokenA = 'a'.repeat(43), tokenB = 'b'.repeat(43);

function mount(token = tokenA, status = 'signedOut') {
  const calls = [], navigation = [], globalNotices = [], slots = [];
  let index = 0, focused = true, callback, previousCallback, cleanup, restores = 0;
  const state = { token, validation: null };
  const slot = (initial) => {
    const key = index++;
    if (!(key in slots)) slots[key] = initial;
    return key;
  };
  const react = {
    useState(initial) {
      const key = slot(initial);
      return [slots[key], (value) => { slots[key] = typeof value === 'function' ? value(slots[key]) : value; }];
    },
    useRef(initial) { return slots[slot({ current: initial })]; },
    useCallback(fn, dependencies) {
      const key = slot(null), previous = slots[key];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        slots[key] = { fn, dependencies };
      }
      return slots[key].fn;
    },
  };
  const router = { replace: (path) => navigation.push(path) };
  const form = {
    formState: { errors: {}, isSubmitting: false },
    reset() {}, watch: () => '',
    handleSubmit: (fn) => async () => {
      await state.validation;
      await fn({ password: 'Password!1', passwordConfirmation: 'Password!1' });
    },
  };
  const api = {};
  new Function('exports', 'process', 'fetch', apiSource)(api,
    { env: { EXPO_PUBLIC_API_URL: 'http://localhost:8080' } },
    (url, options) => {
      const pending = Promise.withResolvers();
      calls.push({ url, body: JSON.parse(options.body), ...pending });
      return pending.promise;
    });
  const jsx = (type, props) => ({ type, props });
  const alerts = { showAuthErrorAlert: (message, onConfirm) => {
    if (globalNotices.at(-1)?.onConfirm) return;
    globalNotices.push({ message, onConfirm });
  } };
  const imports = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { StyleSheet: { create: (value) => value }, View: 'View' },
    'expo-router': { useFocusEffect: (fn) => { callback = fn; }, useRouter: () => router,
      useLocalSearchParams: () => ({ token: state.token }) },
    'react-hook-form': { useForm: () => form, Controller: 'Controller' },
    '../components/AuthProvider': { useAuth: () => ({ state: { status }, restore: async () => { restores++; } }) },
    '../utils/authApi': api,
    '../utils/alerts': { useAlerts: () => alerts },
    '../utils/validation': { validatePassword: () => true, validatePasswordConfirmation: () => true },
  };
  for (const name of ['AppScreen', 'NoticeModal', 'auth/FormTextField', 'auth/PrimaryButton']) {
    imports[`../components/${name}`] = { [name.split('/').at(-1)]: name.split('/').at(-1) };
  }
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    assert.ok(imports[name], `Unexpected import ${name}`);
    return imports[name];
  }, exports);
  const page = {
    calls, navigation, globalNotices, state,
    render() {
      index = 0;
      const tree = exports.default();
      if (focused && callback !== previousCallback) {
        cleanup?.(); previousCallback = callback; cleanup = callback();
      }
      return tree;
    },
    blur() { focused = false; cleanup?.(); cleanup = undefined; previousCallback = undefined; },
    focus() { focused = true; page.render(); },
    changeToken(next) { state.token = next; page.render(); },
    async respond(index, status = 204, message = 'failed', code = 'INTERNAL_SERVER_ERROR') {
      calls[index].resolve(status === 204 ? new Response(null, { status }) :
        Response.json({ message, code }, { status }));
      await tick(); page.render();
    },
    error() { return nodes(page.render()).find((node) => node.type === 'NoticeModal' &&
      node.props?.accessibilityLabel === '요청을 확인해주세요.' && node.props.visible)?.props; },
    button() { return nodes(page.render()).find((node) => node.props?.label === '비밀번호 변경')?.props; },
    completed() { return nodes(page.render()).find((node) => node.props && 'onLogin' in node.props)?.props; },
    restores: () => restores,
  };
  page.render();
  return page;
}

test('a replacement link retains its own error and retry instead of a stale global notice', async () => {
  const page = mount();
  await page.respond(0, 500, 'A failure');
  const stale = page.error();
  page.changeToken(tokenB);
  await page.respond(1, 500, 'B failure');
  const current = page.error();
  assert.equal(current?.message, '요청을 확인해주세요.\nB failure');
  assert.equal(current.confirmLabel, '확인');
  stale.onConfirm();
  assert.equal(page.calls.length, 2);
  current.onRequestClose();
  assert.ok(page.error());
  current.onConfirm(); page.render();
  assert.equal(page.calls[2].body.token, tokenB);
  await page.respond(2);
  assert.ok(page.button());
  assert.deepEqual(page.globalNotices, []);
});

test('invalid replacement links redirect only from the current error confirmation', async () => {
  for (const [status, destination] of [['signedOut', '/find-password'], ['signedIn', '/mypage']]) {
    const page = mount(tokenA, status);
    await page.respond(0, 500, 'A failure');
    const stale = page.error();
    page.changeToken(tokenB);
    await page.respond(1, 400, 'invalid B', 'PASSWORD_RESET_INVALID');
    assert.equal(page.error()?.message, '요청을 확인해주세요.\ninvalid B');
    stale.onConfirm(); assert.deepEqual(page.navigation, []);
    page.error().onConfirm(); assert.deepEqual(page.navigation, [destination]);
    assert.equal(page.button(), undefined);
  }
});

test('late validation responses and stale focus callbacks cannot change the current link', async () => {
  const page = mount();
  page.changeToken(tokenB);
  await page.respond(1);
  await page.respond(0, 400, 'late A', 'PASSWORD_RESET_INVALID');
  assert.ok(page.button()); assert.equal(page.error(), undefined);
  page.blur(); page.focus();
  await page.respond(2, 500, 'old focus');
  const stale = page.error();
  page.blur(); page.focus();
  await page.respond(3, 500, 'new focus');
  assert.equal(page.error()?.message, '요청을 확인해주세요.\nnew focus');
  stale.onConfirm(); assert.equal(page.calls.length, 4);
  page.error().onConfirm(); page.render();
  await page.respond(4);
  assert.ok(page.button());
});

test('only a 204 validation response exposes the form, and malformed tokens never call the API', async () => {
  const page = mount();
  assert.equal(page.button(), undefined);
  await page.respond(0, 200, 'not a validation success');
  assert.equal(page.button(), undefined); assert.ok(page.error());
  page.error().onConfirm(); page.render(); await page.respond(1);
  assert.ok(page.button());
  for (const token of ['', ['ambiguous']]) {
    const invalid = mount(token);
    assert.equal(invalid.calls.length, 0); assert.ok(invalid.error());
  }
});

test('reset failures remain dismissible and a successful reset preserves the login flow', async () => {
  const page = mount(); await page.respond(0);
  const failed = page.button().onPress(); await tick();
  await page.respond(1, 500, 'reset failure'); await failed;
  assert.equal(page.error()?.message, '요청을 확인해주세요.\nreset failure');
  page.error().onRequestClose(); assert.equal(page.error(), undefined);
  assert.equal(page.completed().visible, false);
  const success = page.button().onPress(); await tick();
  assert.deepEqual(page.calls[2].body, { token: tokenA, newPassword: 'Password!1' });
  await page.respond(2); await success;
  assert.equal(page.completed().visible, true);
  page.completed().onLogin();
  assert.deepEqual(page.navigation, ['/']); assert.equal(page.restores(), 1);
});

test('a token rejected during reset removes the form until the current error redirects', async () => {
  const page = mount(); await page.respond(0);
  const pending = page.button().onPress(); await tick();
  await page.respond(1, 400, 'consumed token', 'PASSWORD_RESET_INVALID'); await pending;
  assert.equal(page.button(), undefined);
  assert.equal(page.error()?.message, '요청을 확인해주세요.\nconsumed token');
  page.error().onConfirm(); assert.deepEqual(page.navigation, ['/find-password']);
});

test('link replacement during asynchronous form validation cannot submit the old token', async () => {
  const page = mount(); await page.respond(0);
  const validation = Promise.withResolvers();
  page.state.validation = validation.promise;
  const pending = page.button().onPress();
  page.changeToken(tokenB); await page.respond(1);
  validation.resolve(); await pending;
  assert.equal(page.calls.length, 2);
  assert.ok(page.button());
  assert.equal(page.completed().visible, false);
});
