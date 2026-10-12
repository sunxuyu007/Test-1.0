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


// Funzione di supporto per calcolare l'hash SHA-256 di una stringa
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== LOGIN =====
async function handleLogin() {
   const userEl = document.getElementById('user');
    const passEl = document.getElementById('pass');
    
    const inputUser = userEl ? userEl.value.trim() : "";
    const inputPass = passEl ? passEl.value : "";
    
    const correctUserHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    const correctPassHash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

    const inputUserHash = await sha256(inputUser);
    const inputPassHash = await sha256(inputPass);

    if (inputUserHash === correctUserHash && inputPassHash === correctPassHash) {
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
        if (passEl) {
            passEl.style.animation = 'wrongShake 0.4s ease';
            passEl.style.borderColor = 'var(--danger)';
            setTimeout(function() { passEl.style.animation = ''; passEl.style.borderColor = ''; }, 500);
        }
        showToast('Username o password errati', 'error');
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
        '<div style="display:flex; gap:6px;">' +
            '<button class="delete-btn" title="Modifica nome corso" onclick="event.stopPropagation(); editCourse(\'' + m.replace(/'/g, "\\'") + '\')">✏️</button>' +
            '<button class="delete-btn" title="Elimina corso" onclick="event.stopPropagation(); deleteCourse(\'' + m.replace(/'/g, "\\'") + '\')">🗑️</button>' +
        '</div>' +
    '</div>' +
    '<div class="counter-pill"><span class="counter-dot"></span>' +
    groupCount + ' Argomenti · ' + totalItems + ' Elementi</div>';

        g.appendChild(card);
    });

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

function addNewCourse() {
   let html = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">' +
        '<div class="modal-card">' +
        '<h3>➕ Aggiungi Nuovo Corso</h3>' +
        '<p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:16px;">Inserisci il nome della materia da studiare</p>' +
        '<input type="text" id="modal-new-course-name" placeholder="Es. Fisica Tecnica..." style="width:100%; padding:12px; border-radius:10px; background:rgba(15,23,42,0.9); border:1px solid var(--glass-border); color:var(--text); margin-bottom:20px; outline:none;">' +
        '<div style="display:flex; gap:10px;">' +
        '<button class="btn" onclick="confirmAddCourse()" style="flex:1; padding:12px;">Crea Corso</button>' +
        '<button class="btn btn-back" onclick="closeModal()">Annulla</button></div>' +
        '</div></div>';
    
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = html;
    
    setTimeout(() => {
        const input = document.getElementById('modal-new-course-name');
        if (input) {
            input.focus();
            input.onkeydown = (e) => { if (e.key === 'Enter') confirmAddCourse(); };
        }
    }, 50);
}

function confirmAddCourse() {
    const input = document.getElementById('modal-new-course-name');
    if (!input) return;
    const courseName = input.value.trim();
    if (!courseName) {
        showToast('Inserisci un nome valido per il corso', 'error');
        return;
    }
    if (db[courseName]) {
        showToast('Questo corso esiste già!', 'error');
        return;
    }
    
    db[courseName] = { groups: {} };
    save();
    renderDash();
    closeModal();
    showToast('Corso aggiunto con successo!', 'success');
}

function editCourse(oldName) {
    let html = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">' +
        '<div class="modal-card">' +
        '<h3>✏️ Modifica Nome Corso</h3>' +
        '<p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:16px;">Inserisci il nuovo nome per il corso "' + oldName + '"</p>' +
        '<input type="text" id="modal-edit-course-name" value="' + oldName.replace(/"/g, '&quot;') + '" style="width:100%; padding:12px; border-radius:10px; background:rgba(15,23,42,0.9); border:1px solid var(--glass-border); color:var(--text); margin-bottom:20px; outline:none;">' +
        '<div style="display:flex; gap:10px;">' +
        '<button class="btn" onclick="confirmEditCourse(\'' + oldName.replace(/'/g, "\\'").replace(/"/g, '&quot;') + '\')" style="flex:1; padding:12px;">Salva Modifiche</button>' +
        '<button class="btn btn-back" onclick="closeModal()">Annulla</button></div>' +
        '</div></div>';
    
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = html;
    
    setTimeout(() => {
        const input = document.getElementById('modal-edit-course-name');
        if (input) {
            input.focus();
            input.select();
            input.onkeydown = (e) => { if (e.key === 'Enter') confirmEditCourse(oldName); };
        }
    }, 50);
}

function confirmEditCourse(oldName) {
    const input = document.getElementById('modal-edit-course-name');
    if (!input) return;
    const newName = input.value.trim();
    if (!newName || newName === oldName) {
        closeModal();
        return;
    }
    if (db[newName]) {
        showToast('Esiste già un corso con questo nome!', 'error');
        return;
    }

    db[newName] = db[oldName];
    delete db[oldName];

    const types = ['flashcard', 'quiz', 'esercizio'];
    types.forEach(function(type) {
        const oldKey = oldName + '_' + type;
        const newKey = newName + '_' + type;
        if (scores[oldKey]) {
            scores[newKey] = scores[oldKey];
            delete scores[oldKey];
        }
    });
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));

    save();
    renderDash();
    closeModal();
    showToast('Nome del corso modificato con successo!', 'success');
}

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
                    currentList.push({ 
                        type: item.type, 
                        q: item.q, 
                        a: item.a, 
                        options: item.options, 
                        image: item.image, 
                        answerImage: item.answerImage, 
                        images: item.images,                 
                        answerImages: item.answerImages,     
                        lottieDataQ: item.lottieDataQ || item.lottieData, 
                        lottieDataA: item.lottieDataA,         
                        gRef: g 
                    });
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

function renderItem() {
    const container = document.getElementById('study-content');
    if (!container) return;
    
    const item = currentList[currentIdx];
    updateProgress();
    
    let imgHtml = getImagesHtml(item.images, item.image);
    if (item.image) {
        imgHtml = '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
                  '<img src="' + item.image + '" style="max-width: 100%; max-height: 320px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine Domanda">' +
                  '</div>';
    }

    let ansImgHtml = getImagesHtml(item.answerImages, item.answerImage);
    if (item.answerImage) {
        ansImgHtml = '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
                     '<img src="' + item.answerImage + '" style="max-width: 100%; max-height: 320px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine Risposta">' +
                     '</div>';
    }

    let lottieHtmlQ = item.lottieDataQ ? getLottieHtml('q') : '';
    let lottieHtmlA = item.lottieDataA ? getLottieHtml('a') : '';

    if (currentA === 'flashcard') {
        container.innerHTML =
            '<div class="study-container" onclick="this.querySelector(\'.flip-inner\').classList.toggle(\'flipped\')">' +
            '<div class="flip-inner">' +
            '<div class="flip-front">' +
            '<span class="badge">' + item.gRef + '</span>' +
            imgHtml +
            lottieHtmlQ +
            (item.q ? '<div style="font-size:1.25rem; line-height:1.6; font-weight:500;">' + renderMedia(item.q) + '</div>' : '') +
            '<span class="flip-hint">🔄 Clicca per girare</span></div>' +
            '<div class="flip-back">' +
            '<span class="badge" style="background:linear-gradient(135deg, var(--success), var(--accent));">RISPOSTA</span>' +
            ansImgHtml +
            lottieHtmlA +
            '<div style="line-height:1.7; font-size:1.05rem;">' + renderMedia(item.a) + '</div>' +
            '<span class="flip-hint">🔄 Clicca per tornare</span></div>' +
            '</div></div>';

    } else if (currentA === 'esercizio') {
        container.innerHTML =
            '<div class="exercise-card">' +
            '<span class="badge">' + item.gRef + '</span>' +
            '<h3 style="font-size:1.2rem; margin:10px 0;">Esercizio</h3>' +
            imgHtml +
            lottieHtmlQ +
            (item.q ? '<p style="font-size:1.05rem; margin-bottom:24px; line-height:1.7; color:var(--text-main);">' + renderMedia(item.q) + '</p>' : '') +
            '<button class="btn btn-success" onclick="revealSolution(this)">Mostra Svolgimento</button>' +
            '<div id="sol" class="solution-box">' + ansImgHtml + lottieHtmlA + renderMedia(item.a) + '</div>' +
            '</div>';

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
            (item.q ? '<h3 style="font-size:1.15rem; margin-bottom:15px; line-height:1.5;">' + renderMedia(item.q) + '</h3>' : '') +
            imgHtml +
            lottieHtmlQ +
            optHtml +
            '<button class="btn" id="btn-submit-quiz" onclick="submitMultipleQuiz()" ' + btnState + ' style="margin-top:15px; width:100%;">Conferma Risposta 🎯</button>' +
            '</div>';
    }

    renderMathInContainer(container);

   // Carica Lottie della domanda
    if (item.lottieDataQ) {
        renderLottieAnimation('q', 'lottie-container-q', item.lottieDataQ);
    }

    // Carica Lottie della risposta (retro della flashcard) con un piccolo ritardo per consentire il rendering del DOM
    if (item.lottieDataA) {
        setTimeout(function() {
            renderLottieAnimation('a', 'lottie-container-a', item.lottieDataA);
        }, 50);
    }
}

let tempLottieDataQ = null;
let tempLottieDataA = null;
let editLottieDataQ = null;
let editLottieDataA = null;

function handleLottieSelection(input, targetType, mode) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (mode === 'add') {
                if (targetType === 'q') tempLottieDataQ = json;
                else tempLottieDataA = json;
                const textEl = document.getElementById(targetType === 'q' ? 'file-text-lottie-q' : 'file-text-lottie-a');
                if (textEl) textEl.innerHTML = '<strong style="color:var(--success);">Caricato (' + file.name + ')</strong>';
            } else {
                if (targetType === 'q') editLottieDataQ = json;
                else editLottieDataA = json;
                const textEl = document.getElementById(targetType === 'q' ? 'file-text-edit-lottie-q' : 'file-text-edit-lottie-a');
                if (textEl) textEl.innerHTML = '<strong style="color:var(--success);">Caricato (' + file.name + ')</strong>';
            }
            showToast('Animazione Lottie caricata con successo!', 'success');
        } catch (err) {
            showToast('File JSON non valido o corrotto', 'error');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function clearLottieFile(targetType, mode) {
    if (mode === 'add') {
        if (targetType === 'q') tempLottieDataQ = null;
        else tempLottieDataA = null;
        const textEl = document.getElementById(targetType === 'q' ? 'file-text-lottie-q' : 'file-text-lottie-a');
        if (textEl) textEl.innerText = targetType === 'q' ? 'Scegli JSON domanda...' : 'Scegli JSON risposta...';
    } else {
        if (targetType === 'q') editLottieDataQ = null;
        else editLottieDataA = null;
        const textEl = document.getElementById(targetType === 'q' ? 'file-text-edit-lottie-q' : 'file-text-edit-lottie-a');
        if (textEl) textEl.innerText = 'Carica file JSON...';
    }
    showToast('Animazione Lottie rimossa', 'info');
}

let activeLotties = {
    q: { animation: null, markers: [], idx: 0 },
    a: { animation: null, markers: [], idx: 0 }
};

function getLottieHtml(prefix) {
    return '<div style="display: flex; flex-direction: column; align-items: center; width: 100%;">' +
        '<div id="lottie-container-' + prefix + '" style="width: 100%; max-width: 520px; height: 520px; margin: 15px auto; background: rgba(0,0,0,0.4); border-radius: 12px; border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center;"></div>' +
        '<div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; width: 100%; max-width: 520px;" id="lottie-controls-' + prefix + '">' +
        '<button class="btn btn-sm btn-ghost" onclick="lottiePrevMarker(\'' + prefix + '\')" style="padding: 10px 18px; border-radius: 10px; font-size: 1.1rem; margin: 0;" title="Fase Precedente">&#9664;</button>' +
        '<div style="flex: 1; text-align: center; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 10px; border-radius: 10px;">' +
        '<span id="lottie-marker-label-' + prefix + '" style="font-size: 0.9rem; font-weight: 600; color: var(--accent);">Fase</span>' +
        '</div>' +
        '<button class="btn btn-sm btn-ghost" onclick="lottieNextMarker(\'' + prefix + '\')" style="padding: 10px 18px; border-radius: 10px; font-size: 1.1rem; margin: 0;" title="Fase Successiva">&#9654;</button>' +
        '</div>' +
        '</div>';
}

function renderLottieAnimation(prefix, containerId, jsonAnimationData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (activeLotties[prefix].animation) {
        activeLotties[prefix].animation.destroy();
        activeLotties[prefix].animation = null;
    }

    container.innerHTML = "";
    activeLotties[prefix].markers = jsonAnimationData.markers || [];
    activeLotties[prefix].idx = 0;

    try {
        activeLotties[prefix].animation = lottie.loadAnimation({
            container: container,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: jsonAnimationData
        });

        if (activeLotties[prefix].markers.length > 0) {
            updateLottieSegment(prefix);
        }
    } catch (e) {
        console.error("Errore Lottie:", e);
    }
}

function updateLottieSegment(prefix) {
    const state = activeLotties[prefix];
    if (!state.animation || state.markers.length === 0) return;
    const m = state.markers[state.idx];
    
    const labelEl = document.getElementById('lottie-marker-label-' + prefix);
    if (labelEl) {
        labelEl.innerText = m.cm + ' (' + (state.idx + 1) + ' di ' + state.markers.length + ')';
    }
    state.animation.playSegments([m.tm, m.tm + m.dr], true);
}

function lottieNextMarker(prefix) {
    const state = activeLotties[prefix];
    if (state.markers.length === 0) return;
    if (state.idx < state.markers.length - 1) {
        state.idx++;
        updateLottieSegment(prefix);
    }
}

function lottiePrevMarker(prefix) {
    const state = activeLotties[prefix];
    if (state.markers.length === 0) return;
    if (state.idx > 0) {
        state.idx--;
        updateLottieSegment(prefix);
    }
}

function revealSolution(btn) {
    const sol = document.getElementById('sol');
    if (sol) sol.style.display = 'block';
    if (btn) btn.style.display = 'none';

    const item = currentList[currentIdx];
    if (item && item.lottieDataA) {
        renderLottieAnimation('a', 'lottie-container-a', item.lottieDataA);
    }
}

function nextItem() {
   if (quizAutoAdvance) { clearTimeout(quizAutoAdvance); quizAutoAdvance = null; }
    if (currentIdx < currentList.length - 1) {
        currentIdx++;
        renderItem();
    } else {
        showResults();
    }
}

// ===== RESULTS =====
function showResults() {
   clearInterval(timerInterval);
    if (quizAutoAdvance) { clearTimeout(quizAutoAdvance); quizAutoAdvance = null; }

    const elapsed = timerLimit > 0 ? (timerLimit - Math.max(timerSeconds, 0)) : timerSeconds;
    const timeStr = formatTime(elapsed);
    const pct = sessionTotal > 0 ? Math.round((sessionScore / sessionTotal) * 100) : 0;
    let sessionErrors = sessionTotal - sessionScore;
    const avgTimePerItem = sessionTotal > 0 ? (elapsed / sessionTotal).toFixed(1) : 0;

    if (currentS && currentA) {
        if (!db[currentS]) db[currentS] = { groups: {} };
        if (!db[currentS].stats) db[currentS].stats = {};
        if (!db[currentS].stats[currentA]) {
            db[currentS].stats[currentA] = { sessions: 0, totalTime: 0, totalErrors: 0 };
        }

        const stat = db[currentS].stats[currentA];
        stat.sessions += 1;
        stat.totalTime += elapsed;
        stat.totalErrors += (currentA === 'quiz' ? sessionErrors : 0);

        save();
    }

    const statsData = db[currentS] && db[currentS].stats && db[currentS].stats[currentA] ? db[currentS].stats[currentA] : null;
    const avgSessionTime = statsData ? formatTime(Math.round(statsData.totalTime / statsData.sessions)) : timeStr;
    const avgErrorsVal = statsData && statsData.sessions > 0 ? (statsData.totalErrors / statsData.sessions).toFixed(1) : sessionErrors;

    const scoreKey = currentS + '_' + currentA;
    const prev = scores[scoreKey];
    let isNewBest = false;
    if (currentA === 'quiz' && (!prev || pct > prev.pct || (pct === prev.pct && elapsed < (prev.elapsedSec || Infinity)))) {
        scores[scoreKey] = { score: sessionScore, total: sessionTotal, pct: pct, time: timeStr, elapsedSec: elapsed };
        localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
        isNewBest = true;
    }

    let emoji = '🏆';
    let color = 'var(--success)';
    if (currentA === 'quiz') {
        if (pct >= 90) { emoji = '🌟'; color = '#f59e0b'; }
        else if (pct >= 70) { emoji = '🎉'; color = 'var(--success)'; }
        else { emoji = '💪'; color = 'var(--accent)'; }
    }

    let html = '<div class="results-card">' +
        '<div style="font-size:3rem; margin-bottom:10px;">' + emoji + '</div>' +
        '<h2>Riepilogo Sessione</h2>';

    if (currentA === 'quiz') {
        html += '<div class="results-score" style="color:' + color + ';">' + pct + '%</div>' +
                '<div class="results-detail">Punteggio: <strong>' + sessionScore + '</strong> / ' + sessionTotal + '</div>';
    } else {
        html += '<div class="results-score" style="color:var(--accent);">Completato!</div>' +
                '<div class="results-detail">Elementi studiati: <strong>' + sessionTotal + '</strong></div>';
    }

    html += '<div class="results-detail">⏱️ Tempo totale impiegato: <strong>' + timeStr + '</strong></div>' +
            '<div class="results-detail">⚡ Tempo medio per elemento: <strong>' + avgTimePerItem + ' s</strong></div>';

    if (currentA === 'quiz') {
        html += '<div class="results-detail">❌ Errori in questa sessione: <strong>' + sessionErrors + '</strong></div>' +
                '<div class="results-detail">📊 Media errori storici: <strong>' + avgErrorsVal + '</strong></div>';
    }

    html += '<div class="results-detail" style="margin-top:6px; opacity:0.85; font-size:0.85rem;">📈 Tempo medio storico sessioni: <strong>' + avgSessionTime + '</strong></div>';

    if (isNewBest) {
        html += '<div class="best-score-badge" style="margin-top:12px;">🏆 NUOVO RECORD DI PUNTEGGIO!</div>';
    }

    html += '<div style="margin-top:28px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
        '<button class="btn" onclick="openPreset(\'' + currentA + '\')">🔄 Riprova / Conferma</button>' +
        '<button class="btn btn-ghost" onclick="openStatsView()">📊 Statistiche</button>' +
        '<button class="btn btn-back" onclick="showView(\'view-subject-menu\')">🚪 Esci</button>' +
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

async function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
        console.error("Errore salvataggio localStorage:", e);
        showToast('Memoria del browser quasi piena! Le immagini locali occupano spazio.', 'error');
    }

    if (fileHandle) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(db, null, 2));
            await writable.close();
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Errore di scrittura sul file:", e);
                showToast('Errore di scrittura sul file JSON del PC!', 'error');
            }
        }
    }
}

