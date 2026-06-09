/* =========================================================
   КАЛЬКУЛЯТОР СТОИМОСТИ УСЛУГ — script.js
   ========================================================= */

// ─── Утилиты форматирования ──────────────────────────────
function formatMoney(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}

function today() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function deadline(format) {
  if (format === 'Ежемесячное сопровождение') return 'С момента подписания договора';
  return '5–10 рабочих дней';
}

function paymentTerms() {
  return '50% предоплата, 50% по завершении работ';
}

// ─── Чтение данных из формы ──────────────────────────────
function getFormData() {
  const clientName    = document.getElementById('client-name').value.trim();
  const clientInn     = document.getElementById('client-inn').value.trim();
  const clientContact = document.getElementById('client-contact').value.trim();
  const clientPhone   = document.getElementById('client-phone').value.trim();
  const clientEmail   = document.getElementById('client-email').value.trim();
  const clientTypeEl  = document.querySelector('input[name="client-type"]:checked');
  const clientType    = clientTypeEl ? clientTypeEl.value : 'ООО';

  const employees  = parseInt(document.getElementById('employees').value) || 0;
  const operations = parseInt(document.getElementById('operations').value) || 0;

  const urgencyEl  = document.querySelector('input[name="urgency"]:checked');
  const urgency    = urgencyEl ? urgencyEl.value : 'no';

  const managerEl  = document.querySelector('input[name="manager"]:checked');
  const manager    = managerEl ? managerEl.value : 'no';

  const formatEl   = document.querySelector('input[name="format"]:checked');
  const workFormat = formatEl ? formatEl.value : 'Разовая услуга';

  return { clientName, clientInn, clientContact, clientPhone, clientEmail, clientType,
           employees, operations, urgency, manager, workFormat };
}

// ─── Расчёт стоимости ────────────────────────────────────
function calcTotal() {
  const { employees, operations, urgency, manager } = getFormData();
  const checks = document.querySelectorAll('.service-check:checked');

  let baseSum   = 0;
  const items   = [];

  checks.forEach(cb => {
    const name        = cb.dataset.name;
    const price       = parseInt(cb.dataset.price) || 0;
    const perEmployee = cb.dataset.perEmployee === 'true';

    if (perEmployee) {
      const count = employees > 0 ? employees : 1;
      const total = price * count;
      baseSum += total;
      items.push({ name: `${name} (${count} чел.)`, price: total });
    } else {
      baseSum += price;
      items.push({ name, price });
    }
  });

  // Коэффициент по количеству операций
  let opCoef = 0;
  if (operations > 300)     opCoef = 0.40;
  else if (operations > 100) opCoef = 0.20;

  const modifiers = [];

  if (opCoef > 0) {
    const opAdd = Math.round(baseSum * opCoef);
    modifiers.push({ label: `Коэффициент операций (${opCoef * 100}%)`, value: opAdd });
  }

  let subtotal = Math.round(baseSum * (1 + opCoef));

  // Срочность +30%
  let urgencyAdd = 0;
  if (urgency === 'yes') {
    urgencyAdd = Math.round(subtotal * 0.3);
    modifiers.push({ label: 'Срочность (+30%)', value: urgencyAdd });
    subtotal += urgencyAdd;
  }

  // Личный менеджер +10 000
  let managerAdd = 0;
  if (manager === 'yes') {
    managerAdd = 10000;
    modifiers.push({ label: 'Личный менеджер', value: managerAdd });
    subtotal += managerAdd;
  }

  return { total: subtotal, items, modifiers, baseSum };
}

