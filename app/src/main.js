import { dayKey, formatTime, getToday, register, editTime } from './core.js';
import { load, save } from './storage.js';

const $ = (id) => document.getElementById(id);
const els = {
  check: $('check'),
  message: $('message'),
  warning: $('warning'),
  registerBtn: $('register-btn'),
  editBtn: $('edit-btn'),
  editForm: $('edit-form'),
  editTime: $('edit-time'),
  cancelBtn: $('cancel-btn'),
  error: $('error'),
};

let records = load();
let renderedDay = dayKey(new Date());

function persist() {
  const ok = save(records);
  els.error.hidden = ok;
  els.error.textContent = ok ? '' : 'No se pudo guardar. Revisa el almacenamiento del navegador.';
}

// mode: 'new' (just registered), 'duplicate' (NFC tap, already registered) or 'view'.
function render(mode = 'view') {
  const now = new Date();
  renderedDay = dayKey(now);
  const taken = getToday(records, now);
  const time = taken && formatTime(taken);

  const duplicate = taken && mode === 'duplicate';
  els.check.textContent = duplicate ? '⚠️' : taken ? '✅' : '';
  els.warning.hidden = !duplicate;
  if (!taken) els.message.textContent = 'Hoy: pendiente';
  else if (mode === 'new') els.message.textContent = `Registrado hoy a las ${time}`;
  else if (mode === 'duplicate') els.message.textContent = `Ya registrado hoy a las ${time}`;
  else els.message.textContent = `Hoy: ${time}`;

  els.registerBtn.hidden = Boolean(taken);
  els.editBtn.hidden = !taken;
  els.editForm.hidden = true;
}

function registerNow() {
  const result = register(records, new Date());
  records = result.records;
  if (result.registered) persist();
  return result.registered;
}

els.registerBtn.addEventListener('click', () => {
  registerNow();
  render('new');
});

els.editBtn.addEventListener('click', () => {
  // Suggest the current time: the usual correction is "I took it just now".
  els.editTime.value = formatTime(new Date());
  els.editForm.hidden = false;
  els.editBtn.hidden = true;
});

els.cancelBtn.addEventListener('click', () => render());

els.editForm.addEventListener('submit', (event) => {
  event.preventDefault();
  records = editTime(records, dayKey(new Date()), els.editTime.value);
  persist();
  render();
});

// The page may stay open past midnight: refresh the status when it comes back on a new day.
// Same day: keep what is shown, so the NFC result message isn't replaced.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && dayKey(new Date()) !== renderedDay) {
    records = load();
    render();
  }
});

// NFC tag opens ?nfc=1: register once, then drop the param so reloads don't re-register.
if (new URLSearchParams(location.search).get('nfc') === '1') {
  const registered = registerNow();
  history.replaceState(null, '', location.pathname);
  render(registered ? 'new' : 'duplicate');
} else {
  render();
}

try {
  navigator.storage?.persist?.();
} catch {
  // Not critical: the browser may refuse persistent storage.
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
