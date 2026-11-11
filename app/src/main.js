import {
  dayKey,
  medicationDayKey,
  formatTime,
  minutesToTime,
  timeToMinutes,
  parseDayKey,
  addDays,
  isScheduledForDay,
  findIntake,
  registerIntake,
  editIntakeTime,
  removeIntake,
  reminderDate,
} from './core.js';
import { loadState, saveState } from './storage.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);

const els = {
  pageTitle: $('page-title'), todayBadge: $('today-badge'), toast: $('toast'), storageError: $('storage-error'),
  summaryIcon: $('summary-icon'), summaryTitle: $('summary-title'), summaryCount: $('summary-count'), dayBoundary: $('day-boundary'),
  reminderList: $('reminder-list'), todayMedications: $('today-medications'), emptyToday: $('empty-today'),
  calendarMonth: $('calendar-month'), calendarGrid: $('calendar-grid'), selectedDayDetail: $('selected-day-detail'),
  previousMonth: $('previous-month'), nextMonth: $('next-month'), medicationList: $('medication-list'), addMedication: $('add-medication'),
  dayStart: $('day-start'), notificationStatus: $('notification-status'), enableNotifications: $('enable-notifications'),
  installApp: $('install-app'), installHelp: $('install-help'), exportData: $('export-data'),
  medicationDialog: $('medication-dialog'), medicationForm: $('medication-form'), medicationFormTitle: $('medication-form-title'),
  medicationId: $('medication-id'), medicationName: $('medication-name'), medicationInstructions: $('medication-instructions'),
  reminderEnabled: $('reminder-enabled'), reminderTime: $('reminder-time'), reminderTimeRow: $('reminder-time-row'),
  deleteMedication: $('delete-medication'), closeMedicationDialog: $('close-medication-dialog'),
  intakeDialog: $('intake-dialog'), intakeForm: $('intake-form'), intakeMedicationId: $('intake-medication-id'),
  intakeDay: $('intake-day'), intakeTime: $('intake-time'), removeIntake: $('remove-intake'), closeIntakeDialog: $('close-intake-dialog'),
};

const longDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const scheduleNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const colors = ['#2864dc', '#8b5cf6', '#e05d33', '#16805a', '#c23b76', '#0088a9'];

let state = loadState();
let activeView = 'today';
let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDay = medicationDayKey(new Date(), state.settings.dayStartMinutes);
let installPrompt = null;
let toastTimer = null;

function persist() {
  const saved = saveState(state);
  els.storageError.hidden = saved;
  return saved;
}

function showToast(message, duration = 3500) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, duration);
}

function medicationById(id) {
  return state.medications.find((medication) => medication.id === id);
}

function nfcUrl(medicationId) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('take', medicationId);
  return url.toString();
}

function getTodayData(now = new Date()) {
  const key = medicationDayKey(now, state.settings.dayStartMinutes);
  const medications = state.medications.filter((medication) => (
    isScheduledForDay(medication, key) || findIntake(state.records, medication.id, key)
  ));
  return { key, medications };
}

function isOverdue(medication, key, now = new Date()) {
  return medication.reminderEnabled
    && !findIntake(state.records, medication.id, key)
    && now >= reminderDate(key, medication.reminderTime, state.settings.dayStartMinutes);
}

function renderHeader() {
  const now = new Date();
  els.todayBadge.innerHTML = `${now.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}<strong>${now.getDate()}</strong>`;
}

