import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../app/find-email.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test('no account clears the phone and consumed verification after the notice is confirmed', async () => {
  const values = { phone: '010-1234-5678', verificationCode: '123456', verificationProof: 'proof' };
  const notices = [];
  let resets = 0;
  let verificationResets = 0;
  class AuthApiError extends Error {
    constructor(message, code) { super(message); this.code = code; }
  }
  const form = {
    formState: { isSubmitting: false, isValid: true },
    handleSubmit: (submit) => () => submit({ ...values }),
    setValue: (field, value) => { values[field] = value; },
    watch: (field) => values[field],
    reset: () => { values.phone = ''; values.verificationCode = ''; values.verificationProof = ''; resets++; },
  };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'expo-router': { useRouter: () => ({ replace() {} }) },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: (value) => value } },
    'react-hook-form': { useForm: () => form, FormProvider: 'FormProvider' },
    '../components/AppScreen': { AppScreen: 'AppScreen' },
    '../components/auth/PhoneVerificationSection': { PhoneVerificationSection: 'PhoneVerificationSection' },
    '../components/auth/PrimaryButton': { PrimaryButton: 'PrimaryButton' },
    '../constants/theme': { colors: {}, typography: {} },
    '../hooks/usePhoneVerification': { usePhoneVerification: () => ({
      requestCode() {}, verifyCode() {}, isProofValid: () => true,
      resetVerification: () => { verificationResets++; }, revision: 0,
    }) },
    '../utils/alerts': { useAlerts: () => ({
      showAuthErrorAlert: (message, onConfirm) => notices.push({ message, onConfirm }),
      showPhoneVerificationRequiredAlert() {},
    }) },
    '../utils/authApi': {
      AuthApiError,
      findEmail: async () => { throw new AuthApiError('일치하는 회원정보를 찾을 수 없습니다.', 'ACCOUNT_NOT_FOUND'); },
      getAuthErrorMessage: (error) => error.message,
    },
  };
  const exports = {};
  new Function('require', 'exports', source)((name) => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  }, exports);
  const button = exports.default().props.children.props.children[1];
  assert.equal(button.props.disabled, false);
  await button.props.onPress();
  assert.equal(verificationResets, 1);
  assert.equal(values.verificationProof, '');
  assert.equal(values.phone, '010-1234-5678');
  assert.equal(notices[0].message, '일치하는 회원정보를 찾을 수 없습니다.');
  notices[0].onConfirm();
  assert.equal(resets, 1);
  assert.deepEqual(values, { phone: '', verificationCode: '', verificationProof: '' });
  const after = exports.default().props.children.props.children[1];
  assert.equal(after.props.disabled, true);
});
