import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../app/mypage.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const nodes = (tree) => !tree || typeof tree !== 'object' ? [] :
  [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const profile = { email: 'driver@example.test', name: 'Original', phone: '010-1234-5678', marketingConsent: false };

// Run the real route handlers with controlled focus, form-validation and HTTP completion.
async function mount() {
  const slots = [];
  let index = 0, focused = true, focusCallback, cleanup, previousFocus, tree;
  const state = { name: profile.name, errors: [], proofResets: 0, proofValid: true, validation: null };
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
    useCallback(callback, dependencies) {
      const key = slot(null), previous = slots[key];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        slots[key] = { callback, dependencies };
      }
      return slots[key].callback;
    },
  };
  const form = {
    values: { ...profile, verificationCode: '', verificationProof: '' },
    formState: { errors: {}, isSubmitting: false },
    getValues: () => form.values,
    reset: (values) => { form.values = { ...values }; },
    setValue: (key, value) => { form.values[key] = value; },
    watch: (keys) => keys.map((key) => form.values[key]),
    handleSubmit: (callback) => async () => {
      const values = { ...form.values }, validation = state.validation;
      form.formState.isSubmitting = true;
      try { await validation; await callback(values); }
      finally { form.formState.isSubmitting = false; }
    },
  };
  const api = {
    getProfile: async () => ({ ...profile, name: state.name }),
    updateProfile: async (changes) => ({ ...profile, ...changes }),
    changePhone: async () => {},
    requestMyPasswordResetEmail: async () => ({ email: profile.email }),
    getAuthErrorMessage: (error) => error.message,
  };
  const auth = {
    request: (action) => action({ token: 'test-session' }),
    updateName: (name) => { state.name = name; },
    signOut: async () => {}, withdraw: async () => {},
  };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { StyleSheet: { create: (value) => value }, View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'expo-router': { useFocusEffect: (callback) => { focusCallback = callback; } },
    'react-hook-form': { useForm: () => form, FormProvider: 'FormProvider', Controller: 'Controller' },
    '../components/AuthProvider': { useAuth: () => auth },
    '../constants/theme': { colors: {}, typography: {} },
    '../hooks/usePhoneVerification': { usePhoneVerification: () => ({
      isProofValid: (values) => state.proofValid && values.verificationProof === 'proof',
      resetVerification: () => { state.proofResets++; }, revision: 0,
    }) },
    '../utils/authApi': api,
    '../utils/inputFormat': { formatName: (value) => value },
    '../utils/alerts': { useAlerts: () => ({
      showAuthErrorAlert: (message) => state.errors.push(message),
      showPhoneVerificationRequiredAlert: () => state.errors.push('proof-required'),
    }) },
  };
  for (const name of ['AppScreen', 'NoticeModal', 'auth/FormTextField', 'auth/LegalDocumentLink',
    'auth/PhoneVerificationSection', 'auth/PrimaryButton', 'icons/CheckSquareIcon']) {
    imports[`../components/${name}`] = { [name.split('/').at(-1)]: name.split('/').at(-1) };
  }
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    assert.ok(imports[name], `Unexpected import ${name}`);
    return imports[name];
  }, exports);
  const page = {
    state, form, api, auth,
    render() {
      index = 0;
      tree = exports.default();
      if (focused && focusCallback !== previousFocus) {
        cleanup?.();
        previousFocus = focusCallback;
        cleanup = focusCallback();
      }
      return tree;
    },
    blur() { focused = false; cleanup?.(); cleanup = undefined; previousFocus = undefined; },
    async focus() { focused = true; page.render(); await tick(); page.render(); },
    button() { return nodes(page.render()).find((node) => node.props?.label === '정보 변경하기').props; },
    notice() { return nodes(page.render()).find((node) => node.props && 'notice' in node.props).props.notice; },
    resetLink() {
      nodes(page.render()).find((node) => node.type === 'Pressable' &&
        nodes(node).some((child) => child.props?.children === '비밀번호 재설정')).props.onPress();
    },
    account(action = '로그아웃') {
      nodes(page.render()).find((node) => node.type === 'Pressable' &&
        nodes(node).some((child) => child.props?.children === action)).props.onPress();
      const modal = nodes(page.render()).find((node) => node.props?.accessibilityLabel === `${action} 확인`);
      modal.props.onConfirm();
    },
  };
  await page.focus();
  return page;
}

test('a late save after leaving cannot overwrite the current name or start phone change', async () => {
  const page = await mount(), old = deferred();
  let phoneCalls = 0;
  page.api.updateProfile = () => old.promise;
  page.api.changePhone = async () => { phoneCalls++; };
  Object.assign(page.form.values, { name: 'Earlier', phone: '010-9999-5678', verificationProof: 'proof' });
  const pending = page.button().onPress();
  await tick();
  page.blur();
  page.state.name = 'Later';
  old.resolve({ ...profile, name: 'Earlier' });
  await pending;
  assert.equal(page.state.name, 'Later');
  assert.equal(phoneCalls, 0);
  assert.equal(page.notice(), null);
  assert.equal(page.state.proofResets, 0);
});

test('leaving during asynchronous validation prevents the save request', async () => {
  const page = await mount(), validation = deferred();
  let updates = 0;
  page.api.updateProfile = async () => { updates++; return profile; };
  page.state.validation = validation.promise;
  page.form.values.name = 'Earlier';
  const pending = page.button().onPress();
  page.blur();
  await page.focus();
  validation.resolve();
  await pending;
  assert.equal(updates, 0);
  assert.equal(page.notice(), null);
});

