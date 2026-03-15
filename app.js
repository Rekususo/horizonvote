/* ===== Event Horizon – Live Results (Two Pools) ===== */

// ---------- CONFIG ----------
const CONFIG = {
  pollInterval: 15000,

  // Google Apps Script web app URL (reads & writes votes)
  sheetUrl: 'https://script.google.com/macros/s/AKfycbxbjw54Gbz3d1SHnZRj6K_2zz6tnctVmaZS23uue4QHoNGZUKTjTchlt7LULTDSC31gHQ/exec',

  countdownTarget: null,
};

// ---------- STATE ----------
let state = {
  taste_yes: 0,
  taste_no: 0,
  cross: 0,
  doubt: 0,
  fun_fact: '--',
  lastFetchTime: null,
};

// ---------- DOM REFS ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  // Hero
  totalHero:   $('#totalVotesHero'),
  refreshNote: $('#refreshNote'),
  // Pool 1 - Tasting
  pctTasteYes:   $('#pctTasteYes'),
  pctTasteNo:    $('#pctTasteNo'),
  barTasteYes:   $('#barTasteYes'),
  barTasteNo:    $('#barTasteNo'),
  totalTasting:  $('#totalTasting'),
  tastingPctYes: $('#tastingPctYes'),
  qrConfirm:     $('#qrConfirm'),
  // Pool 2 - Online
  pctCross:      $('#pctCross'),
  pctDoubt:      $('#pctDoubt'),
  barCross:      $('#barCross'),
  barDoubt:      $('#barDoubt'),
  totalOnline:   $('#totalOnline'),
  onlinePctCross:$('#onlinePctCross'),
  voteButtons:   $('#voteButtons'),
  voteDone:      $('#voteDone'),
  btnCross:      $('#btnCross'),
  btnDoubt:      $('#btnDoubt'),
  // Dashboard
  chartTasteYes:    $('#chartTasteYes'),
  chartTasteNo:     $('#chartTasteNo'),
  chartCross:       $('#chartCross'),
  chartDoubt:       $('#chartDoubt'),
  chartPctTasteYes: $('#chartPctTasteYes'),
  chartPctTasteNo:  $('#chartPctTasteNo'),
  chartPctCross:    $('#chartPctCross'),
  chartPctDoubt:    $('#chartPctDoubt'),
  totalAll:    $('#totalAll'),
  lastVote:    $('#lastVoteTime'),
  funStat:     $('#funStat'),
  funStatDesc: $('#funStatDesc'),
  // Countdown
  cdHours: $('#cdHours'),
  cdMins:  $('#cdMins'),
  cdSecs:  $('#cdSecs'),
};

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
  if (data.cross !== undefined)     state.cross = parseInt(data.cross, 10) || 0;
  if (data.doubt !== undefined)     state.doubt = parseInt(data.doubt, 10) || 0;
  if (data.fun_fact)                state.fun_fact = data.fun_fact;
  state.lastFetchTime = new Date();
}

// ---------- PERCENTAGE HELPER ----------
function pct(a, total) {
  return total > 0 ? Math.round((a / total) * 100) : 0;
}

// ---------- UPDATE UI ----------
function formatTimeAgo(date) {
  if (!date) return '--';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return secs + 's ago';
  return Math.floor(secs / 60) + 'm ago';
}

function updateUI() {
  const tasteTotal = state.taste_yes + state.taste_no;
  const onlineTotal = state.cross + state.doubt;
  const grandTotal = tasteTotal + onlineTotal;

  const pTasteYes = pct(state.taste_yes, tasteTotal);
  const pTasteNo = tasteTotal > 0 ? 100 - pTasteYes : 0;
  const pCross = pct(state.cross, onlineTotal);
  const pDoubt = onlineTotal > 0 ? 100 - pCross : 0;

  // Hero
  animateCounter(els.totalHero, grandTotal);

  // Pool 1 bars
  if (els.pctTasteYes) els.pctTasteYes.textContent = pTasteYes + '%';
  if (els.pctTasteNo) els.pctTasteNo.textContent = pTasteNo + '%';
  if (els.barTasteYes) els.barTasteYes.style.width = pTasteYes + '%';
  if (els.barTasteNo) els.barTasteNo.style.width = pTasteNo + '%';
  animateCounter(els.totalTasting, tasteTotal);
  if (els.tastingPctYes) els.tastingPctYes.textContent = pTasteYes + '%';

  // Pool 2 bars
  if (els.pctCross) els.pctCross.textContent = pCross + '%';
  if (els.pctDoubt) els.pctDoubt.textContent = pDoubt + '%';
  if (els.barCross) els.barCross.style.width = pCross + '%';
  if (els.barDoubt) els.barDoubt.style.width = pDoubt + '%';
  animateCounter(els.totalOnline, onlineTotal);
  if (els.onlinePctCross) els.onlinePctCross.textContent = pCross + '%';

  // Dashboard chart - heights relative to max across all 4 values
  const maxVal = Math.max(state.taste_yes, state.taste_no, state.cross, state.doubt, 1);
  if (els.chartTasteYes) els.chartTasteYes.style.height = Math.round((state.taste_yes / maxVal) * 100) + '%';
  if (els.chartTasteNo) els.chartTasteNo.style.height = Math.round((state.taste_no / maxVal) * 100) + '%';
  if (els.chartCross) els.chartCross.style.height = Math.round((state.cross / maxVal) * 100) + '%';
  if (els.chartDoubt) els.chartDoubt.style.height = Math.round((state.doubt / maxVal) * 100) + '%';
  if (els.chartPctTasteYes) els.chartPctTasteYes.textContent = state.taste_yes.toLocaleString();
  if (els.chartPctTasteNo) els.chartPctTasteNo.textContent = state.taste_no.toLocaleString();
  if (els.chartPctCross) els.chartPctCross.textContent = state.cross.toLocaleString();
  if (els.chartPctDoubt) els.chartPctDoubt.textContent = state.doubt.toLocaleString();

  // Dashboard stats
  animateCounter(els.totalAll, grandTotal);
  if (els.lastVote) els.lastVote.textContent = formatTimeAgo(state.lastFetchTime);
  if (els.funStat) els.funStat.textContent = state.fun_fact;
}