// ─── Обновление сводки в реальном времени ────────────────
function updateSummary() {
  const { total, items, modifiers } = calcTotal();
  const formatted = formatMoney(total);

  // Desktop sidebar
  document.getElementById('total-display').textContent = formatted;

  // Mobile bar
  document.getElementById('mobile-total-display').textContent = formatted;

  // Breakdown
  const bdEl = document.getElementById('total-breakdown');

  if (items.length === 0) {
    bdEl.innerHTML = '<p class="breakdown-empty">Выберите услуги для расчёта</p>';
  } else {
    let html = '';
    items.forEach(it => {
      html += `<div class="breakdown-item">
        <span class="breakdown-name">${escapeHtml(it.name)}</span>
        <span class="breakdown-price">${formatMoney(it.price)}</span>
      </div>`;
    });
    modifiers.forEach(m => {
      html += `<div class="breakdown-modifier">
        <span>${escapeHtml(m.label)}</span>
        <span>+${formatMoney(m.value)}</span>
      </div>`;
    });
    bdEl.innerHTML = html;
  }

  // Meta
  const { workFormat } = getFormData();
  const metaEl = document.getElementById('total-meta');
  metaEl.innerHTML = `
    <div class="total-meta-item"><span class="total-meta-dot"></span><span>${escapeHtml(workFormat)}</span></div>
    <div class="total-meta-item"><span class="total-meta-dot"></span><span>${deadline(workFormat)}</span></div>
  `;

  // Update salary price display
  updateSalaryDisplay();
}

function updateSalaryDisplay() {
  const employees = parseInt(document.getElementById('employees').value) || 0;
  const salaryEl = document.querySelector('.salary-price');
  if (salaryEl) {
    const count = employees > 0 ? employees : 1;
    salaryEl.textContent = formatMoney(1500 * count);
  }
}

