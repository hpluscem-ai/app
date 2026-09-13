import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
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