function showView(id) {
    document.querySelectorAll('.view').forEach(function(v) { v.style.display = 'none'; });
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        target.style.animation = 'none';
        target.offsetHeight;
        target.style.animation = '';
        if (id === 'view-browse') {
            initSearchFilters();
        }
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
    
    if (!q && tempImagesQ.length === 0) {
        showToast('Inserisci il testo della domanda o allega almeno un\'immagine', 'error');
        return;
    }
    
    let item = { type: type, q: q, enabled: true };

    if (tempImagesQ.length > 0) {
        item.images = [...tempImagesQ];
    }
    if (tempImagesA.length > 0) {
        item.answerImages = [...tempImagesA];
    }

    finishAddManual(item, gName);
}

function finishAddManual(item, gName) {
    const type = item.type;
    
    if (tempLottieDataQ) item.lottieDataQ = tempLottieDataQ;
    if (tempLottieDataA) item.lottieDataA = tempLottieDataA;
    tempLottieDataQ = null;
    tempLottieDataA = null;

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
    
    document.getElementById('add-q').value = '';
    if (document.getElementById('add-a')) document.getElementById('add-a').value = '';
    if (document.getElementById('add-image')) document.getElementById('add-image').value = '';
    if (document.getElementById('add-answer-image')) document.getElementById('add-answer-image').value = '';

    const textQ = document.getElementById('file-text-q');
    if (textQ) textQ.innerText = 'Scegli immagini...';

    const textA = document.getElementById('file-text-a');
    if (textA) textA.innerText = 'Scegli immagini...';

    const textLottieQ = document.getElementById('file-text-lottie-q');
    if (textLottieQ) textLottieQ.innerText = 'Scegli JSON domanda...';

    const textLottieA = document.getElementById('file-text-lottie-a');
    if (textLottieA) textLottieA.innerText = 'Scegli JSON risposta...';

    tempImagesQ = [];
    tempImagesA = [];
    renderImagePreviews('q');
    renderImagePreviews('a');
}