function medicationCard(medication, key, now) {
  const intake = findIntake(state.records, medication.id, key);
  const overdue = !intake && isOverdue(medication, key, now);
  const statusClass = intake ? 'taken' : overdue ? 'overdue' : '';
  const statusText = intake ? `Tomada · ${formatTime(new Date(intake.takenAt))}` : overdue ? 'Pendiente' : 'Por tomar';
  const instructions = medication.instructions || 'Sin indicaciones';
  return `
    <article class="medication-card" style="--med-color:${escapeHtml(medication.color || colors[0])}">
      <div class="medication-top">
        <div class="medication-name"><span class="pill-icon" aria-hidden="true">💊</span><div><h3>${escapeHtml(medication.name)}</h3><p class="muted small">${escapeHtml(instructions)}</p></div></div>
        <span class="status ${statusClass}">${statusText}</span>
      </div>
      <div class="card-actions">
        ${intake
          ? `<button class="primary-button taken" type="button" data-action="edit-intake" data-medication="${escapeHtml(medication.id)}" data-day="${key}">✓ Tomada a las ${formatTime(new Date(intake.takenAt))}</button>`
          : `<button class="primary-button" type="button" data-action="take" data-medication="${escapeHtml(medication.id)}">Marcar como tomada</button>`}
      </div>
    </article>`;
}

function renderToday() {
  const now = new Date();
  const { key, medications } = getTodayData(now);
  const taken = medications.filter((medication) => findIntake(state.records, medication.id, key));
  const overdue = medications.filter((medication) => isOverdue(medication, key, now));
  const startTime = minutesToTime(state.settings.dayStartMinutes);

  selectedDay = key;
  els.summaryCount.textContent = `${taken.length}/${medications.length}`;
  els.dayBoundary.textContent = `Tu día va de ${startTime} a ${startTime}`;
  els.summaryIcon.textContent = taken.length === medications.length && medications.length ? '✨' : overdue.length ? '⏰' : '☀️';
  els.summaryTitle.textContent = !medications.length
    ? 'Día libre de tomas'
    : taken.length === medications.length
      ? 'Todo listo por hoy'
      : `${medications.length - taken.length} ${medications.length - taken.length === 1 ? 'toma pendiente' : 'tomas pendientes'}`;

  els.reminderList.innerHTML = overdue.map((medication) => `
    <div class="reminder"><span aria-hidden="true">⏰</span><div>${escapeHtml(medication.name)} sigue pendiente<small>Recordatorio de las ${escapeHtml(medication.reminderTime)}</small></div></div>
  `).join('');
  els.todayMedications.innerHTML = medications.map((medication) => medicationCard(medication, key, now)).join('');
  els.emptyToday.hidden = medications.length > 0;
}

