/* =========================================================
   КАЛЬКУЛЯТОР УСЛУГ v2 — script.js
   ========================================================= */

// ─── Данные исполнителя ──────────────────────────────────
const EXECUTOR = {
  name:    'ООО «Бизнес Сервис»',
  inn:     '7700000000',
  kpp:     '770001001',
  ogrn:    '1237700000000',
  address: '115035, г. Москва, ул. Примерная, д. 10, офис 25',
  email:   'info@business-service.ru',
  phone:   '+7 (495) 000-00-00',
  bank:    'АО «Пример Банк»',
  rs:      '40702810000000000000',
  bik:     '044525000',
  ks:      '30101810000000000000',
  director:'Иванов Иван Иванович'
};

// ─── Глобальное состояние текущего КП/договора ───────────
let currentKP       = null;
let currentContract = null;

// ─── Утилиты ─────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}
function todayStr() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function todayFile() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
function deadlineText(format) {
  return format === 'Ежемесячное сопровождение' ? 'С момента подписания договора' : '5–10 рабочих дней';
}
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Нумерация (localStorage) ────────────────────────────
function nextNum(key) {
  const year = new Date().getFullYear();
  const storKey = `counter_${key}_${year}`;
  let n = parseInt(localStorage.getItem(storKey) || '0', 10) + 1;
  localStorage.setItem(storKey, String(n));
  return `${key}-${year}-${String(n).padStart(4,'0')}`;
}

// ─── Чтение формы ────────────────────────────────────────
function getFormData() {
  return {
    clientName:    document.getElementById('client-name').value.trim(),
    clientInn:     document.getElementById('client-inn').value.trim(),
    clientContact: document.getElementById('client-contact').value.trim(),
    clientPhone:   document.getElementById('client-phone').value.trim(),
    clientEmail:   document.getElementById('client-email').value.trim(),
    clientType:    (document.querySelector('input[name="client-type"]:checked') || {}).value || 'ООО',
    employees:     parseInt(document.getElementById('employees').value) || 0,
    operations:    parseInt(document.getElementById('operations').value) || 0,
    urgency:       (document.querySelector('input[name="urgency"]:checked') || {}).value || 'no',
    manager:       (document.querySelector('input[name="manager"]:checked') || {}).value || 'no',
    workFormat:    (document.querySelector('input[name="format"]:checked') || {}).value || 'Разовая услуга'
  };
}

// ─── Расчёт ──────────────────────────────────────────────
function calcTotal() {
  const fd = getFormData();
  const checks = document.querySelectorAll('.service-check:checked');
  let baseSum = 0;
  const items = [];

  checks.forEach(cb => {
    const name = cb.dataset.name;
    const price = parseInt(cb.dataset.price) || 0;
    const perEmp = cb.dataset.perEmployee === 'true';
    if (perEmp) {
      const cnt = fd.employees > 0 ? fd.employees : 1;
      const tot = price * cnt;
      baseSum += tot;
      items.push({ name: `${name} (${cnt} чел.)`, price: tot });
    } else {
      baseSum += price;
      items.push({ name, price });
    }
  });

  let opCoef = 0;
  if (fd.operations > 300)      opCoef = 0.40;
  else if (fd.operations > 100) opCoef = 0.20;

  const modifiers = [];
  if (opCoef > 0) {
    const add = Math.round(baseSum * opCoef);
    modifiers.push({ label: `Операций > ${fd.operations > 300 ? 300 : 100} (+${opCoef*100}%)`, value: add });
  }
  let subtotal = Math.round(baseSum * (1 + opCoef));

  if (fd.urgency === 'yes') {
    const add = Math.round(subtotal * 0.3);
    modifiers.push({ label: 'Срочность (+30%)', value: add });
    subtotal += add;
  }
  if (fd.manager === 'yes') {
    modifiers.push({ label: 'Личный менеджер', value: 10000 });
    subtotal += 10000;
  }
  return { total: subtotal, items, modifiers };
}