function doImport() {
   try {
        const importArea = document.getElementById('import-area');
        const raw = importArea ? importArea.value.trim() : "";
        if (!raw) { 
            showToast('Incolla dei dati JSON prima di importare', 'error'); 
            return; 
        }
        
        const data = JSON.parse(raw);
        let count = 0;

        if (Array.isArray(data)) {
            data.forEach(function(item) {
                const courseName = (item.course && item.course.trim()) ? item.course.trim() : (currentS || "Generale");
                const groupName = (item.group && item.group.trim()) ? item.group.trim() : "Generale";

                if (!db[courseName]) {
                    db[courseName] = { groups: {} };
                }
                if (!db[courseName].groups) {
                    db[courseName].groups = {};
                }
                if (!db[courseName].groups[groupName]) {
                    db[courseName].groups[groupName] = [];
                }

                let cleanItem = { ...item };
                delete cleanItem.course;
                delete cleanItem.group;
                if (cleanItem.enabled === undefined) cleanItem.enabled = true;

                db[courseName].groups[groupName].push(cleanItem);
                count++;
            });
        } 
        else if (typeof data === 'object' && data !== null) {
            for (let courseName in data) {
                if (!db[courseName]) {
                    db[courseName] = { groups: {} };
                }
                if (!db[courseName].groups) db[courseName].groups = {};

                const groups = data[courseName].groups || data[courseName];
                for (let groupName in groups) {
                    if (!db[courseName].groups[groupName]) {
                        db[courseName].groups[groupName] = [];
                    }
                    const itemsArr = groups[groupName];
                    if (Array.isArray(itemsArr)) {
                        itemsArr.forEach(function(item) {
                            db[courseName].groups[groupName].push(item);
                            count++;
                        });
                    }
                }
            }
        }

        save();
        renderDash();
        showToast(count + ' elementi importati e smistati con successo!', 'success');
        if (importArea) importArea.value = '';
        
        if (currentS && db[currentS]) {
            openSub(currentS);
        } else {
            showView('view-main');
        }
    } catch (e) {
        console.error(e);
        showToast('Errore nel formato JSON. Controlla la sintassi.', 'error');
    }
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
    
    if (val.startsWith('data:image')) {
        return '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
               '<img src="' + val + '" style="max-width: 100%; max-height: 350px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine">' +
               '</div>';
    }
    
    const urlRegex = /(https?:\/\/[^\s]+?\.(?:jpeg|jpg|png|webp|gif)(?:\?[^\s]*)?|https?:\/\/[^\s]+?gstatic\.com\/images[^\s]*|https?:\/\/[^\s]+?\?q=tbn[^\s]*)/gi;
    
    let processed = val.replace(urlRegex, function(url) {
        return '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
               '<img src="' + url + '" style="max-width: 100%; max-height: 350px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine">' +
               '</div>';
    });
    
    return processed.replace(/\n/g, '<br>');
}

