// ===== PARTICLES =====
(function() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 35; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 15) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        const size = (2 + Math.random() * 3) + 'px';
        p.style.width = size;
        p.style.height = size;
        p.style.opacity = 0.1 + Math.random() * 0.4;
        container.appendChild(p);
    }
})();

// ===== CARD MOUSE GLOW =====
document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.card').forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
        card.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
});

// ===== RIPPLE =====
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

// ===== TOAST =====
function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toast-container');
    const icons = { success: '&#10003;', error: '&#10007;', info: '&#8505;' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<span>' + (icons[type] || '&#8505;') + '</span> ' + message;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3200);
}

// ===== CORE STATE =====
const STORAGE_KEY = 'uniflash_v14_db';
const SCORES_KEY = 'uniflash_scores';
let db = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    "Analisi 2": { groups: {} },
    "Algebra & Geometria": { groups: {} }
};
let scores = JSON.parse(localStorage.getItem(SCORES_KEY)) || {};
let fileHandle = null;
let currentS = "", currentA = "", currentList = [], currentIdx = 0;

// Session state
let sessionScore = 0;
let sessionTotal = 0;
let sessionAnswered = [];
let timerInterval = null;
let timerSeconds = 0;
let timerLimit = 0;
let randomizeOrder = true;
let quizAutoAdvance = null;

// ===== LOGIN =====
function handleLogin() {
    const passEl = document.getElementById('pass');
    if (passEl.value === "1234") {
        const overlay = document.getElementById('login-overlay');
        overlay.style.transition = 'opacity 0.5s ease, filter 0.5s ease';
        overlay.style.opacity = '0';
        overlay.style.filter = 'blur(10px)';
        setTimeout(function() { overlay.style.display = "none"; renderDash(); showView('view-main'); }, 500);
    } else {
        passEl.style.animation = 'wrongShake 0.4s ease';
        passEl.style.borderColor = 'var(--danger)';
        setTimeout(function() { passEl.style.animation = ''; passEl.style.borderColor = ''; }, 500);
        showToast('Credenziali errate', 'error');
    }
}

// ===== DASHBOARD =====
function renderDash() {
    const g = document.getElementById('main-grid');
    g.innerHTML = "";
    Object.keys(db).forEach(function(m) {
        const totalItems = Object.values(db[m].groups || {}).reduce(function(s, arr) { 
            return s + arr.length; 
        }, 0);
        const groupCount = Object.keys(db[m].groups || {}).length;

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = function() { openSub(m); };

        card.innerHTML =
            '<h3 style="font-size:1.3rem; margin-bottom:4px;">' + m + '</h3>' +
            '<div class="counter-pill"><span class="counter-dot"></span>' +
            groupCount + ' Argomenti · ' + totalItems + ' Elementi</div>';

        g.appendChild(card);
    });
}

function openSub(m) {
    currentS = m;
    document.getElementById('subject-title').innerText = m;
    renderDropdown();
    showView('view-subject-menu');
}

// ===== DROPDOWN =====
function renderDropdown() {
    const list = document.getElementById('dropdown-list');
    list.innerHTML = "";
    const groups = db[currentS].groups;
    for (let gName in groups) {
        const row = document.createElement('div');
        row.className = 'filter-row';
        (function(r) {
            r.onclick = function(e) {
                e.stopPropagation();
                const cb = r.querySelector('input');
                if (e.target !== cb) cb.checked = !cb.checked;
                updateFilterStatus();
            };
        })(row);
        row.innerHTML = '<input type="checkbox" checked class="g-check" value="' + gName + '">' +
            '<span>' + gName + ' <span style="opacity:0.5">(' + groups[gName].length + ')</span></span>';
        list.appendChild(row);
    }
    updateFilterStatus();
}

function toggleFilterMenu() {
    document.getElementById('dropdown-list').classList.toggle('active');
    document.getElementById('dropdown-trigger').classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const c = document.querySelector('.dropdown-container');
    if (c && !c.contains(e.target)) {
        document.getElementById('dropdown-list').classList.remove('active');
        document.getElementById('dropdown-trigger').classList.remove('open');
    }
});

