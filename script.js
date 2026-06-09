/* ═══════════════════════════════════════════
   КАЛЬКУЛЯТОР БУХГАЛТЕРСКИХ УСЛУГ
   Квиз-версия — script.js
═══════════════════════════════════════════ */

/* ─── Исполнитель ─────────────────────── */
const EX = {
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
  director: 'Иванов Иван Иванович',
  dirShort: 'Иванов И.И.'
};

/* ─── Состояние квиза ─────────────────── */
const TOTAL_STEPS = 12;
let currentStep = 1;
let goingBack   = false;

const answers = {
  name:      '',
  inn:       '',
  type:      '',
  employees: 0,
  empLabel:  '',
  accounting:'',
  services:  [],   // [{id,name,price,perEmp}]
  operations: 10,
  opsLabel:  '',
  urgent:    'no',
  manager:   'no',
  format:    '',
  startWhen: '',
  contact:   '',
  phone:     '',
  email:     ''
};

/* ─── Утилиты ─────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}
function todayStr() {
  return new Date().toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
}
function todayShort() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}
function todayFile() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
function deadlineText(fmt_) {
  return fmt_ === 'Ежемесячное сопровождение'
    ? 'С момента подписания договора, на постоянной основе'
    : '5–10 рабочих дней с момента подписания договора';
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeFile(s) {
  return String(s||'').replace(/[\\/:*?"<>|«»]/g,'').replace(/\s+/g,'_').slice(0,40);
}
function nextNum(prefix) {
  const y   = new Date().getFullYear();
  const key = `ctr_${prefix}_${y}`;
  const n   = parseInt(localStorage.getItem(key)||'0',10)+1;
  localStorage.setItem(key,String(n));
  return `${prefix}-${y}-${String(n).padStart(4,'0')}`;
}

/* ─── Расчёт итоговой стоимости ────────── */
function calcTotal() {
  const emp = answers.employees;
  let base  = 0;
  const items = [];

  answers.services.forEach(s => {
    if (s.perEmp) {
      const cnt = emp > 0 ? emp : 1;
      const tot = s.price * cnt;
      base += tot;
      items.push({ name: `${s.name} (${cnt} чел.)`, price: tot });
    } else {
      base += s.price;
      items.push({ name: s.name, price: s.price });
    }
  });

  const ops = answers.operations;
  let opCoef = 0;
  if (ops > 300)      opCoef = 0.40;
  else if (ops > 100) opCoef = 0.20;

  const mods = [];
  if (opCoef > 0) {
    const add = Math.round(base * opCoef);
    mods.push({ label: `Объём операций (${opCoef*100}%)`, value: add });
  }

  let total = Math.round(base * (1 + opCoef));

  if (answers.urgent === 'yes') {
    const add = Math.round(total * 0.30);
    mods.push({ label: 'Срочное подключение (+30%)', value: add });
    total += add;
  }
  if (answers.manager === 'yes') {
    mods.push({ label: 'Персональный менеджер', value: 10000 });
    total += 10000;
  }

  return { total, items, mods };
}

/* ─── Квиз: запуск ────────────────────── */
function startQuiz() {
  document.getElementById('hero').style.display = 'none';
  document.getElementById('quiz-wrapper').style.display = 'block';
  currentStep = 1;
  goingBack   = false;
  showStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Квиз: показать шаг ──────────────── */
function showStep(n) {
  document.querySelectorAll('.quiz-slide').forEach(el => {
    el.classList.remove('active','back','exit');
    el.style.display = 'none';
  });

  const slide = document.querySelector(`.quiz-slide[data-step="${n}"]`);
  if (!slide) return;
  slide.style.display = 'block';
  slide.classList.add('active');
  if (goingBack) slide.classList.add('back');

  // Progress
  document.getElementById('step-label').textContent = `Шаг ${n} из ${TOTAL_STEPS}`;
  document.getElementById('bar-fill').style.width = `${(n / TOTAL_STEPS) * 100}%`;

  // Nav buttons
  document.getElementById('btn-back').style.display = n > 1 ? 'inline-flex' : 'none';
  const btnNext = document.getElementById('btn-next');
  btnNext.style.display = n === TOTAL_STEPS ? 'none' : 'inline-flex';
  btnNext.textContent = n === TOTAL_STEPS - 1 ? 'Посмотреть расчёт →' : 'Далее →';

  // На шаге 12 — обновить сводку
  if (n === TOTAL_STEPS) buildSummary();

  // Восстановить выбор
  restoreStep(n);

  currentStep = n;
  goingBack   = false;
}

/* ─── Восстановить выбор на шаге ─────── */
function restoreStep(n) {
  if (n === 1 && answers.name) {
    const el = document.getElementById('q-name');
    if (el) el.value = answers.name;
  }
  if (n === 2)  restoreChoice('q-type-group', answers.type);
  if (n === 3)  restoreChoice('q-emp-group', String(answers.employees));
  if (n === 4)  restoreChoice('q-acc-group', answers.accounting);
  if (n === 5)  restoreServices();
  if (n === 6)  restoreChoice('q-ops-group', String(answers.operations));
  if (n === 7)  restoreChoice('q-urgent-group', answers.urgent);
  if (n === 8)  restoreChoice('q-mgr-group', answers.manager);
  if (n === 9)  restoreChoice('q-fmt-group', answers.format);
  if (n === 10) restoreChoice('q-start-group', answers.startWhen);
  if (n === 11) {
    const c = document.getElementById('q-contact');
    const i = document.getElementById('q-inn');
    const p = document.getElementById('q-phone');
    const e = document.getElementById('q-email');
    if (c) c.value = answers.contact;
    if (i) i.value = answers.inn;
    if (p) p.value = answers.phone;
    if (e) e.value = answers.email;
  }
}

function restoreChoice(groupId, val) {
  if (!val) return;
  document.querySelectorAll(`#${groupId} .choice-card`).forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === val);
  });
}