// ─── Обновление сайдбара ─────────────────────────────────
function updateSummary() {
  const { total, items, modifiers } = calcTotal();
  const fmtd = fmt(total);
  document.getElementById('total-display').textContent = fmtd;
  document.getElementById('mobile-total-display').textContent = fmtd;

  const bdEl = document.getElementById('total-breakdown');
  if (items.length === 0) {
    bdEl.innerHTML = '<p class="breakdown-empty">Выберите услуги для расчёта</p>';
  } else {
    let html = '';
    items.forEach(it => {
      html += `<div class="breakdown-item"><span class="breakdown-name">${esc(it.name)}</span><span class="breakdown-price">${fmt(it.price)}</span></div>`;
    });
    modifiers.forEach(m => {
      html += `<div class="breakdown-modifier"><span>${esc(m.label)}</span><span>+${fmt(m.value)}</span></div>`;
    });
    bdEl.innerHTML = html;
  }

  const { workFormat } = getFormData();
  document.getElementById('total-meta').innerHTML = `
    <div class="total-meta-item"><span class="total-meta-dot"></span><span>${esc(workFormat)}</span></div>
    <div class="total-meta-item"><span class="total-meta-dot"></span><span>${deadlineText(workFormat)}</span></div>`;

  // Salary display
  const emp = parseInt(document.getElementById('employees').value) || 1;
  const sp = document.querySelector('.salary-price');
  if (sp) sp.textContent = fmt(1500 * (emp > 0 ? emp : 1));
}

// ─── Валидация ───────────────────────────────────────────
function clearValidation() {
  document.querySelectorAll('.field-input').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  document.getElementById('error-banner').style.display = 'none';
}

