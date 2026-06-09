/* =========================================================
   КАЛЬКУЛЯТОР УСЛУГ — script.js
   ========================================================= */

const EXECUTOR = {
  name:     'ООО «Бизнес Сервис»',
  inn:      '7700000000',
  kpp:      '770001001',
  ogrn:     '1237700000000',
  address:  '115035, г. Москва, ул. Примерная, д. 10, офис 25',
  email:    'info@business-service.ru',
  phone:    '+7 (495) 000-00-00',
  bank:     'АО «Пример Банк»',
  rs:       '40702810000000000000',
  bik:      '044525000',
  ks:       '30101810000000000000',
  director: 'Иванов Иван Иванович'
};

// Текущая сессия
let lastKP       = null;
let lastContract = null;

// ─── Утилиты ─────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}
function todayStr() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function todayFile() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
function deadlineText(format) {
  return format === 'Ежемесячное сопровождение' ? 'С момента подписания договора' : '5–10 рабочих дней';
}
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeFile(s) {
  return String(s || '').replace(/[\\/:*?"<>|«»]/g,'').replace(/\s+/g,'_').slice(0,40);
}

// ─── Счётчики (сессионные) ───────────────────────────────
const _counters = {};
function nextNum(prefix) {
  const year = new Date().getFullYear();
  const key  = `${prefix}_${year}`;
  const stored = parseInt(localStorage.getItem(`ctr_${key}`) || '0', 10) + 1;
  localStorage.setItem(`ctr_${key}`, String(stored));
  return `${prefix}-${year}-${String(stored).padStart(4,'0')}`;
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
  const fd     = getFormData();
  const checks = document.querySelectorAll('.service-check:checked');
  let baseSum  = 0;
  const items  = [];

  checks.forEach(cb => {
    const name   = cb.dataset.name;
    const price  = parseInt(cb.dataset.price) || 0;
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
    modifiers.push({ label: `Операций > ${fd.operations > 300 ? 300 : 100} (+${opCoef * 100}%)`, value: add });
  }
  let total = Math.round(baseSum * (1 + opCoef));

  if (fd.urgency === 'yes') {
    const add = Math.round(total * 0.3);
    modifiers.push({ label: 'Срочность (+30%)', value: add });
    total += add;
  }
  if (fd.manager === 'yes') {
    modifiers.push({ label: 'Личный менеджер', value: 10000 });
    total += 10000;
  }
  return { total, items, modifiers };
}

// ─── Обновление сайдбара в реальном времени ──────────────
function updateSummary() {
  const { total, items, modifiers } = calcTotal();
  const fmtd = fmt(total);
  document.getElementById('total-display').textContent       = fmtd;
  document.getElementById('mobile-total-display').textContent = fmtd;

  const bdEl = document.getElementById('total-breakdown');
  if (items.length === 0) {
    bdEl.innerHTML = '<p class="breakdown-empty">Выберите услуги для расчёта</p>';
  } else {
    let html = '';
    items.forEach(it => {
      html += `<div class="breakdown-item">
        <span class="breakdown-name">${esc(it.name)}</span>
        <span class="breakdown-price">${fmt(it.price)}</span>
      </div>`;
    });
    modifiers.forEach(m => {
      html += `<div class="breakdown-modifier">
        <span>${esc(m.label)}</span>
        <span>+${fmt(m.value)}</span>
      </div>`;
    });
    bdEl.innerHTML = html;
  }

  const { workFormat } = getFormData();
  document.getElementById('total-meta').innerHTML = `
    <div class="total-meta-item"><span class="total-meta-dot"></span><span>${esc(workFormat)}</span></div>
    <div class="total-meta-item"><span class="total-meta-dot"></span><span>${deadlineText(workFormat)}</span></div>`;

  // Зарплатный проект — динамическая цена
  const emp = parseInt(document.getElementById('employees').value) || 1;
  const sp  = document.querySelector('.salary-price');
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
  const fd     = getFormData();
  const checks = document.querySelectorAll('.service-check:checked');
  const errors = [];

  const setErr = (fieldId, errId, msg) => {
    const inp = document.getElementById(fieldId);
    const err = document.getElementById(errId);
    if (inp) inp.classList.add('input-error');
    if (err) err.textContent = msg;
    errors.push(msg);
  };

  if (!fd.clientName)    setErr('client-name',    'err-client-name',    'Укажите название компании или ФИО');
  if (!fd.clientContact) setErr('client-contact', 'err-client-contact', 'Укажите контактное лицо');

  if (!fd.clientPhone && !fd.clientEmail) {
    setErr('client-phone', 'err-client-phone', 'Укажите телефон или email');
    setErr('client-email', 'err-client-email', 'Укажите телефон или email');
  }

  if (checks.length === 0) {
    const errEl = document.getElementById('err-services');
    if (errEl) errEl.textContent = 'Выберите хотя бы одну услугу';
    errors.push('Выберите хотя бы одну услугу');
  }

  if (errors.length > 0) {
    const parts = [];
    if (!fd.clientName || !fd.clientContact || (!fd.clientPhone && !fd.clientEmail)) {
      parts.push('Заполните данные клиента.');
    }
    if (checks.length === 0) parts.push('Выберите хотя бы одну услугу — без этого КП сформировать нельзя.');

    document.getElementById('error-banner-text').textContent = parts.join(' ');
    const banner = document.getElementById('error-banner');
    banner.style.display = 'flex';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

// ─── Текст КП ────────────────────────────────────────────
function buildKPText(fd, items, total, kpNum) {
  const lines = items.map(it => `  • ${it.name} — ${fmt(it.price)}`).join('\n');
  return `КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ

от ${EXECUTOR.name}
ИНН ${EXECUTOR.inn}
Email: ${EXECUTOR.email}
Телефон: ${EXECUTOR.phone}

Для:
${fd.clientName}${fd.clientInn ? '\nИНН: ' + fd.clientInn : ''}${fd.clientContact ? '\nКонтактное лицо: ' + fd.clientContact : ''}${fd.clientPhone ? '\nТелефон: ' + fd.clientPhone : ''}${fd.clientEmail ? '\nEmail: ' + fd.clientEmail : ''}

Дата: ${todayStr()}
Номер КП: ${kpNum}

Здравствуйте${fd.clientContact ? ', ' + fd.clientContact : ''}!

Подготовили для вас расчёт стоимости бухгалтерских услуг.

В рамках работы мы готовы взять на себя следующие задачи:
${lines}

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

Следующий шаг — согласовать детали, после чего мы подготовим договор и начнём работу.

С уважением,
${EXECUTOR.name}
${EXECUTOR.phone} · ${EXECUTOR.email}`;
}

// ─── Текст договора ──────────────────────────────────────
function buildContractText(fd, items, total, cNum) {
  const lines = items.map((it, i) => `${i+1}.2.${i+1}. ${it.name} — ${fmt(it.price)}`).join('\n');
  return `ДОГОВОР ОКАЗАНИЯ УСЛУГ № ${cNum}

г. Москва                                                     ${todayStr()}

${EXECUTOR.name}, именуемое в дальнейшем «Исполнитель», в лице генерального директора ${EXECUTOR.director}, действующего на основании Устава, с одной стороны, и ${fd.clientName}, именуемый в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем.


1. ПРЕДМЕТ ДОГОВОРА

1.1. Исполнитель обязуется оказать Заказчику бухгалтерские, налоговые и сопутствующие консультационные услуги, а Заказчик обязуется принять и оплатить услуги.

1.2. Перечень услуг:
${lines}

1.3. Формат работы: ${fd.workFormat}


2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ

2.1. Общая стоимость услуг: ${fmt(total)}

2.2. Оплата производится в следующем порядке:
50% — предоплата до начала оказания услуг.
50% — после завершения работ / по итогам отчётного периода.


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

5.2. Исполнитель не несёт ответственность за последствия, возникшие из-за непредоставления документов Заказчиком.


6. РЕКВИЗИТЫ СТОРОН

Исполнитель:                               Заказчик:
${EXECUTOR.name.padEnd(40)}${fd.clientName}
ИНН: ${EXECUTOR.inn.padEnd(35)}${fd.clientInn ? 'ИНН: ' + fd.clientInn : ''}
КПП: ${EXECUTOR.kpp.padEnd(35)}${fd.clientContact ? 'Контактное лицо: ' + fd.clientContact : ''}
ОГРН: ${EXECUTOR.ogrn.padEnd(34)}${fd.clientPhone ? 'Телефон: ' + fd.clientPhone : ''}
Адрес: ${EXECUTOR.address}
Email: ${EXECUTOR.email.padEnd(33)}${fd.clientEmail ? 'Email: ' + fd.clientEmail : ''}
Телефон: ${EXECUTOR.phone}
Р/с: ${EXECUTOR.rs}
Банк: ${EXECUTOR.bank}
БИК: ${EXECUTOR.bik}
К/с: ${EXECUTOR.ks}


ПОДПИСИ СТОРОН

Исполнитель: _________________________ / ${EXECUTOR.director} /

Заказчик: ___________________________ / ${fd.clientContact || fd.clientName} /`;
}

// ─── Скачивание .doc ─────────────────────────────────────
function wrapAsDoc(text, title) {
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.6;margin:2cm;color:#000}pre{font-family:Times New Roman,serif;font-size:12pt;white-space:pre-wrap}</style>
</head><body><pre>${esc(text)}</pre></body></html>`;
}

function downloadDoc(content, filename) {
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ─── Формирование КП ─────────────────────────────────────
function generateProposal() {
  if (!validate()) return;

  const fd         = getFormData();
  const { total, items } = calcTotal();
  const kpNum      = nextNum('КП');
  const kpText     = buildKPText(fd, items, total, kpNum);
  lastKP           = { text: kpText, kpNum, fd, items, total };

  document.getElementById('kp-meta').textContent  = `${kpNum} · ${todayStr()}`;
  document.getElementById('kp-body').textContent   = kpText;
  const kpSection = document.getElementById('result-kp');
  kpSection.style.display = 'block';

  // Скрыть старый договор при новом КП
  document.getElementById('result-contract-full').style.display = 'none';
  lastContract = null;

  const fname = `КП_${safeFile(fd.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(kpText, fname), fname);

  kpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('КП сформировано и скачивается');
}

function downloadKP() {
  if (!lastKP) { showToast('Сначала сформируйте КП'); return; }
  const fname = `КП_${safeFile(lastKP.fd.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(lastKP.text, fname), fname);
  showToast('КП скачивается');
}

function copyKP() {
  if (!lastKP) { showToast('Сначала сформируйте КП'); return; }
  copyToClipboard(lastKP.text, 'КП скопировано');
}

// ─── Формирование договора ───────────────────────────────
function generateContract() {
  if (!lastKP) { showToast('Сначала сформируйте КП'); return; }

  const { fd, items, total } = lastKP;
  const cNum         = nextNum('Д');
  const contractText = buildContractText(fd, items, total, cNum);
  lastContract       = { text: contractText, cNum };

  document.getElementById('contract-meta').textContent  = `${cNum} · ${todayStr()}`;
  document.getElementById('contract-body').textContent   = contractText;
  const sec = document.getElementById('result-contract-full');
  sec.style.display = 'block';

  const fname = `Договор_${safeFile(fd.clientName)}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(contractText, fname), fname);

  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Договор сформирован и скачивается');
}

function downloadContract() {
  if (!lastContract) { showToast('Сначала сформируйте договор'); return; }
  const fd    = lastKP ? lastKP.fd : {};
  const fname = `Договор_${safeFile(fd.clientName || 'клиент')}_${todayFile()}.doc`;
  downloadDoc(wrapAsDoc(lastContract.text, fname), fname);
  showToast('Договор скачивается');
}

function copyContract() {
  if (!lastContract) { showToast('Сначала сформируйте договор'); return; }
  copyToClipboard(lastContract.text, 'Договор скопирован');
}

// ─── Сброс ───────────────────────────────────────────────
function resetAll() {
  ['client-name','client-inn','client-contact','client-phone','client-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const ooo = document.querySelector('input[name="client-type"][value="ООО"]');
  if (ooo) ooo.checked = true;
  document.querySelectorAll('.service-check').forEach(cb => { cb.checked = false; });
  document.getElementById('employees').value  = '0';
  document.getElementById('operations').value = '0';
  ['urgency','manager','format'].forEach(name => {
    const first = document.querySelector(`input[name="${name}"]`);
    if (first) first.checked = true;
  });
  document.getElementById('result-kp').style.display            = 'none';
  document.getElementById('result-contract-full').style.display = 'none';
  clearValidation();
  lastKP = null; lastContract = null;
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
  Object.assign(ta.style, { position:'fixed', opacity:'0', pointerEvents:'none' });
  document.body.appendChild(ta); ta.select();
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
    background:'#111827', color:'#fff', padding:'10px 22px', borderRadius:'100px',
    fontFamily:'var(--font-body)', fontSize:'13px', fontWeight:'500',
    zIndex:'9999', boxShadow:'0 8px 30px rgba(0,0,0,.22)',
    opacity:'0', transition:'opacity .2s ease', pointerEvents:'none', whiteSpace:'nowrap'
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
}

// ─── Прокрутка ───────────────────────────────────────────
function scrollToForm() {
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Маски ввода ─────────────────────────────────────────
function initMasks() {
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
  initMasks();
  updateSummary();

  document.querySelectorAll('.service-check').forEach(cb => cb.addEventListener('change', updateSummary));
  document.getElementById('employees').addEventListener('input', updateSummary);
  document.getElementById('operations').addEventListener('input', updateSummary);
  document.querySelectorAll('input[name="urgency"], input[name="manager"], input[name="format"]')
    .forEach(r => r.addEventListener('change', updateSummary));
});