function restoreServices() {
  const ids = new Set(answers.services.map(s => s.id));
  document.querySelectorAll('#q-services-group .service-card').forEach(btn => {
    btn.classList.toggle('selected', ids.has(btn.dataset.id));
  });
}

/* ─── Квиз: вперёд ───────────────────── */
function nextStep() {
  if (!validateStep(currentStep)) return;
  collectStep(currentStep);
  goingBack = false;
  if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
}

/* ─── Квиз: назад ────────────────────── */
function prevStep() {
  collectStep(currentStep);
  goingBack = true;
  if (currentStep > 1) showStep(currentStep - 1);
}

/* ─── Сбор ответа текущего шага ─────── */
function collectStep(n) {
  if (n === 1) {
    answers.name = document.getElementById('q-name').value.trim();
  }
  if (n === 2) {
    const sel = document.querySelector('#q-type-group .choice-card.selected');
    if (sel) answers.type = sel.dataset.val;
  }
  if (n === 3) {
    const sel = document.querySelector('#q-emp-group .choice-card.selected');
    if (sel) {
      answers.employees = parseInt(sel.dataset.val, 10);
      answers.empLabel  = sel.querySelector('.cc-label').textContent;
    }
  }
  if (n === 4) {
    const sel = document.querySelector('#q-acc-group .choice-card.selected');
    if (sel) {
      answers.accounting = sel.dataset.val;
      // Авто-подсказка услуги
      if (sel.dataset.val === 'no' && !answers.services.find(s => s.id === 'restore')) {
        const btn = document.querySelector('#q-services-group .service-card[data-id="restore"]');
        if (btn) { btn.classList.add('selected'); toggleService(btn); btn.classList.add('selected'); }
      }
    }
  }
  if (n === 5) {
    // services уже собраны через toggleService
  }
  if (n === 6) {
    const sel = document.querySelector('#q-ops-group .choice-card.selected');
    if (sel) {
      answers.operations = parseInt(sel.dataset.val, 10);
      answers.opsLabel   = sel.querySelector('.cc-label').textContent;
    }
  }
  if (n === 7) {
    const sel = document.querySelector('#q-urgent-group .choice-card.selected');
    if (sel) answers.urgent = sel.dataset.val;
  }
  if (n === 8) {
    const sel = document.querySelector('#q-mgr-group .choice-card.selected');
    if (sel) answers.manager = sel.dataset.val;
  }
  if (n === 9) {
    const sel = document.querySelector('#q-fmt-group .choice-card.selected');
    if (sel) answers.format = sel.dataset.val;
  }
  if (n === 10) {
    const sel = document.querySelector('#q-start-group .choice-card.selected');
    if (sel) answers.startWhen = sel.dataset.val;
  }
  if (n === 11) {
    answers.contact = (document.getElementById('q-contact').value || '').trim();
    answers.inn     = (document.getElementById('q-inn').value || '').trim();
    answers.phone   = (document.getElementById('q-phone').value || '').trim();
    answers.email   = (document.getElementById('q-email').value || '').trim();
  }
}

/* ─── Валидация шага ─────────────────── */
function clearStepErrors() {
  document.querySelectorAll('.q-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.q-input').forEach(el => el.classList.remove('input-error'));
}

