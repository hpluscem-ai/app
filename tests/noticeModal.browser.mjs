import assert from 'node:assert/strict';

// Run with a CUA tab already signed in on /mypage. Only cancels dialogs.
export async function checkNoticeModalClosing(tab) {
  const checked = [];
  for (const action of ['회원탈퇴', '로그아웃', '회원탈퇴']) {
    await tab.playwright.getByRole('button', { name: action, exact: true }).click();
    const dialog = tab.playwright.getByRole('alert', { name: `${action} 확인` });
    const message = await dialog.textContent();
    await dialog.getByRole('button', { name: '취소', exact: true }).click();
    const closing = await tab.playwright.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      return alert && {
        label: alert.getAttribute('aria-label'),
        message: alert.textContent,
        disabled: Array.from(alert.querySelectorAll('[role="button"]'))
          .every(button => button.getAttribute('aria-disabled') === 'true'),
      };
    });
    assert.ok(closing, 'Closing frame was not captured; rerun the browser check.');
    assert.equal(closing.label, `${action} 확인`);
    assert.equal(closing.message, message);
    assert.equal(closing.disabled, true);
    await dialog.waitFor({ state: 'detached' });
    checked.push(action);
  }
  return checked;
}
