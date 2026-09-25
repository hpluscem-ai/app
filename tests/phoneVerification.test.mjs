import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createFormControl } from 'react-hook-form';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function load(source, imports = {}) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(source, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  );
  new Function('require', 'module', 'exports', outputText)(
    (name) => imports[name] ?? require(name), module, module.exports,
  );
  return module.exports;
}

const validation = load('../utils/validation.ts');
const inputFormat = load('../utils/inputFormat.ts');

function render(required) {
  const values = { phone: '010-1234-5678', verificationCode: '', verificationProof: '' };
  const verificationCalls = [];
  const { PhoneVerificationSection } = load('../components/auth/PhoneVerificationSection.tsx', {
    react: {
      useEffect() {},
      useRef: (current) => ({ current }),
      useState: (initial) => [initial, () => {}],
    },
    'react-native': { StyleSheet: { create: (styles) => styles }, Text: 'Text', View: 'View' },
    'react-hook-form': {
      Controller: 'Controller',
      useFormContext: () => ({
        formState: { errors: {} },
        getValues: (name) => values[name],
        setValue: (name, value) => { values[name] = value; },
      }),
    },
    '../../constants/theme': { colors: {}, typography: {} },
    '../../utils/inputFormat': inputFormat,
    '../../utils/validation': validation,
    './FormTextField': { FormTextField: 'FormTextField' },
    './PrimaryButton': { PrimaryButton: 'PrimaryButton' },
  });
  const tree = PhoneVerificationSection({
    required,
    onRequestCode: () => { throw new Error('Unexpected SMS request'); },
    onVerifyCode: (input) => { verificationCalls.push(input); },
  });
  function findCode(node) {
    if (!node) return undefined;
    if (node?.props?.name === 'verificationCode') return node.props;
    return [node?.props?.children].flat().map(findCode).find(Boolean);
  }
  return { controller: findCode(tree), values, verificationCalls };
}

test('optional SMS input does not block general profile submission', () => {
  const { controller } = render(false);
  for (const code of ['', '1', '12', '123', '1234', '12345', '123456']) {
    assert.equal(controller.rules.validate(code), true, `optional code: ${code}`);
  }
});

test('required and default SMS validation still requires exactly six digits', () => {
  for (const required of [true, undefined]) {
    const { controller } = render(required);
    for (const code of ['', '1', '12', '123', '1234', '12345', '12345a', '1234567']) {
      assert.notEqual(controller.rules.validate(code), true, `required code: ${code}`);
    }
    assert.equal(controller.rules.validate('123456'), true);
  }
});

test('optional validation does not authorize verification without a sent code', () => {
  const { controller, values, verificationCalls } = render(false);
  const field = controller.render({ field: { value: '123456' } });
  field.props.onSubmitEditing();
  assert.deepEqual(verificationCalls, []);
  assert.equal(values.verificationProof, '');
});

const tick = () => new Promise((resolve) => setImmediate(resolve));
const nodes = (tree) => !tree || typeof tree !== 'object' ? [] :
  [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];

function hookRuntime() {
  const slots = [], effects = [];
  let index = 0;
  const slot = (initial) => {
    const key = index++;
    if (!(key in slots)) slots[key] = initial;
    return key;
  };
  return {
    reset() { index = 0; },
    useRef(initial) { return slots[slot({ current: initial })]; },
    useState(initial) {
      const key = slot(initial);
      return [slots[key], (value) => { slots[key] = typeof value === 'function' ? value(slots[key]) : value; }];
    },
    useEffect(callback, dependencies) {
      const key = slot(null), previous = slots[key];
      if (!previous || !dependencies || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        const next = { dependencies, cleanup: previous?.cleanup };
        slots[key] = next;
        effects.push(() => { next.cleanup?.(); next.cleanup = callback(); });
      }
    },
    flush() { while (effects.length) effects.shift()(); },
    dispose() { for (const value of slots) value?.cleanup?.(); },
  };
}

