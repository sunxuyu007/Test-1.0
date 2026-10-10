// ===== PARTICLES =====
(function() {
    const container = document.getElementById('particles');
    if (!container) return;
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
    if (!container) return;
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
        setTimeout(function() { 
            overlay.style.display = "none"; 
            renderDash(); 
            showView('view-main'); 
        }, 500);
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
    if (!g) return;
    g.innerHTML = "";
    
    if (!db) db = {};

    Object.keys(db).forEach(function(m) {
        if (!db[m] || !db[m].groups) db[m] = { groups: {} };
        
        const totalItems = Object.values(db[m].groups).reduce(function(s, arr) { 
            return s + (Array.isArray(arr) ? arr.length : 0); 
        }, 0);
        const groupCount = Object.keys(db[m].groups).length;

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = function() { openSub(m); };

        card.innerHTML =
            '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
                '<h3 style="font-size:1.3rem; margin-bottom:4px;">' + m + '</h3>' +
                '<button class="delete-btn" title="Elimina corso" onclick="event.stopPropagation(); deleteCourse(\'' + m.replace(/'/g, "\\'") + '\')">🗑️</button>' +
            '</div>' +
            '<div class="counter-pill"><span class="counter-dot"></span>' +
            groupCount + ' Argomenti · ' + totalItems + ' Elementi</div>';

        g.appendChild(card);
    });

    // --- CARD AGGIUNGI CORSO ---
    const newAddCard = document.createElement('div');
    newAddCard.className = 'card';
    newAddCard.style.border = '2px dashed var(--glass-border-hover)';
    newAddCard.style.display = 'flex';
    newAddCard.style.flexDirection = 'column';
    newAddCard.style.alignItems = 'center';
    newAddCard.style.justifyContent = 'center';
    newAddCard.onclick = function() { addNewCourse(); };
    newAddCard.innerHTML =
        '<div class="card-icon icon-settings" style="width:40px; height:40px; font-size:1.2rem; margin-bottom:8px;">➕</div>' +
        '<h3 style="font-size:1.1rem;">Aggiungi Corso</h3>' +
        '<p>Crea una nuova materia da studiare</p>';
    g.appendChild(newAddCard);
}

// ===== AGGIUNGI NUOVO CORSO =====
function addNewCourse() {
    const courseName = prompt("Inserisci il nome del nuovo corso (es. Fisica Tecnica):");
    if (!courseName) return;
    const trimmed = courseName.trim();
    if (!trimmed) return;
    
    if (db[trimmed]) {
        showToast('Questo corso esiste già!', 'error');
        return;
    }
    
    db[trimmed] = { groups: {} };
    save();
    renderDash();
    showToast('Corso aggiunto con successo!', 'success');
}

// ===== ELIMINA CORSO =====
function deleteCourse(courseName) {
    if (confirm('Sei sicuro di voler eliminare definitivamente il corso "' + courseName + '" e tutti i suoi dati?')) {
        delete db[courseName];
        save();
        renderDash();
        showToast('Corso eliminato con successo', 'info');
    }
}

function openSub(m) {
    currentS = m;
    const titleEl = document.getElementById('subject-title');
    if (titleEl) titleEl.innerText = m;
    renderDropdown();
    populateGroupDatalist();
    showView('view-subject-menu');
}

// ===== DROPDOWN =====
function renderDropdown() {
    const list = document.getElementById('dropdown-list');
    if (!list) return;
    list.innerHTML = "";
    const groups = db[currentS] && db[currentS].groups ? db[currentS].groups : {};
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
    const list = document.getElementById('dropdown-list');
    const trigger = document.getElementById('dropdown-trigger');
    if (list) list.classList.toggle('active');
    if (trigger) trigger.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const c = document.querySelector('.dropdown-container');
    const list = document.getElementById('dropdown-list');
    const trigger = document.getElementById('dropdown-trigger');
    if (c && !c.contains(e.target)) {
        if (list) list.classList.remove('active');
        if (trigger) trigger.classList.remove('open');
    }
});

function updateFilterStatus() {
    const count = document.querySelectorAll('.g-check:checked').length;
    const total = document.querySelectorAll('.g-check').length;
    const statusEl = document.getElementById('filter-status');
    if (statusEl) statusEl.innerText = count + '/' + total + ' selezionati';
}

// ===== GROUP BROWSER =====
function renderBrowse() {
    const container = document.getElementById('browse-content');
    if (!container) return;
    const groups = db[currentS] && db[currentS].groups ? db[currentS].groups : {};
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
                '<div style="display:flex; gap:6px;">' +
                    '<button class="delete-btn" title="Modifica" onclick="editQuestion(\'' + safeG + '\', ' + idx + ')">✏️</button>' +
                    '<button class="delete-btn" title="Elimina" onclick="deleteQuestion(\'' + safeG + '\', ' + idx + ')">&#10005;</button>' +
                '</div>' +
                '</div>';
        }
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function toggleGroup(header) {
    const chevron = header.querySelector('.chevron');
    const body = header.nextElementSibling;
    if (chevron) chevron.classList.toggle('open');
    if (body) body.classList.toggle('open');
}

function deleteQuestion(gName, idx) {
    if (!confirm('Eliminare questa domanda?')) return;
    if (db[currentS] && db[currentS].groups && db[currentS].groups[gName]) {
        db[currentS].groups[gName].splice(idx, 1);
        if (db[currentS].groups[gName].length === 0) delete db[currentS].groups[gName];
        save();
        renderBrowse();
        renderDropdown();
        showToast('Domanda eliminata', 'info');
    }
}

function deleteGroup(gName) {
    if (!confirm('Eliminare tutto il gruppo "' + gName + '"?')) return;
    if (db[currentS] && db[currentS].groups) {
        delete db[currentS].groups[gName];
        save();
        renderBrowse();
        renderDropdown();
        showToast('Gruppo eliminato', 'info');
    }
}

// ===== PRESET MODAL =====
function openPreset(type) {
    currentA = type;
    const typeLabels = { flashcard: '🎴 Flashcards', quiz: '📝 Quiz', esercizio: '✍️ Esercizi' };
    const groups = db[currentS] && db[currentS].groups ? db[currentS].groups : {};
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

    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = html;
}

function updatePresetCount() {
    const checked = Array.from(document.querySelectorAll('.preset-check:checked')).map(function(c) { return c.value; });
    let avail = 0;
    const groups = db[currentS] && db[currentS].groups ? db[currentS].groups : {};
    checked.forEach(function(g) {
        if (groups[g]) {
            avail += groups[g].filter(function(i) { return i.type === currentA; }).length;
        }
    });
    const countInput = document.getElementById('preset-count');
    const availInfo = document.getElementById('preset-avail-info');
    if (countInput) {
        countInput.max = avail;
        if (parseInt(countInput.value) > avail) countInput.value = avail;
    }
    if (availInfo) availInfo.innerText = 'Disponibili: ' + avail;
}

function closeModal() {
    const modalRoot = document.getElementById('modal-root');
    const overlay = modalRoot ? modalRoot.querySelector('.modal-overlay') : null;
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(function() { if (modalRoot) modalRoot.innerHTML = ''; }, 200);
    } else if (modalRoot) {
        modalRoot.innerHTML = '';
    }
}

