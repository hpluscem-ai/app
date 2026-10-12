import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const nodes = tree => !tree || typeof tree !== 'object' ? [] :
  [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
function load(file, imports) {
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', source)(name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  }, exports);
  return exports;
}
const native = {
  ActivityIndicator: 'ActivityIndicator', View: 'View', Text: 'Text', Modal: 'Modal',
  Pressable: 'Pressable', Image: 'Image', ScrollView: 'ScrollView',
  StyleSheet: { create: styles => styles, absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } },
};
function mount(platform = 'android') {
  let index = 0, focused = false, focusEffect, focusCleanup;
  const slots = [], effects = [], listeners = new Set();
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    },
    useCallback: fn => fn,
    useEffect(fn, deps) {
      const i = index++, previous = slots[i];
      if (!previous || deps.some((value, j) => value !== previous.deps[j])) {
        slots[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const { RequestLoading } = load('../components/RequestLoading.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': { useFocusEffect: fn => { focusEffect = fn; } },
    'react-native-paper': { Portal: 'Portal' },
    '../constants/theme': { colors: { overlayScrim: 'scrim' } },
    'react-native': { ...native, Platform: { OS: platform }, BackHandler: {
      addEventListener: (_event, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
    } },
  });
  return {
    listeners,
    focus(value) {
      if (value === focused) return;
      focused = value;
      if (value) focusCleanup = focusEffect(); else focusCleanup?.();
    },
    render(visible) {
      index = 0;
      const tree = RequestLoading({ visible });
      while (effects.length) effects.shift()();
      return tree;
    },
  };
}

test('native pending requests show only the default spinner and remove it on completion or blur', () => {
  for (const platform of ['android', 'ios']) {
    const page = mount(platform);
    assert.equal(page.render(true), null);
    page.focus(true);
    assert.equal(page.render(false), null);
    const visible = nodes(page.render(true));
    assert.deepEqual(visible.map(node => node.type), ['Portal', 'View', 'ActivityIndicator']);
    assert.equal(visible[1].props.style.backgroundColor, 'scrim');
    assert.equal(visible[1].props.onStartShouldSetResponder(), true);
    assert.equal(visible[2].props.color, undefined);
    assert.equal(visible[2].props.size, undefined);
    assert.equal(page.listeners.size, platform === 'android' ? 1 : 0);
    for (const back of page.listeners) assert.equal(back(), true);
    assert.equal(page.render(false), null);
    assert.equal(page.listeners.size, 0);
    page.render(true);
    page.focus(false);
    assert.equal(page.render(true), null);
    assert.equal(page.listeners.size, 0);
  }
  const web = mount('web');
  web.render(true); web.focus(true);
  assert.equal(web.render(true), null);
});

test('a pending account confirmation reuses its native modal with a dimmed background and blocks dismissal', () => {
  const { NoticeModal } = load('../components/NoticeModal.tsx', {
    react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...native, Platform: { OS: 'android' } },
    '../constants/theme': { colors: { overlayScrim: 'scrim' }, typography: {} },
  });
  let confirms = 0, cancels = 0;
  const props = { visible: true, busy: true, accessibilityLabel: '로그아웃 확인', confirmLabel: '로그아웃', message: '로그아웃 하시겠습니까?', onConfirm: () => confirms++, onCancel: () => cancels++ };
  const tree = NoticeModal(props);
  tree.props.onRequestClose();
  assert.equal(confirms + cancels, 0);
  assert.equal(nodes(tree).filter(node => node.type === 'Modal').length, 1);
  assert.equal(nodes(tree).filter(node => node.type === 'ActivityIndicator').length, 1);
  assert.equal(nodes(tree).filter(node => node.type === 'Pressable').length, 0);
  assert.equal(tree.props.children.props.style[0].backgroundColor, 'scrim');
  assert.equal(tree.props.children.props.accessibilityViewIsModal, true);
  const settled = NoticeModal({ ...props, busy: false });
  assert.equal(nodes(settled).filter(node => node.type === 'ActivityIndicator').length, 0);
  assert.equal(nodes(settled).filter(node => node.type === 'Pressable').length, 2);
});