test('old save completion cannot unlock or clear proof for a new focused save', async () => {
  const page = await mount(), old = deferred(), current = deferred();
  let updates = 0;
  page.api.updateProfile = () => ++updates === 1 ? old.promise : current.promise;
  Object.assign(page.form.values, { name: 'Earlier', phone: '010-9999-5678', verificationProof: 'proof' });
  const first = page.button().onPress();
  await tick();
  page.blur(); await page.focus();
  Object.assign(page.form.values, { name: 'Later', verificationProof: 'new-proof' });
  const second = page.button().onPress();
  await tick();
  old.reject(new Error('old failure'));
  await first;
  assert.deepEqual(page.state.errors, []);
  assert.equal(page.form.values.verificationProof, 'new-proof');
  assert.equal(page.button().disabled, true);
  await page.button().onPress();
  assert.equal(updates, 2);
  current.resolve({ ...profile, name: 'Later' });
  await second;
  assert.equal(page.state.name, 'Later');
  assert.deepEqual(page.notice(), { type: 'profile-updated' });
});

test('normal save succeeds and phone changes still require proof', async () => {
  const page = await mount();
  page.form.values.name = 'Current';
  await page.button().onPress();
  assert.equal(page.state.name, 'Current');
  assert.deepEqual(page.notice(), { type: 'profile-updated' });
  let calls = 0;
  page.api.changePhone = async () => { calls++; };
  page.form.values.phone = '010-9999-5678';
  await page.button().onPress();
  assert.equal(calls, 0);
  assert.deepEqual(page.state.errors, ['proof-required']);
});

test('old reset-mail completion preserves the new focus proof and busy state', async () => {
  const page = await mount(), old = deferred(), current = deferred();
  let mails = 0;
  page.api.requestMyPasswordResetEmail = () => ++mails === 1 ? old.promise : current.promise;
  page.resetLink();
  page.blur(); await page.focus();
  page.form.values.verificationProof = 'proof'; page.resetLink();
  old.reject(new Error('old mail failure')); await tick();
  assert.deepEqual(page.state.errors, []);
  assert.equal(page.form.values.verificationProof, 'proof');
  assert.equal(page.button().disabled, true);
  page.resetLink(); assert.equal(mails, 2);
  current.resolve({ email: profile.email }); await tick();
  assert.deepEqual(page.notice(), { email: profile.email, type: 'password-reset-sent' });
  assert.equal(page.form.values.verificationProof, 'proof');
});

test('reset button sends without SMS proof even when the phone field is edited', async () => {
  const page = await mount();
  let mails = 0;
  page.form.values.phone = '010-9999-5678';
  page.api.requestMyPasswordResetEmail = async (session) => {
    assert.deepEqual(session, { token: 'test-session' });
    mails++;
    return { email: profile.email };
  };
  page.resetLink(); await tick();
  assert.equal(mails, 1);
  assert.deepEqual(page.state.errors, []);
  assert.deepEqual(page.notice(), { email: profile.email, type: 'password-reset-sent' });
});

test('late account failures do not open errors outside the originating focus', async () => {
  for (const action of ['로그아웃', '회원탈퇴']) {
    const page = await mount(), old = deferred();
    page.auth.signOut = page.auth.withdraw = () => old.promise;
    page.account(action); page.blur(); await page.focus();
    old.reject(new Error('old account failure')); await tick();
    assert.deepEqual(page.state.errors, []);
  }
});

test('a verified unchanged profile saves through the API and only completes after success', async () => {
  const page = await mount(), response = deferred(), calls = [];
  page.api.updateProfile = (changes) => { calls.push(changes); return response.promise; };
  assert.equal(page.button().disabled, true);
  page.form.values.verificationProof = 'invalid-proof';
  assert.equal(page.button().disabled, true);
  await page.button().onPress();
  assert.deepEqual(calls, []);

  page.form.values.verificationProof = 'proof';
  assert.equal(page.button().disabled, false);
  const pending = page.button().onPress();
  await tick();
  assert.deepEqual(calls, [{ name: profile.name }]);
  assert.equal(page.notice(), null);
  assert.equal(page.button().disabled, true);
  await page.button().onPress();
  assert.equal(calls.length, 1);
  response.resolve(profile);
  await pending;
  assert.deepEqual(page.notice(), { type: 'profile-updated' });
  assert.equal(page.form.values.verificationProof, '');
  assert.equal(page.button().disabled, true);
});

test('a failed unchanged save unlocks for retry without resending SMS or showing success', async () => {
  const page = await mount();
  let calls = 0;
  page.api.updateProfile = async () => { calls++; throw new Error('save failed'); };
  page.form.values.verificationProof = 'proof';
  await page.button().onPress();
  assert.equal(page.notice(), null);
  assert.deepEqual(page.state.errors, ['save failed']);
  assert.equal(page.form.values.verificationProof, 'proof');
  assert.equal(page.state.proofResets, 0);
  assert.equal(page.button().disabled, false);
  await page.button().onPress();
  assert.equal(calls, 2);
});

test('proof expiry during validation prevents unchanged saves and phone changes', async () => {
  for (const changePhone of [false, true]) {
    const page = await mount(), validation = deferred();
    let calls = 0;
    page.api.updateProfile = page.api.changePhone = async () => { calls++; return profile; };
    page.form.values.verificationProof = 'proof';
    if (changePhone) page.form.values.phone = '010-9999-5678';
    page.state.validation = validation.promise;
    const pending = page.button().onPress();
    page.state.proofValid = false;
    validation.resolve(); await pending;
    assert.equal(calls, 0);
    assert.equal(page.notice(), null);
    assert.equal(page.form.values.verificationProof, '');
    assert.deepEqual(page.state.errors, ['proof-required']);
    assert.equal(page.button().disabled, !changePhone);
  }
});