// ===== LAUNCH SESSION =====
function launchSession() {
    const selected = Array.from(document.querySelectorAll('.preset-check:checked')).map(function(c) { return c.value; });
    const countInput = document.getElementById('preset-count');
    let count = countInput ? (parseInt(countInput.value) || 999) : 999;
    const toggleRandomEl = document.getElementById('toggle-random');
    randomizeOrder = toggleRandomEl ? toggleRandomEl.classList.contains('active') : true;
    const timerSelect = document.getElementById('preset-timer');
    timerLimit = timerSelect ? (parseInt(timerSelect.value) || 0) : 0;

    currentList = [];
    const groups = db[currentS] && db[currentS].groups ? db[currentS].groups : {};
    selected.forEach(function(g) {
        if (groups[g]) {
            groups[g].forEach(function(item) {
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
        if (timerEl) { timerEl.style.display = 'inline-flex'; timerEl.className = 'timer-display'; }
        if (timerText) timerText.innerText = formatTime(timerSeconds);
        timerInterval = setInterval(function() {
            timerSeconds--;
            if (timerText) timerText.innerText = formatTime(timerSeconds);
            if (timerEl) {
                if (timerSeconds <= 10) timerEl.className = 'timer-display danger';
                else if (timerSeconds <= 30) timerEl.className = 'timer-display warning';
                else timerEl.className = 'timer-display';
            }
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                showToast('Tempo scaduto!', 'error');
                showResults();
            }
        }, 1000);
    } else {
        timerSeconds = 0;
        if (timerEl) { timerEl.style.display = 'inline-flex'; timerEl.className = 'timer-display'; }
        if (timerText) timerText.innerText = '00:00';
        timerInterval = setInterval(function() {
            timerSeconds++;
            if (timerText) timerText.innerText = formatTime(timerSeconds);
        }, 1000);
    }

    const scoreEl = document.getElementById('score-display');
    const scoreText = document.getElementById('score-text');
    if (currentA === 'quiz') {
        if (scoreEl) scoreEl.style.display = 'inline-flex';
        if (scoreText) scoreText.innerText = '0/' + sessionTotal;
    } else {
        if (scoreEl) scoreEl.style.display = 'none';
    }

    const btnNext = document.getElementById('btn-next');
    if (btnNext) btnNext.style.display = '';

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
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressText) progressText.innerText = (currentIdx + 1) + '/' + currentList.length;
}

// ===== RENDER ITEM =====
function renderItem() {
    const container = document.getElementById('study-content');
    if (!container) return;
    
    // 1. Dichiariamo prima l'elemento corrente
    const item = currentList[currentIdx];
    updateProgress();
    
// Prepariamo l'HTML dell'immagine con stili corretti e ben visibili
    let imgHtml = '';
    const isImageUrl = item.q && (item.q.startsWith('http://') || item.q.startsWith('https://')) && (item.q.match(/\.(jpeg|jpg|png|webp|gif)/i) || item.q.includes('encrypted-tbn0.gstatic.com') || item.q.includes('images'));

    if (item.image) {
        imgHtml = '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
                  '<img src="' + item.image + '" style="max-width: 100%; max-height: 350px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Allegato">' +
                  '</div>';
    } else if (isImageUrl) {
        imgHtml = '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
                  '<img src="' + item.q + '" style="max-width: 100%; max-height: 350px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine web">' +
                  '</div>';
    }

    if (currentA === 'flashcard') {
        container.innerHTML =
            '<div class="study-container" onclick="this.querySelector(\'.flip-inner\').classList.toggle(\'flipped\')">' +
            '<div class="flip-inner">' +
            '<div class="flip-front">' +
            '<span class="badge">' + item.gRef + '</span>' +
            imgHtml +
            '<div style="font-size:1.25rem; line-height:1.6; font-weight:500;">' + item.q + '</div>' +
            '<span class="flip-hint">🔄 Clicca per girare</span></div>' +
            '<div class="flip-back">' +
            '<span class="badge" style="background:linear-gradient(135deg, var(--success), var(--accent));">RISPOSTA</span>' +
            '<div style="line-height:1.7; font-size:1.05rem;">' + item.a + '</div>' +
            '<span class="flip-hint">🔄 Clicca per tornare</span></div>' +
            '</div></div>';

    } else if (currentA === 'esercizio') {
        const questionContent = renderMedia(item.q);
        const qHtml = questionContent.includes('<img') ? 
            questionContent : 
            '<p style="font-size:1.05rem; margin-bottom:24px; line-height:1.7; color:var(--text-main);">' + item.q + '</p>';
        
        container.innerHTML =
            '<div class="exercise-card">' +
            '<span class="badge">' + item.gRef + '</span>' +
            '<h3 style="font-size:1.2rem; margin:10px 0;">Esercizio</h3>' +
            qHtml +
            '<button class="btn btn-success" onclick="revealSolution(this)">Mostra Svolgimento</button>' +
            '<div id="sol" class="solution-box">' + renderMedia(item.a) + '</div></div>';

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
            let checkedAttr = '';
            
            if (answered !== null) {
                if (opts[i].isCorrect) cls += ' correct';
                else if (Array.isArray(answered) && answered.includes(opts[i].origIdx)) cls += ' wrong';
            } else if (Array.isArray(answered) && answered.includes(opts[i].origIdx)) {
                checkedAttr = 'checked';
            }

            optHtml += '<div class="quiz-option-checkbox-row ' + cls + '" style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:12px; margin-bottom:8px; cursor:pointer;" onclick="toggleQuizCheckbox(this)">' +
                '<input type="checkbox" class="quiz-cb" value="' + opts[i].origIdx + '" data-correct="' + opts[i].isCorrect + '" ' + checkedAttr + (answered !== null ? ' disabled' : '') + ' style="width:20px; height:20px; cursor:pointer;">' +
                '<span style="flex:1; font-size:1rem;">' + opts[i].text + '</span>' +
                '</div>';
        }

        const btnState = answered !== null ? 'style="display:none;"' : '';
        container.innerHTML =
            '<div class="exercise-card">' +
            '<span class="badge">' + item.gRef + '</span>' +
            '<h3 style="font-size:1.15rem; margin:10px 0 20px; line-height:1.5;">' + item.q + '</h3>' +
            imgHtml +
            optHtml +
            '<button class="btn" id="btn-submit-quiz" onclick="submitMultipleQuiz()" ' + btnState + ' style="margin-top:15px; width:100%;">Conferma Risposta 🎯</button>' +
            '</div>';
    }
}

function revealSolution(btn) {
    const sol = document.getElementById('sol');
    if (sol) sol.style.display = 'block';
    if (btn) btn.style.display = 'none';
}

function answerQuiz(origIdx, isCorrect, clickedBtn) {
    if (sessionAnswered[currentIdx] !== null) return;
    sessionAnswered[currentIdx] = origIdx;
    if (isCorrect) sessionScore++;
    const scoreText = document.getElementById('score-text');
    if (scoreText) scoreText.innerText = sessionScore + '/' + sessionTotal;

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

    const resultsContent = document.getElementById('results-content');
    if (resultsContent) resultsContent.innerHTML = html;
    showView('view-results');
}

// ===== UTILS =====
async function connectToFile() {
    try {
        [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        db = JSON.parse(await file.text());
        save(); renderDash();
        const syncInfo = document.getElementById('sync-info');
        if (syncInfo) syncInfo.innerHTML = 'Stato: <span style="color:var(--success);">FILE CONNESSO</span>';
        showToast('Database connesso!', 'success');
    } catch (e) { if (e.name !== 'AbortError') showToast('Errore nella connessione', 'error'); }
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

function showView(id) {
    document.querySelectorAll('.view').forEach(function(v) { v.style.display = 'none'; });
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        target.style.animation = 'none';
        target.offsetHeight;
        target.style.animation = '';
        if (id === 'view-browse') renderBrowse();
    }
}

function openManager() { showView('view-manager'); }

function clearSubject() {
    if (confirm("Svuotare tutto il contenuto di questa materia?")) {
        if (db[currentS]) {
            db[currentS].groups = {};
            save();
            openSub(currentS);
            showToast('Materia svuotata', 'info');
        }
    }
}

function addManual() {
    const type = document.getElementById('add-type').value;
    const gNameInput = document.getElementById('add-group').value;
    const gName = gNameInput ? gNameInput.trim() || "Generale" : "Generale";
    const qInput = document.getElementById('add-q').value;
    const q = qInput ? qInput.trim() : "";
    
    // Controlla se c'è almeno del testo o un'immagine allegata
    const imageInput = document.getElementById('add-image');
    const hasImage = imageInput && imageInput.files && imageInput.files[0];
    
    if (!q && !hasImage) {
        showToast('Inserisci il testo della domanda o allega un\'immagine', 'error');
        return;
    }
    
    let item = { type: type, q: q, enabled: true };

    // Se è stata caricata un'immagine, la leggiamo e la convertiamo
    if (hasImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            item.image = e.target.result; // Salva l'immagine convertita in stringa
            finishAddManual(item, gName);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        finishAddManual(item, gName);
    }
}

// Funzione di supporto per completare il salvataggio
function finishAddManual(item, gName) {
    const type = item.type;
    if (type === 'quiz') {
        const optionRows = document.querySelectorAll('.quiz-option-row');
        const options = [];
        
        optionRows.forEach(function(row) {
            const text = row.querySelector('.opt-text').value.trim();
            const isCorrect = row.querySelector('.opt-correct').checked;
            if (text) {
                options.push({ text: text, isCorrect: isCorrect });
            }
        });
        
        if (options.length < 2) {
            showToast('Inserisci almeno 2 opzioni di risposta', 'error');
            return;
        }
        if (!options.some(function(o) { return o.isCorrect; })) {
            showToast('Seleziona almeno una risposta corretta', 'error');
            return;
        }
        item.options = options;
    } else { 
        const aInput = document.getElementById('add-a').value;
        item.a = aInput; 
    }
    
    if (!db[currentS]) db[currentS] = { groups: {} };
    if (!db[currentS].groups[gName]) db[currentS].groups[gName] = [];
    db[currentS].groups[gName].push(item);
    save();
    if (typeof populateGroupDatalist === 'function') populateGroupDatalist();
    if (typeof renderDropdown === 'function') renderDropdown();
    showToast('Elemento aggiunto con successo!', 'success');
    
    // Pulisci i campi del form
    document.getElementById('add-q').value = '';
    if (document.getElementById('add-a')) document.getElementById('add-a').value = '';
    if (document.getElementById('add-image')) document.getElementById('add-image').value = '';
}

function doImport() {
    try {
        const importArea = document.getElementById('import-area');
        const raw = importArea ? importArea.value.trim() : "";
        if (!raw) { showToast('Incolla dei dati JSON prima di importare', 'error'); return; }
        const data = JSON.parse(raw);
        let count = 0;
        data.forEach(function(i) {
            const groupName = i.group || "Generale";
            if (!db[currentS]) db[currentS] = { groups: {} };
            if (!db[currentS].groups[groupName]) db[currentS].groups[groupName] = [];
            db[currentS].groups[groupName].push(i);
            count++;
        });
        save();
        showToast(count + ' elementi importati!', 'success');
        if (importArea) importArea.value = '';
        openSub(currentS);
    } catch (e) { showToast('Errore nel formato JSON', 'error'); }
}

const addTypeSelect = document.getElementById('add-type');
if (addTypeSelect) {
    addTypeSelect.onchange = function(e) {
        const quizFields = document.getElementById('quiz-fields');
        const addA = document.getElementById('add-a');
        if (quizFields) quizFields.style.display = e.target.value === 'quiz' ? 'block' : 'none';
        if (addA) addA.style.display = e.target.value === 'quiz' ? 'none' : 'block';
    };
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    const studyView = document.getElementById('view-study');
    if (studyView && studyView.style.display === 'block') {
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


// ===== MODIFICA ELEMENTO =====
function editQuestion(gName, idx) {
    const item = db[currentS].groups[gName][idx];
    if (!item) return;

    if (item.type === 'flashcard' || item.type === 'esercizio') {
        const newQ = prompt("Modifica la domanda:", item.q);
        if (newQ === null) return;
        const newA = prompt("Modifica la risposta o lo svolgimento:", item.a);
        if (newA === null) return;

        item.q = newQ.trim();
        item.a = newA.trim();
    } else if (item.type === 'quiz') {
        const newQ = prompt("Modifica la domanda del quiz:", item.q);
        if (newQ === null) return;
        
        // Trova risposta corretta e sbagliate attuali
        let currentCorrect = "";
        let wrongOpts = [];
        if (item.options) {
            item.options.forEach(function(opt) {
                if (opt.isCorrect) currentCorrect = opt.text;
                else wrongOpts.push(opt.text);
            });
        }

        const newCorrect = prompt("Modifica la risposta CORRETTA:", currentCorrect);
        if (newCorrect === null) return;
        const newW1 = prompt("Modifica la 1° risposta SBALGIATA:", wrongOpts[0] || "");
        if (newW1 === null) return;
        const newW2 = prompt("Modifica la 2° risposta SBAGLIATA:", wrongOpts[1] || "");
        if (newW2 === null) return;

        item.q = newQ.trim();
        item.options = [
            { text: newCorrect.trim(), isCorrect: true },
            { text: newW1.trim(), isCorrect: false },
            { text: newW2.trim(), isCorrect: false }
        ];
    }

    save();
    renderBrowse();
    showToast('Elemento modificato con successo!', 'success');
}

// ===== POPOLA MENU TENDINA SOTTOGRUPPI =====
function populateGroupDatalist() {
    const datalist = document.getElementById('group-options');
    if (!datalist) return;
    datalist.innerHTML = "";
    
    const groups = (db[currentS] && db[currentS].groups) ? db[currentS].groups : {};
    Object.keys(groups).forEach(function(gName) {
        const option = document.createElement('option');
        option.value = gName;
        datalist.appendChild(option);
    });
}

// ===== GESTIONE OPZIONI DINAMICHE MANUALI =====
function addQuizOptionRow(text = "", isCorrect = false) {
    const container = document.getElementById('quiz-options-container');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'quiz-option-row';
    row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
    
    row.innerHTML = 
        '<input type="checkbox" class="opt-correct" ' + (isCorrect ? 'checked' : '') + ' title="Segna come corretta" style="width: 20px; height: 20px; cursor: pointer;">' +
        '<input type="text" class="opt-text" value="' + text.replace(/"/g, '&quot;') + '" placeholder="Scrivi opzione..." style="flex: 1; margin-bottom: 0;">' +
        '<button type="button" class="delete-btn" onclick="this.parentElement.remove()" title="Rimuovi opzione">✕</button>';
    
    container.appendChild(row);
}

function toggleQuizCheckbox(row) {
    if (sessionAnswered[currentIdx] !== null) return;
    const cb = row.querySelector('.quiz-cb');
    if (event.target !== cb) {
        cb.checked = !cb.checked;
    }
}

function submitMultipleQuiz() {
    if (sessionAnswered[currentIdx] !== null) return;
    
    const checkboxes = document.querySelectorAll('.quiz-cb');
    const selectedIndices = [];
    let allCorrect = true;
    let hasSelection = false;

    checkboxes.forEach(function(cb) {
        const isSelected = cb.checked;
        const isCorrect = cb.getAttribute('data-correct') === 'true';
        const idx = parseInt(cb.value);

        if (isSelected) {
            hasSelection = true;
            selectedIndices.push(idx);
        }

        // Condizione di correttezza: deve aver selezionato tutte le corrette e nessuna errata
        if (isSelected !== isCorrect) {
            allCorrect = false;
        }
    });

    if (!hasSelection) {
        showToast('Seleziona almeno una risposta', 'error');
        return;
    }

    sessionAnswered[currentIdx] = selectedIndices;
    if (allCorrect) sessionScore++;
    
    const scoreText = document.getElementById('score-text');
    if (scoreText) scoreText.innerText = sessionScore + '/' + sessionTotal;

    // Evidenzia visivamente le risposte corrette e sbagliate
    checkboxes.forEach(function(cb) {
        cb.disabled = true;
        const row = cb.closest('.quiz-option-checkbox-row');
        const isCorrect = cb.getAttribute('data-correct') === 'true';
        if (isCorrect) {
            row.style.borderColor = 'var(--success)';
            row.style.background = 'rgba(16, 185, 129, 0.1)';
        } else if (cb.checked) {
            row.style.borderColor = 'var(--danger)';
            row.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    });

    const submitBtn = document.getElementById('btn-submit-quiz');
    if (submitBtn) submitBtn.style.display = 'none';

    if (allCorrect) showToast('Risposta corretta!', 'success');
    else showToast('Risposta errata!', 'error');

    quizAutoAdvance = setTimeout(function() {
        quizAutoAdvance = null;
        if (currentIdx < currentList.length - 1) {
            nextItem();
        } else {
            showResults();
        }
    }, 2000);
}

function renderMedia(val) {
    if (!val) return '';
    // Se è un'immagine in base64 o un link web valido
    const isBase64 = val.startsWith('data:image');
    const isUrl = (val.startsWith('http://') || val.startsWith('https://')) && 
                  (val.match(/\.(jpeg|jpg|png|webp|gif)/i) || val.includes('encrypted-tbn0.gstatic.com') || val.includes('images'));
    
    if (isBase64 || isUrl) {
        return '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
               '<img src="' + val + '" style="max-width: 100%; max-height: 350px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine">' +
               '</div>';
    }
    return val;
}