function openStatsView() {
    const container = document.getElementById('stats-content');
    if (!container) return;

    const stats = db[currentS] && db[currentS].stats ? db[currentS].stats : {};
    const types = [
        { key: 'flashcard', label: '🎴 Flashcards' },
        { key: 'quiz', label: '📝 Quiz' },
        { key: 'esercizio', label: '✍️ Esercizi' }
    ];

    let html = '<h3 style="margin-bottom:20px; font-size:1.2rem; color:var(--text-main);">Riepilogo Medie &mdash; ' + currentS + '</h3>';
    let hasData = false;

    types.forEach(function(t) {
        const data = stats[t.key];
        if (data && data.sessions > 0) {
            hasData = true;
            const avgTime = Math.round(data.totalTime / data.sessions);
            const avgErrors = (data.totalErrors / data.sessions).toFixed(1);
            const timeBarWidth = Math.min(100, (avgTime / 60) * 20);
            const errorBarWidth = Math.min(100, avgErrors * 15);

            html += '<div class="stat-card-item">' +
                '<h4 style="margin-bottom:10px; color:var(--accent); font-size:1.05rem;">' + t.label + ' <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">(Sessioni: ' + data.sessions + ')</span></h4>' +
                '<div style="font-size:0.85rem; margin-bottom:2px; color:var(--text-main);">⏱️ Tempo Medio: <strong>' + formatTime(avgTime) + '</strong></div>' +
                '<div class="stat-bar-track"><div class="stat-bar-time" style="width:' + timeBarWidth + '%;"></div></div>' +
                '<div style="font-size:0.85rem; margin-bottom:2px; color:var(--text-main);">❌ Errori Medi per sessione: <strong>' + avgErrors + '</strong></div>' +
                '<div class="stat-bar-track"><div class="stat-bar-error" style="width:' + errorBarWidth + '%;"></div></div>' +
                '</div>';
        }
    });

    if (!hasData) {
        html += '<p style="text-align:center; color:var(--text-muted); padding:30px;">Nessuna statistica registrata per questo corso.</p>';
    }

    container.innerHTML = html;
    showView('view-stats');
}

