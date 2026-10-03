/* ═══════════════════════════════════════════════════════════════════════
   Toast notifications — UTP Adjunct Lecture

   Replaces native alert(), which always prefixes messages with
   "<origin> says" (browser-controlled, not overridable by the page).
   These toasts are branded, non-blocking, and auto-dismiss.
   ═══════════════════════════════════════════════════════════════════════ */

// Shown as the small label above each message. Change this to rename the sender.
const TOAST_SENDER = 'Imran';

const TOAST_ICONS = { success: '✅', error: '❌', warn: '💬', info: 'ℹ️' };

function getToastStack() {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  return stack;
}

/**
 * Show a toast.
 * @param {string} message  Text to display (plain text — never HTML).
 * @param {'success'|'error'|'warn'|'info'} [type='info']
 * @param {number} [duration=3200]  ms before auto-dismiss.
 */
function showToast(message, type = 'info', duration = 3200) {
  const stack = getToastStack();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = TOAST_ICONS[type] || TOAST_ICONS.info;

  const body = document.createElement('div');
  body.className = 'toast-body';
  const from = document.createElement('span');
  from.className = 'toast-from';
  from.textContent = TOAST_SENDER;
  const text = document.createElement('span');
  // textContent (not innerHTML) so student-supplied strings can't inject markup.
  text.textContent = message;
  body.appendChild(from);
  body.appendChild(text);

  toast.appendChild(icon);
  toast.appendChild(body);

  // Tapping dismisses early.
  toast.addEventListener('click', () => dismiss());
  stack.appendChild(toast);

  // Next frame so the CSS transition runs.
  requestAnimationFrame(() => toast.classList.add('show'));

  let removed = false;
  function dismiss() {
    if (removed) return;
    removed = true;
    clearTimeout(timer);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 240);
  }
  const timer = setTimeout(dismiss, duration);

  return dismiss;
}

/* ── Branded confirm dialog ──────────────────────────────────────────────
   Native confirm() carries the same unchangeable "<origin> says" prefix as
   alert(), so this is a promise-based replacement.

   Usage:  if (!(await showConfirm('Log out?'))) return;
*/
function showConfirm(message, {
  title = '',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const card = document.createElement('div');
    card.className = 'confirm-card';

    const heading = document.createElement('div');
    heading.className = 'confirm-title';
    heading.textContent = title;

    const body = document.createElement('p');
    body.className = 'confirm-message';
    body.textContent = message; // textContent so message can't inject markup

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sm confirm-cancel';
    cancelBtn.textContent = cancelText;

    const okBtn = document.createElement('button');
    okBtn.className = `btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`;
    okBtn.textContent = confirmText;

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    card.appendChild(heading);
    card.appendChild(body);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('show'));
    okBtn.focus();

    let settled = false;
    function close(result) {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    }

    okBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    // Clicking the backdrop (but not the card) cancels.
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey);
  });
}