function updateFilterStatus() {
    const count = document.querySelectorAll('.g-check:checked').length;
    const total = document.querySelectorAll('.g-check').length;
    document.getElementById('filter-status').innerText = count + '/' + total + ' selezionati';
}

// ===== GROUP BROWSER =====
function renderBrowse() {
    const container = document.getElementById('browse-content');
    const groups = db[currentS].groups;
    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:40px;">Nessun gruppo in questa materia.</p>';
        return;
    }
    let html = '';
    for (let gName in groups) {
        const items = groups[gName];
        const safeG = gName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += '<div class="group-item">' +
            '<div class="group-header" onclick="toggleGroup(this)">' +
            '<div class="group-name"><span class="chevron">&#9654;</span> ' + gName + '</div>' +
            '<div style="display:flex; align-items:center; gap:10px;">' +
            '<span class="group-count">' + items.length + ' elementi</span>' +
            '<button class="delete-btn" title="Elimina gruppo" onclick="event.stopPropagation(); deleteGroup(\'' + safeG + '\')" style="font-size:0.85rem;">&#128465;</button>' +
            '</div></div><div class="group-body">';
        for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            const preview = (item.q || '').substring(0, 120) + ((item.q || '').length > 120 ? '...' : '');
            html += '<div class="question-row">' +
                '<span class="q-type">' + item.type + '</span>' +
                '<div class="q-text">' + preview + '</div>' +
                '<button class="delete-btn" title="Elimina" onclick="deleteQuestion(\'' + safeG + '\', ' + idx + ')">&#10005;</button>' +
                '</div>';
        }
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function toggleGroup(header) {
    const chevron = header.querySelector('.chevron');
    const body = header.nextElementSibling;
    chevron.classList.toggle('open');
    body.classList.toggle('open');
}

function deleteQuestion(gName, idx) {
    if (!confirm('Eliminare questa domanda?')) return;
    db[currentS].groups[gName].splice(idx, 1);
    if (db[currentS].groups[gName].length === 0) delete db[currentS].groups[gName];
    save();
    renderBrowse();
    renderDropdown();
    showToast('Domanda eliminata', 'info');
}

function deleteGroup(gName) {
    if (!confirm('Eliminare tutto il gruppo "' + gName + '"?')) return;
    delete db[currentS].groups[gName];
    save();
    renderBrowse();
    renderDropdown();
    showToast('Gruppo eliminato', 'info');
}