function monthCellDates(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = addDays(first, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function renderCalendar() {
  const today = medicationDayKey(new Date(), state.settings.dayStartMinutes);
  els.calendarMonth.textContent = monthName.format(displayedMonth);
  els.calendarGrid.innerHTML = monthCellDates(displayedMonth).map((date) => {
    const key = dayKey(date);
    const records = state.records.filter((record) => record.medicationDay === key && medicationById(record.medicationId));
    const otherMonth = date.getMonth() !== displayedMonth.getMonth();
    return `<button class="calendar-day${otherMonth ? ' other-month' : ''}${key === today ? ' today' : ''}${key === selectedDay ? ' selected' : ''}" type="button" role="gridcell" data-day="${key}" aria-label="${escapeHtml(longDate.format(date))}, ${records.length} tomas">${date.getDate()}<span class="day-dots">${records.slice(0, 3).map(() => '<i class="day-dot"></i>').join('')}</span></button>`;
  }).join('');
  renderSelectedDay();
}

function renderSelectedDay() {
  const date = parseDayKey(selectedDay);
  const scheduled = state.medications.filter((medication) => (
    isScheduledForDay(medication, selectedDay) || findIntake(state.records, medication.id, selectedDay)
  ));
  const isFuture = date > parseDayKey(medicationDayKey(new Date(), state.settings.dayStartMinutes));
  const rows = scheduled.map((medication) => {
    const intake = findIntake(state.records, medication.id, selectedDay);
    const label = intake ? formatTime(new Date(intake.takenAt)) : isFuture ? 'Programada' : 'Sin registrar';
    return `<div class="detail-row"><div><strong>${escapeHtml(medication.name)}</strong><p class="muted small">${escapeHtml(medication.instructions || 'Toma programada')}</p></div><button class="text-button" type="button" ${intake ? `data-action="edit-intake" data-medication="${escapeHtml(medication.id)}" data-day="${selectedDay}"` : 'disabled'}>${intake ? `✓ ${label}` : label}</button></div>`;
  }).join('');
  els.selectedDayDetail.innerHTML = `<h3>${escapeHtml(shortDay.format(date))}</h3>${rows || '<p class="muted">No había tomas programadas este día.</p>'}`;
}

function scheduleLabel(days) {
  if (!days || days.length === 7) return 'Todos los días';
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => scheduleNames[day]).join(' · ');
}

function renderMedications() {
  els.medicationList.innerHTML = state.medications.map((medication) => {
    const link = nfcUrl(medication.id);
    const reminder = medication.reminderEnabled ? ` · Aviso ${medication.reminderTime}` : '';
    return `
      <article class="medication-card" style="--med-color:${escapeHtml(medication.color || colors[0])}">
        <div class="medication-top"><div class="medication-name"><span class="pill-icon" aria-hidden="true">💊</span><div><h3>${escapeHtml(medication.name)}</h3><p class="muted small">${escapeHtml(medication.instructions || 'Sin indicaciones')}</p></div></div><button class="icon-button" type="button" data-action="edit-medication" data-medication="${escapeHtml(medication.id)}" aria-label="Editar ${escapeHtml(medication.name)}">⋯</button></div>
        <p class="medication-meta">${scheduleLabel(medication.scheduleDays)}${reminder}</p>
        <div class="nfc-box"><div class="nfc-label"><span>ENLACE PARA LA ETIQUETA NFC</span><span aria-hidden="true">⌁</span></div><code class="nfc-link">${escapeHtml(link)}</code><div class="card-actions"><button class="text-button" type="button" data-action="copy-nfc" data-medication="${escapeHtml(medication.id)}">Copiar enlace</button><button class="text-button" type="button" data-action="share-nfc" data-medication="${escapeHtml(medication.id)}">Compartir</button></div></div>
      </article>`;
  }).join('') || '<div class="empty-state"><span>💊</span><h2>Añade tu primer tratamiento</h2><p>Cada uno tendrá un enlace NFC independiente.</p></div>';
}

function renderSettings() {
  els.dayStart.value = minutesToTime(state.settings.dayStartMinutes);
  if (!('Notification' in window)) {
    els.notificationStatus.textContent = 'Este navegador no admite notificaciones.';
    els.enableNotifications.hidden = true;
  } else {
    const labels = { granted: 'Activadas en este dispositivo.', denied: 'Bloqueadas en los ajustes del navegador.', default: 'Aún no están activadas.' };
    els.notificationStatus.textContent = labels[Notification.permission];
    els.enableNotifications.hidden = Notification.permission === 'granted';
  }
}

function renderAll() {
  renderHeader();
  renderToday();
  renderCalendar();
  renderMedications();
  renderSettings();
}

function switchView(view) {
  activeView = view;
  const titles = { today: 'Hoy', calendar: 'Calendario', medications: 'Tratamientos', settings: 'Ajustes' };
  document.querySelectorAll('.view').forEach((element) => {
    const active = element.id === `view-${view}`;
    element.hidden = !active;
    element.classList.toggle('active', active);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  els.pageTitle.textContent = titles[view];
  if (view === 'calendar') renderCalendar();
  if (view === 'medications') renderMedications();
  if (view === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function takeMedication(medicationId, source = 'manual') {
  const medication = medicationById(medicationId);
  if (!medication) {
    showToast('No se ha encontrado ese tratamiento. Revisa el enlace NFC.', 5000);
    return false;
  }
  const result = registerIntake(state.records, medicationId, new Date(), state.settings.dayStartMinutes);
  state.records = result.records;
  if (result.registered) {
    persist();
    showToast(`✓ ${medication.name} registrada a las ${formatTime(new Date(result.record.takenAt))}`);
  } else {
    showToast(`${medication.name} ya estaba registrada a las ${formatTime(new Date(result.record.takenAt))}`, 5000);
  }
  renderAll();
  if (source === 'nfc') switchView('today');
  return result.registered;
}

function openIntakeDialog(medicationId, key) {
  const record = findIntake(state.records, medicationId, key);
  if (!record) return;
  els.intakeMedicationId.value = medicationId;
  els.intakeDay.value = key;
  els.intakeTime.value = formatTime(new Date(record.takenAt));
  els.intakeDialog.showModal();
}

function makeId(name) {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'tratamiento';
  return `${slug}-${Date.now().toString(36).slice(-5)}`;
}

function openMedicationDialog(medication = null) {
  els.medicationForm.reset();
  els.medicationId.value = medication?.id ?? '';
  els.medicationName.value = medication?.name ?? '';
  els.medicationInstructions.value = medication?.instructions ?? '';
  els.reminderEnabled.checked = medication?.reminderEnabled ?? false;
  els.reminderTime.value = medication?.reminderTime ?? '20:00';
  els.reminderTimeRow.hidden = !els.reminderEnabled.checked;
  document.querySelectorAll('[name="schedule-day"]').forEach((checkbox) => {
    checkbox.checked = medication ? medication.scheduleDays.includes(Number(checkbox.value)) : true;
  });
  els.medicationFormTitle.textContent = medication ? 'Editar tratamiento' : 'Nuevo tratamiento';
  els.deleteMedication.hidden = !medication;
  els.medicationDialog.showModal();
  setTimeout(() => els.medicationName.focus(), 50);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
}

async function sendReminder(medication) {
  const title = `Toma pendiente: ${medication.name}`;
  const options = { body: medication.instructions || 'Aún no has registrado esta toma.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: `daycounter-${medication.id}` };
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // The visible in-app reminder remains available if the OS rejects it.
  }
}

function checkReminders() {
  const now = new Date();
  const { key, medications } = getTodayData(now);
  let changed = false;
  for (const medication of medications) {
    const reminderKey = `${medication.id}:${key}`;
    if (!isOverdue(medication, key, now) || state.remindersSent[reminderKey]) continue;
    if ('Notification' in window && Notification.permission === 'granted') {
      sendReminder(medication);
      state.remindersSent[reminderKey] = now.toISOString();
      changed = true;
    }
  }
  if (changed) persist();
  if (activeView === 'today') renderToday();
}

document.querySelector('.bottom-nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) switchView(button.dataset.view);
});

els.todayMedications.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'take') takeMedication(button.dataset.medication);
  if (button.dataset.action === 'edit-intake') openIntakeDialog(button.dataset.medication, button.dataset.day);
});

els.calendarGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-day]');
  if (!button) return;
  selectedDay = button.dataset.day;
  const selectedDate = parseDayKey(selectedDay);
  if (selectedDate.getMonth() !== displayedMonth.getMonth()) displayedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderCalendar();
});