function validateStep(n) {
  clearStepErrors();

  if (n === 1) {
    const val = document.getElementById('q-name').value.trim();
    if (!val) {
      setErr('err-name', 'Введите название компании или ФИО');
      document.getElementById('q-name').classList.add('input-error');
      return false;
    }
  }
  if (n === 2) {
    if (!document.querySelector('#q-type-group .choice-card.selected')) {
      setErr('err-type', 'Выберите один из вариантов');
      return false;
    }
  }
  if (n === 3) {
    if (!document.querySelector('#q-emp-group .choice-card.selected')) {
      setErr('err-emp', 'Выберите вариант');
      return false;
    }
  }
  if (n === 4) {
    if (!document.querySelector('#q-acc-group .choice-card.selected')) {
      setErr('err-acc', 'Выберите один из вариантов');
      return false;
    }
  }
  if (n === 5) {
    if (!document.querySelector('#q-services-group .service-card.selected')) {
      setErr('err-services', 'Выберите хотя бы одну услугу');
      return false;
    }
  }
  if (n === 6) {
    if (!document.querySelector('#q-ops-group .choice-card.selected')) {
      setErr('err-ops', 'Выберите вариант');
      return false;
    }
  }
  if (n === 7) {
    if (!document.querySelector('#q-urgent-group .choice-card.selected')) {
      setErr('err-urgent', 'Выберите вариант');
      return false;
    }
  }
  if (n === 8) {
    if (!document.querySelector('#q-mgr-group .choice-card.selected')) {
      setErr('err-mgr', 'Выберите вариант');
      return false;
    }
  }
  if (n === 9) {
    if (!document.querySelector('#q-fmt-group .choice-card.selected')) {
      setErr('err-fmt', 'Выберите формат работы');
      return false;
    }
  }
  if (n === 10) {
    if (!document.querySelector('#q-start-group .choice-card.selected')) {
      setErr('err-start', 'Выберите вариант');
      return false;
    }
  }
  if (n === 11) {
    const phone = document.getElementById('q-phone').value.trim();
    const email = document.getElementById('q-email').value.trim();
    if (!phone && !email) {
      setErr('err-phone', 'Укажите телефон или email');
      setErr('err-email', 'Укажите телефон или email');
      document.getElementById('q-phone').classList.add('input-error');
      document.getElementById('q-email').classList.add('input-error');
      return false;
    }
  }
  return true;
}

function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

