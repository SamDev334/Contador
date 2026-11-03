'use strict';

/* ==========================================================
   Ferramentas úteis – lógica
   ========================================================== */

const $ = (selector) => document.querySelector(selector);
const pad = (n, size = 2) => String(n).padStart(size, '0');

// localStorage pode falhar (modo privado, bloqueio): nunca derruba a página
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignora */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignora */ } },
};

/** Formata segundos totais como HH:MM:SS. */
function formatHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Converte "AAAA-MM-DD" em meia-noite LOCAL (new Date(string) usaria UTC e erraria 1 dia). */
function parseLocalDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const DAY = 86_400_000;

/* ---------- Abas ---------- */
function initTabs() {
  const tabs = [...document.querySelectorAll('.tab')];
  const panels = [...document.querySelectorAll('.panel')];

  const select = (name, { focus = false } = {}) => {
    const target = tabs.find((t) => t.dataset.tab === name) || tabs[0];
    tabs.forEach((t) => {
      const active = t === target;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    panels.forEach((p) => { p.hidden = p.id !== target.dataset.tab; });
    store.set('ferramentaAtiva', target.dataset.tab);
    // replaceState pode lançar SecurityError em prévias/iframes isolados: não pode derrubar o resto
    try { history.replaceState(null, '', `#${target.dataset.tab}`); } catch { /* ignora */ }
    target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    if (focus) target.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (e.key in keys) {
        e.preventDefault();
        select(tabs[(i + keys[e.key] + tabs.length) % tabs.length].dataset.tab, { focus: true });
      } else if (e.key === 'Home') { e.preventDefault(); select(tabs[0].dataset.tab, { focus: true }); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1].dataset.tab, { focus: true }); }
    });
  });

  select(location.hash.slice(1) || store.get('ferramentaAtiva') || tabs[0].dataset.tab);
}