function validate() {
  clearValidation();
  const fd = getFormData();
  const checks = document.querySelectorAll('.service-check:checked');
  const errors = [];

  const setErr = (id, msg) => {
    const errEl = document.getElementById(id);
    if (errEl) errEl.textContent = msg;
    const inputId = id.replace('err-','');
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.add('input-error');
    errors.push(msg);
  };

  if (!fd.clientName)    setErr('err-client-name',    'Укажите название компании или ФИО');
  if (!fd.clientContact) setErr('err-client-contact', 'Укажите контактное лицо');
  if (!fd.clientPhone && !fd.clientEmail) {
    setErr('err-client-phone', 'Укажите телефон или email');
    setErr('err-client-email', 'Укажите телефон или email');
  }
  if (checks.length === 0) {
    const servErr = document.getElementById('err-services');
    if (servErr) servErr.textContent = 'Выберите хотя бы одну услугу';
    errors.push('Выберите хотя бы одну услугу');
  }

  if (errors.length > 0) {
    const banner = document.getElementById('error-banner');
    let msg = '';
    if (!fd.clientName || !fd.clientContact || (!fd.clientPhone && !fd.clientEmail)) {
      msg += 'Заполните данные клиента. ';
    }
    if (checks.length === 0) msg += 'Выберите хотя бы одну услугу — без этого КП сформировать нельзя.';
    document.getElementById('error-banner-text').textContent = msg.trim();
    banner.style.display = 'flex';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

// ─── Генерация КП (текст) ────────────────────────────────
function buildKPText(fd, items, total, kpNumber) {
  const serviceLines = items.map(it => `  • ${it.name} — ${fmt(it.price)}`).join('\n');
  return `КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ

от ${EXECUTOR.name}
ИНН ${EXECUTOR.inn}
Email: ${EXECUTOR.email}
Телефон: ${EXECUTOR.phone}

Для:
${fd.clientName}${fd.clientInn ? '\nИНН: ' + fd.clientInn : ''}${fd.clientContact ? '\nКонтактное лицо: ' + fd.clientContact : ''}${fd.clientPhone ? '\nТелефон: ' + fd.clientPhone : ''}${fd.clientEmail ? '\nEmail: ' + fd.clientEmail : ''}

Дата формирования: ${todayStr()}
Номер КП: ${kpNumber}

Здравствуйте${fd.clientContact ? ', ' + fd.clientContact : ''}!

Подготовили для вас расчёт стоимости бухгалтерских услуг на основе выбранных параметров.

В рамках работы мы готовы взять на себя следующие задачи:
${serviceLines}

Параметры расчёта:
  • Тип клиента: ${fd.clientType}
  • Формат работы: ${fd.workFormat}
  • Количество сотрудников: ${fd.employees}
  • Количество операций в месяц: ${fd.operations}
  • Срочность: ${fd.urgency === 'yes' ? 'Да (+30%)' : 'Нет'}
  • Личный менеджер: ${fd.manager === 'yes' ? 'Да (+10 000 ₽)' : 'Нет'}

Итоговая стоимость:
${fmt(total)}

Условия оплаты:
50% — предоплата перед началом работы.
50% — после завершения работ / по итогам отчётного периода.

Срок оказания услуг:
${deadlineText(fd.workFormat)}

Следующий шаг:
После согласования условий мы подготовим договор и сможем начать работу.

С уважением,
${EXECUTOR.name}
${EXECUTOR.phone} · ${EXECUTOR.email}`;
}

// ─── Генерация договора (текст) ──────────────────────────
function buildContractText(fd, items, total, contractNumber) {
  const serviceLines = items.map((it, i) => `${i+1}.2.${i+1}. ${it.name} — ${fmt(it.price)}`).join('\n');
  return `ДОГОВОР ОКАЗАНИЯ УСЛУГ № ${contractNumber}

г. Москва
${todayStr()}

${EXECUTOR.name}, именуемое в дальнейшем «Исполнитель», в лице генерального директора ${EXECUTOR.director}, действующего на основании Устава, с одной стороны, и ${fd.clientName}, именуемый в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем.


1. ПРЕДМЕТ ДОГОВОРА

1.1. Исполнитель обязуется оказать Заказчику бухгалтерские, налоговые и сопутствующие консультационные услуги, а Заказчик обязуется принять и оплатить услуги.

1.2. Перечень услуг:
${serviceLines}

1.3. Формат работы: ${fd.workFormat}


2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК ОПЛАТЫ

2.1. Общая стоимость услуг составляет: ${fmt(total)}

2.2. Оплата производится в следующем порядке:
50% — предоплата до начала оказания услуг.
50% — после завершения работ / по итогам отчётного периода.

2.3. Стоимость рассчитана на основании выбранных Заказчиком услуг и параметров расчёта.


3. СРОКИ ОКАЗАНИЯ УСЛУГ

3.1. Срок оказания услуг: ${deadlineText(fd.workFormat)}

3.2. При необходимости сроки могут быть уточнены сторонами дополнительно.


4. ПРАВА И ОБЯЗАННОСТИ СТОРОН

4.1. Исполнитель обязуется:
  • оказать услуги качественно и в согласованные сроки;
  • использовать данные Заказчика только для целей оказания услуг;
  • своевременно информировать Заказчика о ходе выполнения работ.

4.2. Заказчик обязуется:
  • предоставить необходимые документы и информацию;
  • своевременно оплачивать услуги;
  • проверять и согласовывать подготовленные материалы.


5. ОТВЕТСТВЕННОСТЬ СТОРОН

5.1. Стороны несут ответственность в соответствии с законодательством РФ.

5.2. Исполнитель не несёт ответственность за последствия, возникшие из-за непредоставления или несвоевременного предоставления документов Заказчиком.


6. РЕКВИЗИТЫ СТОРОН

Исполнитель:
${EXECUTOR.name}
ИНН: ${EXECUTOR.inn}
КПП: ${EXECUTOR.kpp}
ОГРН: ${EXECUTOR.ogrn}
Адрес: ${EXECUTOR.address}
Email: ${EXECUTOR.email}
Телефон: ${EXECUTOR.phone}
Р/с: ${EXECUTOR.rs}
Банк: ${EXECUTOR.bank}
БИК: ${EXECUTOR.bik}
К/с: ${EXECUTOR.ks}

Заказчик:
${fd.clientName}${fd.clientInn ? '\nИНН: ' + fd.clientInn : ''}${fd.clientContact ? '\nКонтактное лицо: ' + fd.clientContact : ''}${fd.clientPhone ? '\nТелефон: ' + fd.clientPhone : ''}${fd.clientEmail ? '\nEmail: ' + fd.clientEmail : ''}


ПОДПИСИ СТОРОН

Исполнитель: __________________ / ${EXECUTOR.director} /

Заказчик: __________________ / ${fd.clientContact || fd.clientName} /`;
}

// ─── HTML-обёртка для скачивания как .doc ────────────────
function wrapAsDoc(text, title) {
  const safe = esc(text);
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  body { font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #000; }
  pre { font-family: Times New Roman, serif; font-size: 12pt; white-space: pre-wrap; }
</style>
</head>
<body><pre>${safe}</pre></body>
</html>`;
}

// ─── Скачивание файла ────────────────────────────────────
function downloadDoc(content, filename) {
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeFilename(name) {
  return name.replace(/[\\/:*?"<>|«»]/g, '').replace(/\s+/g, '_').slice(0, 40);
}

// ─── Основной сценарий: формирование КП ─────────────────
function generateProposal() {
  if (!validate()) return;

  const fd       = getFormData();
  const { total, items } = calcTotal();
  const kpNumber = nextNum('КП');
  const zNumber  = nextNum('З');

  const kpText = buildKPText(fd, items, total, kpNumber);
  currentKP    = { text: kpText, kpNumber, fd, items, total, zNumber };

  // Показать блок КП
  const kpSection = document.getElementById('result-kp');
  document.getElementById('kp-meta').textContent = `${kpNumber} · ${todayStr()}`;
  document.getElementById('kp-body').textContent  = kpText;
  kpSection.style.display = 'block';

  // Показать блок интеграции
  document.getElementById('integration-info').style.display = 'block';

  // Автоскачивание
  const fname = `КП_${safeFilename(fd.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(kpText, fname), fname);

  // Сохранить в историю
  saveToHistory({
    zNumber, kpNumber, contractNumber: null,
    date: new Date().toISOString(),
    clientName: fd.clientName,
    clientType: fd.clientType,
    total, status: 'КП сформировано',
    fd, items
  });

  // Прогресс
  setStep(4);

  // Скролл
  kpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('КП сформировано и скачивается');
}

// ─── Скачать КП повторно ─────────────────────────────────
function downloadKP() {
  if (!currentKP) { showToast('Сначала сформируйте КП'); return; }
  const fname = `КП_${safeFilename(currentKP.fd.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(currentKP.text, fname), fname);
  showToast('КП скачивается');
}

// ─── Скопировать КП ──────────────────────────────────────
function copyKP() {
  if (!currentKP) { showToast('Сначала сформируйте КП'); return; }
  copyToClipboard(currentKP.text, 'КП скопировано в буфер');
}

// ─── Формирование договора ───────────────────────────────
function generateContract() {
  if (!currentKP) { showToast('Сначала сформируйте КП'); return; }

  const { fd, items, total, zNumber } = currentKP;
  const contractNumber = nextNum('Д');
  currentContract = { contractNumber };

  const contractText = buildContractText(fd, items, total, contractNumber);
  currentContract.text = contractText;

  // Показать блок договора
  const contractSection = document.getElementById('result-contract-full');
  document.getElementById('contract-meta').textContent = `${contractNumber} · ${todayStr()}`;
  document.getElementById('contract-body').textContent  = contractText;
  contractSection.style.display = 'block';

  // Автоскачивание
  const fname = `Договор_${safeFilename(fd.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(contractText, fname), fname);

  // Обновить историю
  updateHistoryContract(currentKP.zNumber, contractNumber);

  // Прогресс
  setStep(5);

  // Скролл
  contractSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Договор сформирован и скачивается');
}

// ─── Скачать договор повторно ────────────────────────────
function downloadContract() {
  if (!currentContract || !currentContract.text) { showToast('Сначала сформируйте договор'); return; }
  const fd = currentKP ? currentKP.fd : {};
  const fname = `Договор_${safeFilename(fd.clientName || 'клиент')}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(currentContract.text, fname), fname);
  showToast('Договор скачивается');
}

// ─── Скопировать договор ─────────────────────────────────
function copyContract() {
  if (!currentContract || !currentContract.text) { showToast('Сначала сформируйте договор'); return; }
  copyToClipboard(currentContract.text, 'Договор скопирован в буфер');
}

// ─── История (localStorage) ──────────────────────────────
const LS_KEY = 'biz_service_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveHistory(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}
function saveToHistory(entry) {
  const arr = loadHistory();
  arr.unshift(entry);
  saveHistory(arr);
  renderHistory();
}
function updateHistoryContract(zNumber, contractNumber) {
  const arr = loadHistory();
  const idx = arr.findIndex(e => e.zNumber === zNumber);
  if (idx !== -1) {
    arr[idx].contractNumber = contractNumber;
    arr[idx].status = 'Договор сформирован';
    saveHistory(arr);
    renderHistory();
  }
}
function deleteHistoryEntry(zNumber) {
  const arr = loadHistory().filter(e => e.zNumber !== zNumber);
  saveHistory(arr);
  renderHistory();
}
function clearHistory() {
  if (!confirm('Очистить всю историю заявок? Это действие нельзя отменить.')) return;
  localStorage.removeItem(LS_KEY);
  renderHistory();
  showToast('История очищена');
}

function renderHistory() {
  const arr = loadHistory();
  const empty = document.getElementById('history-empty');
  const wrap  = document.getElementById('history-table-wrap');
  const tbody = document.getElementById('history-tbody');
  if (arr.length === 0) {
    empty.style.display = 'block';
    wrap.style.display  = 'none';
    return;
  }
  empty.style.display = 'none';
  wrap.style.display  = 'block';

  tbody.innerHTML = arr.map(e => {
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
    const statusClass = e.status === 'Договор сформирован' ? 'status-contract' : 'status-kp';
    return `<tr>
      <td><span class="ht-num">${esc(e.zNumber)}</span><br><span style="font-size:11px;color:var(--gray-400)">${esc(e.kpNumber)}</span></td>
      <td class="ht-date">${esc(dateStr)}</td>
      <td class="ht-client" title="${esc(e.clientName)}">${esc(e.clientName)}</td>
      <td class="ht-type">${esc(e.clientType)}</td>
      <td class="ht-sum">${fmt(e.total)}</td>
      <td><span class="status-badge ${statusClass}">${esc(e.status)}</span></td>
      <td>
        <div class="ht-actions">
          <button class="btn btn-secondary" onclick="openHistoryEntry('${esc(e.zNumber)}')">Открыть</button>
          <button class="btn btn-ghost" onclick="redownloadKP('${esc(e.zNumber)}')">КП</button>
          ${e.contractNumber ? `<button class="btn btn-ghost" onclick="redownloadContract('${esc(e.zNumber)}')">Дог.</button>` : ''}
          <button class="btn btn-ghost" style="color:var(--red-500)" onclick="deleteHistoryEntry('${esc(e.zNumber)}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openHistoryEntry(zNumber) {
  const arr = loadHistory();
  const e   = arr.find(x => x.zNumber === zNumber);
  if (!e) return;
  const kpText = buildKPText(e.fd, e.items, e.total, e.kpNumber);
  currentKP    = { text: kpText, kpNumber: e.kpNumber, fd: e.fd, items: e.items, total: e.total, zNumber: e.zNumber };

  document.getElementById('kp-meta').textContent = `${e.kpNumber} · ${new Date(e.date).toLocaleDateString('ru-RU')}`;
  document.getElementById('kp-body').textContent  = kpText;
  const kpSection = document.getElementById('result-kp');
  kpSection.style.display = 'block';

  if (e.contractNumber) {
    const cText = buildContractText(e.fd, e.items, e.total, e.contractNumber);
    currentContract = { contractNumber: e.contractNumber, text: cText };
    document.getElementById('contract-meta').textContent = `${e.contractNumber} · ${new Date(e.date).toLocaleDateString('ru-RU')}`;
    document.getElementById('contract-body').textContent  = cText;
    document.getElementById('result-contract-full').style.display = 'block';
  }

  kpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Заявка открыта');
}

function redownloadKP(zNumber) {
  const arr = loadHistory();
  const e   = arr.find(x => x.zNumber === zNumber);
  if (!e) return;
  const kpText = buildKPText(e.fd, e.items, e.total, e.kpNumber);
  const fname  = `КП_${safeFilename(e.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(kpText, fname), fname);
  showToast('КП скачивается');
}

function redownloadContract(zNumber) {
  const arr = loadHistory();
  const e   = arr.find(x => x.zNumber === zNumber);
  if (!e || !e.contractNumber) return;
  const cText = buildContractText(e.fd, e.items, e.total, e.contractNumber);
  const fname = `Договор_${safeFilename(e.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(cText, fname), fname);
  showToast('Договор скачивается');
}

// ─── Прогресс-шаги ───────────────────────────────────────
function setStep(n) {
  document.querySelectorAll('.progress-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active','done');
    if (s < n)  el.classList.add('done');
    if (s === n) el.classList.add('active');
  });
}

// ─── Прокрутка к форме ───────────────────────────────────
function scrollToForm() {
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Сброс ───────────────────────────────────────────────
function resetAll() {
  ['client-name','client-inn','client-contact','client-phone','client-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const oooR = document.querySelector('input[name="client-type"][value="ООО"]');
  if (oooR) oooR.checked = true;
  document.querySelectorAll('.service-check').forEach(cb => { cb.checked = false; });
  document.getElementById('employees').value  = '0';
  document.getElementById('operations').value = '0';
  const urgNo = document.querySelector('input[name="urgency"][value="no"]');
  if (urgNo) urgNo.checked = true;
  const mgrNo = document.querySelector('input[name="manager"][value="no"]');
  if (mgrNo) mgrNo.checked = true;
  const fmtR = document.querySelector('input[name="format"][value="Разовая услуга"]');
  if (fmtR) fmtR.checked = true;

  document.getElementById('result-kp').style.display            = 'none';
  document.getElementById('result-contract-full').style.display = 'none';
  document.getElementById('integration-info').style.display     = 'none';
  clearValidation();

  currentKP       = null;
  currentContract = null;

  setStep(1);
  updateSummary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Копирование ─────────────────────────────────────────
function copyToClipboard(text, msg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => fallbackCopy(text, msg));
  } else {
    fallbackCopy(text, msg);
  }
}
function fallbackCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast(msg); } catch { showToast('Не удалось скопировать'); }
  document.body.removeChild(ta);
}

// ─── Toast ───────────────────────────────────────────────
function showToast(msg) {
  const old = document.querySelector('.toast-msg');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast-msg';
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
    background:'#111827', color:'#fff', padding:'11px 22px', borderRadius:'100px',
    fontFamily:'var(--font-body)', fontSize:'13px', fontWeight:'500',
    zIndex:'9999', boxShadow:'0 8px 30px rgba(0,0,0,.25)',
    opacity:'0', transition:'opacity .2s ease', pointerEvents:'none', whiteSpace:'nowrap'
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2200);
}

// ─── Прогресс по скроллу ─────────────────────────────────
function updateProgressOnScroll() {
  const sections = [
    { id: 'step-client',   step: 1 },
    { id: 'step-services', step: 2 },
    { id: 'step-params',   step: 3 },
  ];
  let current = 1;
  sections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el && el.getBoundingClientRect().top < window.innerHeight * 0.6) current = s.step;
  });
  if (document.getElementById('result-kp').style.display !== 'none') current = 4;
  if (document.getElementById('result-contract-full').style.display !== 'none') current = 5;
  document.querySelectorAll('.progress-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active','done');
    if (s < current) el.classList.add('done');
    if (s === current) el.classList.add('active');
  });
}

// ─── Маски ввода ─────────────────────────────────────────
function initInputMasks() {
  const phone = document.getElementById('client-phone');
  if (phone) {
    phone.addEventListener('input', function() {
      let v = this.value.replace(/\D/g,'');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (v.startsWith('7') && v.length > 1) {
        v = '+7 (' + v.slice(1,4) + ') ' + v.slice(4,7) + '-' + v.slice(7,9) + '-' + v.slice(9,11);
      } else if (v.length) { v = '+' + v; }
      this.value = v;
    });
  }
  const inn = document.getElementById('client-inn');
  if (inn) inn.addEventListener('input', function() { this.value = this.value.replace(/\D/g,'').slice(0,12); });
}

// ─── Инициализация ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initInputMasks();
  updateSummary();
  renderHistory();
  setStep(1);

  document.querySelectorAll('.service-check').forEach(cb => cb.addEventListener('change', updateSummary));
  document.getElementById('employees').addEventListener('input', updateSummary);
  document.getElementById('operations').addEventListener('input', updateSummary);
  document.querySelectorAll('input[name="urgency"], input[name="manager"], input[name="format"]').forEach(r => r.addEventListener('change', updateSummary));
  window.addEventListener('scroll', updateProgressOnScroll, { passive: true });
});