/* ─── Выбор карточки (один выбор) ─────── */
function pickChoice(btn, groupId) {
  document.querySelectorAll(`#${groupId} .choice-card`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ─── Выбор услуг (множественный) ────── */
function toggleService(btn) {
  btn.classList.toggle('selected');
  // Пересобрать массив
  answers.services = [];
  document.querySelectorAll('#q-services-group .service-card.selected').forEach(b => {
    answers.services.push({
      id:     b.dataset.id,
      name:   b.dataset.name,
      price:  parseInt(b.dataset.price, 10),
      perEmp: b.dataset.perEmp === 'true'
    });
  });
}

/* ─── Сводка (шаг 12) ─────────────────── */
function buildSummary() {
  collectStep(11); // на случай если переходим
  const { total, items, mods } = calcTotal();

  document.getElementById('sum-total').textContent = fmt(total);

  // Услуги
  const svcEl = document.getElementById('sum-services');
  if (items.length === 0) {
    svcEl.innerHTML = '<span style="color:var(--gray-400);font-size:13px">Услуги не выбраны</span>';
  } else {
    svcEl.innerHTML = items.map(it =>
      `<div class="sum-service-row">
        <span class="sum-svc-name">${esc(it.name)}</span>
        <span class="sum-svc-price">${fmt(it.price)}</span>
      </div>`
    ).join('') + mods.map(m =>
      `<div class="sum-modifier">
        <span>${esc(m.label)}</span>
        <span>+${fmt(m.value)}</span>
      </div>`
    ).join('');
  }

  // Параметры
  const urgLabel = answers.urgent === 'yes' ? 'Да (+30%)' : 'Нет';
  const mgrLabel = answers.manager === 'yes' ? 'Да (+10 000 ₽)' : 'Нет';
  document.getElementById('sum-params').innerHTML = `
    <div class="sum-param"><span class="sum-param-key">Тип клиента</span><span class="sum-param-val">${esc(answers.type)}</span></div>
    <div class="sum-param"><span class="sum-param-key">Сотрудники</span><span class="sum-param-val">${esc(answers.empLabel)}</span></div>
    <div class="sum-param"><span class="sum-param-key">Операций в месяц</span><span class="sum-param-val">${esc(answers.opsLabel)}</span></div>
    <div class="sum-param"><span class="sum-param-key">Срочность</span><span class="sum-param-val">${urgLabel}</span></div>
    <div class="sum-param"><span class="sum-param-key">Персональный менеджер</span><span class="sum-param-val">${mgrLabel}</span></div>
    <div class="sum-param"><span class="sum-param-key">Формат работы</span><span class="sum-param-val">${esc(answers.format)}</span></div>
    <div class="sum-param"><span class="sum-param-key">Начало работы</span><span class="sum-param-val">${esc(answers.startWhen)}</span></div>
  `;
}

/* ─── Генерация КП ────────────────────── */
let lastKPNum       = '';
let lastContractNum = '';
let lastDocData     = null;

function generateKP() {
  collectStep(11);
  clearStepErrors();

  // Финальная валидация
  let valid = true;
  if (!answers.name) {
    setErr('err-final', 'Заполните данные клиента и выберите хотя бы одну услугу.');
    valid = false;
  }
  if (answers.services.length === 0) {
    setErr('err-final', 'Заполните данные клиента и выберите хотя бы одну услугу.');
    valid = false;
  }
  if (!answers.phone && !answers.email) {
    setErr('err-final', 'Укажите телефон или email клиента.');
    valid = false;
  }
  if (!valid) return;

  const { total, items, mods } = calcTotal();
  lastKPNum   = nextNum('КП');
  lastDocData = { total, items, mods };

  // HTML для предпросмотра и скачивания
  const kpHtml = buildKPHtml(total, items, mods, lastKPNum);
  const kpText = buildKPText(total, items, mods, lastKPNum);

  document.getElementById('kp-meta').textContent = `${lastKPNum} · ${todayStr()}`;
  document.getElementById('kp-preview').textContent = kpText;

  // Спрятать квиз, показать КП
  document.getElementById('quiz-wrapper').style.display = 'none';
  const kpSec = document.getElementById('kp-section');
  kpSec.style.display = 'block';
  kpSec.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Авто-скачивание
  const fname = `КП_${safeFile(answers.name)}_${todayFile()}.doc`;
  downloadDoc(kpHtml, fname);

  // Сохранить в историю
  saveToHistory({ total, kpNum: lastKPNum, contractNum: null });

  showToast('КП сформировано и скачивается');
}

function downloadKP() {
  if (!lastKPNum) { showToast('КП ещё не сформировано'); return; }
  const { total, items, mods } = lastDocData;
  const html  = buildKPHtml(total, items, mods, lastKPNum);
  const fname = `КП_${safeFile(answers.name)}_${todayFile()}.doc`;
  downloadDoc(html, fname);
  showToast('КП скачивается');
}

/* ─── Генерация договора ──────────────── */
function generateContract() {
  if (!lastKPNum) { showToast('Сначала сформируйте КП'); return; }

  const { total, items } = lastDocData;
  lastContractNum = nextNum('Д');

  const cHtml = buildContractHtml(total, items, lastContractNum);
  const cText = buildContractText(total, items, lastContractNum);

  document.getElementById('contract-meta').textContent = `${lastContractNum} · ${todayStr()}`;
  document.getElementById('contract-preview').textContent = cText;

  const sec = document.getElementById('contract-section');
  sec.style.display = 'block';
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const fname = `Договор_${safeFile(answers.name)}_${todayFile()}.doc`;
  downloadDoc(cHtml, fname);

  // Обновить историю
  updateHistoryContract(lastKPNum, lastContractNum);

  showToast('Договор сформирован и скачивается');
}

function downloadContract() {
  if (!lastContractNum) { showToast('Договор ещё не сформирован'); return; }
  const { total, items } = lastDocData;
  const html  = buildContractHtml(total, items, lastContractNum);
  const fname = `Договор_${safeFile(answers.name)}_${todayFile()}.doc`;
  downloadDoc(html, fname);
  showToast('Договор скачивается');
}

/* ─── Финальный экран ─────────────────── */
function showFinal() {
  document.getElementById('final-section').style.display = 'block';
  document.getElementById('history-toggle-wrap').style.display = 'block';
  document.getElementById('final-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function backToCalc() {
  document.getElementById('final-section').style.display = 'none';
  document.getElementById('kp-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function newQuiz() {
  // Сброс
  Object.assign(answers, {
    name:'', inn:'', type:'', employees:0, empLabel:'',
    accounting:'', services:[], operations:10, opsLabel:'',
    urgent:'no', manager:'no', format:'', startWhen:'',
    contact:'', phone:'', email:''
  });
  lastKPNum = ''; lastContractNum = ''; lastDocData = null;

  document.getElementById('kp-section').style.display        = 'none';
  document.getElementById('contract-section').style.display  = 'none';
  document.getElementById('final-section').style.display     = 'none';

  document.getElementById('quiz-wrapper').style.display = 'block';
  showStep(1);
  document.getElementById('hero').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Построение КП (HTML для Word) ────── */
function buildKPHtml(total, items, mods, kpNum) {
  const rows = items.map((it, i) =>
    `<tr>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center">${i+1}</td>
      <td style="border:1px solid #ccc;padding:7px 10px">${esc(it.name)}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;white-space:nowrap">${fmt(it.price)}</td>
    </tr>`
  ).join('');

  const modRows = mods.map(m =>
    `<tr>
      <td colspan="2" style="border:1px solid #ccc;padding:7px 10px;font-style:italic;color:#555">${esc(m.label)}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;color:#2563eb;white-space:nowrap">+${fmt(m.value)}</td>
    </tr>`
  ).join('');

  const urgLabel = answers.urgent  === 'yes' ? 'Да (+30%)' : 'Нет';
  const mgrLabel = answers.manager === 'yes' ? 'Да (+10 000 ₽)' : 'Нет';

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="UTF-8"><title>КП ${esc(answers.name)}</title>
<style>
body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;margin:2.5cm 2cm;color:#000}
h1{font-size:14pt;text-align:center;font-weight:bold;margin:18px 0 6px}
h2{font-size:12pt;font-weight:bold;margin-top:14px;margin-bottom:4px}
table{border-collapse:collapse;width:100%;margin:10px 0}
th{background:#f0f5ff;font-weight:bold;border:1px solid #ccc;padding:7px 10px;text-align:left}
td{border:1px solid #ccc;padding:7px 10px;vertical-align:top}
.right{text-align:right} .center{text-align:center}
.total-row td{font-weight:bold;background:#f0f5ff}
.exec-block{border:1px solid #ddd;padding:10px 14px;margin-bottom:16px;background:#f9fbff;font-size:11pt}
.client-block{margin-bottom:16px}
.sign-line{margin-top:40px;display:flex;justify-content:space-between}
.meta{color:#888;font-size:10pt}
p{margin:4px 0}
</style>
</head>
<body>
<div class="exec-block">
  <strong>${esc(EX.name)}</strong> · ИНН ${esc(EX.inn)} · КПП ${esc(EX.kpp)}<br>
  ${esc(EX.address)}<br>
  Тел.: ${esc(EX.phone)} · Email: ${esc(EX.email)}
</div>

<div class="client-block">
  <p><strong>Для:</strong> ${esc(answers.name)}${answers.inn ? ' · ИНН ' + esc(answers.inn) : ''}</p>
  ${answers.contact ? `<p>Контактное лицо: ${esc(answers.contact)}</p>` : ''}
  ${answers.phone   ? `<p>Телефон: ${esc(answers.phone)}</p>` : ''}
  ${answers.email   ? `<p>Email: ${esc(answers.email)}</p>` : ''}
</div>

<h1>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</h1>
<p class="meta center">Номер: ${esc(kpNum)} &nbsp;|&nbsp; Дата: ${todayShort()}</p>

<p style="margin-top:16px">Уважаемый клиент${answers.contact ? ' — <strong>'+esc(answers.contact)+'</strong>' : ''}!</p>
<p>Подготовили для вас расчёт стоимости бухгалтерских услуг на основании выбранных параметров. Рады сотрудничеству и готовы приступить к работе в удобные для вас сроки.</p>

<h2>Перечень услуг</h2>
<table>
  <tr><th style="width:40px" class="center">№</th><th>Услуга</th><th style="width:130px" class="right">Стоимость</th></tr>
  ${rows}
  ${modRows}
  <tr class="total-row">
    <td colspan="2" class="right">Итого к оплате:</td>
    <td class="right" style="font-size:13pt">${fmt(total)}</td>
  </tr>
</table>

<h2>Параметры расчёта</h2>
<table>
  <tr><td style="width:210px;background:#f9f9f9"><strong>Тип клиента</strong></td><td>${esc(answers.type)}</td></tr>
  <tr><td style="background:#f9f9f9"><strong>Формат работы</strong></td><td>${esc(answers.format)}</td></tr>
  <tr><td style="background:#f9f9f9"><strong>Количество сотрудников</strong></td><td>${esc(answers.empLabel)}</td></tr>
  <tr><td style="background:#f9f9f9"><strong>Объём операций в месяц</strong></td><td>${esc(answers.opsLabel)}</td></tr>
  <tr><td style="background:#f9f9f9"><strong>Срочное подключение</strong></td><td>${urgLabel}</td></tr>
  <tr><td style="background:#f9f9f9"><strong>Персональный менеджер</strong></td><td>${mgrLabel}</td></tr>
</table>

<h2>Условия оплаты</h2>
<p>50% — предоплата перед началом работы.<br>50% — после завершения работ / по итогам отчётного периода.</p>

<h2>Срок оказания услуг</h2>
<p>${deadlineText(answers.format)}</p>

<p style="margin-top:16px">Следующий шаг — согласовать детали, после чего мы подготовим договор и начнём работу. Будем рады ответить на любые вопросы.</p>

<div class="sign-line">
  <div>
    <p><strong>С уважением,</strong></p>
    <p>${esc(EX.name)}</p>
    <p>Генеральный директор ${esc(EX.director)}</p>
    <p style="margin-top:20px">Подпись: __________________</p>
  </div>
</div>
</body></html>`;
}

/* ─── КП текст (для предпросмотра) ────── */
function buildKPText(total, items, mods, kpNum) {
  const urgLabel = answers.urgent  === 'yes' ? 'Да (+30%)' : 'Нет';
  const mgrLabel = answers.manager === 'yes' ? 'Да (+10 000 ₽)' : 'Нет';
  const svcLines = items.map(it => `  • ${it.name} — ${fmt(it.price)}`).join('\n');
  const modLines = mods.map(m  => `  + ${m.label}: +${fmt(m.value)}`).join('\n');
  return `${EX.name} · ИНН ${EX.inn}
${EX.address}
${EX.phone} · ${EX.email}

──────────────────────────────
КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ
Номер: ${kpNum} · Дата: ${todayShort()}
──────────────────────────────

Для: ${answers.name}${answers.inn ? ' · ИНН ' + answers.inn : ''}${answers.contact ? '\nКонтактное лицо: ' + answers.contact : ''}${answers.phone ? '\nТелефон: ' + answers.phone : ''}${answers.email ? '\nEmail: ' + answers.email : ''}

Уважаемый клиент!

Подготовили расчёт стоимости бухгалтерских услуг.

Перечень услуг:
${svcLines}${modLines ? '\n' + modLines : ''}

ИТОГО: ${fmt(total)}

Параметры расчёта:
  Тип клиента: ${answers.type}
  Формат работы: ${answers.format}
  Сотрудников: ${answers.empLabel}
  Операций в месяц: ${answers.opsLabel}
  Срочность: ${urgLabel}
  Персональный менеджер: ${mgrLabel}

Условия оплаты:
50% предоплата, 50% по завершении работ.

Срок оказания услуг:
${deadlineText(answers.format)}

С уважением,
${EX.name}
Генеральный директор ${EX.director}`;
}

/* ─── Построение договора (HTML для Word) */
function buildContractHtml(total, items, cNum) {
  const svcRows = items.map((it, i) =>
    `<tr>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:center">${i+1}</td>
      <td style="border:1px solid #ccc;padding:6px 10px">${esc(it.name)}</td>
      <td style="border:1px solid #ccc;padding:6px 10px;text-align:right;white-space:nowrap">${fmt(it.price)}</td>
    </tr>`
  ).join('');

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="UTF-8"><title>Договор ${esc(answers.name)}</title>
<style>
body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;margin:2.5cm 2cm;color:#000}
h1{font-size:14pt;text-align:center;font-weight:bold;margin:0 0 4px}
h2{font-size:12pt;font-weight:bold;margin-top:18px;margin-bottom:6px;border-bottom:1px solid #ccc;padding-bottom:3px}
table{border-collapse:collapse;width:100%;margin:10px 0}
th{background:#f0f5ff;font-weight:bold;border:1px solid #ccc;padding:6px 10px}
td{border:1px solid #ccc;padding:6px 10px;vertical-align:top}
.total-row td{font-weight:bold;background:#f0f5ff}
.city-date{display:flex;justify-content:space-between;margin:8px 0 18px;font-size:11pt}
.sign-table{width:100%;margin-top:40px;border-collapse:collapse}
.sign-table td{border:none;padding:4px 0;vertical-align:bottom;width:50%}
p{margin:4px 0;text-align:justify}
li{margin:3px 0}
</style>
</head>
<body>
<h1>ДОГОВОР ОКАЗАНИЯ УСЛУГ № ${esc(cNum)}</h1>
<div class="city-date">
  <span>г. Москва</span>
  <span>${todayShort()}</span>
</div>

<p>${esc(EX.name)}, именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице генерального директора ${esc(EX.director)}, действующего на основании Устава, с одной стороны, и <strong>${esc(answers.name)}</strong>, именуемый в дальнейшем <strong>«Заказчик»</strong>, с другой стороны, заключили настоящий договор о нижеследующем.</p>

<h2>1. Предмет договора</h2>
<p>1.1. Исполнитель обязуется оказать Заказчику бухгалтерские, налоговые и консультационные услуги, а Заказчик обязуется принять и оплатить их.</p>
<p>1.2. Перечень услуг:</p>
<table>
  <tr><th style="width:40px;text-align:center">№</th><th>Наименование услуги</th><th style="width:130px;text-align:right">Стоимость</th></tr>
  ${svcRows}
  <tr class="total-row">
    <td colspan="2" style="text-align:right">ИТОГО:</td>
    <td style="text-align:right">${fmt(total)}</td>
  </tr>
</table>
<p>1.3. Формат работы: <strong>${esc(answers.format)}</strong></p>

<h2>2. Стоимость услуг и порядок оплаты</h2>
<p>2.1. Общая стоимость услуг по настоящему договору составляет: <strong>${fmt(total)}</strong></p>
<p>2.2. Оплата производится в следующем порядке:<br>
— 50% (предоплата) до начала оказания услуг;<br>
— 50% после завершения работ / по итогам отчётного периода.</p>
<p>2.3. Стоимость рассчитана на основании выбранных услуг и параметров расчёта.</p>

<h2>3. Сроки оказания услуг</h2>
<p>3.1. ${deadlineText(answers.format)}</p>
<p>3.2. Конкретные сроки могут быть уточнены сторонами дополнительно.</p>

<h2>4. Права и обязанности сторон</h2>
<p>4.1. Исполнитель обязуется:</p>
<ul>
  <li>оказать услуги качественно и в согласованные сроки;</li>
  <li>использовать данные Заказчика исключительно для целей исполнения договора;</li>
  <li>своевременно информировать Заказчика о ходе выполнения работ.</li>
</ul>
<p>4.2. Заказчик обязуется:</p>
<ul>
  <li>предоставить необходимые документы и сведения;</li>
  <li>своевременно оплачивать услуги;</li>
  <li>проверять и согласовывать подготовленные материалы.</li>
</ul>

<h2>5. Ответственность сторон</h2>
<p>5.1. Стороны несут ответственность в соответствии с законодательством Российской Федерации.</p>
<p>5.2. Исполнитель не несёт ответственности за последствия, наступившие вследствие непредоставления или несвоевременного предоставления документов Заказчиком.</p>

<h2>6. Реквизиты сторон</h2>
<table style="border-collapse:collapse">
  <tr>
    <td style="border:1px solid #ccc;padding:8px 12px;width:50%;vertical-align:top">
      <strong>Исполнитель:</strong><br>
      ${esc(EX.name)}<br>
      ИНН: ${esc(EX.inn)} · КПП: ${esc(EX.kpp)}<br>
      ОГРН: ${esc(EX.ogrn)}<br>
      Адрес: ${esc(EX.address)}<br>
      Тел.: ${esc(EX.phone)}<br>
      Email: ${esc(EX.email)}<br>
      Р/с: ${esc(EX.rs)}<br>
      Банк: ${esc(EX.bank)}<br>
      БИК: ${esc(EX.bik)} · К/с: ${esc(EX.ks)}
    </td>
    <td style="border:1px solid #ccc;padding:8px 12px;width:50%;vertical-align:top">
      <strong>Заказчик:</strong><br>
      ${esc(answers.name)}<br>
      ${answers.inn ? 'ИНН: ' + esc(answers.inn) + '<br>' : ''}
      ${answers.contact ? esc(answers.contact) + '<br>' : ''}
      ${answers.phone ? 'Тел.: ' + esc(answers.phone) + '<br>' : ''}
      ${answers.email ? 'Email: ' + esc(answers.email) : ''}
    </td>
  </tr>
</table>

<table class="sign-table">
  <tr>
    <td>
      <strong>Исполнитель:</strong><br>
      ${esc(EX.name)}<br><br>
      ________________________ / ${esc(EX.dirShort)} /
    </td>
    <td>
      <strong>Заказчик:</strong><br>
      ${esc(answers.name)}<br><br>
      ________________________ / ${esc(answers.contact || answers.name)} /
    </td>
  </tr>
</table>
</body></html>`;
}

/* ─── Договор текст (предпросмотр) ────── */
function buildContractText(total, items, cNum) {
  const svcLines = items.map((it, i) => `  ${i+1}. ${it.name} — ${fmt(it.price)}`).join('\n');
  return `ДОГОВОР ОКАЗАНИЯ УСЛУГ № ${cNum}

г. Москва                                        ${todayShort()}

${EX.name} (Исполнитель) и ${answers.name} (Заказчик) заключили настоящий договор.

1. ПРЕДМЕТ ДОГОВОРА

1.1. Перечень услуг:
${svcLines}

1.2. Формат работы: ${answers.format}
1.3. Общая стоимость: ${fmt(total)}

2. СТОИМОСТЬ И ОПЛАТА

2.1. Стоимость услуг: ${fmt(total)}
2.2. 50% предоплата до начала работ. 50% по завершении.

3. СРОКИ

${deadlineText(answers.format)}

4. РЕКВИЗИТЫ

Исполнитель: ${EX.name}
ИНН: ${EX.inn} · КПП: ${EX.kpp} · ОГРН: ${EX.ogrn}
${EX.address}
Р/с ${EX.rs} в ${EX.bank}, БИК ${EX.bik}, К/с ${EX.ks}

Заказчик: ${answers.name}${answers.inn ? '\nИНН: ' + answers.inn : ''}${answers.contact ? '\n' + answers.contact : ''}${answers.phone ? '\n' + answers.phone : ''}${answers.email ? '\n' + answers.email : ''}

──────────────────────────────────────
Исполнитель: ______________ / ${EX.dirShort} /
Заказчик: _________________ / ${answers.contact || answers.name} /`;
}

/* ─── Скачивание .doc ────────────────── */
function downloadDoc(html, filename) {
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ─── Копирование ────────────────────── */
function copyText(elId) {
  const el  = document.getElementById(elId);
  const txt = el ? el.textContent : '';
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(txt).then(() => showToast('Скопировано')).catch(() => fallbackCopy(txt));
  } else {
    fallbackCopy(txt);
  }
}
function fallbackCopy(txt) {
  const ta = document.createElement('textarea');
  ta.value = txt;
  Object.assign(ta.style, { position:'fixed', opacity:'0', pointerEvents:'none' });
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('Скопировано'); } catch { showToast('Не удалось скопировать'); }
  document.body.removeChild(ta);
}

/* ─── История заявок ─────────────────── */
function saveToHistory(entry) {
  const arr = loadHistory();
  arr.unshift({
    kpNum:       entry.kpNum,
    contractNum: entry.contractNum,
    date:        new Date().toISOString(),
    name:        answers.name,
    type:        answers.type,
    total:       entry.total
  });
  localStorage.setItem('bsvc_hist', JSON.stringify(arr));
  renderHistory();
}
function updateHistoryContract(kpNum, cNum) {
  const arr = loadHistory();
  const idx = arr.findIndex(e => e.kpNum === kpNum);
  if (idx !== -1) { arr[idx].contractNum = cNum; }
  localStorage.setItem('bsvc_hist', JSON.stringify(arr));
  renderHistory();
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('bsvc_hist') || '[]'); } catch { return []; }
}
function toggleHistory() {
  const sec = document.getElementById('history-section');
  const visible = sec.style.display !== 'none';
  sec.style.display = visible ? 'none' : 'block';
  if (!visible) { renderHistory(); sec.scrollIntoView({ behavior:'smooth', block:'start' }); }
}
function renderHistory() {
  const arr     = loadHistory();
  const emptyEl = document.getElementById('history-empty');
  const listEl  = document.getElementById('history-list');
  if (arr.length === 0) {
    emptyEl.style.display = 'block';
    listEl.innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.innerHTML = arr.map(e => {
    const d = new Date(e.date).toLocaleDateString('ru-RU');
    return `<div class="history-item">
      <div class="hi-main">
        <div class="hi-name">${esc(e.name)}</div>
        <div class="hi-meta">${esc(e.kpNum)} · ${d} · ${esc(e.type)}</div>
      </div>
      <div class="hi-sum">${fmt(e.total)}</div>
      <div class="hi-actions">
        <button class="btn btn-ghost btn-sm" onclick="deleteHistory('${esc(e.kpNum)}')">✕</button>
      </div>
    </div>`;
  }).join('');
}
function deleteHistory(kpNum) {
  const arr = loadHistory().filter(e => e.kpNum !== kpNum);
  localStorage.setItem('bsvc_hist', JSON.stringify(arr));
  renderHistory();
}

/* ─── Toast ─────────────────────────── */
function showToast(msg) {
  const old = document.querySelector('.toast-el');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast-el';
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'28px', left:'50%', transform:'translateX(-50%)',
    background:'#111827', color:'#fff', padding:'10px 22px', borderRadius:'100px',
    fontFamily:'var(--font-b)', fontSize:'13px', fontWeight:'500',
    zIndex:'9999', boxShadow:'0 8px 30px rgba(0,0,0,.22)',
    opacity:'0', transition:'opacity .2s ease', pointerEvents:'none', whiteSpace:'nowrap'
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2200);
}

/* ─── Маска телефона ────────────────── */
function initMasks() {
  const ph = document.getElementById('q-phone');
  if (ph) {
    ph.addEventListener('input', function() {
      let v = this.value.replace(/\D/g,'');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (v.startsWith('7') && v.length > 1) {
        v = '+7 (' + v.slice(1,4) + ') ' + v.slice(4,7) + '-' + v.slice(7,9) + '-' + v.slice(9,11);
      } else if (v.length) { v = '+' + v; }
      this.value = v;
    });
  }
  const inn = document.getElementById('q-inn');
  if (inn) inn.addEventListener('input', function() { this.value = this.value.replace(/\D/g,'').slice(0,12); });
}

/* ─── Enter → Далее ────────────────── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const active = document.querySelector('.quiz-slide.active');
      if (!active) return;
      const step = parseInt(active.dataset.step);
      if (step === TOTAL_STEPS) { generateKP(); }
      else { nextStep(); }
    }
  });
}

/* ─── Init ──────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  initMasks();
  initKeyboard();
});