els.selectedDayDetail.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="edit-intake"]');
  if (button) openIntakeDialog(button.dataset.medication, button.dataset.day);
});

els.previousMonth.addEventListener('click', () => { displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1); renderCalendar(); });
els.nextMonth.addEventListener('click', () => { displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1); renderCalendar(); });
els.addMedication.addEventListener('click', () => openMedicationDialog());
els.closeMedicationDialog.addEventListener('click', () => els.medicationDialog.close());
els.closeIntakeDialog.addEventListener('click', () => els.intakeDialog.close());
els.reminderEnabled.addEventListener('change', () => { els.reminderTimeRow.hidden = !els.reminderEnabled.checked; });

els.medicationList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const medication = medicationById(button.dataset.medication);
  if (!medication) return;
  if (button.dataset.action === 'edit-medication') openMedicationDialog(medication);
  if (button.dataset.action === 'copy-nfc') {
    await copyText(nfcUrl(medication.id));
    showToast(`Enlace NFC de ${medication.name} copiado`);
  }
  if (button.dataset.action === 'share-nfc') {
    const data = { title: `NFC · ${medication.name}`, text: `Enlace de Day Counter para registrar ${medication.name}`, url: nfcUrl(medication.id) };
    if (navigator.share) navigator.share(data).catch(() => {});
    else { await copyText(data.url); showToast('Enlace copiado'); }
  }
});