// ─── Прокрутка к форме ───────────────────────────────────
function scrollToForm() {
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Генерация КП ────────────────────────────────────────
function generateProposal() {
  const checks = document.querySelectorAll('.service-check:checked');
  const warningEl = document.getElementById('warning-no-services');

  if (checks.length === 0) {
    warningEl.style.display = 'block';
    warningEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  warningEl.style.display = 'none';

  const fd = getFormData();
  const { total, items } = calcTotal();

  const serviceList = items.map(it => `  — ${it.name}: ${formatMoney(it.price)}`).join('\n');

  const clientLabel = fd.clientName || 'Уважаемый клиент';

  const kpText = `Здравствуйте${fd.clientContact ? ', ' + fd.clientContact : ''}!

Подготовили для вас расчёт стоимости бухгалтерских услуг на основе выбранных параметров.

В рамках работы мы готовы взять на себя следующие задачи:
${serviceList}

Стоимость услуг составит:
${formatMoney(total)}

В стоимость включены выбранные услуги, базовая коммуникация и подготовка необходимых документов в рамках согласованного объёма работ.

Формат работы:
${fd.workFormat}

Срок оказания услуг:
${deadline(fd.workFormat)}

Условия оплаты:
${paymentTerms()}

Следующий шаг — согласовать детали, после чего мы подготовим договор и начнём работу.

С уважением,
Команда бухгалтерских услуг`;

  // Show KP
  const kpSection = document.getElementById('result-kp');
  document.getElementById('kp-date').textContent = `Сформировано: ${today()}`;
  document.getElementById('kp-body').textContent = kpText;
  kpSection.style.display = 'block';

  // Build contract data
  const contractFields = [
    ['Клиент',               fd.clientName     || '—'],
    ['ИНН',                  fd.clientInn      || '—'],
    ['Тип клиента',          fd.clientType],
    ['Контактное лицо',      fd.clientContact  || '—'],
    ['Email',                fd.clientEmail    || '—'],
    ['Телефон',              fd.clientPhone    || '—'],
    ['Предмет договора',     'Оказание бухгалтерских услуг'],
    ['Перечень услуг',       items.map(it => it.name).join('; ')],
    ['Стоимость',            formatMoney(total)],
    ['Формат работы',        fd.workFormat],
    ['Срок оказания услуг',  deadline(fd.workFormat)],
    ['Условия оплаты',       paymentTerms()],
  ];

  const contractTableEl = document.getElementById('contract-table');
  contractTableEl.innerHTML = contractFields.map(([k, v]) =>
    `<div class="contract-row">
      <div class="contract-key">${escapeHtml(k)}</div>
      <div class="contract-val">${escapeHtml(v)}</div>
    </div>`
  ).join('');

  const contractSection = document.getElementById('result-contract');
  contractSection.style.display = 'block';

  // Scroll to KP
  kpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Копирование ─────────────────────────────────────────
function copyKP() {
  const text = document.getElementById('kp-body').textContent;
  copyToClipboard(text, 'Коммерческое предложение скопировано');
}

function copyContract() {
  const rows = document.querySelectorAll('.contract-row');
  const lines = [];
  rows.forEach(row => {
    const key = row.querySelector('.contract-key').textContent.trim();
    const val = row.querySelector('.contract-val').textContent.trim();
    lines.push(`${key}: ${val}`);
  });
  copyToClipboard(lines.join('\n'), 'Данные для договора скопированы');
}

function copyToClipboard(text, successMsg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(fallbackCopy.bind(null, text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
  } catch (e) {
    showToast('Не удалось скопировать. Выделите текст вручную.');
  }
  document.body.removeChild(ta);
}

// ─── Toast ───────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: #111827;
    color: #fff;
    padding: 12px 24px;
    border-radius: 100px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 8px 30px rgba(0,0,0,.25);
    opacity: 0;
    transition: opacity .2s ease;
    pointer-events: none;
    white-space: nowrap;
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// ─── Сброс ───────────────────────────────────────────────
function resetAll() {
  // Очистить текстовые поля
  ['client-name','client-inn','client-contact','client-phone','client-email'].forEach(id => {
    document.getElementById(id).value = '';
  });

  // Тип клиента — ООО
  const oooRadio = document.querySelector('input[name="client-type"][value="ООО"]');
  if (oooRadio) oooRadio.checked = true;

  // Снять галочки с услуг
  document.querySelectorAll('.service-check').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('.service-item').forEach(el => { el.classList.remove('checked'); });

  // Параметры
  document.getElementById('employees').value = '0';
  document.getElementById('operations').value = '0';

  const urgNo = document.querySelector('input[name="urgency"][value="no"]');
  if (urgNo) urgNo.checked = true;
  const mgrNo = document.querySelector('input[name="manager"][value="no"]');
  if (mgrNo) mgrNo.checked = true;
  const fmtFirst = document.querySelector('input[name="format"][value="Разовая услуга"]');
  if (fmtFirst) fmtFirst.checked = true;

  // Скрыть результаты
  document.getElementById('result-kp').style.display = 'none';
  document.getElementById('result-contract').style.display = 'none';
  document.getElementById('warning-no-services').style.display = 'none';

  updateSummary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Экранирование HTML ──────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Инициализация слушателей ────────────────────────────
function initListeners() {
  // Чекбоксы услуг
  document.querySelectorAll('.service-check').forEach(cb => {
    cb.addEventListener('change', updateSummary);
  });

  // Количество сотрудников и операций
  document.getElementById('employees').addEventListener('input', updateSummary);
  document.getElementById('operations').addEventListener('input', updateSummary);

  // Радиокнопки
  document.querySelectorAll('input[name="urgency"], input[name="manager"], input[name="format"]').forEach(r => {
    r.addEventListener('change', updateSummary);
  });

  // Телефон — простая маска
  const phoneInput = document.getElementById('client-phone');
  phoneInput.addEventListener('input', function () {
    let val = this.value.replace(/\D/g, '');
    if (val.startsWith('8')) val = '7' + val.slice(1);
    if (val.startsWith('7') && val.length > 1) {
      val = '+7 (' + val.slice(1, 4) + ') ' + val.slice(4, 7) + '-' + val.slice(7, 9) + '-' + val.slice(9, 11);
    } else if (val.length > 0) {
      val = '+' + val;
    }
    this.value = val;
  });

  // ИНН — только цифры
  const innInput = document.getElementById('client-inn');
  innInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 12);
  });
}

// ─── Запуск ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initListeners();
  updateSummary();
});