function downloadDatabase() {
    try {
        const dataStr = JSON.stringify(db, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = url;
        downloadAnchor.download = 'database.json';
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);
        showToast('Backup scaricato con successo!', 'success');
    } catch (e) {
        showToast('Errore durante il download del file', 'error');
    }
}

function importDatabaseFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            const replace = confirm("Vuoi SOVRASCRIVERE completamente il database attuale?\n\n• OK = Sostituisci tutto\n• Annulla = Unisci i corsi");

            if (replace) {
                db = parsedData;
            } else {
                for (let course in parsedData) {
                    if (!db[course]) {
                        db[course] = parsedData[course];
                    } else {
                        if (parsedData[course].groups) {
                            if (!db[course].groups) db[course].groups = {};
                            for (let g in parsedData[course].groups) {
                                db[course].groups[g] = parsedData[course].groups[g];
                            }
                        }
                        if (parsedData[course].stats) {
                            if (!db[course].stats) db[course].stats = {};
                            for (let s in parsedData[course].stats) {
                                db[course].stats[s] = parsedData[course].stats[s];
                            }
                        }
                    }
                }
            }

            save();
            renderDash();
            showToast('Database importato con successo!', 'success');
        } catch (err) {
            showToast('Errore: file JSON non valido o corrotto!', 'error');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function initSearchFilters() {
    const groupSelect = document.getElementById('filter-group');
    if (!groupSelect) return;

    groupSelect.innerHTML = '<option value="all" style="background: #0f172a; color: #fff;">Tutti i sottogruppi</option>';
    if (!db[currentS] || !db[currentS].groups) return;

    for (let gName in db[currentS].groups) {
        const option = document.createElement('option');
        option.value = gName;
        option.textContent = gName;
        option.style.background = '#0f172a';
        option.style.color = '#fff';
        groupSelect.appendChild(option);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const typeSelect = document.getElementById('filter-type');
    if (typeSelect) typeSelect.value = 'all';

    filterQuestions();
}

function renderClassicGroupsView(container) {
    const groups = db[currentS].groups;
    if (!groups || Object.keys(groups).length === 0) {
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
            const qText = item.q || 'Senza testo';
            const preview = qText.substring(0, 120) + (qText.length > 120 ? '...' : '');
            html += '<div class="question-row">' +
                '<span class="q-type">' + (item.type || 'flashcard') + '</span>' +
                '<div class="q-text">' + preview + '</div>' +
                '<div style="display:flex; gap:6px;">' +
                    '<button class="delete-btn" title="Modifica" onclick="openEditModal(\'' + safeG + '\', ' + idx + ')">✏️</button>' +
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
    chevron.classList.toggle('open');
    body.classList.toggle('open');
}

function deleteQuestion(gName, idx) {
    if (!confirm('Eliminare questa domanda?')) return;
    db[currentS].groups[gName].splice(idx, 1);
    if (db[currentS].groups[gName].length === 0) delete db[currentS].groups[gName];
    save();
    filterQuestions();
    renderDropdown();
    showToast('Domanda eliminata', 'info');
}

function deleteGroup(gName) {
    if (!confirm('Eliminare tutto il gruppo "' + gName + '"?')) return;
    delete db[currentS].groups[gName];
    save();
    filterQuestions();
    renderDropdown();
    showToast('Gruppo eliminato', 'info');
}

function filterQuestions() {
    const searchInput = document.getElementById('search-input');
    const typeSelect = document.getElementById('filter-type');
    const groupSelect = document.getElementById('filter-group');
    const container = document.getElementById('browse-content');

    if (!container || !db[currentS] || !db[currentS].groups) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedType = typeSelect ? typeSelect.value : 'all';
    const selectedGroup = groupSelect ? groupSelect.value : 'all';

    if (query === '' && selectedType === 'all' && selectedGroup === 'all') {
        renderClassicGroupsView(container);
        return;
    }

    let html = '';
    let totalFound = 0;

    for (let gName in db[currentS].groups) {
        if (selectedGroup !== 'all' && gName !== selectedGroup) continue;

        const items = db[currentS].groups[gName];
        if (!Array.isArray(items)) continue;

        let groupHtml = '';
        let groupItemsCount = 0;

        items.forEach(function(item, idx) {
            const qText = item.q || '';
            const itemType = item.type || (item.options ? 'quiz' : 'flashcard');

            if (selectedType !== 'all' && itemType !== selectedType) return;

            const aText = item.a || '';
            const optsText = Array.isArray(item.options) ? item.options.map(o => o.text).join(' ') : '';
            const fullContent = (qText + ' ' + aText + ' ' + optsText).toLowerCase();

            if (query === '' || fullContent.includes(query)) {
                groupItemsCount++;
                totalFound++;

                const safeG = gName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                groupHtml += '<div class="question-row" style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.02); margin:6px 0; border:1px solid var(--glass-border);">' +
                    '<span class="q-type" style="background:rgba(99,102,241,0.15); color:var(--primary-light); padding:3px 10px; border-radius:8px; font-weight:600; font-size:0.72rem; text-transform:uppercase;">' + itemType + '</span>' +
                    '<div class="q-text" style="flex:1; font-size:0.88rem; line-height:1.5; color:var(--text);">' + qText + '</div>' +
                    '<div style="display:flex; gap:6px;">' +
                        '<button class="delete-btn" title="Modifica" onclick="openEditModal(\'' + safeG + '\', ' + idx + ')">✏️</button>' +
                        '<button class="delete-btn" title="Elimina" onclick="deleteQuestion(\'' + safeG + '\', ' + idx + ')">&#10005;</button>' +
                    '</div>' +
                    '</div>';
            }
        });

        if (groupItemsCount > 0) {
            html += '<div style="margin-bottom: 20px;">' +
                '<h3 style="font-size: 1rem; color: var(--accent); margin-bottom: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 4px;">📁 ' + gName + '</h3>' +
                groupHtml +
                '</div>';
        }
    }

    if (totalFound === 0) {
        html = '<p style="text-align: center; color: var(--text-muted); padding: 30px;">Nessun elemento trovato con i criteri attuali.</p>';
    } else {
        html = '<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Trovati <strong>' + totalFound + '</strong> elementi:</p>' + html;
    }

    container.innerHTML = html;
}

function openEditModal(gName, idx) {
    const item = db[currentS].groups[gName][idx];
    if (!item) return;
    const isQuiz = item.type === 'quiz';
    
    editImagesQ = item.images ? [...item.images] : (item.image ? [item.image] : []);
    editImagesA = item.answerImages ? [...item.answerImages] : (item.answerImage ? [item.answerImage] : []);
    
    editLottieDataQ = item.lottieDataQ ? JSON.parse(JSON.stringify(item.lottieDataQ)) : (item.lottieData ? JSON.parse(JSON.stringify(item.lottieData)) : null);
    editLottieDataA = item.lottieDataA ? JSON.parse(JSON.stringify(item.lottieDataA)) : null;
    
    let html = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">' +
        '<div class="modal-card" style="max-height: 90vh; overflow-y: auto;">' +
        '<h3>✏️ Modifica Elemento</h3>' +
        '<label style="font-size:0.82rem; color:var(--text-muted); display:block; margin-top:10px;">Sottogruppo</label>' +
        '<input type="text" id="edit-group" value="' + gName.replace(/"/g, '&quot;') + '" placeholder="Sottogruppo">' +
        '<label style="font-size:0.82rem; color:var(--text-muted); display:block; margin-top:10px;">Testo Domanda</label>' +
        '<textarea id="edit-q" rows="3" placeholder="Domanda...">' + (item.q || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>';
    
    html += '<div style="margin-top: 15px;">' +
        '<label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Immagini Domanda:</label>' +
        '<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 16px; background: rgba(15,23,42,0.9); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main);">' +
        '<label style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0;">' +
        '📷 <span id="file-text-edit-q" style="opacity: 0.85; font-size: 0.9rem;">Gestisci immagini...</span>' +
        '<input type="file" id="edit-image" accept="image/png, image/jpeg, image/webp, image/gif" multiple style="display: none;" onchange="handleEditImageSelection(this, \'q\')">' +
        '</label>' +
        '<button type="button" onclick="clearAllEditImages(\'q\')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; cursor: pointer; font-size: 0.8rem; padding: 6px 10px; border-radius: 8px;" title="Rimuovi tutte">Rimuovi tutte</button>' +
        '</div>' +
        '<div id="preview-container-edit-q" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;"></div>' +
        '</div>';

    html += '<div style="margin-top: 15px;">' +
        '<label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Animazione Lottie Domanda (.json):</label>' +
        '<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 16px; background: rgba(15,23,42,0.9); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main);">' +
        '<label style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0;">' +
        '🎬 <span id="file-text-edit-lottie-q" style="opacity: 0.85; font-size: 0.9rem;">' + (editLottieDataQ ? '<strong style="color:var(--success);">Presente</strong>' : 'Carica JSON...') + '</span>' +
        '<input type="file" id="edit-lottie-file-q" accept=".json" style="display: none;" onchange="handleLottieSelection(this, \'q\', \'edit\')">' +
        '</label>' +
        '<button type="button" onclick="clearLottieFile(\'q\', \'edit\')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; cursor: pointer; font-size: 0.8rem; padding: 6px 10px; border-radius: 8px;" title="Rimuovi">Rimuovi</button>' +
        '</div>' +
        '</div>';

    if (isQuiz) {
        html += '<label style="font-size:0.82rem; color:var(--text-muted); display:block; margin-top:10px;">Opzioni del Quiz</label><div id="edit-quiz-fields" style="margin-top:6px;">';
        if (item.options) {
            item.options.forEach((opt) => {
                html += '<div style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">' +
                    '<input type="text" class="edit-opt-text" value="' + opt.text.replace(/"/g, '&quot;') + '" style="margin:0; flex:1;">' +
                    '<label style="font-size:0.8rem; display:flex; align-items:center; gap:4px; white-space:nowrap;"><input type="checkbox" class="edit-opt-correct" ' + (opt.isCorrect ? 'checked' : '') + '> Corretta</label>' +
                    '</div>';
            });
        }
        html += '</div>';
    } else {
        html += '<label style="font-size:0.82rem; color:var(--text-muted); display:block; margin-top:10px;">Risposta / Svolgimento</label>' +
            '<textarea id="edit-a" rows="3" placeholder="Risposta...">' + (item.a || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>';
        
        html += '<div style="margin-top: 15px;">' +
            '<label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Immagini Risposta / Svolgimento:</label>' +
            '<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 16px; background: rgba(15,23,42,0.9); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main);">' +
            '<label style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0;">' +
            '📷 <span id="file-text-edit-a" style="opacity: 0.85; font-size: 0.9rem;">Gestisci immagini...</span>' +
            '<input type="file" id="edit-answer-image" accept="image/png, image/jpeg, image/webp, image/gif" multiple style="display: none;" onchange="handleEditImageSelection(this, \'a\')">' +
            '</label>' +
            '<button type="button" onclick="clearAllEditImages(\'a\')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; cursor: pointer; font-size: 0.8rem; padding: 6px 10px; border-radius: 8px;" title="Rimuovi tutte">Rimuovi tutte</button>' +
            '</div>' +
            '<div id="preview-container-edit-a" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;"></div>' +
            '</div>';

        html += '<div style="margin-top: 15px;">' +
            '<label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:6px;">Animazione Lottie Risposta / Svolgimento (.json):</label>' +
            '<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 16px; background: rgba(15,23,42,0.9); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main);">' +
            '<label style="cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0;">' +
            '🎬 <span id="file-text-edit-lottie-a" style="opacity: 0.85; font-size: 0.9rem;">' + (editLottieDataA ? '<strong style="color:var(--success);">Presente</strong>' : 'Carica JSON...') + '</span>' +
            '<input type="file" id="edit-lottie-file-a" accept=".json" style="display: none;" onchange="handleLottieSelection(this, \'a\', \'edit\')">' +
            '</label>' +
            '<button type="button" onclick="clearLottieFile(\'a\', \'edit\')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; cursor: pointer; font-size: 0.8rem; padding: 6px 10px; border-radius: 8px;" title="Rimuovi">Rimuovi</button>' +
            '</div>' +
            '</div>';
    }

    html += '<div style="margin-top:24px; display:flex; gap:10px;">' +
        '<button class="btn" onclick="saveEditedQuestion(\'' + gName.replace(/'/g, "\\'").replace(/"/g, '&quot;') + '\', ' + idx + ')" style="flex:1; padding:12px;">Salva Modifiche</button>' +
        '<button class="btn btn-back" onclick="closeModal()">Annulla</button></div>' +
        '</div></div>';

    document.getElementById('modal-root').innerHTML = html;

    renderEditImagePreviews('q');
    renderEditImagePreviews('a');
}

function saveEditedQuestion(oldGName, idx) {
    const item = db[currentS].groups[oldGName][idx];
    const newGName = document.getElementById('edit-group').value.trim() || oldGName;
    const newQ = document.getElementById('edit-q').value.trim();
    
    if (!newQ && editImagesQ.length === 0) {
        showToast('Inserisci il testo della domanda o almeno un\'immagine', 'error');
        return;
    }

    item.q = newQ;

    if (editImagesQ.length > 0) {
        item.images = [...editImagesQ];
        item.image = editImagesQ[0];
    } else {
        delete item.images;
        delete item.image;
    }

    if (editLottieDataQ !== null) item.lottieDataQ = editLottieDataQ; else delete item.lottieDataQ;
    if (editLottieDataA !== null) item.lottieDataA = editLottieDataA; else delete item.lottieDataA;
    delete item.lottieData;

    editLottieDataQ = null;
    editLottieDataA = null;

    if (item.type === 'quiz') {
        const optTexts = document.querySelectorAll('.edit-opt-text');
        const optCorrects = document.querySelectorAll('.edit-opt-correct');
        let newOptions = [];
        for (let i = 0; i < optTexts.length; i++) {
            newOptions.push({
                text: optTexts[i].value.trim(),
                isCorrect: optCorrects[i].checked
            });
        }
        item.options = newOptions;
    } else {
        const editA = document.getElementById('edit-a');
        if (editA) item.a = editA.value;

        if (editImagesA.length > 0) {
            item.answerImages = [...editImagesA];
            item.answerImage = editImagesA[0];
        } else {
            delete item.answerImages;
            delete item.answerImage;
        }
    }

    if (newGName !== oldGName) {
        db[currentS].groups[oldGName].splice(idx, 1);
        if (db[currentS].groups[oldGName].length === 0) delete db[currentS].groups[oldGName];
        if (!db[currentS].groups[newGName]) db[currentS].groups[newGName] = [];
        db[currentS].groups[newGName].push(item);
    }

    save();
    closeModal();
    filterQuestions();
    renderDropdown();
    showToast('Elemento modificato con successo!', 'success');
}

let editImagesQ = [];
let editImagesA = [];

function handleEditImageSelection(input, type) {
    if (!input.files || input.files.length === 0) return;
    const targetArray = type === 'q' ? editImagesQ : editImagesA;
    
    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 600;
                
                if (width > height && width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                } else if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64Data = canvas.toDataURL('image/jpeg', 0.7);
                targetArray.push(base64Data);
                renderEditImagePreviews(type);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function renderEditImagePreviews(type) {
    const containerId = type === 'q' ? 'preview-container-edit-q' : 'preview-container-edit-a';
    const textId = type === 'q' ? 'file-text-edit-q' : 'file-text-edit-a';
    const container = document.getElementById(containerId);
    const textEl = document.getElementById(textId);
    const targetArray = type === 'q' ? editImagesQ : editImagesA;

    if (textEl) {
        const count = targetArray.length;
        textEl.innerHTML = count > 0 ? '<strong style="color:var(--success);">' + count + ' ' + (count === 1 ? 'immagine' : 'immagini') + '</strong>' : 'Gestisci immagini...';
    }

    if (!container) return;
    if (targetArray.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    targetArray.forEach((src, idx) => {
        html += '<div style="position: relative; width: 80px; height: 80px; border-radius: 10px; border: 1px solid var(--glass-border); overflow: hidden; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">' +
                '<img src="' + src + '" style="width: 100%; height: 100%; object-fit: cover;">' +
                '<button type="button" onclick="removeSingleEditImage(\'' + type + '\', ' + idx + ')" style="position: absolute; top: 3px; right: 3px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Rimuovi">✕</button>' +
                '<div style="position: absolute; bottom: 2px; left: 2px; right: 2px; display: flex; justify-content: space-between; background: rgba(15,23,42,0.85); border-radius: 4px; padding: 1px 3px; align-items: center;">' +
                (idx > 0 ? '<button type="button" onclick="moveEditImage(\'' + type + '\', ' + idx + ', -1)" style="background:none; border:none; color:white; font-size:10px; cursor:pointer;" title="Sposta">◀</button>' : '<span></span>') +
                '<span style="font-size:8px; color:var(--text-muted); font-weight:bold;">' + (idx + 1) + '</span>' +
                (idx < targetArray.length - 1 ? '<button type="button" onclick="moveEditImage(\'' + type + '\', ' + idx + ', 1)" style="background:none; border:none; color:white; font-size:10px; cursor:pointer;" title="Sposta">▶</button>' : '<span></span>') +
                '</div>' +
                '</div>';
    });
    container.innerHTML = html;
}

function removeSingleEditImage(type, idx) {
    if (type === 'q') editImagesQ.splice(idx, 1);
    else editImagesA.splice(idx, 1);
    renderEditImagePreviews(type);
}

function moveEditImage(type, idx, direction) {
    const targetArray = type === 'q' ? editImagesQ : editImagesA;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= targetArray.length) return;
    const item = targetArray.splice(idx, 1)[0];
    targetArray.splice(newIdx, 0, item);
    renderEditImagePreviews(type);
}

function clearAllEditImages(type) {
    if (type === 'q') editImagesQ = [];
    else editImagesA = [];
    renderEditImagePreviews(type);
    showToast('Tutte le immagini rimosse', 'info');
}

let tempImagesQ = []; 
let tempImagesA = [];

function handleImageSelection(input, type) {
    if (!input.files || input.files.length === 0) return;
    const targetArray = type === 'q' ? tempImagesQ : tempImagesA;
    
    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 600;
                
                if (width > height && width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                } else if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64Data = canvas.toDataURL('image/jpeg', 0.7);
                targetArray.push(base64Data);
                renderImagePreviews(type);
            };
            img.onerror = function() {
                showToast('Errore nel caricamento del file immagine', 'error');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function renderImagePreviews(type) {
    const containerId = type === 'q' ? 'preview-container-q' : 'preview-container-a';
    const textId = type === 'q' ? 'file-text-q' : 'file-text-a';
    const container = document.getElementById(containerId);
    const textEl = document.getElementById(textId);
    const targetArray = type === 'q' ? tempImagesQ : tempImagesA;

    if (textEl) {
        const count = targetArray.length;
        textEl.innerHTML = count > 0 ? '<strong style="color:var(--success);">' + count + ' ' + (count === 1 ? 'immagine selezionata' : 'immagini selezionate') + '</strong>' : 'Scegli immagini...';
    }

    if (!container) return;
    if (targetArray.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';

    let html = '';
    targetArray.forEach((src, idx) => {
        html += '<div style="position: relative; width: 90px; height: 90px; border-radius: 10px; border: 1px solid var(--glass-border); overflow: hidden; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">' +
                '<img src="' + src + '" style="width: 100%; height: 100%; object-fit: cover;">' +
                '<button type="button" onclick="removeSingleImage(\'' + type + '\', ' + idx + ')" style="position: absolute; top: 4px; right: 4px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);" title="Rimuovi">✕</button>' +
                '<div style="position: absolute; bottom: 2px; left: 2px; right: 2px; display: flex; justify-content: space-between; background: rgba(15,23,42,0.85); border-radius: 6px; padding: 2px 4px; align-items: center;">' +
                (idx > 0 ? '<button type="button" onclick="moveImage(\'' + type + '\', ' + idx + ', -1)" style="background:none; border:none; color:white; font-size:11px; cursor:pointer;" title="Sposta a sinistra">◀</button>' : '<span></span>') +
                '<span style="font-size:9px; color:var(--text-muted); font-weight:bold;">' + (idx + 1) + '</span>' +
                (idx < targetArray.length - 1 ? '<button type="button" onclick="moveImage(\'' + type + '\', ' + idx + ', 1)" style="background:none; border:none; color:white; font-size:11px; cursor:pointer;" title="Sposta a destra">▶</button>' : '<span></span>') +
                '</div>' +
                '</div>';
    });
    container.innerHTML = html;
}

function removeSingleImage(type, idx) {
    if (type === 'q') tempImagesQ.splice(idx, 1);
    else tempImagesA.splice(idx, 1);
    renderImagePreviews(type);
}

function moveImage(type, idx, direction) {
    const targetArray = type === 'q' ? tempImagesQ : tempImagesA;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= targetArray.length) return;
    const item = targetArray.splice(idx, 1)[0];
    targetArray.splice(newIdx, 0, item);
    renderImagePreviews(type);
}

function clearAllImages(type) {
    if (type === 'q') tempImagesQ = [];
    else tempImagesA = [];
    renderImagePreviews(type);
    showToast('Tutte le immagini rimosse', 'info');
}

function getImagesHtml(imagesArray, singleImage) {
    let html = '';
    const list = imagesArray && imagesArray.length > 0 ? imagesArray : (singleImage ? [singleImage] : []);
    list.forEach(src => {
        html += '<div style="margin: 15px 0; text-align: center; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 12px; border: 1px solid var(--glass-border);">' +
                '<img src="' + src + '" style="max-width: 100%; max-height: 320px; border-radius: 8px; object-fit: contain; display: block; margin: 0 auto;" alt="Immagine">' +
                '</div>';
    });
    return html;
}

function renderMathInContainer(element) {
    if (window.renderMathInElement && element) {
        window.renderMathInElement(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
        });
    }
}