els.medicationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const scheduleDays = [...document.querySelectorAll('[name="schedule-day"]:checked')].map((checkbox) => Number(checkbox.value));
  if (!scheduleDays.length) {
    showToast('Selecciona al menos un día de toma');
    return;
  }
  const existing = medicationById(els.medicationId.value);
  const medication = {
    id: existing?.id ?? makeId(els.medicationName.value),
    name: els.medicationName.value.trim(),
    instructions: els.medicationInstructions.value.trim(),
    scheduleDays,
    reminderEnabled: els.reminderEnabled.checked,
    reminderTime: els.reminderTime.value,
    color: existing?.color ?? colors[state.medications.length % colors.length],
  };
  state.medications = existing
    ? state.medications.map((item) => item.id === existing.id ? medication : item)
    : [...state.medications, medication];
  persist();
  els.medicationDialog.close();
  renderAll();
  showToast(`${medication.name} guardada`);
});

els.deleteMedication.addEventListener('click', () => {
  const medication = medicationById(els.medicationId.value);
  if (!medication || !confirm(`¿Eliminar ${medication.name} y todo su historial?`)) return;
  state.medications = state.medications.filter((item) => item.id !== medication.id);
  state.records = state.records.filter((record) => record.medicationId !== medication.id);
  persist();
  els.medicationDialog.close();
  renderAll();
  showToast(`${medication.name} eliminada`);
});

els.intakeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.records = editIntakeTime(state.records, els.intakeMedicationId.value, els.intakeDay.value, els.intakeTime.value, state.settings.dayStartMinutes);
  persist();
  els.intakeDialog.close();
  renderAll();
  showToast('Hora actualizada');
});

els.removeIntake.addEventListener('click', () => {
  state.records = removeIntake(state.records, els.intakeMedicationId.value, els.intakeDay.value);
  persist();
  els.intakeDialog.close();
  renderAll();
  showToast('Toma marcada como pendiente');
});

els.dayStart.addEventListener('change', () => {
  const newStart = timeToMinutes(els.dayStart.value);
  state.settings.dayStartMinutes = newStart;
  const deduplicated = new Map();
  for (const record of state.records) {
    const medicationDay = medicationDayKey(new Date(record.takenAt), newStart);
    const updated = { ...record, id: `${record.medicationId}-${medicationDay}`, medicationDay };
    deduplicated.set(`${record.medicationId}:${medicationDay}`, updated);
  }
  state.records = [...deduplicated.values()];
  selectedDay = medicationDayKey(new Date(), newStart);
  persist();
  renderAll();
  showToast(`El día ahora empieza a las ${els.dayStart.value}`);
});

els.enableNotifications.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  renderSettings();
  if (permission === 'granted') { showToast('Notificaciones activadas'); checkReminders(); }
});

els.exportData.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `day-counter-${dayKey(new Date())}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Copia de seguridad creada');
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  els.installApp.hidden = false;
  els.installHelp.hidden = true;
});

els.installApp.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  els.installApp.hidden = true;
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  state = loadState();
  renderAll();
  checkReminders();
});

function handleNfcUrl() {
  const params = new URLSearchParams(location.search);
  let medicationId = params.get('take');
  if (!medicationId && params.get('nfc') === '1') medicationId = state.medications[0]?.id;
  if (!medicationId) return;
  history.replaceState(null, '', `${location.pathname}${location.hash}`);
  takeMedication(medicationId, 'nfc');
}

try { navigator.storage?.persist?.(); } catch { /* Optional browser feature. */ }

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

renderAll();
handleNfcUrl();
checkReminders();
setInterval(checkReminders, 60_000);
