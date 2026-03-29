/* ═══════════════════════════════════════════════
   FitTrack v2 — app.js
   Modüller: CFG · DB · Utils · Toast · Modal ·
   Router · BodyDiagram · HomeScreen · QuickLog ·
   HistoryScreen · SessionDetail · ProgressScreen ·
   SettingsScreen · App
   ═══════════════════════════════════════════════ */

/* ── CFG ──────────────────────────────────────── */
const CFG = {
  DB_NAME:    'fittrack-v2',
  DB_VERSION: 1,

  /* bodyPart → renk */
  BODY_COLORS: {
    chest:'#D4A843', back:'#60A5FA', shoulders:'#A78BFA',
    biceps:'#34D399', triceps:'#F472B6', core:'#FB923C',
    quads:'#38BDF8', hamstrings:'#4ADE80', glutes:'#E879F9',
    calves:'#FCD34D', cardio:'#94A3B8'
  },
};

/* ── DB ───────────────────────────────────────── */
const DB = {
  _db: null,

  open() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(CFG.DB_NAME, CFG.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('exercises')) {
          const ex = db.createObjectStore('exercises', { keyPath: 'id' });
          ex.createIndex('category',  'category',  { unique: false });
          ex.createIndex('bodyPart',  'bodyPart',  { unique: false });
        }
        if (!db.objectStoreNames.contains('logs')) {
          const lg = db.createObjectStore('logs', { keyPath: 'id' });
          lg.createIndex('date',      'date',      { unique: false });
          lg.createIndex('startTime', 'startTime', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = e => { DB._db = e.target.result; res(DB._db); };
      req.onerror   = e => rej(e.target.error);
    });
  },

  _tx(stores, mode = 'readonly') {
    return DB._db.transaction(Array.isArray(stores) ? stores : [stores], mode);
  },

  _pr(req) {
    return new Promise((res, rej) => {
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  },

  getAll(store, indexName, key) {
    const tx = DB._tx(store);
    const os = tx.objectStore(store);
    const req = indexName ? os.index(indexName).getAll(key) : os.getAll();
    return DB._pr(req);
  },

  get(store, key) {
    return DB._pr(DB._tx(store).objectStore(store).get(key));
  },

  put(store, record) {
    return DB._pr(DB._tx(store, 'readwrite').objectStore(store).put(record));
  },

  delete(store, key) {
    return DB._pr(DB._tx(store, 'readwrite').objectStore(store).delete(key));
  },

  getSetting(key, def = null) {
    return DB.get('settings', key).then(r => (r !== undefined && r !== null ? r.value : def));
  },

  setSetting(key, value) {
    return DB.put('settings', { key, value });
  },

  async seedIfEmpty() {
    const existing = await DB.getAll('exercises');
    if (existing.length > 0) return;
    const tx = DB._db.transaction(['exercises'], 'readwrite');
    const os = tx.objectStore('exercises');
    EXERCISE_DATA.forEach(e => os.put(e));
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },

  /* Kas grubu seti (bu haftа) — bodyPart → set sayısı */
  async weeklyMuscleSets() {
    const logs = await DB.getAll('logs');
    const now  = Date.now();
    const weekLogs = logs.filter(l => now - l.startTime < 7 * 24 * 3600 * 1000);
    const map = {};
    for (const log of weekLogs) {
      for (const ex of (log.exercises || [])) {
        const bp = ex.bodyPart || 'other';
        const sets = (ex.sets || []).filter(s => s.done).length;
        map[bp] = (map[bp] || 0) + sets;
      }
    }
    return map;
  },
};

/* ── Utils ────────────────────────────────────── */
const Utils = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  todayKey: () => new Date().toISOString().split('T')[0],
  formatTime(s) {
    if (s < 60)  return s + 's';
    const m = Math.floor(s / 60), sec = s % 60;
    if (s < 3600) return m + ':' + String(sec).padStart(2, '0');
    const h = Math.floor(m / 60);
    return h + ':' + String(m % 60).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  },
  formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  },
  formatDateShort(ts) {
    return new Date(ts).toLocaleDateString('tr-TR', { day:'numeric', month:'short' });
  },
  greetingText() {
    const h = new Date().getHours();
    if (h < 6)  return 'Gece kuşu 🦉';
    if (h < 12) return 'Günaydın ☀️';
    if (h < 18) return 'İyi günler 💪';
    return 'İyi akşamlar 🌙';
  },
  esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  },
  totalVolume(sets) {
    return (sets || []).filter(s => s.done).reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
  },
  ringOffset(elapsed, total) {
    const CIRC = 327;
    return CIRC * Math.min(elapsed / Math.max(total, 1), 1);
  },
  /* Kas grubu → hafif renk badgesi */
  muscleBg(bp) {
    const c = CFG.BODY_COLORS[bp] || '#94A3B8';
    return { color: c, bg: c + '22', border: c + '40' };
  },
};

/* ── Toast ────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', dur = 2800) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), dur);
  },
};

/* ── Modal ────────────────────────────────────── */
const Modal = {
  show({ title, message, actions = [], centered = false }) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent   = title   || '';
    document.getElementById('modal-message').textContent = message || '';
    const actEl = document.getElementById('modal-actions');
    actEl.innerHTML = '';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className   = `btn ${a.class || 'btn-ghost'} btn-block`;
      btn.textContent = a.label;
      btn.onclick = () => { Modal.hide(); if (a.handler) a.handler(); };
      actEl.appendChild(btn);
    });
    overlay.classList.toggle('centered', centered);
    overlay.classList.remove('hidden');
  },
  hide()  { document.getElementById('modal-overlay').classList.add('hidden'); },
  confirm(title, message, onConfirm) {
    Modal.show({ title, message, actions: [
      { label:'Vazgeç',  class:'btn-ghost' },
      { label:'Onayla',  class:'btn-rose',  handler: onConfirm },
    ]});
  },
};