/* ---------- 1. Contador de dias ---------- */
function initDays() {
  const start = $('#dataInicial');
  const end = $('#dataFinal');
  const error = $('#diasErro');
  const stats = $('#diasStats');

  start.value = store.get('diasInicial') || '';
  end.value = store.get('diasFinal') || '';

  const calculate = () => {
    error.textContent = '';
    stats.hidden = true;
    if (!start.value || !end.value) {
      error.textContent = 'Escolha as duas datas.';
      return;
    }
    store.set('diasInicial', start.value);
    store.set('diasFinal', end.value);

    const from = parseLocalDate(start.value);
    const to = parseLocalDate(end.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    $('#diasPassados').textContent = Math.round((today - from) / DAY);
    $('#diasRestantes').textContent = Math.round((to - today) / DAY);
    $('#diasTotal').textContent = Math.abs(Math.round((to - from) / DAY));
    stats.hidden = false;
  };

  $('#diasCalcular').addEventListener('click', calculate);
  if (start.value && end.value) calculate();
}

/* ---------- 2. Relógio ---------- */
function initClock() {
  const time = $('#relogioHora');
  const date = $('#relogioData');
  const render = () => {
    const now = new Date();
    time.textContent = now.toLocaleTimeString('pt-BR');
    date.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  render();
  setInterval(render, 1000);
}

/* ---------- 3. Calculadora (sem eval) ---------- */
/**
 * Avalia expressões aritméticas com + - * / % ^ e parênteses.
 * Gramática: expr = termo (('+'|'-') termo)*; termo = potência (('*'|'/'|'%') potência)*;
 * potência = unário ('^' potência)?; unário = '-' unário | '(' expr ')' | número
 */
function evaluate(source) {
  const text = source.replace(/\s+/g, '').replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/');
  if (!text) throw new Error('Digite uma expressão.');
  if (!/^[\d+\-*/%^().]+$/.test(text)) throw new Error('Use apenas números e + - * / % ^ ( ).');

  let pos = 0;
  const peek = () => text[pos];

  const number = () => {
    const match = /^(?:\d+\.?\d*|\.\d+)/.exec(text.slice(pos));
    if (!match) throw new Error('Expressão inválida.');
    pos += match[0].length;
    return parseFloat(match[0]);
  };
  const unary = () => {
    if (peek() === '-') { pos++; return -unary(); }
    if (peek() === '+') { pos++; return unary(); }
    if (peek() === '(') {
      pos++;
      const value = expr();
      if (peek() !== ')') throw new Error('Parêntese não fechado.');
      pos++;
      return value;
    }
    return number();
  };
  const power = () => {
    const base = unary();
    if (peek() === '^') { pos++; return base ** power(); }
    return base;
  };
  const term = () => {
    let value = power();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = text[pos++];
      const right = power();
      if (op === '*') value *= right;
      else if (right === 0) throw new Error('Divisão por zero.');
      else value = op === '/' ? value / right : value % right;
    }
    return value;
  };
  const expr = () => {
    let value = term();
    while (peek() === '+' || peek() === '-') {
      const op = text[pos++];
      const right = term();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = expr();
  if (pos < text.length) throw new Error('Expressão inválida.');
  if (!Number.isFinite(result)) throw new Error('Resultado fora do alcance.');
  return result;
}

function initCalculator() {
  const input = $('#calcInput');
  const output = $('#calcResultado');

  const run = () => {
    try {
      const value = evaluate(input.value);
      output.textContent = value.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
      output.classList.remove('error');
    } catch (e) {
      output.textContent = e.message;
      output.classList.add('error');
    }
  };

  $('#calcBtn').addEventListener('click', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  $('#calcLimpar').addEventListener('click', () => {
    input.value = '';
    output.textContent = '—';
    output.classList.remove('error');
    input.focus();
  });
}

/* ---------- 4. Bloco de notas ---------- */
function initNotes() {
  const area = $('#notaArea');
  const status = $('#notaStatus');
  let timer;

  area.value = store.get('blocoNotas') || '';

  area.addEventListener('input', () => {
    status.textContent = 'Salvando…';
    clearTimeout(timer);
    timer = setTimeout(() => {
      store.set('blocoNotas', area.value);
      status.textContent = `Salvo às ${new Date().toLocaleTimeString('pt-BR')}`;
    }, 400);
  });

  $('#notaLimpar').addEventListener('click', () => {
    if (area.value && !confirm('Apagar toda a nota?')) return;
    area.value = '';
    store.remove('blocoNotas');
    status.textContent = 'Nota apagada.';
  });
}

/* ---------- 5. Cronômetro ---------- */
function initStopwatch() {
  const display = $('#cronoDisplay');
  const startButton = $('#cronoStart');
  let elapsed = 0;       // ms acumulados antes da última retomada
  let startedAt = 0;     // instante da última retomada
  let frame = null;

  const render = (ms) => {
    const cs = Math.floor(ms / 10) % 100;
    display.textContent = `${formatHMS(Math.floor(ms / 1000))}.${pad(cs)}`;
  };
  const tick = () => {
    render(elapsed + Date.now() - startedAt);
    frame = requestAnimationFrame(tick);
  };

  startButton.addEventListener('click', () => {
    if (frame === null) {
      startedAt = Date.now();
      frame = requestAnimationFrame(tick);
      startButton.textContent = 'Pausar';
      display.classList.add('running');
    } else {
      cancelAnimationFrame(frame);
      frame = null;
      elapsed += Date.now() - startedAt;
      render(elapsed);
      startButton.textContent = 'Continuar';
      display.classList.remove('running');
    }
  });

  $('#cronoReset').addEventListener('click', () => {
    cancelAnimationFrame(frame);
    frame = null;
    elapsed = 0;
    render(0);
    startButton.textContent = 'Iniciar';
    display.classList.remove('running');
  });
}

/* ---------- 6. Temporizador ---------- */
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch { /* sem suporte a áudio */ }
}

function initTimer() {
  const minInput = $('#timerMin');
  const secInput = $('#timerSec');
  const display = $('#timerDisplay');
  const error = $('#timerErro');
  const startButton = $('#timerStart');
  let interval = null;
  let endsAt = 0;
  let remainingMs = 0;

  const inputSeconds = () => (Number(minInput.value) || 0) * 60 + (Number(secInput.value) || 0);
  const showIdle = () => { display.textContent = formatHMS(inputSeconds()); display.classList.remove('done'); };

  const stop = () => {
    clearInterval(interval);
    interval = null;
    display.classList.remove('running');
  };

  const tick = () => {
    remainingMs = endsAt - Date.now();
    if (remainingMs <= 0) {
      stop();
      remainingMs = 0;
      display.textContent = 'Tempo esgotado!';
      display.classList.add('done');
      startButton.textContent = 'Iniciar';
      beep();
      return;
    }
    display.textContent = formatHMS(Math.ceil(remainingMs / 1000));
  };

  startButton.addEventListener('click', () => {
    error.textContent = '';
    if (interval !== null) {            // pausar
      stop();
      startButton.textContent = 'Continuar';
      return;
    }
    if (remainingMs <= 0) {             // começar do zero
      const seconds = inputSeconds();
      if (seconds <= 0) { error.textContent = 'Informe um tempo maior que zero.'; return; }
      remainingMs = seconds * 1000;
    }
    display.classList.remove('done');
    display.classList.add('running');
    endsAt = Date.now() + remainingMs;
    interval = setInterval(tick, 200);
    tick();
    startButton.textContent = 'Pausar';
  });

  $('#timerReset').addEventListener('click', () => {
    stop();
    remainingMs = 0;
    error.textContent = '';
    startButton.textContent = 'Iniciar';
    showIdle();
  });

  document.querySelectorAll('[data-preset]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const total = Number(chip.dataset.preset);
      minInput.value = Math.floor(total / 60);
      secInput.value = total % 60;
      if (interval === null) { remainingMs = 0; startButton.textContent = 'Iniciar'; showIdle(); }
    });
  });

  [minInput, secInput].forEach((el) => el.addEventListener('input', () => {
    if (interval === null) { remainingMs = 0; startButton.textContent = 'Iniciar'; showIdle(); }
  }));

  showIdle();
}

