'use strict';

/* ==========================================================
   Contador de Tempo – lógica da página inicial
   ========================================================== */

const $ = (selector) => document.querySelector(selector);

// localStorage pode falhar (modo privado, bloqueio): nunca derruba a página
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignora */ } },
};

const pad = (n) => String(n).padStart(2, '0');

/* ---------- Contador de cliques ---------- */
const MILESTONES = {
  10: 'Parabéns! Você chegou a 10 cliques. Continue assim!',
  50: 'Impressionante! Você alcançou 50 cliques. Continue sua jornada!',
  100: 'Incrível! Você atingiu a marca de 100 cliques. Continue superando limites!',
};

function initClicker() {
  const button = $('#clickButton');
  const label = $('#clickCount');
  let clicks = Number(store.get('clicks')) || 0;

  const render = () => {
    label.textContent = clicks === 1 ? '1 clique' : `${clicks} cliques`;
  };

  button.addEventListener('click', () => {
    clicks += 1;
    store.set('clicks', clicks);
    render();
    if (MILESTONES[clicks]) alert(MILESTONES[clicks]);
  });

  render();
}

/* ---------- Contagem regressiva até uma hora (formato 12h) ---------- */
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i;

/** Converte "08:30:00 PM" em { hours, minutes, seconds } (24h) ou lança Error com a mensagem para o usuário. */
function parseTime12h(text) {
  const match = text.trim().match(TIME_PATTERN);
  if (!match) throw new Error('Use o formato 12h, por exemplo 08:30:00 PM.');

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  const period = match[4].toUpperCase();

  if (hours < 1 || hours > 12 || minutes > 59 || seconds > 59) {
    throw new Error('Valores de tempo inválidos. Verifique os números.');
  }
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return { hours, minutes, seconds };
}

function initCountdown() {
  const input = $('#hour');
  const error = $('#hourError');
  const display = $('.countdown');
  const caption = $('#countdownCaption');
  const audio = $('#myAudio');
  const startButton = $('#startButton');
  const stopButton = $('#stopButton');
  let timer = null;

  const stop = () => {
    clearInterval(timer);
    timer = null;
    display.classList.remove('running');
    stopButton.hidden = true;
  };

  const showError = (message) => {
    error.textContent = message;
    input.classList.toggle('invalid', Boolean(message));
  };

  const start = () => {
    let time;
    try {
      time = parseTime12h(input.value);
    } catch (e) {
      showError(e.message);
      input.focus();
      return;
    }
    showError('');
    store.set('countdownHour', input.value.trim());
    stop();
    audio.pause();
    audio.currentTime = 0;

    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hours, time.minutes, time.seconds);
    if (target <= now) target.setDate(target.getDate() + 1);

    caption.textContent = `Até ${target.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    display.classList.remove('done');
    display.classList.add('running');
    stopButton.hidden = false;

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        stop();
        display.classList.add('done');
        display.textContent = 'Parabéns, mais um dia vencido!';
        audio.play().catch(() => { /* o navegador pode bloquear áudio sem interação */ });
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      display.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    tick();
    if (display.classList.contains('running')) timer = setInterval(tick, 1000);
  };

  startButton.addEventListener('click', start);
  stopButton.addEventListener('click', () => {
    stop();
    display.textContent = '--:--:--';
    caption.textContent = '';
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
  input.addEventListener('input', () => showError(''));

  input.value = store.get('countdownHour') || '';
  display.textContent = '--:--:--';
}

/* ---------- Dias até uma data ---------- */
function initDaysCounter() {
  const input = $('#targetDate');
  const result = $('#daysCounter');

  const calculate = () => {
    if (!input.value) {
      input.classList.add('invalid');
      input.focus();
      return;
    }
    input.classList.remove('invalid');
    store.set('targetDate', input.value);

    // "AAAA-MM-DD" vira meia-noite LOCAL (new Date(string) usaria UTC e erraria 1 dia)
    const [year, month, day] = input.value.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((target - today) / 86_400_000);

    const date = target.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    let html;
    if (days > 1) html = `Faltam <strong>${days}</strong> dias até ${date}`;
    else if (days === 1) html = `Falta <strong>1</strong> dia até ${date}`;
    else if (days === 0) html = `<strong>É hoje!</strong> ${date}`;
    else html = `Essa data foi há <strong>${Math.abs(days)}</strong> ${Math.abs(days) === 1 ? 'dia' : 'dias'} (${date})`;

    result.innerHTML = html;
    result.hidden = false;
  };

  $('#calcButton').addEventListener('click', calculate);
  input.addEventListener('change', () => input.classList.remove('invalid'));

  const saved = store.get('targetDate');
  if (saved) {
    input.value = saved;
    calculate();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initClicker();
  initCountdown();
  initDaysCounter();
});