/* ── Router ───────────────────────────────────── */
const Router = {
  _history: [],
  _params:  {},

  navigate(route, params = {}) {
    Router._history.push({ route, params });
    Router._params = params;
    Router._render(route, params);
    Router._updateTabBar(route);
    window.scrollTo(0, 0);
  },

  back() {
    if (Router._history.length <= 1) return;
    Router._history.pop();
    const prev = Router._history[Router._history.length - 1];
    Router._params = prev.params || {};
    Router._render(prev.route, prev.params);
    Router._updateTabBar(prev.route);
    window.scrollTo(0, 0);
  },

  get currentRoute() {
    const l = Router._history[Router._history.length - 1];
    return l ? l.route : 'home';
  },

  _render(route, params) {
    const main    = document.getElementById('main-content');
    const backBtn = document.getElementById('header-back');
    const titleEl = document.getElementById('header-title');
    const actEl   = document.getElementById('header-actions');

    backBtn.classList.add('hidden');
    actEl.innerHTML = '';

    const rootRoutes = ['home', 'history', 'progress', 'settings'];
    if (!rootRoutes.includes(route)) {
      backBtn.classList.remove('hidden');
      backBtn.onclick = () => Router.back();
    }

    main.innerHTML = '';
    main.className = 'main-content screen-enter';

    switch (route) {
      case 'home':           titleEl.textContent = 'FitTrack';         HomeScreen.render(main);              break;
      case 'history':        titleEl.textContent = 'Geçmiş';           HistoryScreen.render(main);           break;
      case 'session-detail': titleEl.textContent = 'Seans Detayı';     SessionDetail.render(main, params);   break;
      case 'progress':       titleEl.textContent = 'İlerleme';         ProgressScreen.render(main);          break;
      case 'settings':       titleEl.textContent = 'Ayarlar';          SettingsScreen.render(main);          break;
      default:               titleEl.textContent = 'FitTrack';         HomeScreen.render(main);
    }
  },

  _updateTabBar(route) {
    const map = { home:'home', history:'history', progress:'progress', settings:'settings' };
    document.querySelectorAll('.tab-btn[data-route]').forEach(btn => {
      const active = btn.dataset.route === (map[route] || null);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
  },
};

/* ── BodyDiagram — SVG vücut haritası ─────────── */
const BodyDiagram = {
  /* bodyPart → [frontPathIds] kullanarak SVG içindeki id ile eşleşir */
  FRONT_PARTS: ['chest','shoulders','biceps','triceps','core','quads','calves'],
  BACK_PARTS:  ['back','shoulders','triceps','glutes','hamstrings','calves'],

  /* SVG üretici — side: 'front' | 'back' */
  buildSVG(side, activePart, intensityMap = {}) {
    const isFront = side === 'front';

    /* Her muscle için dolgu rengini hesapla */
    const fill = (bp) => {
      const sets = intensityMap[bp] || 0;
      if (!sets) return 'var(--bg-4)';
      if (sets <= 3)  return 'rgba(45,212,191,.3)';
      if (sets <= 8)  return 'rgba(45,212,191,.5)';
      if (sets <= 15) return 'rgba(212,168,67,.4)';
      if (sets <= 25) return 'rgba(212,168,67,.65)';
      return 'var(--gold)';
    };

    const sel  = bp => `fill:${activePart === bp ? 'var(--gold-glow)' : fill(bp)};cursor:pointer;transition:fill .2s;`;
    const base = `fill:var(--bg-3);stroke:var(--sep-solid);stroke-width:1;`;
    const ap   = (bp, paths) => `<g class="muscle-group" data-bp="${bp}" onclick="BodyDiagram._click('${bp}')" style="outline:none;">
      ${paths.map(p => `<path d="${p}" style="${sel(bp)}"/>`).join('')}
    </g>`;

    if (isFront) {
      return `
      <svg viewBox="0 0 100 230" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
        <!-- Siluet gövde -->
        <path d="M38,25 Q50,20 62,25 L68,35 Q78,37 82,45 L80,70 Q74,72 72,75 L74,95 Q76,100 75,115 L70,185 Q68,195 65,200 L60,205 Q55,208 50,207 Q45,208 40,205 L35,200 Q32,195 30,185 L25,115 Q24,100 26,95 L28,75 Q26,72 20,70 L18,45 Q22,37 32,35 Z"
          style="${base}"/>
        <circle cx="50" cy="14" r="11" style="${base}"/>
        <rect x="45" y="25" width="10" height="9" rx="3" style="fill:var(--bg-3);stroke:var(--sep-solid);stroke-width:1;"/>

        <!-- Ön Omuz (shoulders front) -->
        ${ap('shoulders', [
          'M18,41 Q22,34 32,36 L30,50 Q22,51 17,47 Z',
          'M82,41 Q78,34 68,36 L70,50 Q78,51 83,47 Z'
        ])}
        <!-- Göğüs (chest) -->
        ${ap('chest', [
          'M32,36 Q41,31 50,33 L49,56 Q36,60 29,51 Z',
          'M68,36 Q59,31 50,33 L51,56 Q64,60 71,51 Z'
        ])}
        <!-- Biceps -->
        ${ap('biceps', [
          'M17,51 Q22,48 26,50 L24,72 Q19,74 14,70 Z',
          'M83,51 Q78,48 74,50 L76,72 Q81,74 86,70 Z'
        ])}
        <!-- Triceps (ön görünümde yanlarda) -->
        ${ap('triceps', [
          'M14,71 Q18,69 23,71 L22,88 Q17,89 13,87 Z',
          'M86,71 Q82,69 77,71 L78,88 Q83,89 87,87 Z'
        ])}
        <!-- Karın (core) -->
        ${ap('core', [
          'M36,57 L64,57 L62,92 Q50,96 38,92 Z'
        ])}
        <!-- Quads -->
        ${ap('quads', [
          'M30,116 Q39,111 48,113 L47,162 Q38,166 28,161 Z',
          'M70,116 Q61,111 52,113 L53,162 Q62,166 72,161 Z'
        ])}
        <!-- Calves ön -->
        ${ap('calves', [
          'M29,165 Q37,162 43,164 L42,197 Q36,200 28,197 Z',
          'M71,165 Q63,162 57,164 L58,197 Q64,200 72,197 Z'
        ])}
      </svg>`;
    } else {
      return `
      <svg viewBox="0 0 100 230" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
        <!-- Arka siluet -->
        <path d="M38,25 Q50,20 62,25 L68,35 Q78,37 82,45 L80,70 Q74,72 72,75 L74,95 Q76,100 75,115 L70,185 Q68,195 65,200 L60,205 Q55,208 50,207 Q45,208 40,205 L35,200 Q32,195 30,185 L25,115 Q24,100 26,95 L28,75 Q26,72 20,70 L18,45 Q22,37 32,35 Z"
          style="${base}"/>
        <circle cx="50" cy="14" r="11" style="${base}"/>
        <rect x="45" y="25" width="10" height="9" rx="3" style="fill:var(--bg-3);stroke:var(--sep-solid);stroke-width:1;"/>

        <!-- Arka Omuz -->
        ${ap('shoulders', [
          'M18,41 Q22,34 32,36 L30,50 Q22,51 17,47 Z',
          'M82,41 Q78,34 68,36 L70,50 Q78,51 83,47 Z'
        ])}
        <!-- Sırt (back/lats/traps) -->
        ${ap('back', [
          'M32,36 Q50,29 68,36 L66,58 Q50,64 34,58 Z',
          'M20,58 Q28,55 34,60 L32,90 Q22,94 17,86 Z',
          'M80,58 Q72,55 66,60 L68,90 Q78,94 83,86 Z'
        ])}
        <!-- Triceps (arkadan) -->
        ${ap('triceps', [
          'M17,51 Q22,48 26,50 L24,72 Q19,74 14,70 Z',
          'M83,51 Q78,48 74,50 L76,72 Q81,74 86,70 Z'
        ])}
        <!-- Gluteus -->
        ${ap('glutes', [
          'M26,103 Q38,98 50,100 L50,124 Q36,128 24,121 Z',
          'M74,103 Q62,98 50,100 L50,124 Q64,128 76,121 Z'
        ])}
        <!-- Hamstrings -->
        ${ap('hamstrings', [
          'M27,126 Q37,121 47,123 L46,166 Q36,170 25,165 Z',
          'M73,126 Q63,121 53,123 L54,166 Q64,170 75,165 Z'
        ])}
        <!-- Calves arka -->
        ${ap('calves', [
          'M26,168 Q35,165 42,167 L41,198 Q34,202 25,198 Z',
          'M74,168 Q65,165 58,167 L59,198 Q66,202 75,198 Z'
        ])}
      </svg>`;
    }
  },

  _click(bp) {
    /* QuickLog varsa filtrele, yoksa yok say */
    if (typeof QuickLog !== 'undefined' && QuickLog._open) {
      QuickLog._filterByBodyPart(bp);
    }
    /* ProgressScreen'de ise seçimi güncelle */
    if (typeof ProgressScreen !== 'undefined' && ProgressScreen._bodyDiagramActive) {
      ProgressScreen._selectBodyPart(bp);
    }
  },

  /* Progress / Home ekranı için statik harita (tıklama yok, sadece renk) */
  renderStatic(container, side, intensityMap) {
    container.innerHTML = BodyDiagram.buildSVG(side, null, intensityMap);
  },
};

/* ── HomeScreen ───────────────────────────────── */
const HomeScreen = {
  async render(container) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div></div>`;

    const [name, allLogs, muscleMap] = await Promise.all([
      DB.getSetting('userName', ''),
      DB.getAll('logs'),
      DB.weeklyMuscleSets(),
    ]);

    const todayKey   = Utils.todayKey();
    const todayLogs  = allLogs.filter(l => l.date === todayKey);
    const totalSets  = todayLogs.reduce((a, l) => a + (l.exercises || []).reduce((b, e) => b + (e.sets || []).filter(s => s.done).length, 0), 0);
    const totalVol   = todayLogs.reduce((a, l) => a + (l.totalVolume || 0), 0);
    const streak     = HomeScreen._calcStreak(allLogs);
    const weekCount  = allLogs.filter(l => Date.now() - l.startTime < 7 * 24 * 3600 * 1000).length;

    /* Bugün yapılan egzersizler (tümü birleştir) */
    const todayExMap = {};
    for (const log of todayLogs) {
      for (const ex of (log.exercises || [])) {
        if (!todayExMap[ex.exerciseId]) todayExMap[ex.exerciseId] = { ...ex, allSets: [] };
        todayExMap[ex.exerciseId].allSets.push(...(ex.sets || []));
      }
    }
    const todayExArr = Object.values(todayExMap);

    /* Haftalık kas grubu barları */
    const topMuscles = Object.entries(muscleMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const maxSets    = topMuscles.length ? topMuscles[0][1] : 1;

    container.innerHTML = `
      <div class="home-hero">
        <div class="home-hero-greeting">${Utils.greetingText()}${name ? ' · ' + Utils.esc(name) : ''}</div>
        <div class="home-hero-title">Bugün hazır mısın?</div>
        <div class="home-hero-sub">${new Date().toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' })}</div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">${streak}</div>
          <div class="stat-lbl">Seri 🔥</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${totalSets}</div>
          <div class="stat-lbl">Bugün set</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${weekCount}</div>
          <div class="stat-lbl">Bu hafta</div>
        </div>
      </div>

      ${todayExArr.length ? `
        <div class="section-header mt-4">
          <span class="section-title">Bugünkü Seans</span>
          <span class="section-action" style="font-size:12px;color:var(--txt-3);">${totalVol > 0 ? Math.round(totalVol) + ' kg hacim' : ''}</span>
        </div>
        <div class="today-exercises">
          ${todayExArr.map(ex => {
            const doneSets = (ex.allSets || []).filter(s => s.done).length;
            return `<div class="today-ex-row" onclick="Router.navigate('session-detail',{logId:'${todayLogs[0].id}'})">
              <div class="today-ex-icon">${ex.icon || '💪'}</div>
              <div class="today-ex-name">${Utils.esc(ex.name)}</div>
              <div class="today-ex-meta">${doneSets} set ✓</div>
            </div>`;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state" style="padding:var(--sp-6) var(--sp-4);">
          <div class="empty-state-icon">💪</div>
          <div class="empty-state-title">Bugün henüz antrenman yok</div>
          <div class="empty-state-sub">+ butonuna basarak egzersiz ekle</div>
        </div>`}

      ${topMuscles.length ? `
        <div class="section-header mt-3">
          <span class="section-title">Bu Hafta — Kas Seti</span>
        </div>
        <div class="muscle-week-strip">
          ${topMuscles.map(([bp, sets]) => {
            const c = CFG.BODY_COLORS[bp] || '#94A3B8';
            const pct = Math.round((sets / maxSets) * 100);
            return `<div class="muscle-week-row">
              <div class="muscle-week-name">${BODY_PART_LABELS[bp] || bp}</div>
              <div class="muscle-week-bar-wrap">
                <div class="muscle-week-bar" style="width:${pct}%;background:${c};"></div>
              </div>
              <div class="muscle-week-count">${sets}</div>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
    `;
  },

  _calcStreak(logs) {
    if (!logs.length) return 0;
    const days = new Set(logs.map(l => l.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (days.has(key)) streak++;
      else if (i > 0) break;
    }
    return streak;
  },
};

/* ── QuickLog — hızlı egzersiz+set girişi ─────── */
const QuickLog = {
  _open:        false,
  _cb:          null,
  _filter:      'Tümü',
  _search:      '',
  _side:        'front',
  _selBodyPart: null,
  _exercises:   [],
  _session:     null,  /* bugünkü devam eden seans */

  async show() {
    QuickLog._open   = true;
    QuickLog._filter = 'Tümü';
    QuickLog._search = '';
    QuickLog._selBodyPart = null;

    const overlay = document.getElementById('quick-log-overlay');
    overlay.classList.remove('hidden');

    QuickLog._exercises = await DB.getAll('exercises');

    /* Bugün için açık seans var mı? */
    const todayKey = Utils.todayKey();
    const allLogs  = await DB.getAll('logs');
    const todayLog = allLogs.find(l => l.date === todayKey);
    if (todayLog) {
      QuickLog._session = todayLog;
    } else {
      QuickLog._session = {
        id:        Utils.uid(),
        date:      todayKey,
        startTime: Date.now(),
        exercises: [],
        totalVolume: 0,
        muscleGroups: {},
      };
    }

    QuickLog._bindTabs();
    QuickLog._renderTab('search');
  },

  hide() {
    QuickLog._open = false;
    document.getElementById('quick-log-overlay').classList.add('hidden');
  },

  _bindTabs() {
    document.querySelectorAll('.qlog-tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.qlog-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        QuickLog._renderTab(btn.dataset.tab);
      };
    });
    document.getElementById('qlog-close').onclick = QuickLog.hide;
  },

  _renderTab(tab) {
    const cont = document.getElementById('qlog-tab-content');

    if (tab === 'search') {
      QuickLog._search = '';
      const cats = ['Tümü','Push','Pull','Legs','Core','Cardio','Esneklik'];
      cont.innerHTML = `
        <div class="overlay-search">
          <input type="search" id="qlog-search" class="search-input" placeholder="Egzersiz ara…">
        </div>
        <div class="category-chips" id="qlog-chips">
          ${cats.map(c => `<button class="chip ${c === 'Tümü' ? 'active' : ''}" data-cat="${Utils.esc(c)}">${c}</button>`).join('')}
        </div>
        <div class="overlay-list" id="qlog-list"></div>
      `;
      cont.querySelector('#qlog-search').oninput = e => {
        QuickLog._search = e.target.value.toLowerCase();
        QuickLog._renderExList();
      };
      cont.querySelectorAll('.chip').forEach(btn => {
        btn.onclick = () => {
          cont.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          QuickLog._filter = btn.dataset.cat;
          QuickLog._renderExList();
        };
      });
      QuickLog._renderExList();

    } else if (tab === 'body') {
      cont.innerHTML = `
        <div class="body-diagram-wrap">
          <div class="body-diagram-toggle">
            <button class="body-side-btn active" id="bsd-front">Ön</button>
            <button class="body-side-btn" id="bsd-back">Arka</button>
          </div>
          <div class="body-svg-wrap" id="body-svg-wrap"></div>
          <div class="muscle-legend" id="muscle-legend"></div>
        </div>
        <div class="overlay-list" id="qlog-body-list"></div>
      `;
      QuickLog._side = 'front';
      cont.querySelector('#bsd-front').onclick = () => { QuickLog._side = 'front'; QuickLog._refreshBodyDiagram(); };
      cont.querySelector('#bsd-back').onclick  = () => { QuickLog._side = 'back';  QuickLog._refreshBodyDiagram(); };
      QuickLog._refreshBodyDiagram();

    } else if (tab === 'recent') {
      const allLogs = DB.getAll('logs');
      cont.innerHTML = `<div class="overlay-list" id="qlog-recent-list"><div class="empty-state"><div class="empty-state-icon">⏱</div><div class="empty-state-title">Yükleniyor…</div></div></div>`;
      DB.getAll('logs').then(logs => {
        const sorted  = [...logs].sort((a, b) => b.startTime - a.startTime);
        const exIds   = [];
        const seen    = new Set();
        for (const log of sorted) {
          for (const ex of (log.exercises || [])) {
            if (!seen.has(ex.exerciseId)) { seen.add(ex.exerciseId); exIds.push(ex); }
          }
          if (exIds.length >= 20) break;
        }
        const listEl = cont.querySelector('#qlog-recent-list');
        if (!exIds.length) {
          listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏱</div><div class="empty-state-title">Henüz geçmiş yok</div></div>`;
          return;
        }
        listEl.innerHTML = exIds.map(ex => `
          <div class="exercise-card" onclick="QuickLog._openSetEntry('${ex.exerciseId}')">
            <div class="exercise-card-icon">${ex.icon || '💪'}</div>
            <div class="exercise-card-body">
              <div class="exercise-card-name">${Utils.esc(ex.name)}</div>
              <div class="exercise-card-sub">${Utils.esc(ex.muscleGroup || '')} · ${Utils.esc(ex.equipment || '')}</div>
            </div>
          </div>
        `).join('');
      });
    }
  },

  _renderExList() {
    const listEl = document.getElementById('qlog-list');
    if (!listEl) return;
    let list = QuickLog._exercises;
    if (QuickLog._filter !== 'Tümü') list = list.filter(e => e.category === QuickLog._filter);
    if (QuickLog._search) list = list.filter(e =>
      e.name.toLowerCase().includes(QuickLog._search) ||
      (e.nameTR || '').toLowerCase().includes(QuickLog._search) ||
      (e.muscleGroup || '').toLowerCase().includes(QuickLog._search)
    );
    if (!list.length) { listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Bulunamadı</div></div>`; return; }
    listEl.innerHTML = list.map(ex => `
      <div class="exercise-card" onclick="QuickLog._openSetEntry('${ex.id}')">
        <div class="exercise-card-icon">${ex.icon || '💪'}</div>
        <div class="exercise-card-body">
          <div class="exercise-card-name">${Utils.esc(ex.nameTR || ex.name)}</div>
          <div class="exercise-card-sub">${Utils.esc(ex.muscleGroup || '')} · ${Utils.esc(ex.equipment || '')}</div>
        </div>
      </div>
    `).join('');
  },

  _filterByBodyPart(bp) {
    QuickLog._selBodyPart = bp;
    QuickLog._refreshBodyDiagram();
    const listEl = document.getElementById('qlog-body-list');
    if (!listEl) return;
    const list = QuickLog._exercises.filter(e => e.bodyPart === bp);
    if (!list.length) { listEl.innerHTML = `<div style="padding:var(--sp-4);text-align:center;color:var(--txt-3);">Bu kas grubu için egzersiz bulunamadı</div>`; return; }
    listEl.innerHTML = `
      <div style="padding:var(--sp-3) var(--sp-4) var(--sp-1);font-size:12px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.5px;">${BODY_PART_LABELS[bp] || bp}</div>
      ${list.map(ex => `
        <div class="exercise-card" onclick="QuickLog._openSetEntry('${ex.id}')">
          <div class="exercise-card-icon">${ex.icon || '💪'}</div>
          <div class="exercise-card-body">
            <div class="exercise-card-name">${Utils.esc(ex.nameTR || ex.name)}</div>
            <div class="exercise-card-sub">${Utils.esc(ex.muscleGroup || '')} · ${Utils.esc(ex.equipment || '')}</div>
          </div>
        </div>
      `).join('')}
    `;
  },

  _refreshBodyDiagram() {
    const wrap = document.getElementById('body-svg-wrap');
    if (!wrap) return;

    /* Seçili parça vurgulu */
    const svgHtml = BodyDiagram.buildSVG(QuickLog._side, QuickLog._selBodyPart);
    wrap.innerHTML = svgHtml;

    /* Ön/arka toggle güncelle */
    const frontBtn = document.getElementById('bsd-front');
    const backBtn  = document.getElementById('bsd-back');
    if (frontBtn) { frontBtn.classList.toggle('active', QuickLog._side === 'front'); }
    if (backBtn)  { backBtn.classList.toggle('active', QuickLog._side === 'back'); }

    /* Legend chipsleri */
    const parts = QuickLog._side === 'front' ? BodyDiagram.FRONT_PARTS : BodyDiagram.BACK_PARTS;
    const legend = document.getElementById('muscle-legend');
    if (legend) {
      legend.innerHTML = parts.map(bp => {
        const c = CFG.BODY_COLORS[bp] || '#94A3B8';
        const active = QuickLog._selBodyPart === bp;
        return `<button class="muscle-chip ${active ? 'active' : ''}" 
          onclick="QuickLog._filterByBodyPart('${bp}')"
          style="${active ? `background:${c}22;color:${c};border-color:${c}60;` : ''}"
        >${BODY_PART_LABELS[bp] || bp}</button>`;
      }).join('');
    }
  },

  async _openSetEntry(exerciseId) {
    const ex = QuickLog._exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    SetEntry.open(ex, QuickLog._session, async () => {
      /* Seans kaydet */
      await QuickLog._saveSession();
      QuickLog.hide();
      Router.navigate('home');
    });
  },

  async _saveSession() {
    const session = QuickLog._session;
    if (!session) return;
    /* Toplam hacim hesapla */
    session.totalVolume = session.exercises.reduce((a, ex) =>
      a + Utils.totalVolume(ex.sets), 0
    );
    /* Kas grubu haritası */
    session.muscleGroups = {};
    for (const ex of session.exercises) {
      const bp = ex.bodyPart || 'other';
      const sets = (ex.sets || []).filter(s => s.done).length;
      session.muscleGroups[bp] = (session.muscleGroups[bp] || 0) + sets;
    }
    await DB.put('logs', session);
  },
};

/* ── SetEntry — set/tekrar/kilo girişi ────────── */
const SetEntry = {
  _ex:      null,
  _session: null,
  _sets:    [],
  _prevSets:[],
  _onDone:  null,

  async open(ex, session, onDone) {
    SetEntry._ex      = ex;
    SetEntry._session = session;
    SetEntry._onDone  = onDone;

    /* Mevcut seansta bu egzersiz varsa devam et */
    let exEntry = (session.exercises || []).find(e => e.exerciseId === ex.id);
    if (!exEntry) {
      exEntry = { exerciseId: ex.id, name: ex.nameTR || ex.name, muscleGroup: ex.muscleGroup, bodyPart: ex.bodyPart, icon: ex.icon, sets: [] };
      session.exercises = session.exercises || [];
      session.exercises.push(exEntry);
    }

    /* Önceki logdan ön doldurma */
    const allLogs = await DB.getAll('logs');
    const sorted  = [...allLogs].sort((a, b) => b.startTime - a.startTime);
    SetEntry._prevSets = [];
    for (const log of sorted) {
      const logEx = (log.exercises || []).find(e => e.exerciseId === ex.id);
      if (logEx) { SetEntry._prevSets = logEx.sets || []; break; }
    }

    /* Set dizisini başlat veya devam et */
    if (exEntry.sets.length > 0) {
      SetEntry._sets = exEntry.sets;
    } else {
      const prevDone = SetEntry._prevSets.filter(s => s.done);
      const initCount = prevDone.length || 3;
      SetEntry._sets = Array.from({ length: initCount }, (_, i) => ({
        reps:   String(prevDone[i]?.reps   || 10),
        weight: String(prevDone[i]?.weight || 0),
        done:   false,
      }));
      exEntry.sets = SetEntry._sets;
    }

    const overlay = document.getElementById('set-entry-overlay');
    document.getElementById('setentry-title').textContent = ex.nameTR || ex.name;
    overlay.classList.remove('hidden');
    document.getElementById('setentry-back').onclick = () => {
      overlay.classList.add('hidden');
    };

    SetEntry._render();
  },

  _render() {
    const cont = document.getElementById('setentry-content');
    const ex   = SetEntry._ex;

    cont.innerHTML = `
      <div style="background:var(--bg-2);border:1px solid var(--sep);border-radius:var(--r-lg);padding:var(--sp-4);margin-bottom:var(--sp-4);">
        <div style="font-size:12px;font-weight:700;color:var(--txt-3);text-transform:uppercase;letter-spacing:.5px;">${ex.category} · ${Utils.esc(ex.muscleGroup || '')}</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px;">${Utils.esc(ex.nameTR || ex.name)}</div>
      </div>
      <table class="set-table">
        <thead><tr>
          <th class="set-num">Set</th>
          <th>Önceki</th>
          <th>KG</th>
          <th>Tekrar</th>
          <th>✓</th>
        </tr></thead>
        <tbody id="setentry-tbody"></tbody>
      </table>
      <button class="add-set-btn" onclick="SetEntry._addSet()">＋ Set Ekle</button>
      <div style="height:80px;"></div>
    `;

    SetEntry._renderRows();

    /* Footer kaydet / iptal */
    let footer = document.getElementById('setentry-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'setentry-footer';
      footer.className = 'setentry-footer';
    }
    footer.innerHTML = `
      <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('set-entry-overlay').classList.add('hidden')">İptal</button>
      <button class="btn btn-gold" style="flex:2;" onclick="SetEntry._save()">Kaydet ✓</button>
    `;
    document.getElementById('set-entry-overlay').appendChild(footer);
  },

  _renderRows() {
    const tbody = document.getElementById('setentry-tbody');
    if (!tbody) return;
    tbody.innerHTML = SetEntry._sets.map((s, i) => {
      const prev = SetEntry._prevSets[i];
      const prevStr = prev ? `${prev.weight}×${prev.reps}` : '—';
      return `<tr class="${s.done ? 'set-done' : ''}" id="ser-row-${i}">
        <td class="set-num">${i + 1}</td>
        <td class="set-prev">${prevStr}</td>
        <td><input type="number" class="set-input" inputmode="decimal" value="${s.weight}" min="0" max="999" step="2.5"
          onchange="SetEntry._update(${i},'weight',this.value)"></td>
        <td><input type="number" class="set-input" inputmode="numeric" value="${s.reps}" min="0" max="999"
          onchange="SetEntry._update(${i},'reps',this.value)"></td>
        <td><button class="set-check-btn" onclick="SetEntry._toggle(${i})">${s.done ? '✓' : ''}</button></td>
      </tr>`;
    }).join('');
  },

  _update(i, field, val) {
    SetEntry._sets[i][field] = val;
    /* Seanstaki egzersiz setleri de güncellenir (referans) */
  },

  _toggle(i) {
    SetEntry._sets[i].done = !SetEntry._sets[i].done;
    const row = document.getElementById(`ser-row-${i}`);
    if (row) {
      row.classList.toggle('set-done', SetEntry._sets[i].done);
      const btn = row.querySelector('.set-check-btn');
      if (btn) btn.textContent = SetEntry._sets[i].done ? '✓' : '';
    }
    if (SetEntry._sets[i].done) {
      RestTimer.start(90, () => {
        if (i + 1 < SetEntry._sets.length) {
          const next = document.querySelector(`#ser-row-${i + 1} input`);
          if (next) next.focus();
        }
      });
    }
  },

  _addSet() {
    const last = SetEntry._sets[SetEntry._sets.length - 1] || {};
    SetEntry._sets.push({ weight: last.weight || '0', reps: last.reps || '10', done: false });
    SetEntry._renderRows();
  },

  async _save() {
    /* Seansı kaydet */
    if (SetEntry._onDone) await SetEntry._onDone();
    document.getElementById('set-entry-overlay').classList.add('hidden');
    Toast.show('Kaydedildi ✓', 'success');
    /* Ana sayfayı yenile */
    if (Router.currentRoute === 'home') {
      HomeScreen.render(document.getElementById('main-content'));
    }
  },
};