// ===== PRESET MODAL =====
function openPreset(type) {
    currentA = type;
    const typeLabels = { flashcard: '🎴 Flashcards', quiz: '📝 Quiz', esercizio: '✍️ Esercizi' };
    const groups = db[currentS].groups;
    const selected = Array.from(document.querySelectorAll('.g-check:checked')).map(function(c) { return c.value; });

    let totalAvail = 0;
    const groupCounts = {};
    selected.forEach(function(g) {
        if (groups[g]) {
            const count = groups[g].filter(function(i) { return i.type === type; }).length;
            if (count > 0) { groupCounts[g] = count; totalAvail += count; }
        }
    });

    if (totalAvail === 0) {
        showToast('Nessun elemento disponibile!', 'error');
        return;
    }

    const scoreKey = currentS + '_' + type;
    const best = scores[scoreKey];

    let html = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">' +
        '<div class="modal-card">' +
        '<h3>' + typeLabels[type] + '</h3>' +
        '<p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:20px;">' + currentS + ' &mdash; ' + totalAvail + ' elementi disponibili</p>';

    if (best) {
        html += '<div style="margin-bottom:20px;">' +
            '<div class="best-score-badge" style="animation:none;">&#127942; Miglior punteggio: ' + best.score + '/' + best.total + ' (' + best.pct + '%) &mdash; ' + (best.time || '--') + '</div></div>';
    }

    html += '<div style="margin-bottom:20px;">' +
        '<h4 style="font-size:0.92rem; margin-bottom:10px; color:var(--text-muted);">Argomenti</h4>';
    for (let g in groupCounts) {
        html += '<div class="preset-group-row" onclick="var cb=this.querySelector(\'input\'); if(event.target!==cb) cb.checked=!cb.checked; updatePresetCount();">' +
            '<input type="checkbox" checked class="preset-check" value="' + g + '">' +
            '<span style="flex:1;">' + g + '</span>' +
            '<span style="font-size:0.82rem; color:var(--text-muted);">' + groupCounts[g] + '</span></div>';
    }
    html += '</div>';

    html += '<div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">' +
        '<label style="font-weight:500; font-size:0.92rem; color:var(--text-muted); flex:1;">Numero domande</label>' +
        '<input type="number" id="preset-count" class="number-input" value="' + totalAvail + '" min="1" max="' + totalAvail + '">' +
        '<button class="btn btn-sm btn-ghost" onclick="document.getElementById(\'preset-count\').value=' + totalAvail + '">Max</button></div>' +
        '<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:16px;" id="preset-avail-info">Disponibili: ' + totalAvail + '</div>';

    html += '<div class="toggle-row">' +
        '<label>🔀 Ordine casuale</label>' +
        '<button class="toggle ' + (randomizeOrder ? 'active' : '') + '" id="toggle-random" onclick="this.classList.toggle(\'active\')"></button></div>';

    html += '<div class="toggle-row">' +
        '<label>&#9201; Timer</label>' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
        '<select id="preset-timer" style="width:140px; padding:10px; font-size:0.88rem;">' +
        '<option value="0">Nessuno</option>' +
        '<option value="60">1 minuto</option>' +
        '<option value="120">2 minuti</option>' +
        '<option value="180">3 minuti</option>' +
        '<option value="300">5 minuti</option>' +
        '<option value="600">10 minuti</option>' +
        '<option value="900">15 minuti</option>' +
        '<option value="1200">20 minuti</option>' +
        '<option value="1800">30 minuti</option>' +
        '</select></div></div>';

    html += '<div style="margin-top:24px; display:flex; gap:10px;">' +
        '<button class="btn" onclick="launchSession()" style="flex:1; padding:15px;">Inizia! 🚀</button>' +
        '<button class="btn btn-back" onclick="closeModal()">Annulla</button></div>' +
        '</div></div>';

    document.getElementById('modal-root').innerHTML = html;
}

function updatePresetCount() {
    const checked = Array.from(document.querySelectorAll('.preset-check:checked')).map(function(c) { return c.value; });
    let avail = 0;
    checked.forEach(function(g) {
        if (db[currentS].groups[g]) {
            avail += db[currentS].groups[g].filter(function(i) { return i.type === currentA; }).length;
        }
    });
    const countInput = document.getElementById('preset-count');
    countInput.max = avail;
    if (parseInt(countInput.value) > avail) countInput.value = avail;
    document.getElementById('preset-avail-info').innerText = 'Disponibili: ' + avail;
}

function closeModal() {
    const overlay = document.getElementById('modal-root').querySelector('.modal-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(function() { document.getElementById('modal-root').innerHTML = ''; }, 200);
    } else {
        document.getElementById('modal-root').innerHTML = '';
    }
}