/* ---------- 7 e 9. Conversores bidirecionais ---------- */
const round = (n, digits = 4) => (Number.isFinite(n) ? String(Math.round(n * 10 ** digits) / 10 ** digits) : '');

/** Liga campos de forma que editar um atualiza os outros. `fields` = [{ el, toBase, fromBase }]. */
function linkFields(fields) {
  fields.forEach((source) => {
    source.el.addEventListener('input', () => {
      const raw = source.el.value;
      const base = source.toBase(parseFloat(raw));
      fields.forEach((target) => {
        if (target !== source) target.el.value = raw === '' ? '' : round(target.fromBase(base));
      });
    });
  });
}

function initTemperature() {
  linkFields([
    { el: $('#tempC'), toBase: (c) => c, fromBase: (c) => c },
    { el: $('#tempF'), toBase: (f) => (f - 32) * 5 / 9, fromBase: (c) => c * 9 / 5 + 32 },
    { el: $('#tempK'), toBase: (k) => k - 273.15, fromBase: (c) => c + 273.15 },
  ]);
}

const UNITS = {
  'km-mi': { a: 'Quilômetros', b: 'Milhas', factor: 0.621371 },
  'kg-lb': { a: 'Quilos', b: 'Libras', factor: 2.204623 },
  'm-ft': { a: 'Metros', b: 'Pés', factor: 3.280840 },
};

function initUnits() {
  const type = $('#unidadeTipo');
  const a = $('#unidadeA');
  const b = $('#unidadeB');

  const apply = () => {
    const unit = UNITS[type.value];
    $('#unidadeALabel').textContent = unit.a;
    $('#unidadeBLabel').textContent = unit.b;
    if (a.value !== '') b.value = round(parseFloat(a.value) * unit.factor);
  };

  a.addEventListener('input', () => { b.value = a.value === '' ? '' : round(parseFloat(a.value) * UNITS[type.value].factor); });
  b.addEventListener('input', () => { a.value = b.value === '' ? '' : round(parseFloat(b.value) / UNITS[type.value].factor); });
  type.addEventListener('change', apply);
  apply();
}