// Keep the real form validation and verification hook; replace only rendering and HTTP.
function mountVerification(purpose = 'sign_up') {
  const hooks = hookRuntime(), section = hookRuntime();
  const form = createFormControl({
    mode: purpose === 'reset_password' ? 'onSubmit' : 'onChange',
    defaultValues: { phone: '010-1234-5678', verificationCode: '', verificationProof: '' },
  });
  const formState = { errors: {}, isValid: false };
  const unsubscribe = form.subscribe({ formState: { errors: true, isValid: true }, callback: (value) => Object.assign(formState, value) });
  const expiresAt = new Date(Date.now() + 180_000).toISOString();
  const calls = [], sentIds = [];
  const api = {
    send: async () => { sentIds.push('verification'); return { verificationId: 'verification', expiresAt }; },
    confirm: async (_id, code) => {
      await tick();
      if (code !== '123456') throw new Error('인증번호가 일치하지 않습니다.');
      return { verificationProof: `proof-${calls.length}`, expiresAt };
    },
  };
  const confirm = (id, code) => { calls.push({ id, code }); return api.confirm(id, code); };
  const { usePhoneVerification } = load('../hooks/usePhoneVerification.ts', {
    react: hooks,
    '../components/AuthProvider': { useAuth: () => ({ request: (action) => action({}) }) },
    '../utils/authApi': {
      sendPhoneVerification: api.send, sendPhoneChangeVerification: api.send,
      confirmPhoneVerification: confirm, confirmPhoneChangeVerification: confirm,
      getAuthErrorMessage: (error) => error.message,
    },
  });
  const { PhoneVerificationSection } = load('../components/auth/PhoneVerificationSection.tsx', {
    react: section,
    'react-native': { StyleSheet: { create: (styles) => styles }, Text: 'Text', View: 'View' },
    'react-hook-form': { Controller: 'Controller', useFormContext: () => ({ ...form, formState }) },
    '../../constants/theme': { colors: {}, typography: {} },
    '../../utils/inputFormat': inputFormat, '../../utils/validation': validation,
    './FormTextField': { FormTextField: 'FormTextField' }, './PrimaryButton': { PrimaryButton: 'PrimaryButton' },
  });
  let tree, verification;
  const page = {
    form, formState, api, calls, sentIds, expiresAt, disabled: false, email: 'test@example.com',
    render() {
      hooks.reset(); verification = usePhoneVerification(purpose, page.email);
      section.reset();
      tree = PhoneVerificationSection({
        onRequestCode: verification.requestCode, onVerifyCode: verification.verifyCode,
        required: purpose !== 'reset_password', disabled: page.disabled,
        verificationScope: `${page.email}:${purpose}`,
      });
      for (const node of nodes(tree)) if (node.type === 'Controller') form.register(node.props.name, node.props.rules);
      section.flush();
    },
    async settle() { await tick(); page.render(); await tick(); page.render(); },
    field(name = 'verificationCode') {
      const controller = nodes(tree).find((node) => node.props?.name === name).props;
      const field = form.register(name, controller.rules);
      return controller.render({ field: {
        value: form.getValues(name),
        onChange: (value) => field.onChange({ target: { name, value }, type: 'change' }),
      } }).props;
    },
    button() { return nodes(tree).find((node) => node.type === 'PrimaryButton').props; },
    async send() { page.button().onPress(); await page.settle(); },
    async change(code) { page.field().onChangeText(code); await page.settle(); },
    validProof() { return verification.isProofValid(form.getValues()); },
    dispose() { section.dispose(); unsubscribe(); },
  };
  page.render();
  return page;
}

test('all SMS purposes accept a corrected code without resending or extending the deadline', async () => {
  for (const purpose of ['sign_up', 'find_email', 'reset_password', 'change_phone']) {
    const page = mountVerification(purpose);
    try {
      await page.send();
      await page.change('000000');
      assert.match(page.formState.errors.verificationCode.message, /일치하지/);
      assert.equal(page.button().disabled, false);
      await page.change('');
      await page.change('123456');
      assert.equal(page.validProof(), true, purpose);
      assert.equal(page.formState.isValid, true, purpose);
      assert.equal(page.formState.errors.verificationCode, undefined);
      assert.equal(page.sentIds.length, 1);
      assert.deepEqual(page.calls.map(({ code }) => code), ['000000', '123456']);
    } finally { page.dispose(); }
  }
});