// ===== LAUNCH SESSION =====
function launchSession() {
    const selected = Array.from(document.querySelectorAll('.preset-check:checked')).map(function(c) { return c.value; });
    let count = parseInt(document.getElementById('preset-count').value) || 999;
    randomizeOrder = document.getElementById('toggle-random').classList.contains('active');
    timerLimit = parseInt(document.getElementById('preset-timer').value) || 0;

    currentList = [];
    selected.forEach(function(g) {
        if (db[currentS].groups[g]) {
            db[currentS].groups[g].forEach(function(item) {
                if (item.type === currentA) {
                    currentList.push({ type: item.type, q: item.q, a: item.a, options: item.options, gRef: g });
                }
            });
        }
    });

    if (currentList.length === 0) {
        showToast('Nessun elemento trovato!', 'error');
        return;
    }

    if (randomizeOrder) currentList.sort(function() { return Math.random() - 0.5; });
    currentList = currentList.slice(0, count);
    currentIdx = 0;
    sessionScore = 0;
    sessionTotal = currentList.length;
    sessionAnswered = [];
    for (let i = 0; i < currentList.length; i++) sessionAnswered.push(null);

    closeModal();
    showView('view-study');

    const timerEl = document.getElementById('timer-display');
    const timerText = document.getElementById('timer-text');
    clearInterval(timerInterval);
    if (quizAutoAdvance) { clearTimeout(quizAutoAdvance); quizAutoAdvance = null; }

    if (timerLimit > 0) {
        timerSeconds = timerLimit;
        timerEl.style.display = 'inline-flex';
        timerEl.className = 'timer-display';
        timerText.innerText = formatTime(timerSeconds);
        timerInterval = setInterval(function() {
            timerSeconds--;
            timerText.innerText = formatTime(timerSeconds);
            if (timerSeconds <= 10) timerEl.className = 'timer-display danger';
            else if (timerSeconds <= 30) timerEl.className = 'timer-display warning';
            else timerEl.className = 'timer-display';
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                showToast('Tempo scaduto!', 'error');
                showResults();
            }
        }, 1000);
    } else {
        timerSeconds = 0;
        timerEl.style.display = 'inline-flex';
        timerEl.className = 'timer-display';
        timerText.innerText = '00:00';
        timerInterval = setInterval(function() {
            timerSeconds++;
            timerText.innerText = formatTime(timerSeconds);
        }, 1000);
    }

    const scoreEl = document.getElementById('score-display');
    if (currentA === 'quiz') {
        scoreEl.style.display = 'inline-flex';
        document.getElementById('score-text').innerText = '0/' + sessionTotal;
    } else {
        scoreEl.style.display = 'none';
    }

    document.getElementById('btn-next').style.display = '';

    updateProgress();
    renderItem();
}