/* ── RestTimer ────────────────────────────────── */
const RestTimer = {
  _timer: null, _total: 90, _elapsed: 0, _onDone: null, _ctx: null,

  start(seconds, onDone) {
    RestTimer.stop();
    RestTimer._total   = seconds;
    RestTimer._elapsed = 0;
    RestTimer._onDone  = onDone;

    const overlay = document.getElementById('rest-overlay');
    overlay.classList.remove('hidden');

    overlay.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.sec) === seconds);
      btn.onclick = () => RestTimer.start(parseInt(btn.dataset.sec), RestTimer._onDone);
    });

    document.getElementById('rest-skip-btn').onclick   = () => RestTimer._finish();
    document.getElementById('rest-add30-btn').onclick  = () => { RestTimer._total += 30; RestTimer._update(); };

    RestTimer._update();
    RestTimer._timer = setInterval(() => {
      RestTimer._elapsed++;
      if (RestTimer._elapsed >= RestTimer._total) RestTimer._finish();
      else RestTimer._update();
    }, 1000);
  },

  _update() {
    const rem = Math.max(0, RestTimer._total - RestTimer._elapsed);
    const el  = document.getElementById('rest-countdown');
    if (el)   el.textContent = rem;
    const ring = document.getElementById('rest-ring-fg');
    if (ring) ring.style.strokeDashoffset = Utils.ringOffset(RestTimer._elapsed, RestTimer._total);
  },

  _finish() {
    RestTimer.stop();
    document.getElementById('rest-overlay').classList.add('hidden');
    RestTimer._beep();
    try { navigator.vibrate && navigator.vibrate([100, 50, 100]); } catch(e){}
    if (RestTimer._onDone) RestTimer._onDone();
  },

  stop() { if (RestTimer._timer) { clearInterval(RestTimer._timer); RestTimer._timer = null; } },

  _beep() {
    try {
      if (!RestTimer._ctx) RestTimer._ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = RestTimer._ctx;
      const play = (freq, t, dur) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + dur);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + dur + .05);
      };
      const go = () => { play(880,.0,.15); play(880,.18,.15); play(1100,.36,.25); };
      ctx.state === 'suspended' ? ctx.resume().then(go) : go();
    } catch(e){}
  },
};