/* ---------- 8. Gerador de senha ---------- */
function initPassword() {
  const length = $('#senhaTamanho');
  const output = $('#senhaGerada');
  const status = $('#senhaStatus');
  const sets = [
    ['#senhaMaius', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
    ['#senhaMinus', 'abcdefghijklmnopqrstuvwxyz'],
    ['#senhaNum', '0123456789'],
    ['#senhaSimb', '!@#$%^&*()-_=+[]{}?'],
  ];

  /** Inteiro aleatório uniforme em [0, max) sem viés de módulo. */
  const randomInt = (max) => {
    const limit = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
    return buffer[0] % max;
  };

  const generate = () => {
    status.textContent = '';
    const active = sets.filter(([sel]) => $(sel).checked).map(([, chars]) => chars);
    if (!active.length) {
      status.textContent = 'Marque pelo menos um tipo de caractere.';
      return;
    }
    const size = Number(length.value);
    const pool = active.join('');
    // garante ao menos um caractere de cada tipo escolhido
    const chars = active.map((set) => set[randomInt(set.length)]);
    while (chars.length < size) chars.push(pool[randomInt(pool.length)]);
    for (let i = chars.length - 1; i > 0; i--) {   // embaralha (Fisher-Yates)
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    output.textContent = chars.slice(0, size).join('');
  };

  length.addEventListener('input', () => { $('#senhaTamanhoValor').textContent = length.value; });
  $('#senhaGerar').addEventListener('click', generate);
  $('#senhaCopiar').addEventListener('click', async () => {
    const text = output.textContent;
    if (!text || text === '—') { status.textContent = 'Gere uma senha primeiro.'; return; }
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Senha copiada!';
    } catch {
      status.textContent = 'Não foi possível copiar. Selecione e copie manualmente.';
    }
  });
}

/* ---------- 10. Lista de tarefas ---------- */
function initTasks() {
  const list = $('#listaTarefas');
  const form = $('#tarefaForm');
  const input = $('#tarefaInput');
  const empty = $('#tarefasVazio');

  let tasks = [];
  try { tasks = JSON.parse(store.get('tarefas')) || []; } catch { tasks = []; }

  const save = () => store.set('tarefas', JSON.stringify(tasks));

  const render = () => {
    list.replaceChildren();
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.classList.toggle('done', task.done);

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = task.done;
      check.id = `tarefa-${index}`;
      check.setAttribute('aria-label', task.text);
      check.addEventListener('change', () => { task.done = check.checked; save(); render(); });

      const text = document.createElement('span');
      text.textContent = task.text;                      // textContent evita injeção de HTML
      text.addEventListener('click', () => { task.done = !task.done; save(); render(); });
      text.style.cursor = 'pointer';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `Remover "${task.text}"`);
      remove.addEventListener('click', () => { tasks.splice(index, 1); save(); render(); });

      li.append(check, text, remove);
      list.append(li);
    });
    empty.hidden = tasks.length > 0;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    tasks.push({ text, done: false });
    save();
    input.value = '';
    render();
  });

  $('#tarefasLimpar').addEventListener('click', () => {
    if (!tasks.some((t) => t.done)) return;
    tasks = tasks.filter((t) => !t.done);
    save();
    render();
  });

  render();
}

/* ---------- Inicialização ---------- */
// Cada ferramenta é iniciada isolada: se uma falhar, as outras continuam funcionando
// e o erro aparece no Console (F12) com o nome da ferramenta.
function boot() {
  const inits = [
    initTabs, initDays, initClock, initCalculator, initNotes,
    initStopwatch, initTimer, initTemperature, initUnits, initPassword, initTasks,
  ];
  inits.forEach((init) => {
    try { init(); } catch (err) { console.error(`[ferramentas] falha em ${init.name}:`, err); }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
