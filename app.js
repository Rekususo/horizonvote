/* ===== Event Horizon – Live Results (QR Tasting Only) ===== */

// ---------- CONFIG ----------
const CONFIG = {
  pollInterval: 15000,
  sheetUrl: 'https://script.google.com/macros/s/AKfycbxbjw54Gbz3d1SHnZRj6K_2zz6tnctVmaZS23uue4QHoNGZUKTjTchlt7LULTDSC31gHQ/exec',
  countdownTarget: '2026-04-08T00:00:00',
};

// ---------- STATE ----------
let state = {
  taste_yes: 0,
  taste_no: 0,
  fun_fact: '--',
  lastFetchTime: null,
};

// ---------- DOM REFS ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let els = {};
function initEls() {
  els = {
    totalHero:   $('#totalVotesHero'),
    refreshNote: $('#refreshNote'),
    pctTasteYes:   $('#pctTasteYes'),
    pctTasteNo:    $('#pctTasteNo'),
    barTasteYes:   $('#barTasteYes'),
    barTasteNo:    $('#barTasteNo'),
    totalTasting:  $('#totalTasting'),
    tastingPctYes: $('#tastingPctYes'),
    qrConfirm:     $('#qrConfirm'),
    cdDays:  $('#cdDays'),
    cdHours: $('#cdHours'),
    cdMins:  $('#cdMins'),
    cdSecs:  $('#cdSecs'),
  };
}

// ---------- COUNTER ANIMATION ----------
function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const start = parseInt(el.textContent.replace(/,/g, ''), 10) || 0;
  if (start === target) return;
  const range = target - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + range * ease);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- PARSE RESPONSE ----------
function applyData(data) {
  if (data.taste_yes !== undefined) state.taste_yes = parseInt(data.taste_yes, 10) || 0;
  if (data.taste_no !== undefined)  state.taste_no = parseInt(data.taste_no, 10) || 0;
  if (data.fun_fact)                state.fun_fact = data.fun_fact;
  state.lastFetchTime = new Date();
}

// ---------- PERCENTAGE HELPER ----------
function pct(a, total) {
  return total > 0 ? Math.round((a / total) * 100) : 0;
}

// ---------- UPDATE UI ----------
function updateUI() {
  const tasteTotal = state.taste_yes + state.taste_no;

  const pTasteYes = pct(state.taste_yes, tasteTotal);
  const pTasteNo = tasteTotal > 0 ? 100 - pTasteYes : 0;

  // Hero
  animateCounter(els.totalHero, tasteTotal);

  // Tasting bars
  if (els.pctTasteYes) els.pctTasteYes.textContent = pTasteYes + '%';
  if (els.pctTasteNo) els.pctTasteNo.textContent = pTasteNo + '%';
  if (els.barTasteYes) els.barTasteYes.style.width = pTasteYes + '%';
  if (els.barTasteNo) els.barTasteNo.style.width = pTasteNo + '%';
  animateCounter(els.totalTasting, tasteTotal);
  if (els.tastingPctYes) els.tastingPctYes.textContent = pTasteYes + '%';
}

// ---------- DATA FETCHING ----------
async function fetchData() {
  if (!CONFIG.sheetUrl) {
    state.taste_yes += Math.floor(Math.random() * 5);
    state.taste_no += Math.floor(Math.random() * 2);
    state.fun_fact = 'Horizon works with tea too!';
    state.lastFetchTime = new Date();
    updateUI();
    return;
  }

  try {
    if (els.refreshNote) els.refreshNote.textContent = 'Updating...';
    const url = CONFIG.sheetUrl + (CONFIG.sheetUrl.includes('?') ? '&' : '?') + 'action=read&_t=' + Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    applyData(json);
    updateUI();
  } catch (err) {
    console.error('Fetch error:', err);
  } finally {
    if (els.refreshNote) els.refreshNote.textContent = 'Refreshes every 15 seconds';
  }
}

// ---------- VOTE SUBMISSION ----------
async function submitVote(type) {
  if (!CONFIG.sheetUrl) {
    if (type === 'taste_yes') state.taste_yes++;
    if (type === 'taste_no') state.taste_no++;
    state.lastFetchTime = new Date();
    updateUI();
    return true;
  }

  try {
    const url = CONFIG.sheetUrl + '?action=vote&type=' + encodeURIComponent(type);
    await fetch(url, { mode: 'no-cors' });
    setTimeout(fetchData, 1000);
    return true;
  } catch (err) {
    console.error('Vote submit error:', err);
    return false;
  }
}

// ---------- QR VOTE ----------
function handleQRVote() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('qr') !== '1') return;

  window.history.replaceState({}, '', window.location.pathname);

  // Already voted this session
  if (sessionStorage.getItem('horizon_qr_voted')) {
    if (els.qrConfirm) els.qrConfirm.hidden = false;
    return;
  }

  // Show vote buttons
  const votePanel = $('#qrVote');
  if (votePanel) votePanel.hidden = false;

  const btnYes = $('#btnVoteYes');
  const btnNo = $('#btnVoteNo');

  function castVote(type) {
    if (btnYes) btnYes.disabled = true;
    if (btnNo) btnNo.disabled = true;
    submitVote(type).then(ok => {
      if (ok) {
        sessionStorage.setItem('horizon_qr_voted', '1');
        if (votePanel) votePanel.hidden = true;
        if (els.qrConfirm) els.qrConfirm.hidden = false;
      }
    });
  }

  if (btnYes) btnYes.addEventListener('click', () => castVote('taste_yes'));
  if (btnNo) btnNo.addEventListener('click', () => castVote('taste_no'));
}

// ---------- COUNTDOWN ----------
function getNextDrawTime() {
  if (CONFIG.countdownTarget) return new Date(CONFIG.countdownTarget);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function updateCountdown() {
  const target = getNextDrawTime();
  const now = new Date();
  let diff = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(diff / 86400); diff %= 86400;
  const hours = Math.floor(diff / 3600); diff %= 3600;
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  if (els.cdDays) els.cdDays.textContent = String(days).padStart(2, '0');
  if (els.cdHours) els.cdHours.textContent = String(hours).padStart(2, '0');
  if (els.cdMins) els.cdMins.textContent = String(mins).padStart(2, '0');
  if (els.cdSecs) els.cdSecs.textContent = String(secs).padStart(2, '0');
}

// ---------- MODAL ----------
function initModal() {
  const modal = $('#rulesModal');
  if (!modal) return;
  [$('#btnRules'), $('#footerRules')].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    });
  });
  const closeBtn = $('#modalClose');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  });
}

// ---------- COPY LINK / SCREENSHOT HELPERS ----------
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  });
}

function flashButton(btn, msg) {
  const original = btn.innerHTML;
  btn.textContent = msg;
  setTimeout(() => { btn.innerHTML = original; }, 2000);
}

function initCopyLink() {
  ['#btnCopyLink', '#btnCopyLinkQR'].forEach(sel => {
    const btn = $(sel);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await copyToClipboard(window.location.href);
      flashButton(btn, 'Copied!');
    });
  });

  ['#btnScreenshotQR'].forEach(sel => {
    const btn = $(sel);
    if (!btn) return;
    btn.addEventListener('click', () => {
      flashButton(btn, 'Take a screenshot now!');
    });
  });
}

// ---------- SCROLL FADE-IN ----------
function initScrollFade() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  $$('.section').forEach(s => observer.observe(s));
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  initEls();
  fetchData();
  handleQRVote();
  initModal();
  initCopyLink();
  initScrollFade();

  setInterval(fetchData, CONFIG.pollInterval);
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