test('a queued edit is confirmed once after either a failed or successful older response', async () => {
  for (const successfulFirstResponse of [false, true]) {
    const page = mountVerification();
    try {
      await page.send();
      const confirm = page.api.confirm;
      let finish;
      page.api.confirm = () => new Promise((resolve, reject) => {
        finish = () => successfulFirstResponse
          ? resolve({ verificationProof: 'old-proof', expiresAt: page.expiresAt })
          : reject(new Error('인증번호가 일치하지 않습니다.'));
      });
      const input = page.field();
      input.onChangeText('000000');
      input.onChangeText('');
      input.onChangeText('654321');
      input.onChangeText('123456');
      await page.settle();
      assert.equal(page.calls.length, 1);
      page.api.confirm = confirm;
      finish(); await page.settle();
      assert.deepEqual(page.calls.map(({ code }) => code), ['000000', '123456']);
      assert.equal(page.form.getValues('verificationProof'), 'proof-2');
      assert.equal(page.validProof(), true);
      assert.equal(page.sentIds.length, 1);
      assert.equal(page.button().disabled, false);
    } finally { page.dispose(); }
  }
});

test('queued confirmations cannot survive invalid input, scope changes, expiry, disabling or unmount', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: Date.now() });
  for (const reason of ['incomplete', 'phone', 'email', 'expired', 'disabled', 'unmount']) {
    const page = mountVerification();
    let finish;
    try {
      await page.send();
      page.api.confirm = () => new Promise((resolve) => { finish = resolve; });
      const input = page.field();
      input.onChangeText('000000'); input.onChangeText('123456');
      if (reason === 'incomplete') input.onChangeText('123');
      if (reason === 'phone') page.field('phone').onChangeText('010-9999-5678');
      if (reason === 'email') page.email = 'changed@example.com';
      if (reason === 'expired') t.mock.timers.tick(180_001);
      if (reason === 'disabled') page.disabled = true;
      if (reason === 'unmount') page.dispose(); else page.render();
      finish({ verificationProof: 'old-proof', expiresAt: page.expiresAt });
      if (reason === 'unmount') await tick(); else await page.settle();
      assert.equal(page.calls.length, 1, reason);
      assert.equal(page.form.getValues('verificationProof'), '', reason);
    } finally { if (reason !== 'unmount') page.dispose(); }
  }
});

test('unchanged failed input and duplicate submit events do not trigger automatic retries', async () => {
  const page = mountVerification();
  try {
    await page.send();
    let finish;
    page.api.confirm = () => new Promise((_resolve, reject) => { finish = reject; });
    page.field().onChangeText('000000'); page.render();
    page.field().onSubmitEditing(); page.field().onSubmitEditing();
    finish(new Error('인증번호가 일치하지 않습니다.')); await page.settle();
    assert.equal(page.calls.length, 1);
    assert.equal(page.form.getValues('verificationProof'), '');
    assert.equal(page.button().disabled, false);
  } finally { page.dispose(); }
});

test('correcting the code does not extend the original three-minute deadline', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setInterval'], now: Date.now() });
  const page = mountVerification();
  try {
    await page.send(); await page.change('000000');
    t.mock.timers.tick(179_000);
    await page.change('123456');
    assert.equal(page.validProof(), true);
    t.mock.timers.tick(1_001); await page.settle();
    assert.equal(page.validProof(), false);
    assert.equal(page.form.getValues('verificationProof'), '');
    assert.match(page.formState.errors.verificationCode.message, /만료/);
    assert.equal(page.sentIds.length, 1);
  } finally { page.dispose(); }
});