/* ── HistoryScreen ────────────────────────────── */
const HistoryScreen = {
  _year:  new Date().getFullYear(),
  _month: new Date().getMonth(),
  _selDay: null,
  _logs: [],

  async render(container) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div></div>`;
    HistoryScreen._logs = await DB.getAll('logs');
    HistoryScreen._selDay = null;
    HistoryScreen._draw(container);
  },

  _draw(container) {
    const logs    = HistoryScreen._logs;
    const year    = HistoryScreen._year;
    const month   = HistoryScreen._month;
    const dayMap  = {}; /* 'YYYY-MM-DD' → log count */
    const volMap  = {};
    for (const l of logs) {
      dayMap[l.date] = (dayMap[l.date] || 0) + 1;
      volMap[l.date] = (volMap[l.date] || 0) + (l.totalVolume || 0);
    }

    const monthName  = new Date(year, month, 1).toLocaleDateString('tr-TR', { month:'long', year:'numeric' });
    const firstDay   = new Date(year, month, 1).getDay(); /* 0=Sun…6=Sat */
    const startOffset = (firstDay + 6) % 7; /* Mon-first */
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr   = Utils.todayKey();

    let calCells = '';
    for (let blank = 0; blank < startOffset; blank++) calCells += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cnt = dayMap[key] || 0;
      const intensity = cnt === 0 ? '' : cnt === 1 ? 'trained-1' : cnt === 2 ? 'trained-2' : cnt === 3 ? 'trained-3' : cnt === 4 ? 'trained-4' : 'trained-5';
      const isToday   = key === todayStr ? 'today' : '';
      const isSel     = key === HistoryScreen._selDay ? 'selected' : '';
      calCells += `<div class="cal-day ${intensity} ${isToday} ${isSel}" onclick="HistoryScreen._dayClick('${key}')">${d}</div>`;
    }

    /* Seçili gün veya tüm seans listesi */
    const filteredLogs = HistoryScreen._selDay
      ? logs.filter(l => l.date === HistoryScreen._selDay)
      : [...logs].sort((a, b) => b.startTime - a.startTime).slice(0, 30);

    container.innerHTML = `
      <div class="section-header"><span class="section-title">Takvim</span></div>
      <div class="calendar-wrap">
        <div class="calendar-header">
          <button class="calendar-nav-btn" onclick="HistoryScreen._prevMonth()">‹</button>
          <div class="calendar-month">${monthName}</div>
          <button class="calendar-nav-btn" onclick="HistoryScreen._nextMonth()">›</button>
        </div>
        <div class="cal-day-labels">
          ${['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d => `<div class="cal-day-label">${d}</div>`).join('')}
        </div>
        <div class="cal-grid">${calCells}</div>
      </div>

      <div class="section-header mt-3">
        <span class="section-title">${HistoryScreen._selDay ? Utils.formatDateShort(new Date(HistoryScreen._selDay)) : 'Son Seanslar'}</span>
        ${HistoryScreen._selDay ? `<button class="section-action" onclick="HistoryScreen._clearDay()">Tümü → </button>` : ''}
      </div>
      <div class="card-list">
        ${!filteredLogs.length ? `<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Bu gün için kayıt yok</div></div>` :
          filteredLogs.map(log => HistoryScreen._logCard(log)).join('')}
      </div>
    `;
  },

  _logCard(log) {
    const dur = Utils.formatTime(log.duration || 0);
    const setCount = (log.exercises || []).reduce((a, e) => a + (e.sets || []).filter(s => s.done).length, 0);
    const tags = Object.keys(log.muscleGroups || {}).slice(0, 4).map(bp =>
      `<span class="muscle-tag">${BODY_PART_LABELS[bp] || bp}</span>`
    ).join('');
    return `<div class="session-card" onclick="Router.navigate('session-detail',{logId:'${log.id}'})">
      <div class="session-card-date">${Utils.formatDate(log.startTime)}</div>
      <div class="session-card-title">${(log.exercises || []).length} egzersiz · ${setCount} set</div>
      <div class="session-card-stats">
        <span class="session-stat">⏱ <strong>${dur}</strong></span>
        <span class="session-stat">📦 <strong>${log.totalVolume || 0} kg</strong></span>
      </div>
      ${tags ? `<div class="session-muscle-tags">${tags}</div>` : ''}
    </div>`;
  },

  _dayClick(key) {
    HistoryScreen._selDay = key === HistoryScreen._selDay ? null : key;
    HistoryScreen._draw(document.getElementById('main-content'));
  },

  _clearDay() { HistoryScreen._selDay = null; HistoryScreen._draw(document.getElementById('main-content')); },

  _prevMonth() {
    if (HistoryScreen._month === 0) { HistoryScreen._month = 11; HistoryScreen._year--; }
    else HistoryScreen._month--;
    HistoryScreen._draw(document.getElementById('main-content'));
  },

  _nextMonth() {
    if (HistoryScreen._month === 11) { HistoryScreen._month = 0; HistoryScreen._year++; }
    else HistoryScreen._month++;
    HistoryScreen._draw(document.getElementById('main-content'));
  },
};

/* ── SessionDetail ────────────────────────────── */
const SessionDetail = {
  async render(container, params) {
    const log = await DB.get('logs', params.logId);
    if (!log) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Seans bulunamadı</div></div>`;
      return;
    }
    const doneSets = (log.exercises || []).reduce((a, e) => a + (e.sets || []).filter(s => s.done).length, 0);
    const tags = Object.keys(log.muscleGroups || {}).map(bp => {
      const c = CFG.BODY_COLORS[bp] || '#94A3B8';
      return `<span class="muscle-tag" style="background:${c}22;color:${c};border-color:${c}40;">${BODY_PART_LABELS[bp] || bp}</span>`;
    }).join('');

    container.innerHTML = `
      <div class="p-4">
        <div class="session-detail-header">
          <div style="font-size:13px;color:var(--txt-3);">${Utils.formatDate(log.startTime)}</div>
          <div class="session-detail-name">${(log.exercises || []).length} Egzersiz</div>
          ${tags ? `<div class="session-muscle-tags mt-2">${tags}</div>` : ''}
          <div class="session-detail-stats">
            <div>
              <div class="session-detail-stat-val">${Utils.formatTime(log.duration || 0)}</div>
              <div class="session-detail-stat-lbl">Süre</div>
            </div>
            <div>
              <div class="session-detail-stat-val">${Math.round(log.totalVolume || 0)}</div>
              <div class="session-detail-stat-lbl">kg Hacim</div>
            </div>
            <div>
              <div class="session-detail-stat-val">${doneSets}</div>
              <div class="session-detail-stat-lbl">Set ✓</div>
            </div>
          </div>
        </div>

        ${(log.exercises || []).map(ex => `
          <div class="card mt-3">
            <div style="font-size:16px;font-weight:700;margin-bottom:var(--sp-3);">
              ${ex.icon || '💪'} ${Utils.esc(ex.name)}
              <span style="font-size:12px;color:var(--txt-3);font-weight:400;margin-left:6px;">${Utils.esc(ex.muscleGroup || '')}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="font-size:11px;color:var(--txt-4);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">
                <th style="text-align:left;padding-bottom:8px;">Set</th>
                <th style="text-align:center;">KG</th>
                <th style="text-align:center;">Tekrar</th>
                <th style="text-align:center;">Hacim</th>
                <th style="text-align:center;">✓</th>
              </tr></thead>
              <tbody>
                ${(ex.sets || []).map((s, i) => `<tr style="${s.done ? 'background:var(--teal-dim);' : ''}border-bottom:1px solid var(--sep);">
                  <td style="padding:8px 0;font-size:13px;color:var(--txt-3);">${i + 1}</td>
                  <td style="text-align:center;font-size:15px;font-weight:700;">${s.weight}</td>
                  <td style="text-align:center;font-size:15px;font-weight:700;">${s.reps}</td>
                  <td style="text-align:center;font-size:13px;color:var(--txt-3);">${Math.round((parseFloat(s.weight)||0)*(parseInt(s.reps)||0))}</td>
                  <td style="text-align:center;">${s.done ? '<span style="color:var(--teal);">✓</span>' : '<span style="color:var(--txt-4);">—</span>'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <button class="btn btn-rose btn-block mt-4" onclick="SessionDetail._delete('${log.id}')">Seans Kaydını Sil</button>
      </div>
    `;
  },

  _delete(logId) {
    Modal.confirm('Seans Sil', 'Bu antrenman kaydını kalıcı olarak silmek istediğine emin misin?', async () => {
      await DB.delete('logs', logId);
      Toast.show('Silindi.', 'success');
      Router.navigate('history');
    });
  },
};

/* ── ProgressScreen ───────────────────────────── */
const ProgressScreen = {
  _bodyDiagramActive: false,
  _selPart: null,

  async render(container) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div></div>`;
    const [logs, allEx] = await Promise.all([DB.getAll('logs'), DB.getAll('exercises')]);
    const exMap = {};
    allEx.forEach(e => exMap[e.id] = e);

    const totalVol   = logs.reduce((a, l) => a + (l.totalVolume || 0), 0);
    const totalTime  = logs.reduce((a, l) => a + (l.duration || 0), 0);
    const avgDur     = logs.length ? Math.floor(totalTime / logs.length) : 0;
    const streak     = HomeScreen._calcStreak(logs);

    /* Haftalık kas seti */
    const muscleMap = await DB.weeklyMuscleSets();
    const maxSets   = Math.max(...Object.values(muscleMap), 1);

    /* Kişisel rekordlar */
    const prs = ProgressScreen._calcPRs(logs, exMap);

    container.innerHTML = `
      <div class="section-header"><span class="section-title">Genel</span></div>
      <div class="progress-stats">
        <div class="progress-stat">
          <div class="progress-stat-val">${logs.length}</div>
          <div class="progress-stat-lbl">Toplam Seans</div>
        </div>
        <div class="progress-stat">
          <div class="progress-stat-val">${totalVol >= 1000 ? (totalVol/1000).toFixed(1)+'t' : Math.round(totalVol)+'kg'}</div>
          <div class="progress-stat-lbl">Toplam Hacim</div>
        </div>
        <div class="progress-stat">
          <div class="progress-stat-val">${Utils.formatTime(avgDur)}</div>
          <div class="progress-stat-lbl">Ort. Süre</div>
        </div>
        <div class="progress-stat">
          <div class="progress-stat-val">${streak}</div>
          <div class="progress-stat-lbl">Güncel Seri</div>
        </div>
      </div>

      <div class="section-header mt-4"><span class="section-title">Bu Hafta — Kas Haritası</span></div>
      <div class="chart-card" style="display:flex;gap:16px;align-items:flex-start;">
        <div style="flex:0 0 130px;">
          <div style="display:flex;background:var(--bg-3);border-radius:var(--r-full);padding:3px;gap:3px;margin-bottom:12px;">
            <button class="body-side-btn active" id="prog-front" onclick="ProgressScreen._setSide('front')" style="flex:1;">Ön</button>
            <button class="body-side-btn" id="prog-back" onclick="ProgressScreen._setSide('back')" style="flex:1;">Arka</button>
          </div>
          <div id="prog-body-wrap"></div>
        </div>
        <div class="muscle-freq-table" style="flex:1;padding:0;">
          ${Object.entries(muscleMap).sort((a,b) => b[1]-a[1]).map(([bp, sets]) => {
            const c = CFG.BODY_COLORS[bp] || '#94A3B8';
            const pct = Math.round((sets / maxSets) * 100);
            return `<div class="muscle-freq-row">
              <div class="muscle-freq-name">${BODY_PART_LABELS[bp] || bp}</div>
              <div class="muscle-freq-bar-wrap"><div class="muscle-freq-bar" style="width:${pct}%;background:${c};"></div></div>
              <div class="muscle-freq-count">${sets}</div>
            </div>`;
          }).join('') || '<div style="color:var(--txt-3);font-size:13px;padding:8px 0;">Bu hafta veri yok</div>'}
        </div>
      </div>

      <div class="section-header mt-4"><span class="section-title">Son 30 Gün Hacim</span></div>
      <div class="chart-card">
        <canvas id="volume-chart" class="bar-chart" height="120"></canvas>
      </div>

      ${prs.length ? `
      <div class="section-header mt-4"><span class="section-title">Kişisel Rekordlar</span></div>
      <div class="card-list" style="padding-top:0;">
        ${prs.slice(0, 12).map(pr => `
          <div class="pr-item">
            <div class="pr-name">${Utils.esc(pr.name)}</div>
            <div class="pr-val">${pr.weight} kg × ${pr.reps}</div>
          </div>
        `).join('')}
      </div>` : ''}
    `;

    ProgressScreen._bodyDiagramActive = true;
    ProgressScreen._side = 'front';
    ProgressScreen._drawBody(muscleMap);
    ProgressScreen._drawVolumeChart(logs);
  },

  _side: 'front',
  _setSide(side) {
    ProgressScreen._side = side;
    document.getElementById('prog-front')?.classList.toggle('active', side === 'front');
    document.getElementById('prog-back')?.classList.toggle('active', side === 'back');
    DB.weeklyMuscleSets().then(m => ProgressScreen._drawBody(m));
  },

  _drawBody(muscleMap) {
    const wrap = document.getElementById('prog-body-wrap');
    if (!wrap) return;
    wrap.innerHTML = BodyDiagram.buildSVG(ProgressScreen._side, null, muscleMap);
  },

  _calcPRs(logs, exMap) {
    const best = {};
    for (const log of logs) {
      for (const ex of (log.exercises || [])) {
        for (const s of (ex.sets || [])) {
          if (!s.done) continue;
          const vol = (parseFloat(s.weight)||0) * (parseInt(s.reps)||0);
          if (!best[ex.exerciseId] || vol > best[ex.exerciseId].vol) {
            best[ex.exerciseId] = { weight: s.weight, reps: s.reps, vol };
          }
        }
      }
    }
    return Object.entries(best).map(([id, v]) => ({
      name:   (exMap[id] || {}).nameTR || (exMap[id] || {}).name || id,
      weight: v.weight, reps: v.reps,
    })).sort((a, b) => (b.weight * b.reps) - (a.weight * a.reps));
  },

  _drawVolumeChart(logs) {
    const canvas = document.getElementById('volume-chart');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.parentElement.clientWidth - 40;
    const H   = 120;
    canvas.width  = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const data = [], labels = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const vol = logs.filter(l => l.date === key).reduce((a, l) => a + (l.totalVolume || 0), 0);
      data.push(vol);
      labels.push(i % 5 === 0 ? d.getDate() + '/' + (d.getMonth()+1) : '');
    }
    const maxV = Math.max(...data, 1);
    const bw   = W / data.length;
    const padY = 10; const chartH = H - padY - 18;
    ctx.clearRect(0, 0, W, H);
    data.forEach((val, i) => {
      const barH = (val / maxV) * chartH;
      const x = i * bw + bw * .15; const y = padY + chartH - barH; const bbw = bw * .7;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#E8C268'); grad.addColorStop(1, '#D4A84344');
      ctx.fillStyle = val > 0 ? grad : '#243040';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bbw, Math.max(barH, 2), 3);
      else ctx.rect(x, y, bbw, Math.max(barH, 2));
      ctx.fill();
      if (labels[i]) {
        ctx.fillStyle = 'rgba(238,242,255,.3)'; ctx.font = '9px -apple-system,sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(labels[i], i * bw + bw / 2, H - 2);
      }
    });
  },
};

/* ── SettingsScreen ───────────────────────────── */
const SettingsScreen = {
  async render(container) {
    const [name, weight, height, notifEnabled, notifTime] = await Promise.all([
      DB.getSetting('userName', ''),
      DB.getSetting('bodyWeight', ''),
      DB.getSetting('bodyHeight', ''),
      DB.getSetting('notifEnabled', false),
      DB.getSetting('notifTime', '08:00'),
    ]);

    container.innerHTML = `
      <div class="section-header"><span class="section-title">Profil</span></div>
      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">İsim</div>
            <div class="settings-row-sub">${name ? Utils.esc(name) : 'Girilmedi'}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn" data-key="userName" data-label="İsim" data-type="text">Düzenle</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">Vücut Ağırlığı</div>
            <div class="settings-row-sub">${weight ? weight + ' kg' : 'Girilmedi'}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn" data-key="bodyWeight" data-label="Vücut Ağırlığı (kg)" data-type="number">Düzenle</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">Boy</div>
            <div class="settings-row-sub">${height ? height + ' cm' : 'Girilmedi'}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn" data-key="bodyHeight" data-label="Boy (cm)" data-type="number">Düzenle</button>
        </div>
      </div>

      <div class="section-header mt-3"><span class="section-title">Bildirimler</span></div>
      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">Günlük Hatırlatıcı</div>
            <div class="settings-row-sub">Antrenman zamanı hatırlatması</div>
          </div>
          <button class="toggle ${notifEnabled ? 'on' : ''}" id="notif-toggle" onclick="SettingsScreen._toggleNotif(this)"></button>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">Hatırlatma Saati</div>
            <div class="settings-row-sub">${notifTime}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn" data-key="notifTime" data-label="Hatırlatma Saati" data-type="time">Düzenle</button>
        </div>
      </div>

      <div class="section-header mt-3"><span class="section-title">Veri</span></div>
      <div class="settings-section">
        <div class="settings-row" onclick="SettingsScreen._export()">
          <div class="settings-row-label">
            <div class="settings-row-title">Verileri Dışa Aktar</div>
            <div class="settings-row-sub">JSON formatında indir</div>
          </div>
          <span class="settings-row-value">›</span>
        </div>
        <div class="settings-row" onclick="SettingsScreen._reset()">
          <div class="settings-row-label">
            <div class="settings-row-title" style="color:var(--rose);">Tüm Verileri Sıfırla</div>
            <div class="settings-row-sub">Tüm loglar silinir</div>
          </div>
          <span class="settings-row-value">›</span>
        </div>
      </div>

      <div style="text-align:center;padding:32px 16px;color:var(--txt-4);font-size:12px;">FitTrack v2.0 · PWA · IndexedDB</div>
    `;

    container.querySelectorAll('.settings-edit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cur = await DB.getSetting(btn.dataset.key, '');
        SettingsScreen._edit(btn.dataset.key, btn.dataset.label, btn.dataset.type, cur);
      });
    });
  },

  _edit(key, label, type, current) {
    Modal.show({ title: label + ' Düzenle', message: '', centered: true, actions: [] });
    const prevInput = document.getElementById('settings-edit-input');
    if (prevInput) prevInput.remove();
    const inp = document.createElement('input');
    inp.type = type || 'text'; inp.id = 'settings-edit-input';
    inp.className = 'form-input'; inp.value = current || '';
    inp.style.marginBottom = '16px';
    const actEl = document.getElementById('modal-actions');
    actEl.parentNode.insertBefore(inp, actEl);
    actEl.innerHTML = '';
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost btn-block'; cancel.textContent = 'İptal';
    cancel.onclick = Modal.hide;
    const save = document.createElement('button');
    save.className = 'btn btn-gold btn-block'; save.textContent = 'Kaydet';
    save.onclick = async () => {
      const val = document.getElementById('settings-edit-input')?.value.trim();
      await DB.setSetting(key, val); Modal.hide();
      Toast.show('Kaydedildi ✓', 'success');
      SettingsScreen.render(document.getElementById('main-content'));
    };
    actEl.appendChild(cancel); actEl.appendChild(save);
    inp.focus();
  },

  async _toggleNotif(btn) {
    const on = !btn.classList.contains('on');
    btn.classList.toggle('on', on);
    await DB.setSetting('notifEnabled', on);
    if (on && 'Notification' in window) {
      try {
        const p = await Notification.requestPermission();
        if (p !== 'granted') {
          Toast.show('Bildirim izni verilmedi.', 'error', 4000);
          btn.classList.remove('on');
          await DB.setSetting('notifEnabled', false);
        } else { Toast.show('Bildirimler etkinleştirildi ✓', 'success'); }
      } catch(e) { Toast.show('iOS Safari bildirimleri desteklemiyor olabilir.', 'error', 4000); }
    }
  },

  async _export() {
    const [logs, settings] = await Promise.all([DB.getAll('logs'), DB.getAll('settings')]);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), logs, settings }, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fittrack-backup-${Utils.todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
    Toast.show('Dışa aktarıldı ✓', 'success');
  },

  _reset() {
    Modal.confirm('Verileri Sıfırla', 'TÜM antrenman loglarınız silinecek. Bu işlem geri alınamaz!', async () => {
      const db = DB._db;
      const tx = db.transaction(['logs', 'settings'], 'readwrite');
      tx.objectStore('logs').clear(); tx.objectStore('settings').clear();
      tx.oncomplete = () => { Toast.show('Veriler sıfırlandı.', 'success'); SettingsScreen.render(document.getElementById('main-content')); };
    });
  },
};

/* ── Spacing helper ───────────────────────────── */
function _sp(n) {
  const m = { 1:'4px',2:'8px',3:'12px',4:'16px',5:'20px',6:'24px',8:'32px',10:'40px' };
  return m[n] || n + 'px';
}

/* ── App ──────────────────────────────────────── */
const App = {
  async init() {
    try {
      await DB.open();
      await DB.seedIfEmpty();

      /* Tab tıklamaları */
      document.querySelectorAll('.tab-btn[data-route]').forEach(btn => {
        btn.addEventListener('click', () => Router.navigate(btn.dataset.route));
      });

      /* + butonu */
      document.getElementById('tab-add-btn').addEventListener('click', () => QuickLog.show());

      /* Modal dışı tıklama */
      document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-overlay')) Modal.hide();
      });

      Router.navigate('home');
    } catch (err) {
      console.error('[FitTrack] Init hatası:', err);
      document.getElementById('main-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-title">Başlatma Hatası</div>
          <div class="empty-state-sub">${err.message || 'Bilinmeyen hata'}</div>
        </div>`;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