// ---------- DATA FETCHING ----------
async function fetchData() {
  if (!CONFIG.sheetUrl) {
    // Mock data for demo
    state.taste_yes += Math.floor(Math.random() * 5);
    state.taste_no += Math.floor(Math.random() * 2);
    state.cross += Math.floor(Math.random() * 4);
    state.doubt += Math.floor(Math.random() * 2);
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
    // No script URL — increment locally as demo
    if (type === 'taste_yes') state.taste_yes++;
    if (type === 'taste_no') state.taste_no++;
    if (type === 'cross') state.cross++;
    if (type === 'doubt') state.doubt++;
    state.lastFetchTime = new Date();
    updateUI();
    return true;
  }

  try {
    const url = CONFIG.sheetUrl + '?action=vote&type=' + encodeURIComponent(type);
    await fetch(url, { mode: 'no-cors' });
    // Refetch to get updated counts
    setTimeout(fetchData, 1000);
    return true;
  } catch (err) {
    console.error('Vote submit error:', err);
    return false;
  }
}

// ---------- QR AUTO-VOTE ----------
function handleQRVote() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('qr') === '1') {
    if (sessionStorage.getItem('horizon_qr_voted')) {
      if (els.qrConfirm) els.qrConfirm.hidden = false;
      return;
    }
    submitVote('taste_yes').then(ok => {
      if (ok && els.qrConfirm) {
        els.qrConfirm.hidden = false;
        sessionStorage.setItem('horizon_qr_voted', '1');
      }
    });
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// ---------- ONLINE VOTE BUTTONS ----------
function initOnlineVote() {
  if (!els.btnCross || !els.btnDoubt) return;

  const hasVoted = localStorage.getItem('horizon_online_voted');
  if (hasVoted) {
    if (els.voteButtons) els.voteButtons.hidden = true;
    if (els.voteDone) els.voteDone.hidden = false;
    return;
  }

  els.btnCross.addEventListener('click', () => castOnlineVote('cross'));
  els.btnDoubt.addEventListener('click', () => castOnlineVote('doubt'));
}

async function castOnlineVote(type) {
  els.btnCross.disabled = true;
  els.btnDoubt.disabled = true;

  const ok = await submitVote(type);
  if (ok) {
    if (els.voteButtons) els.voteButtons.hidden = true;
    if (els.voteDone) els.voteDone.hidden = false;
    localStorage.setItem('horizon_online_voted', type);
  } else {
    els.btnCross.disabled = false;
    els.btnDoubt.disabled = false;
  }
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
  const hours = Math.floor(diff / 3600); diff %= 3600;
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
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
  ['#btnCopyLink', '#btnCopyLinkQR', '#btnCopyLinkVote'].forEach(sel => {
    const btn = $(sel);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await copyToClipboard(window.location.href);
      flashButton(btn, 'Copied!');
    });
  });

  ['#btnScreenshotQR', '#btnScreenshot'].forEach(sel => {
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
  fetchData();
  handleQRVote();
  initOnlineVote();
  initModal();
  initCopyLink();
  initScrollFade();

  setInterval(fetchData, CONFIG.pollInterval);
  setInterval(() => {
    if (state.lastFetchTime && els.lastVote) {
      els.lastVote.textContent = formatTimeAgo(state.lastFetchTime);
    }
  }, 1000);
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