function formatTime(s) {
    const m = Math.floor(Math.abs(s) / 60);
    const sec = Math.abs(s) % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function endSession() {
    clearInterval(timerInterval);
    if (quizAutoAdvance) { clearTimeout(quizAutoAdvance); quizAutoAdvance = null; }
    if (currentA === 'quiz' && sessionAnswered.some(function(a) { return a !== null; })) {
        showResults();
    } else {
        showView('view-subject-menu');
    }
}

// ===== PROGRESS =====
function updateProgress() {
    const pct = currentList.length > 0 ? ((currentIdx + 1) / currentList.length * 100) : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').innerText = (currentIdx + 1) + '/' + currentList.length;
}

// ===== RENDER ITEM =====
function renderItem() {
    const container = document.getElementById('study-content');
    const item = currentList[currentIdx];
    updateProgress();

    if (currentA === 'flashcard') {
        container.innerHTML =
            '<div class="study-container" onclick="this.querySelector(\'.flip-inner\').classList.toggle(\'flipped\')">' +
            '<div class="flip-inner">' +
            '<div class="flip-front">' +
            '<span class="badge">' + item.gRef + '</span>' +
            '<div style="font-size:1.25rem; line-height:1.6; font-weight:500;">' + item.q + '</div>' +
            '<span class="flip-hint">🔄 Clicca per girare</span></div>' +
            '<div class="flip-back">' +
            '<span class="badge" style="background:linear-gradient(135deg, var(--success), var(--accent));">RISPOSTA</span>' +
            '<div style="line-height:1.7; font-size:1.05rem;">' + item.a + '</div>' +
            '<span class="flip-hint">🔄 Clicca per tornare</span></div>' +
            '</div></div>';

    } else if (currentA === 'esercizio') {
        container.innerHTML =
            '<div class="exercise-card">' +
            '<span class="badge">' + item.gRef + '</span>' +
            '<h3 style="font-size:1.2rem; margin:10px 0;">Esercizio</h3>' +
            '<p style="font-size:1.05rem; margin-bottom:24px; line-height:1.7; color:var(--text-muted);">' + item.q + '</p>' +
            '<button class="btn btn-success" onclick="revealSolution(this)">Mostra Svolgimento</button>' +
            '<div id="sol" class="solution-box">' + item.a + '</div></div>';

    } else {
        let opts = [];
        if (item.options) {
            for (let i = 0; i < item.options.length; i++) {
                opts.push({ text: item.options[i].text, isCorrect: item.options[i].isCorrect, origIdx: i });
            }
        }
        if (randomizeOrder) opts.sort(function() { return Math.random() - 0.5; });

        const answered = sessionAnswered[currentIdx];
        let optHtml = '';
        for (let i = 0; i < opts.length; i++) {
            let cls = 'quiz-option';
            let extra = '';
            if (answered !== null) {
                extra = ' disabled';
                if (opts[i].isCorrect) cls += ' correct';
                else if (answered === opts[i].origIdx) cls += ' wrong';
            }
            optHtml += '<button class="' + cls + extra + '" data-idx="' + opts[i].origIdx + '" data-correct="' + opts[i].isCorrect + '" onclick="answerQuiz(' + opts[i].origIdx + ', ' + opts[i].isCorrect + ', this)">' + opts[i].text + '</button>';
        }

        container.innerHTML =
            '<div class="exercise-card">' +
            '<span class="badge">' + item.gRef + '</span>' +
            '<h3 style="font-size:1.15rem; margin:10px 0 20px; line-height:1.5;">' + item.q + '</h3>' +
            optHtml + '</div>';
    }
}

function revealSolution(btn) {
    document.getElementById('sol').style.display = 'block';
    btn.style.display = 'none';
}

function answerQuiz(origIdx, isCorrect, clickedBtn) {
    if (sessionAnswered[currentIdx] !== null) return;
    sessionAnswered[currentIdx] = origIdx;
    if (isCorrect) sessionScore++;
    document.getElementById('score-text').innerText = sessionScore + '/' + sessionTotal;

    const allBtns = clickedBtn.parentElement.querySelectorAll('.quiz-option');
    allBtns.forEach(function(b) {
        b.classList.add('disabled');
        if (b.getAttribute('data-correct') === 'true') b.classList.add('correct');
        else if (parseInt(b.getAttribute('data-idx')) === origIdx && !isCorrect) b.classList.add('wrong');
    });

    if (isCorrect) showToast('Risposta corretta!', 'success');
    else showToast('Risposta sbagliata!', 'error');

    quizAutoAdvance = setTimeout(function() {
        quizAutoAdvance = null;
        if (currentIdx < currentList.length - 1) {
            nextItem();
        } else {
            showResults();
        }
    }, 1500);
}

function nextItem() {
    if (quizAutoAdvance) { clearTimeout(quizAutoAdvance); quizAutoAdvance = null; }
    if (currentIdx < currentList.length - 1) {
        currentIdx++;
        renderItem();
    } else {
        if (currentA === 'quiz') {
            showResults();
        } else {
            showToast('Sessione completata! Ricominciando...', 'success');
            currentIdx = 0;
            renderItem();
        }
    }
}

// ===== RESULTS =====
function showResults() {
    clearInterval(timerInterval);
    if (quizAutoAdvance) { clearTimeout(quizAutoAdvance); quizAutoAdvance = null; }

    const elapsed = timerLimit > 0 ? (timerLimit - Math.max(timerSeconds, 0)) : timerSeconds;
    const timeStr = formatTime(elapsed);
    const pct = sessionTotal > 0 ? Math.round((sessionScore / sessionTotal) * 100) : 0;

    const scoreKey = currentS + '_' + currentA;
    const prev = scores[scoreKey];
    let isNewBest = false;
    if (!prev || pct > prev.pct || (pct === prev.pct && elapsed < (prev.elapsedSec || Infinity))) {
        scores[scoreKey] = { score: sessionScore, total: sessionTotal, pct: pct, time: timeStr, elapsedSec: elapsed };
        localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
        isNewBest = true;
    }

    let emoji = '😢';
    let color = 'var(--danger)';
    if (pct >= 90) { emoji = '&#127942;'; color = '#f59e0b'; }
    else if (pct >= 70) { emoji = '🎉'; color = 'var(--success)'; }
    else if (pct >= 50) { emoji = '😊'; color = 'var(--accent)'; }

    let html = '<div class="results-card">' +
        '<div style="font-size:3rem; margin-bottom:10px;">' + emoji + '</div>' +
        '<h2>Sessione Completata!</h2>' +
        '<div class="results-score" style="color:' + color + ';">' + pct + '%</div>' +
        '<div class="results-detail">Punteggio: <strong>' + sessionScore + '</strong> / ' + sessionTotal + '</div>' +
        '<div class="results-detail">Tempo: <strong>' + timeStr + '</strong></div>';

    if (isNewBest) {
        html += '<div class="best-score-badge">&#127942; NUOVO RECORD!</div>';
    } else if (prev) {
        html += '<div style="margin-top:12px; font-size:0.82rem; color:var(--text-muted);">Miglior punteggio: ' + prev.score + '/' + prev.total + ' (' + prev.pct + '%) &mdash; ' + prev.time + '</div>';
    }

    html += '<div style="margin-top:28px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
        '<button class="btn" onclick="openPreset(\'' + currentA + '\')">Riprova</button>' +
        '<button class="btn btn-back" onclick="showView(\'view-subject-menu\')">&#8592; Menu</button>' +
        '</div></div>';

    document.getElementById('results-content').innerHTML = html;
    showView('view-results');
}

// ===== UTILS =====
async function connectToFile() {
    try {
        [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        db = JSON.parse(await file.text());
        save(); renderDash();
        document.getElementById('sync-info').innerHTML = 'Stato: <span style="color:var(--success);">FILE CONNESSO</span>';
        showToast('Database connesso!', 'success');
    } catch (e) { if (e.name !== 'AbortError') showToast('Errore nella connessione', 'error'); }
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

function showView(id) {
    document.querySelectorAll('.view').forEach(function(v) { v.style.display = 'none'; });
    const target = document.getElementById(id);
    target.style.display = 'block';
    target.style.animation = 'none';
    target.offsetHeight;
    target.style.animation = '';
    if (id === 'view-browse') renderBrowse();
}

function openManager() { showView('view-manager'); }

function clearSubject() {
    if (confirm("Svuotare tutto il contenuto di questa materia?")) {
        db[currentS].groups = {};
        save(); openSub(currentS);
        showToast('Materia svuotata', 'info');
    }
}

function addManual() {
    const type = document.getElementById('add-type').value;
    const gName = document.getElementById('add-group').value.trim() || "Generale";
    const q = document.getElementById('add-q').value.trim();
    if (!q) { showToast('Inserisci il testo della domanda', 'error'); return; }
    let item = { type: type, q: q, enabled: true };
    if (type === 'quiz') {
        const correct = document.getElementById('q-c').value.trim();
        const w1 = document.getElementById('q-w1').value.trim();
        const w2 = document.getElementById('q-w2').value.trim();
        if (!correct || !w1 || !w2) { showToast('Compila tutte le risposte', 'error'); return; }
        item.options = [{ text: correct, isCorrect: true }, { text: w1, isCorrect: false }, { text: w2, isCorrect: false }];
    } else { item.a = document.getElementById('add-a').value; }
    if (!db[currentS].groups[gName]) db[currentS].groups[gName] = [];
    db[currentS].groups[gName].push(item);
    save();
    showToast('Elemento aggiunto!', 'success');
    document.getElementById('add-q').value = '';
    document.getElementById('add-a').value = '';
    document.getElementById('q-c').value = '';
    document.getElementById('q-w1').value = '';
    document.getElementById('q-w2').value = '';
}

function doImport() {
    try {
        const raw = document.getElementById('import-area').value.trim();
        if (!raw) { showToast('Incolla dei dati JSON prima di importare', 'error'); return; }
        const data = JSON.parse(raw);
        let count = 0;
        data.forEach(function(i) {
            if (!db[currentS].groups[i.group]) db[currentS].groups[i.group] = [];
            db[currentS].groups[i.group].push(i);
            count++;
        });
        save();
        showToast(count + ' elementi importati!', 'success');
        document.getElementById('import-area').value = '';
        openSub(currentS);
    } catch (e) { showToast('Errore nel formato JSON', 'error'); }
}

document.getElementById('add-type').onchange = function(e) {
    document.getElementById('quiz-fields').style.display = e.target.value === 'quiz' ? 'block' : 'none';
    document.getElementById('add-a').style.display = e.target.value === 'quiz' ? 'none' : 'block';
};

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (document.getElementById('view-study').style.display === 'block') {
        if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            const flipInner = document.querySelector('.flip-inner');
            if (flipInner) flipInner.classList.toggle('flipped');
            else nextItem();
        }
        if (e.code === 'ArrowRight') nextItem();
    }
    if (e.code === 'Escape') closeModal();
});
