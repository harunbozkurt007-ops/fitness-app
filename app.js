/* ═══════════════════════════════════════════════════════════
   FitTrack — app.js
   Tüm uygulama mantığı — Pure JS, framework yok
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   CFG — Sabitler
   ────────────────────────────────────────────── */
const CFG = {
  DB_NAME:    'fittrack-db',
  DB_VERSION: 1,
  APP_NAME:   'FitTrack',

  DAYS: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  DAYS_FULL: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],

  CATEGORY_COLORS: {
    'Push':      '#FF9F0A',
    'Pull':      '#0A84FF',
    'Legs':      '#30D158',
    'Core':      '#FFD60A',
    'Full Body': '#BF5AF2',
    'Cardio':    '#FF375F',
    'Esneklik':  '#64D2FF'
  },

  CATEGORY_BADGE: {
    'Push':      'badge-push',
    'Pull':      'badge-pull',
    'Legs':      'badge-legs',
    'Core':      'badge-core',
    'Full Body': 'badge-fullbody',
    'Cardio':    'badge-cardio',
    'Esneklik':  'badge-esneklik'
  }
};

/* ──────────────────────────────────────────────
   DB — IndexedDB Soyutlama Katmanı
   ────────────────────────────────────────────── */
const DB = {
  _db: null,

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CFG.DB_NAME, CFG.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // exercises store
        if (!db.objectStoreNames.contains('exercises')) {
          const exStore = db.createObjectStore('exercises', { keyPath: 'id' });
          exStore.createIndex('category', 'category', { unique: false });
          exStore.createIndex('muscleGroup', 'muscleGroup', { unique: false });
        }

        // workouts store
        if (!db.objectStoreNames.contains('workouts')) {
          const wStore = db.createObjectStore('workouts', { keyPath: 'id' });
          wStore.createIndex('createdAt', 'createdAt', { unique: false });
          wStore.createIndex('category', 'category', { unique: false });
        }

        // programs store
        if (!db.objectStoreNames.contains('programs')) {
          db.createObjectStore('programs', { keyPath: 'id' });
        }

        // logs store
        if (!db.objectStoreNames.contains('logs')) {
          const lStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: false });
          lStore.createIndex('date', 'date', { unique: false });
          lStore.createIndex('workoutId', 'workoutId', { unique: false });
        }

        // settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => { DB._db = e.target.result; resolve(); };
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  _tx(store, mode = 'readonly') {
    return DB._db.transaction(store, mode).objectStore(store);
  },

  _promReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  getAll(store, index = null, keyRange = null) {
    const os = DB._tx(store);
    const source = index ? os.index(index) : os;
    const req = keyRange ? source.getAll(keyRange) : source.getAll();
    return DB._promReq(req);
  },

  get(store, key) {
    return DB._promReq(DB._tx(store).get(key));
  },

  put(store, record) {
    return DB._promReq(DB._tx(store, 'readwrite').put(record));
  },

  delete(store, key) {
    return DB._promReq(DB._tx(store, 'readwrite').delete(key));
  },

  getSetting(key, defaultVal = null) {
    return DB.get('settings', key).then(r => r ? r.value : defaultVal);
  },

  setSetting(key, value) {
    return DB.put('settings', { key, value });
  },

  /* IndexedDB'yi tüm exercises + workouts ile seed et */
  async seedIfEmpty() {
    const existing = await DB.getAll('exercises');
    if (existing.length > 0) return;

    const tx = DB._db.transaction(['exercises', 'workouts'], 'readwrite');
    const exStore = tx.objectStore('exercises');
    const wStore  = tx.objectStore('workouts');

    for (const ex of EXERCISE_DATA) {
      exStore.put(ex);
    }

    const now = Date.now();
    for (const wt of WORKOUT_TEMPLATES) {
      wStore.put({ ...wt, createdAt: now, updatedAt: now, isTemplate: true });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }
};

/* ──────────────────────────────────────────────
   Utils — Yardımcı Fonksiyonlar
   ────────────────────────────────────────────── */
const Utils = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatDateShort(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  },

  todayKey() {
    return new Date().toISOString().split('T')[0];
  },

  dayOfWeek() {
    // 0=Pzt, 6=Paz  (JS: 0=Paz, 1=Pzt, ...)
    return (new Date().getDay() + 6) % 7;
  },

  greetingText() {
    const h = new Date().getHours();
    if (h < 6)  return 'Gece geç 🌙';
    if (h < 12) return 'Günaydın ☀️';
    if (h < 18) return 'İyi günler 💫';
    return 'İyi akşamlar 🌆';
  },

  truncate(str, max = 28) {
    return str && str.length > max ? str.slice(0, max) + '…' : str;
  },

  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  totalVolume(sets) {
    return sets.filter(s => s.done).reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
  },

  /* SVG Rest Ring circumference helper */
  ringOffset(elapsed, total) {
    const CIRC = 327; // 2π × 52
    const frac = Utils.clamp(1 - elapsed / total, 0, 1);
    return CIRC * (1 - frac);
  },

  esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};

/* ──────────────────────────────────────────────
   Toast
   ────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', dur = 2600) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), dur);
  }
};

/* ──────────────────────────────────────────────
   Modal
   ────────────────────────────────────────────── */
const Modal = {
  show({ title, message, actions = [], centered = false }) {
    const overlay = document.getElementById('modal-overlay');
    const card    = document.getElementById('modal-card');
    document.getElementById('modal-title').textContent   = title || '';
    document.getElementById('modal-message').textContent = message || '';

    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = `btn ${a.class || 'btn-secondary'} btn-block`;
      btn.textContent = a.label;
      btn.onclick = () => { Modal.hide(); if (a.handler) a.handler(); };
      actionsEl.appendChild(btn);
    });

    overlay.classList.toggle('centered', centered);
    overlay.classList.remove('hidden');
    card.style.animation = 'none';
    card.offsetHeight; // reflow
    card.style.animation = '';
  },

  hide() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  confirm(title, message, onConfirm) {
    Modal.show({
      title, message,
      actions: [
        { label: 'Vazgeç', class: 'btn-ghost' },
        { label: 'Onayla', class: 'btn-danger', handler: onConfirm }
      ]
    });
  }
};

/* ──────────────────────────────────────────────
   Router — Hash-based SPA
   ────────────────────────────────────────────── */
const Router = {
  _history: [],
  _params: {},

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
    const last = Router._history[Router._history.length - 1];
    return last ? last.route : 'home';
  },

  get params() { return Router._params; },

  _render(route, params) {
    const main    = document.getElementById('main-content');
    const header  = document.getElementById('app-header');
    const tabBar  = document.getElementById('tab-bar');
    const backBtn = document.getElementById('header-back');
    const actionsEl = document.getElementById('header-actions');
    const titleEl   = document.getElementById('header-title');

    // Resetle
    backBtn.classList.add('hidden');
    actionsEl.innerHTML = '';

    // Tab bar'ı aktif antrenman sırasında gizle
    if (route === 'active') {
      tabBar.classList.add('hidden');
    } else {
      tabBar.classList.remove('hidden');
    }

    // Geri butonu — tab kökleri dışında göster
    const rootRoutes = ['home', 'workouts', 'progress', 'settings'];
    if (!rootRoutes.includes(route)) {
      backBtn.classList.remove('hidden');
      backBtn.onclick = () => Router.back();
    }

    // Ekran render et
    main.innerHTML = '';
    main.className = 'main-content screen-enter';

    switch (route) {
      case 'home':
        titleEl.textContent = 'FitTrack';
        HomeScreen.render(main);
        break;
      case 'workouts':
        titleEl.textContent = 'Antrenmanlar';
        WorkoutLibrary.render(main, actionsEl);
        break;
      case 'workout-detail':
        titleEl.textContent = 'Antrenman';
        WorkoutDetail.render(main, params, actionsEl);
        break;
      case 'builder':
        titleEl.textContent = params.id ? 'Düzenle' : 'Yeni Antrenman';
        WorkoutBuilder.render(main, params, actionsEl);
        break;
      case 'exercises':
        titleEl.textContent = 'Egzersizler';
        ExerciseBrowser.render(main);
        break;
      case 'active':
        titleEl.textContent = 'Antrenman';
        ActiveWorkout.render(main, actionsEl);
        break;
      case 'progress':
        titleEl.textContent = 'İlerleme';
        ProgressScreen.render(main);
        break;
      case 'log-detail':
        titleEl.textContent = 'Antrenman Detayı';
        LogDetail.render(main, params);
        break;
      case 'settings':
        titleEl.textContent = 'Ayarlar';
        SettingsScreen.render(main);
        break;
      default:
        titleEl.textContent = 'FitTrack';
        HomeScreen.render(main);
    }
  },

  _updateTabBar(route) {
    const tabMap = { home: 'home', workouts: 'workouts', progress: 'progress', settings: 'settings' };
    const activeTab = tabMap[route] || null;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === activeTab);
      btn.setAttribute('aria-selected', btn.dataset.route === activeTab);
    });
  }
};

/* ──────────────────────────────────────────────
   HomeScreen
   ────────────────────────────────────────────── */
const HomeScreen = {
  async render(container) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div></div>';

    const [settings, allLogs, program, allWorkouts] = await Promise.all([
      DB.getAll('settings').then(rows => {
        const map = {};
        rows.forEach(r => map[r.key] = r.value);
        return map;
      }),
      DB.getAll('logs'),
      DB.getSetting('activeProgram'),
      DB.getAll('workouts')
    ]);

    const name = settings['userName'] || '';

    // Son 30 gün streak hesapla
    const streak = HomeScreen._calcStreak(allLogs);
    const totalWorkouts = allLogs.length;
    const weeklyCount = allLogs.filter(l => {
      const diff = Date.now() - l.startTime;
      return diff < 7 * 24 * 3600 * 1000;
    }).length;

    // Bugün için antrenman bul
    const todayWorkout = HomeScreen._getTodayWorkout(program, allWorkouts);

    container.innerHTML = `
      <div class="home-hero">
        <div class="home-hero-greeting">${Utils.greetingText()}</div>
        <div class="home-hero-title">${name ? Utils.esc(name) + '! 👋' : 'Bugün hazır mısın?'}</div>
        <div class="home-hero-subtitle">${Utils.formatDate(Date.now())}</div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-card-value">${streak}</div>
          <div class="stat-card-label">Seri 🔥</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${totalWorkouts}</div>
          <div class="stat-card-label">Toplam</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${weeklyCount}</div>
          <div class="stat-card-label">Bu Hafta</div>
        </div>
      </div>

      <div class="section-header">
        <span class="section-title">Bugün</span>
      </div>
      <div id="today-section"></div>

      ${allLogs.length > 0 ? `
      <div class="section-header">
        <span class="section-title">Son Antrenmanlar</span>
        <button class="section-action" onclick="Router.navigate('progress')">Tümü →</button>
      </div>
      <div class="card-list" id="recent-list"></div>
      ` : ''}
    `;

    // Bugün bölümü
    const todaySection = container.querySelector('#today-section');
    if (todayWorkout) {
      const exCount = todayWorkout.exercises ? todayWorkout.exercises.length : 0;
      todaySection.innerHTML = `
        <div class="today-workout-card" onclick="WorkoutDetail.open('${Utils.esc(todayWorkout.id)}')">
          <div class="today-badge">BUGÜNÜN ANTRENMANINIZ</div>
          <div class="today-workout-name">${Utils.esc(todayWorkout.name)}</div>
          <div class="today-workout-meta">${exCount} egzersiz · ${Utils.esc(todayWorkout.difficulty || 'Orta')}</div>
          <button class="btn btn-primary today-start-btn" onclick="event.stopPropagation(); ActiveWorkout.start('${Utils.esc(todayWorkout.id)}')">
            ▶ Antrenmanı Başlat
          </button>
        </div>
      `;
    } else {
      todaySection.innerHTML = `
        <div class="rest-day-card">
          <div class="rest-day-icon">😴</div>
          <div class="rest-day-title">Dinlenme Günü</div>
          <div class="rest-day-sub">Bugün için program yok.<br>Veya hızlı bir antrenman başlat.</div>
          <button class="btn btn-secondary mt-4" style="width:100%;" onclick="Router.navigate('workouts')">
            Antrenman Seç
          </button>
        </div>
      `;
    }

    // Son antrenmanlar
    const recentList = container.querySelector('#recent-list');
    if (recentList && allLogs.length > 0) {
      const recent = [...allLogs].sort((a, b) => b.startTime - a.startTime).slice(0, 3);
      recentList.innerHTML = recent.map(log => `
        <div class="log-card" onclick="Router.navigate('log-detail', {logId:'${log.id}'})">
          <div class="log-card-date">${Utils.formatDate(log.startTime)}</div>
          <div class="log-card-name">${Utils.esc(log.workoutName)}</div>
          <div class="log-card-stats">
            <span class="log-card-stat">⏱ <strong>${Utils.formatTime(log.duration || 0)}</strong></span>
            <span class="log-card-stat">🔁 <strong>${log.exercises ? log.exercises.length : 0} egz.</strong></span>
            <span class="log-card-stat">📦 <strong>${Math.round(log.totalVolume || 0)} kg</strong></span>
          </div>
        </div>
      `).join('');
    }
  },

  _calcStreak(logs) {
    if (!logs.length) return 0;
    const days = new Set(logs.map(l => new Date(l.startTime).toISOString().split('T')[0]));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (days.has(key)) { streak++; }
      else if (i > 0) { break; }
    }
    return streak;
  },

  _getTodayWorkout(program, allWorkouts) {
    if (!program || !program.schedule) return null;
    const dow = Utils.dayOfWeek(); // 0=Pzt
    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    const wId = program.schedule[days[dow]];
    if (!wId) return null;
    return allWorkouts.find(w => w.id === wId) || null;
  }
};

/* ──────────────────────────────────────────────
   WorkoutLibrary
   ────────────────────────────────────────────── */
const WorkoutLibrary = {
  async render(container, actionsEl) {
    // + Yeni butonu
    actionsEl.innerHTML = `<button class="btn-icon" title="Yeni Antrenman" onclick="Router.navigate('builder', {})">＋</button>`;

    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div></div>';
    const workouts = await DB.getAll('workouts');

    const categories = ['Tümü', 'Push', 'Pull', 'Legs', 'Core', 'Full Body', 'Cardio', 'Esneklik'];

    container.innerHTML = `
      <div class="category-chips" id="wl-chips"></div>
      <div class="card-list" id="wl-list"></div>
    `;

    WorkoutLibrary._filter = 'Tümü';
    WorkoutLibrary._workouts = workouts;

    const chipsEl = container.querySelector('#wl-chips');
    chipsEl.innerHTML = categories.map(cat => `
      <button class="chip ${cat === 'Tümü' ? 'active' : ''}" data-cat="${Utils.esc(cat)}">${Utils.esc(cat)}</button>
    `).join('');

    chipsEl.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        chipsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        WorkoutLibrary._filter = btn.dataset.cat;
        WorkoutLibrary._renderList(container.querySelector('#wl-list'));
      });
    });

    WorkoutLibrary._renderList(container.querySelector('#wl-list'));
  },

  _renderList(listEl) {
    const filtered = WorkoutLibrary._filter === 'Tümü'
      ? WorkoutLibrary._workouts
      : WorkoutLibrary._workouts.filter(w => w.category === WorkoutLibrary._filter);

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💪</div>
          <div class="empty-state-title">Antrenman Yok</div>
          <div class="empty-state-sub">Bu kategoride antrenman bulunamadı.</div>
          <button class="btn btn-primary mt-4" onclick="Router.navigate('builder', {})">Oluştur</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(w => {
      const exCount = w.exercises ? w.exercises.length : 0;
      const bg = CFG.CATEGORY_COLORS[w.category] || '#FF9F0A';
      return `
        <div class="workout-card" onclick="WorkoutDetail.open('${w.id}')">
          <div class="workout-card-icon" style="background:${bg}22">
            <span>${w.icon || '💪'}</span>
          </div>
          <div class="workout-card-body">
            <div class="workout-card-name">${Utils.esc(w.name)}</div>
            <div class="workout-card-meta">
              <span class="badge ${CFG.CATEGORY_BADGE[w.category] || 'badge-push'}">${Utils.esc(w.category)}</span>
              &nbsp;${exCount} egzersiz · ${Utils.esc(w.difficulty || 'Orta')}
            </div>
          </div>
          <span class="workout-card-chevron">›</span>
        </div>
      `;
    }).join('');
  }
};

/* ──────────────────────────────────────────────
   WorkoutDetail
   ────────────────────────────────────────────── */
const WorkoutDetail = {
  open(workoutId) {
    Router.navigate('workout-detail', { workoutId });
  },

  async render(container, params, actionsEl) {
    const { workoutId } = params;
    const workout = await DB.get('workouts', workoutId);
    if (!workout) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Bulunamadı</div></div>';
      return;
    }

    actionsEl.innerHTML = `
      <button class="btn-icon" onclick="Router.navigate('builder', {id:'${workoutId}'})">✏️</button>
    `;

    // Egzersizleri DB'den çek
    const exIds = (workout.exercises || []).map(e => e.exerciseId);
    const allEx = await DB.getAll('exercises');
    const exMap = {};
    allEx.forEach(e => exMap[e.id] = e);

    const bg = CFG.CATEGORY_COLORS[workout.category] || '#FF9F0A';

    container.innerHTML = `
      <div style="margin:${_sp(4)}; background:linear-gradient(135deg, ${bg} 0%, ${bg}99 100%); border-radius:var(--r-xl); padding:${_sp(5)};">
        <div style="font-size:36px;">${workout.icon || '💪'}</div>
        <div style="font-size:22px; font-weight:700; margin-top:${_sp(2)};">${Utils.esc(workout.name)}</div>
        <div style="font-size:14px; color:rgba(255,255,255,.8); margin-top:${_sp(1)};">
          ${Utils.esc(workout.category)} · ${Utils.esc(workout.difficulty || 'Orta')} · ${(workout.exercises||[]).length} egzersiz
        </div>
      </div>

      <div class="section-header">
        <span class="section-title">Egzersizler</span>
      </div>
      <div class="card-list">
        ${(workout.exercises || []).map((ex, i) => {
          const exData = exMap[ex.exerciseId] || {};
          return `
            <div class="exercise-card" style="cursor:default;">
              <div class="exercise-card-icon">${exData.icon || '💪'}</div>
              <div class="exercise-card-body">
                <div class="exercise-card-name">${Utils.esc(exData.name || ex.exerciseId)}</div>
                <div class="exercise-card-sub">
                  ${ex.targetSets} set × ${ex.targetReps} tekrar
                  · Dinlenme: ${ex.restSec}s
                </div>
              </div>
              <span style="color:var(--text-tertiary);font-size:13px;">${i+1}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="padding:${_sp(4)}; display:flex; flex-direction:column; gap:${_sp(3)};">
        <button class="btn btn-primary btn-block" onclick="ActiveWorkout.start('${workoutId}')">
          ▶ Antrenmanı Başlat
        </button>
        <button class="btn btn-ghost btn-block" onclick="WorkoutDetail._deleteWorkout('${workoutId}')">
          Sil
        </button>
      </div>
    `;
  },

  async _deleteWorkout(workoutId) {
    Modal.confirm('Antrenmanı Sil', 'Bu antrenmanı silmek istediğine emin misin?', async () => {
      await DB.delete('workouts', workoutId);
      Toast.show('Antrenman silindi.', 'success');
      Router.navigate('workouts');
    });
  }
};

/* ──────────────────────────────────────────────
   WorkoutBuilder — Antrenman oluştur / düzenle
   ────────────────────────────────────────────── */
const WorkoutBuilder = {
  _workout: null,
  _exercises: [], // egzersiz listesi: {exerciseId, targetSets, targetReps, restSec, notes}
  _allEx: [],

  async render(container, params, actionsEl) {
    WorkoutBuilder._allEx = await DB.getAll('exercises');

    if (params.id) {
      const w = await DB.get('workouts', params.id);
      WorkoutBuilder._workout = w ? { ...w } : null;
      WorkoutBuilder._exercises = w ? [...(w.exercises || []).map(e => ({...e}))] : [];
    } else {
      WorkoutBuilder._workout = null;
      WorkoutBuilder._exercises = [];
    }

    actionsEl.innerHTML = `<button class="btn btn-primary btn-sm" onclick="WorkoutBuilder.save()">Kaydet</button>`;

    WorkoutBuilder._renderForm(container);
  },

  _renderForm(container) {
    const w = WorkoutBuilder._workout;
    const categories = ['Push', 'Pull', 'Legs', 'Core', 'Full Body', 'Cardio', 'Esneklik'];
    const difficulties = ['Başlangıç', 'Orta', 'Zor'];

    container.innerHTML = `
      <div class="p-4" style="display:flex;flex-direction:column;gap:${_sp(4)};">
        <div class="form-section">
          <div class="form-group">
            <label class="form-label">Antrenman Adı</label>
            <input type="text" id="wb-name" class="form-input" placeholder="Örn: Push Day A" value="${Utils.esc(w ? w.name : '')}" maxlength="40">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:${_sp(3)};">
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select id="wb-category" class="form-select">
                ${categories.map(c => `<option value="${c}" ${w && w.category===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Zorluk</label>
              <select id="wb-difficulty" class="form-select">
                ${difficulties.map(d => `<option value="${d}" ${w && w.difficulty===d?'selected':''}>${d}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="section-header" style="padding:0;">
          <span class="section-title" style="font-size:17px;">Egzersizler</span>
        </div>

        <div id="wb-exercise-list" style="display:flex;flex-direction:column;gap:${_sp(2)};"></div>

        <button class="btn btn-ghost btn-block" onclick="WorkoutBuilder._openPicker()">
          ＋ Egzersiz Ekle
        </button>
      </div>
    `;

    WorkoutBuilder._renderExerciseList();
  },

  _renderExerciseList() {
    const listEl = document.getElementById('wb-exercise-list');
    if (!listEl) return;

    if (!WorkoutBuilder._exercises.length) {
      listEl.innerHTML = `<div style="text-align:center;color:var(--text-tertiary);padding:${_sp(4)};">Henüz egzersiz eklenmedi</div>`;
      return;
    }

    const exMap = {};
    WorkoutBuilder._allEx.forEach(e => exMap[e.id] = e);

    listEl.innerHTML = WorkoutBuilder._exercises.map((ex, i) => {
      const exData = exMap[ex.exerciseId] || {};
      return `
        <div class="builder-exercise-item">
          <div class="builder-exercise-icon">${exData.icon || '💪'}</div>
          <div class="builder-exercise-info">
            <div class="builder-exercise-name">${Utils.esc(exData.name || ex.exerciseId)}</div>
            <div style="display:flex;gap:${_sp(2)};margin-top:4px;align-items:center;">
              <input type="number" class="set-input" style="width:50px;" value="${ex.targetSets}" min="1" max="20"
                onchange="WorkoutBuilder._updateEx(${i},'targetSets',this.value)" title="Set">
              <span style="color:var(--text-tertiary);font-size:12px;">set</span>
              <input type="number" class="set-input" style="width:50px;" value="${ex.targetReps}" min="1" max="999"
                onchange="WorkoutBuilder._updateEx(${i},'targetReps',this.value)" title="Tekrar">
              <span style="color:var(--text-tertiary);font-size:12px;">tekrar</span>
              <input type="number" class="set-input" style="width:55px;" value="${ex.restSec}" min="0" max="600"
                onchange="WorkoutBuilder._updateEx(${i},'restSec',this.value)" title="Dinlenme">
              <span style="color:var(--text-tertiary);font-size:12px;">s</span>
            </div>
          </div>
          <button class="builder-remove-btn" onclick="WorkoutBuilder._removeEx(${i})">✕</button>
        </div>
      `;
    }).join('');
  },

  _updateEx(idx, field, val) {
    WorkoutBuilder._exercises[idx][field] = parseInt(val) || 0;
  },

  _removeEx(idx) {
    WorkoutBuilder._exercises.splice(idx, 1);
    WorkoutBuilder._renderExerciseList();
  },

  _openPicker() {
    ExercisePicker.show((exerciseId) => {
      // Zaten eklenmiş mi?
      if (WorkoutBuilder._exercises.find(e => e.exerciseId === exerciseId)) {
        Toast.show('Bu egzersiz zaten eklendi.', 'error');
        return;
      }
      WorkoutBuilder._exercises.push({ exerciseId, targetSets: 3, targetReps: 10, restSec: 90, notes: '' });
      WorkoutBuilder._renderExerciseList();
    });
  },

  async save() {
    const name = document.getElementById('wb-name')?.value.trim();
    if (!name) { Toast.show('Antrenman adı gerekli.', 'error'); return; }
    if (!WorkoutBuilder._exercises.length) { Toast.show('En az 1 egzersiz ekle.', 'error'); return; }

    const category   = document.getElementById('wb-category')?.value   || 'Push';
    const difficulty = document.getElementById('wb-difficulty')?.value || 'Orta';

    const now = Date.now();
    const workout = {
      id:         WorkoutBuilder._workout ? WorkoutBuilder._workout.id : Utils.uid(),
      name,
      category,
      difficulty,
      icon:       WorkoutBuilder._workout?.icon || '💪',
      iconBg:     CFG.CATEGORY_COLORS[category] || '#FF9F0A',
      exercises:  WorkoutBuilder._exercises.map(e => ({ ...e })),
      createdAt:  WorkoutBuilder._workout?.createdAt || now,
      updatedAt:  now,
      isTemplate: WorkoutBuilder._workout?.isTemplate || false
    };

    await DB.put('workouts', workout);
    Toast.show('Antrenman kaydedildi ✓', 'success');
    Router.navigate('workout-detail', { workoutId: workout.id });
  }
};

/* ──────────────────────────────────────────────
   ExerciseBrowser — Egzersiz Kütüphanesi
   ────────────────────────────────────────────── */
const ExerciseBrowser = {
  _filter: 'Tümü',
  _search: '',
  _exercises: [],

  async render(container) {
    // Her render'da filtre sıfırla — aksi hâlde eski filtre görünümle çelişir
    ExerciseBrowser._filter = 'Tümü';
    ExerciseBrowser._search = '';
    ExerciseBrowser._exercises = await DB.getAll('exercises');
    const categories = ['Tümü', 'Push', 'Pull', 'Legs', 'Core', 'Full Body', 'Cardio', 'Esneklik'];

    container.innerHTML = `
      <div class="overlay-search">
        <input type="search" id="eb-search" class="search-input" placeholder="Egzersiz ara…">
      </div>
      <div class="category-chips" id="eb-chips"></div>
      <div class="card-list" id="eb-list"></div>
    `;

    const chipsEl = container.querySelector('#eb-chips');
    chipsEl.innerHTML = categories.map(c => `
      <button class="chip ${c === 'Tümü' ? 'active' : ''}" data-cat="${Utils.esc(c)}">${Utils.esc(c)}</button>
    `).join('');

    chipsEl.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        chipsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        ExerciseBrowser._filter = btn.dataset.cat;
        ExerciseBrowser._renderList(container.querySelector('#eb-list'));
      });
    });

    container.querySelector('#eb-search').addEventListener('input', (e) => {
      ExerciseBrowser._search = e.target.value.toLowerCase();
      ExerciseBrowser._renderList(container.querySelector('#eb-list'));
    });

    ExerciseBrowser._renderList(container.querySelector('#eb-list'));
  },

  _renderList(listEl) {
    let list = ExerciseBrowser._exercises;
    if (ExerciseBrowser._filter !== 'Tümü') {
      list = list.filter(e => e.category === ExerciseBrowser._filter);
    }
    if (ExerciseBrowser._search) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(ExerciseBrowser._search) ||
        (e.muscleGroup || '').toLowerCase().includes(ExerciseBrowser._search)
      );
    }

    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Sonuç yok</div></div>`;
      return;
    }

    listEl.innerHTML = list.map(ex => `
      <div class="exercise-card">
        <div class="exercise-card-icon">${ex.icon || '💪'}</div>
        <div class="exercise-card-body">
          <div class="exercise-card-name">${Utils.esc(ex.name)}</div>
          <div class="exercise-card-sub">
            <span class="badge ${CFG.CATEGORY_BADGE[ex.category] || ''}">${Utils.esc(ex.category)}</span>
            · ${Utils.esc(ex.muscleGroup || '')}
          </div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">${Utils.esc(ex.equipment || '')}</div>
        </div>
      </div>
    `).join('');
  }
};

/* ──────────────────────────────────────────────
   ExercisePicker — Inline overlay (WorkoutBuilder içinden)
   ────────────────────────────────────────────── */
const ExercisePicker = {
  _cb: null,
  _filter: 'Tümü',
  _search: '',
  _exercises: [],

  show(callback) {
    ExercisePicker._cb = callback;
    ExercisePicker._filter = 'Tümü';
    ExercisePicker._search = '';

    const overlay = document.getElementById('exercise-picker-overlay');
    overlay.classList.remove('hidden');

    DB.getAll('exercises').then(all => {
      ExercisePicker._exercises = all;
      ExercisePicker._renderChips();
      ExercisePicker._renderList();
    });

    document.getElementById('exercise-picker-close').onclick = () => overlay.classList.add('hidden');

    document.getElementById('picker-search').value = '';
    document.getElementById('picker-search').oninput = (e) => {
      ExercisePicker._search = e.target.value.toLowerCase();
      ExercisePicker._renderList();
    };
  },

  _renderChips() {
    const categories = ['Tümü', 'Push', 'Pull', 'Legs', 'Core', 'Full Body', 'Cardio', 'Esneklik'];
    const chipsEl = document.getElementById('picker-category-chips');
    chipsEl.innerHTML = categories.map(c => `
      <button class="chip ${c === ExercisePicker._filter ? 'active' : ''}" data-cat="${Utils.esc(c)}">${Utils.esc(c)}</button>
    `).join('');
    chipsEl.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        chipsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        ExercisePicker._filter = btn.dataset.cat;
        ExercisePicker._renderList();
      });
    });
  },

  _renderList() {
    let list = ExercisePicker._exercises;
    if (ExercisePicker._filter !== 'Tümü') list = list.filter(e => e.category === ExercisePicker._filter);
    if (ExercisePicker._search) list = list.filter(e => e.name.toLowerCase().includes(ExercisePicker._search) || (e.muscleGroup||'').toLowerCase().includes(ExercisePicker._search));

    const listEl = document.getElementById('picker-exercise-list');
    if (!list.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Sonuç yok</div></div>`;
      return;
    }

    listEl.innerHTML = list.map(ex => `
      <div class="exercise-card" onclick="ExercisePicker._pick('${ex.id}')">
        <div class="exercise-card-icon">${ex.icon || '💪'}</div>
        <div class="exercise-card-body">
          <div class="exercise-card-name">${Utils.esc(ex.name)}</div>
          <div class="exercise-card-sub">${Utils.esc(ex.muscleGroup || '')} · ${Utils.esc(ex.equipment || '')}</div>
        </div>
      </div>
    `).join('');
  },

  _pick(exerciseId) {
    document.getElementById('exercise-picker-overlay').classList.add('hidden');
    if (ExercisePicker._cb) ExercisePicker._cb(exerciseId);
  }
};

/* ──────────────────────────────────────────────
   RestTimer
   ────────────────────────────────────────────── */
const RestTimer = {
  _timer:    null,
  _total:    90,
  _elapsed:  0,
  _onDone:   null,
  _audioCtx: null,

  start(seconds, onDone) {
    RestTimer.stop();
    RestTimer._total   = seconds;
    RestTimer._elapsed = 0;
    RestTimer._onDone  = onDone;

    const overlay = document.getElementById('rest-overlay');
    overlay.classList.remove('hidden');

    // Reset preset buttons
    overlay.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.sec) === seconds);
      // Preset tıklandığında timer'ı baştan başlat
      btn.onclick = () => {
        const s = parseInt(btn.dataset.sec);
        overlay.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        RestTimer.start(s, RestTimer._onDone);
      };
    });

    document.getElementById('rest-skip-btn').onclick  = () => RestTimer._finish();
    document.getElementById('rest-add30-btn').onclick = () => { RestTimer._total += 30; RestTimer._update(); };

    RestTimer._update();
    RestTimer._timer = setInterval(() => {
      RestTimer._elapsed++;
      if (RestTimer._elapsed >= RestTimer._total) {
        RestTimer._finish();
      } else {
        RestTimer._update();
      }
    }, 1000);
  },

  _update() {
    const remaining = Math.max(0, RestTimer._total - RestTimer._elapsed);
    const el = document.getElementById('rest-countdown');
    if (el) el.textContent = remaining;

    const ring = document.getElementById('rest-ring-fg');
    if (ring) ring.style.strokeDashoffset = Utils.ringOffset(RestTimer._elapsed, RestTimer._total);
  },

  _finish() {
    RestTimer.stop();
    document.getElementById('rest-overlay').classList.add('hidden');
    RestTimer._beep();
    RestTimer._vibrate();
    if (RestTimer._onDone) RestTimer._onDone();
  },

  stop() {
    if (RestTimer._timer) { clearInterval(RestTimer._timer); RestTimer._timer = null; }
  },

  _beep() {
    try {
      if (!RestTimer._audioCtx) RestTimer._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = RestTimer._audioCtx;
      const playTones = () => {
        const playTone = (freq, start, dur) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur + 0.05);
        };
        playTone(880,  0,    0.15);
        playTone(880,  0.18, 0.15);
        playTone(1100, 0.36, 0.25);
      };
      // iOS Safari AudioContext'i suspend eder — resume() ile uyandır
      if (ctx.state === 'suspended') {
        ctx.resume().then(playTones).catch(() => {});
      } else {
        playTones();
      }
    } catch(e) { /* ses desteklenmiyor */ }
  },

  _vibrate() {
    try { navigator.vibrate && navigator.vibrate([100, 50, 100]); } catch(e) {}
  }
};

/* ──────────────────────────────────────────────
   ActiveWorkout — Canlı Antrenman Motoru
   ────────────────────────────────────────────── */
const ActiveWorkout = {
  _workoutId:   null,
  _workout:     null,
  _exIndex:     0,       // mevcut egzersiz indexi
  _sets:        [],      // her egzersiz için set dizisi: [[{reps,weight,done},…],…]
  _prevLogs:    {},      // exerciseId → son log setleri (önceki değerler için)
  _startTime:   null,
  _timerEl:     null,
  _elapsed:     0,
  _timerHandle: null,
  _allEx:       {},      // id → exercise

  async start(workoutId) {
    // Eğer aktif antrenman varsa sor
    if (ActiveWorkout._workoutId) {
      Modal.confirm('Aktif Antrenman Var', 'Mevcut antrenmanı iptal edip yeni antrenman başlatmak istediğine emin misin?', () => {
        ActiveWorkout._init(workoutId);
      });
      return;
    }
    await ActiveWorkout._init(workoutId);
  },

  async _init(workoutId) {
    const [workout, allEx, allLogs] = await Promise.all([
      DB.get('workouts', workoutId),
      DB.getAll('exercises'),
      DB.getAll('logs')
    ]);

    if (!workout || !workout.exercises || !workout.exercises.length) {
      Toast.show('Antrenman bulunamadı veya boş.', 'error');
      return;
    }

    ActiveWorkout._workoutId = workoutId;
    ActiveWorkout._workout   = workout;
    ActiveWorkout._exIndex   = 0;
    ActiveWorkout._startTime = Date.now();
    ActiveWorkout._elapsed   = 0;

    // Egzersiz map
    ActiveWorkout._allEx = {};
    allEx.forEach(e => ActiveWorkout._allEx[e.id] = e);

    // Set dizisi başlat
    ActiveWorkout._sets = workout.exercises.map(ex => {
      return Array.from({ length: ex.targetSets }, () => ({
        reps: String(ex.targetReps),
        weight: '0',
        done: false
      }));
    });

    // Önceki loglardan son değerleri çek
    ActiveWorkout._prevLogs = {};
    const sortedLogs = [...allLogs].sort((a, b) => b.startTime - a.startTime);
    for (const log of sortedLogs) {
      for (const logEx of (log.exercises || [])) {
        if (!ActiveWorkout._prevLogs[logEx.exerciseId]) {
          ActiveWorkout._prevLogs[logEx.exerciseId] = logEx.sets || [];
        }
      }
    }

    // Önceki değerleri set'e pre-fill et
    workout.exercises.forEach((ex, i) => {
      const prev = ActiveWorkout._prevLogs[ex.exerciseId] || [];
      ActiveWorkout._sets[i].forEach((set, j) => {
        if (prev[j]) {
          set.reps = String(prev[j].reps || ex.targetReps);
          set.weight = String(prev[j].weight || 0);
        }
      });
    });

    // LocalStorage'a kaydet (sayfa kapanırsa kurtarma)
    ActiveWorkout._saveState();

    Router.navigate('active');
  },

  async _restoreState() {
    const saved = localStorage.getItem('ft_active_workout');
    if (!saved) return false;
    try {
      const state = JSON.parse(saved);
      if (Date.now() - state.startTime > 8 * 3600 * 1000) {
        localStorage.removeItem('ft_active_workout');
        return false;
      }
      // yeniden yükle
      const workout = await DB.get('workouts', state.workoutId);
      if (!workout) { localStorage.removeItem('ft_active_workout'); return false; }
      const allEx = await DB.getAll('exercises');
      ActiveWorkout._workoutId = state.workoutId;
      ActiveWorkout._workout   = workout;
      ActiveWorkout._exIndex   = state.exIndex || 0;
      ActiveWorkout._startTime = state.startTime;
      ActiveWorkout._elapsed   = Math.floor((Date.now() - state.startTime) / 1000);
      ActiveWorkout._sets      = state.sets;
      ActiveWorkout._prevLogs  = state.prevLogs || {};
      ActiveWorkout._allEx     = {};
      allEx.forEach(e => ActiveWorkout._allEx[e.id] = e);
      return true;
    } catch(e) {
      localStorage.removeItem('ft_active_workout');
      return false;
    }
  },

  _saveState() {
    try {
      localStorage.setItem('ft_active_workout', JSON.stringify({
        workoutId: ActiveWorkout._workoutId,
        exIndex:   ActiveWorkout._exIndex,
        startTime: ActiveWorkout._startTime,
        sets:      ActiveWorkout._sets,
        prevLogs:  ActiveWorkout._prevLogs
      }));
    } catch(e) {}
  },

  render(container, actionsEl) {
    if (!ActiveWorkout._workout) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💪</div>
          <div class="empty-state-title">Aktif Antrenman Yok</div>
          <button class="btn btn-primary mt-4" onclick="Router.navigate('workouts')">Başlat</button>
        </div>
      `;
      return;
    }

    actionsEl.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="ActiveWorkout._confirmStop()">Bitir</button>`;

    const w      = ActiveWorkout._workout;
    const exIdx  = ActiveWorkout._exIndex;
    const exConf = w.exercises[exIdx];
    const exData = ActiveWorkout._allEx[exConf.exerciseId] || {};
    const sets   = ActiveWorkout._sets[exIdx] || [];
    const prev   = ActiveWorkout._prevLogs[exConf.exerciseId] || [];

    const progress = Math.round(((exIdx) / w.exercises.length) * 100);

    container.innerHTML = `
      <div class="active-workout-wrap">
        <div class="active-header">
          <div class="active-timer">
            Süre: <span id="aw-timer">${Utils.formatTime(ActiveWorkout._elapsed)}</span>
          </div>
          <div class="exercise-progress-bar">
            <div class="exercise-progress-fill" style="width:${progress}%"></div>
          </div>
          <div style="margin-top:${_sp(2)};text-align:center;font-size:12px;color:var(--text-tertiary);">
            ${exIdx + 1} / ${w.exercises.length} egzersiz
          </div>
        </div>

        <div class="active-exercise-card">
          <div class="active-exercise-badge">
            <span class="badge ${CFG.CATEGORY_BADGE[exData.category] || ''}">${exData.category || ''}</span>
            &nbsp;${Utils.esc(exData.muscleGroup || '')}
          </div>
          <div class="active-exercise-name">${Utils.esc(exData.name || exConf.exerciseId)}</div>
          <div class="active-exercise-target">
            Hedef: ${exConf.targetSets} × ${exConf.targetReps} tekrar · Dinlenme: ${exConf.restSec}s
          </div>
        </div>

        <div class="set-table-wrap">
          <table class="set-table">
            <thead>
              <tr>
                <th class="set-num">Set</th>
                <th>Önceki</th>
                <th>KG</th>
                <th>Tekrar</th>
                <th>✓</th>
              </tr>
            </thead>
            <tbody id="aw-sets-body"></tbody>
          </table>
          <button class="add-set-btn" onclick="ActiveWorkout._addSet()">＋ Set Ekle</button>
        </div>

        <div class="active-nav">
          <button class="btn btn-secondary" style="flex:1;" onclick="ActiveWorkout._prevEx()" ${exIdx === 0 ? 'disabled style="opacity:.4"' : ''}>← Önceki</button>
          <button class="btn btn-primary" style="flex:1;" onclick="ActiveWorkout._nextEx()">
            ${exIdx === w.exercises.length - 1 ? 'Bitir 🏆' : 'Sonraki →'}
          </button>
        </div>
      </div>
    `;

    ActiveWorkout._renderSets(sets, prev);

    // Sayaç başlat
    if (ActiveWorkout._timerHandle) clearInterval(ActiveWorkout._timerHandle);
    ActiveWorkout._timerHandle = setInterval(() => {
      ActiveWorkout._elapsed++;
      const el = document.getElementById('aw-timer');
      if (el) el.textContent = Utils.formatTime(ActiveWorkout._elapsed);
      else clearInterval(ActiveWorkout._timerHandle);
      if (ActiveWorkout._elapsed % 30 === 0) ActiveWorkout._saveState();
    }, 1000);
  },

  _renderSets(sets, prev) {
    const tbody = document.getElementById('aw-sets-body');
    if (!tbody) return;

    tbody.innerHTML = sets.map((s, i) => {
      const prevStr = prev[i] ? `${prev[i].weight}kg × ${prev[i].reps}` : '—';
      return `
        <tr class="${s.done ? 'set-done' : ''}" id="aw-row-${i}">
          <td class="set-num">${i + 1}</td>
          <td class="set-prev">${prevStr}</td>
          <td><input type="number" class="set-input" inputmode="decimal" value="${s.weight}"
            onchange="ActiveWorkout._updateSet(${i},'weight',this.value)" min="0" max="999" step="2.5"></td>
          <td><input type="number" class="set-input" inputmode="numeric" value="${s.reps}"
            onchange="ActiveWorkout._updateSet(${i},'reps',this.value)" min="0" max="999"></td>
          <td><button class="set-check-btn" onclick="ActiveWorkout._toggleSet(${i})">${s.done ? '✓' : ''}</button></td>
        </tr>
      `;
    }).join('');
  },

  _updateSet(i, field, val) {
    const sets = ActiveWorkout._sets[ActiveWorkout._exIndex];
    if (!sets[i]) return;
    sets[i][field] = val;
    ActiveWorkout._saveState();
  },

  _toggleSet(i) {
    const sets = ActiveWorkout._sets[ActiveWorkout._exIndex];
    if (!sets[i]) return;
    sets[i].done = !sets[i].done;

    // Satırı güncelle
    const row = document.getElementById(`aw-row-${i}`);
    if (row) {
      row.classList.toggle('set-done', sets[i].done);
      const btn = row.querySelector('.set-check-btn');
      if (btn) btn.textContent = sets[i].done ? '✓' : '';
    }

    // Tamamlandıysa dinlenme başlat
    if (sets[i].done) {
      const exConf = ActiveWorkout._workout.exercises[ActiveWorkout._exIndex];
      RestTimer.start(exConf.restSec || 90, () => {
        // Rest bitti — auto focus
        if (i + 1 < sets.length) {
          const nextInput = document.querySelector(`#aw-row-${i+1} input`);
          if (nextInput) nextInput.focus();
        }
      });
    }

    ActiveWorkout._saveState();
  },

  _addSet() {
    const exConf = ActiveWorkout._workout.exercises[ActiveWorkout._exIndex];
    const sets   = ActiveWorkout._sets[ActiveWorkout._exIndex];
    const last   = sets[sets.length - 1] || {};
    sets.push({ reps: last.reps || String(exConf.targetReps), weight: last.weight || '0', done: false });
    const prev = ActiveWorkout._prevLogs[exConf.exerciseId] || [];
    ActiveWorkout._renderSets(sets, prev);
    ActiveWorkout._saveState();
  },

  _prevEx() {
    if (ActiveWorkout._exIndex > 0) {
      ActiveWorkout._exIndex--;
      ActiveWorkout._saveState();
      // Geçmişe yeni giriş eklemeden yerinde yeniden çiz
      const main      = document.getElementById('main-content');
      const actionsEl = document.getElementById('header-actions');
      ActiveWorkout.render(main, actionsEl);
    }
  },

  _nextEx() {
    const w = ActiveWorkout._workout;
    if (ActiveWorkout._exIndex < w.exercises.length - 1) {
      ActiveWorkout._exIndex++;
      ActiveWorkout._saveState();
      // Geçmişe yeni giriş eklemeden yerinde yeniden çiz
      const main      = document.getElementById('main-content');
      const actionsEl = document.getElementById('header-actions');
      ActiveWorkout.render(main, actionsEl);
    } else {
      // Son egzersiz — bitir
      ActiveWorkout._finish();
    }
  },

  _confirmStop() {
    Modal.confirm('Antrenmanı Bitir', 'Antrenmanı şimdi bitirmek istiyor musun?', () => {
      ActiveWorkout._finish();
    });
  },

  async _finish() {
    RestTimer.stop();
    if (ActiveWorkout._timerHandle) { clearInterval(ActiveWorkout._timerHandle); ActiveWorkout._timerHandle = null; }

    const w = ActiveWorkout._workout;
    const duration = Math.floor((Date.now() - ActiveWorkout._startTime) / 1000);

    // Log kaydı oluştur
    const logExercises = w.exercises.map((exConf, i) => ({
      exerciseId: exConf.exerciseId,
      name: (ActiveWorkout._allEx[exConf.exerciseId] || {}).name || exConf.exerciseId,
      sets: ActiveWorkout._sets[i].map(s => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
        done: s.done
      }))
    }));

    const totalVolume = logExercises.reduce((total, ex) => {
      return total + ex.sets.filter(s => s.done).reduce((acc, s) => acc + s.weight * s.reps, 0);
    }, 0);

    const log = {
      id:          Utils.uid(),
      workoutId:   ActiveWorkout._workoutId,
      workoutName: w.name,
      startTime:   ActiveWorkout._startTime,
      endTime:     Date.now(),
      duration,
      date:        new Date(ActiveWorkout._startTime).toISOString().split('T')[0],
      exercises:   logExercises,
      totalVolume: Math.round(totalVolume)
    };

    await DB.put('logs', log);
    localStorage.removeItem('ft_active_workout');

    // Reset state
    ActiveWorkout._workoutId = null;
    ActiveWorkout._workout   = null;
    ActiveWorkout._sets      = [];

    Toast.show('Antrenman tamamlandı! 🏆', 'success', 3500);
    Router.navigate('home');
  }
};

/* ──────────────────────────────────────────────
   LogDetail
   ────────────────────────────────────────────── */
const LogDetail = {
  async render(container, params) {
    const log = await DB.get('logs', params.logId);
    if (!log) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Log bulunamadı</div></div>';
      return;
    }

    const doneSets = log.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.done).length, 0);

    container.innerHTML = `
      <div class="p-4">
        <div class="card" style="margin-bottom:${_sp(4)};">
          <div style="font-size:13px;color:var(--text-secondary);">${Utils.formatDate(log.startTime)}</div>
          <div style="font-size:22px;font-weight:700;margin-top:${_sp(1)};">${Utils.esc(log.workoutName)}</div>
          <div style="display:flex;gap:${_sp(4)};margin-top:${_sp(3)};">
            <div><div style="font-size:20px;font-weight:700;color:var(--primary);">${Utils.formatTime(log.duration)}</div><div style="font-size:11px;color:var(--text-secondary);">Süre</div></div>
            <div><div style="font-size:20px;font-weight:700;color:var(--primary);">${Math.round(log.totalVolume)} kg</div><div style="font-size:11px;color:var(--text-secondary);">Hacim</div></div>
            <div><div style="font-size:20px;font-weight:700;color:var(--primary);">${doneSets}</div><div style="font-size:11px;color:var(--text-secondary);">Set</div></div>
          </div>
        </div>

        ${log.exercises.map(ex => `
          <div class="card" style="margin-bottom:${_sp(3)};">
            <div style="font-size:16px;font-weight:700;margin-bottom:${_sp(3)};">${Utils.esc(ex.name)}</div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="font-size:12px;color:var(--text-tertiary);">
                  <th style="text-align:left;padding-bottom:${_sp(2)};">Set</th>
                  <th style="text-align:center;">KG</th>
                  <th style="text-align:center;">Tekrar</th>
                  <th style="text-align:center;">Hacim</th>
                  <th style="text-align:center;">✓</th>
                </tr>
              </thead>
              <tbody>
                ${ex.sets.map((s, i) => `
                  <tr style="${s.done ? 'background:var(--success-dim);' : ''}">
                    <td style="padding:${_sp(2)} 0;font-size:14px;color:var(--text-secondary);">${i+1}</td>
                    <td style="text-align:center;font-size:15px;font-weight:600;">${s.weight}</td>
                    <td style="text-align:center;font-size:15px;font-weight:600;">${s.reps}</td>
                    <td style="text-align:center;font-size:13px;color:var(--text-secondary);">${Math.round(s.weight*s.reps*10)/10}</td>
                    <td style="text-align:center;">${s.done ? '<span style="color:var(--success);">✓</span>' : '<span style="color:var(--text-tertiary);">—</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <button class="btn btn-danger btn-block" style="margin-top:${_sp(4)};" onclick="LogDetail._delete('${log.id}')">Logu Sil</button>
      </div>
    `;
  },

  async _delete(logId) {
    Modal.confirm('Logu Sil', 'Bu antrenman kaydını silmek istediğine emin misin?', async () => {
      await DB.delete('logs', logId);
      Toast.show('Log silindi.', 'success');
      Router.navigate('progress');
    });
  }
};

/* ──────────────────────────────────────────────
   ProgressScreen
   ────────────────────────────────────────────── */
const ProgressScreen = {
  async render(container) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div></div>';
    const [logs, allEx] = await Promise.all([DB.getAll('logs'), DB.getAll('exercises')]);

    const exMap = {};
    allEx.forEach(e => exMap[e.id] = e);

    const sorted = [...logs].sort((a, b) => b.startTime - a.startTime);

    // PRs
    const prs = ProgressScreen._calcPRs(logs, exMap);

    // Toplam istatistikler
    const totalVolume  = logs.reduce((a, l) => a + (l.totalVolume || 0), 0);
    const totalTime    = logs.reduce((a, l) => a + (l.duration || 0), 0);
    const avgDuration  = logs.length ? Math.floor(totalTime / logs.length) : 0;

    container.innerHTML = `
      <div class="section-header"><span class="section-title">Genel Bakış</span></div>
      <div class="progress-stats" style="padding:0 ${_sp(4)};">
        <div class="progress-stat">
          <div class="progress-stat-val">${logs.length}</div>
          <div class="progress-stat-lbl">Antrenman</div>
        </div>
        <div class="progress-stat">
          <div class="progress-stat-val">${totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + 't' : totalVolume + 'kg'}</div>
          <div class="progress-stat-lbl">Toplam Hacim</div>
        </div>
        <div class="progress-stat">
          <div class="progress-stat-val">${Utils.formatTime(avgDuration)}</div>
          <div class="progress-stat-lbl">Ort. Süre</div>
        </div>
        <div class="progress-stat">
          <div class="progress-stat-val">${ProgressScreen._calcStreak(logs)}</div>
          <div class="progress-stat-lbl">Güncel Seri</div>
        </div>
      </div>

      <div class="section-header mt-4"><span class="section-title">Son 30 Gün Hacim</span></div>
      <div class="chart-card">
        <canvas id="volume-chart" class="bar-chart" height="120"></canvas>
      </div>

      <div class="section-header mt-4"><span class="section-title">Antrenman Sıklığı</span></div>
      <div class="chart-card">
        <div id="heatmap-container"></div>
      </div>

      ${prs.length ? `
      <div class="section-header mt-4"><span class="section-title">Kişisel Rekordlar</span></div>
      <div class="pr-list" style="padding:0 ${_sp(4)} ${_sp(4)};">
        ${prs.slice(0, 10).map(pr => `
          <div class="pr-item">
            <div class="pr-name">${Utils.esc(pr.name)}</div>
            <div class="pr-val">${pr.weight} kg × ${pr.reps}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="section-header mt-2"><span class="section-title">Antrenman Geçmişi</span></div>
      <div class="card-list" id="log-history">
        ${sorted.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-title">Henüz Kayıt Yok</div>
            <div class="empty-state-sub">İlk antrenmanını yaptıktan sonra ilerleme burada görünecek.</div>
          </div>
        ` : sorted.slice(0, 20).map(log => `
          <div class="log-card" onclick="Router.navigate('log-detail', {logId:'${log.id}'})">
            <div class="log-card-date">${Utils.formatDate(log.startTime)}</div>
            <div class="log-card-name">${Utils.esc(log.workoutName)}</div>
            <div class="log-card-stats">
              <span class="log-card-stat">⏱ <strong>${Utils.formatTime(log.duration||0)}</strong></span>
              <span class="log-card-stat">🔁 <strong>${(log.exercises||[]).length} egz.</strong></span>
              <span class="log-card-stat">📦 <strong>${log.totalVolume||0} kg</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Canvas chart çiz
    ProgressScreen._drawVolumeChart(logs);
    ProgressScreen._drawHeatmap(logs);
  },

  _calcPRs(logs, exMap) {
    const best = {}; // exerciseId → {weight, reps, vol}
    for (const log of logs) {
      for (const ex of (log.exercises || [])) {
        for (const s of (ex.sets || [])) {
          if (!s.done) continue;
          const vol = (s.weight || 0) * (s.reps || 0);
          if (!best[ex.exerciseId] || vol > best[ex.exerciseId].vol) {
            best[ex.exerciseId] = { weight: s.weight, reps: s.reps, vol };
          }
        }
      }
    }
    return Object.entries(best).map(([id, v]) => ({
      name: (exMap[id] || {}).name || id,
      weight: v.weight,
      reps: v.reps
    })).sort((a, b) => (b.weight * b.reps) - (a.weight * a.reps));
  },

  _calcStreak(logs) {
    if (!logs.length) return 0;
    const days = new Set(logs.map(l => new Date(l.startTime).toISOString().split('T')[0]));
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

  _drawVolumeChart(logs) {
    const canvas = document.getElementById('volume-chart');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.parentElement.clientWidth - 32;
    const H   = 120;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Son 30 gün hacim
    const data = [];
    const labels = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayLogs = logs.filter(l => l.date === key);
      const vol = dayLogs.reduce((a, l) => a + (l.totalVolume || 0), 0);
      data.push(vol);
      labels.push(i % 5 === 0 ? d.getDate() + '/' + (d.getMonth()+1) : '');
    }

    const maxVal = Math.max(...data, 1);
    const barW   = W / data.length;
    const padY   = 10;
    const chartH = H - padY - 18;

    ctx.clearRect(0, 0, W, H);

    data.forEach((val, i) => {
      const barH = (val / maxVal) * chartH;
      const x    = i * barW + barW * 0.15;
      const y    = padY + chartH - barH;
      const bw   = barW * 0.7;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#FF9F0A');
      grad.addColorStop(1, '#FF9F0A44');
      ctx.fillStyle = val > 0 ? grad : '#3A3A3C';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, bw, barH, 3) : ctx.rect(x, y, bw, barH);
      ctx.fill();

      // Etiket
      if (labels[i]) {
        ctx.fillStyle = 'rgba(235,235,245,.3)';
        ctx.font = '9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], i * barW + barW / 2, H - 2);
      }
    });
  },

  _drawHeatmap(logs) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const activeDays = new Set(logs.map(l => l.date));
    const cells = [];

    for (let i = 69; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cells.push(`<div class="heatmap-day ${activeDays.has(key) ? 'active-day' : ''}" title="${key}"></div>`);
    }

    container.innerHTML = `
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:${_sp(2)};">Son 70 gün</div>
      <div class="heatmap-grid">${cells.join('')}</div>
    `;
  }
};

/* ──────────────────────────────────────────────
   SettingsScreen
   ────────────────────────────────────────────── */
const SettingsScreen = {
  async render(container) {
    const [name, weight, height, programId, notifEnabled, notifTime, allWorkouts, allPrograms] = await Promise.all([
      DB.getSetting('userName', ''),
      DB.getSetting('bodyWeight', ''),
      DB.getSetting('bodyHeight', ''),
      DB.getSetting('activeProgramId', null),
      DB.getSetting('notifEnabled', false),
      DB.getSetting('notifTime', '08:00'),
      DB.getAll('workouts'),
      DB.getAll('programs')
    ]);

    container.innerHTML = `
      <div class="section-header"><span class="section-title">Profil</span></div>
      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">İsim</div>
            <div class="settings-row-sub">${name ? Utils.esc(name) : 'Girilmedi'}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn"
            data-key="userName" data-label="İsim" data-type="text">Düzenle</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">Vücut Ağırlığı</div>
            <div class="settings-row-sub">${weight ? weight + ' kg' : 'Girilmedi'}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn"
            data-key="bodyWeight" data-label="Vücut Ağırlığı (kg)" data-type="number">Düzenle</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-label">
            <div class="settings-row-title">Boy</div>
            <div class="settings-row-sub">${height ? height + ' cm' : 'Girilmedi'}</div>
          </div>
          <button class="btn btn-ghost btn-xs settings-edit-btn"
            data-key="bodyHeight" data-label="Boy (cm)" data-type="number">Düzenle</button>
        </div>
      </div>

      <div class="section-header mt-3"><span class="section-title">Program</span></div>
      <div class="settings-section">
        <div class="settings-row" onclick="SettingsScreen._manageProgram()">
          <div class="settings-row-label">
            <div class="settings-row-title">Haftalık Program</div>
            <div class="settings-row-sub">${allPrograms.length ? allPrograms.length + ' program' : 'Ayarlanmadı'}</div>
          </div>
          <span class="settings-row-value">›</span>
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
          <button class="btn btn-ghost btn-xs settings-edit-btn"
            data-key="notifTime" data-label="Hatırlatma Saati" data-type="time">Düzenle</button>
        </div>
      </div>

      <div class="section-header mt-3"><span class="section-title">Veri</span></div>
      <div class="settings-section">
        <div class="settings-row" onclick="SettingsScreen._exportData()">
          <div class="settings-row-label">
            <div class="settings-row-title">Verileri Dışa Aktar</div>
            <div class="settings-row-sub">JSON formatında indir</div>
          </div>
          <span class="settings-row-value">›</span>
        </div>
        <div class="settings-row" onclick="SettingsScreen._confirmReset()">
          <div class="settings-row-label">
            <div class="settings-row-title" style="color:var(--accent);">Tüm Verileri Sıfırla</div>
            <div class="settings-row-sub">Tüm log ve ayarları sil</div>
          </div>
          <span class="settings-row-value">›</span>
        </div>
      </div>

      <div style="text-align:center;padding:${_sp(8)} ${_sp(4)};color:var(--text-tertiary);font-size:12px;">
        FitTrack v1.0.0 · PWA<br>IndexedDB + Service Worker
      </div>
    `;

    // Güvenli alan düzenleme butonları — değer onclick'e gömülmez, DB'den okunur
    container.querySelectorAll('.settings-edit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key   = btn.dataset.key;
        const label = btn.dataset.label;
        const type  = btn.dataset.type;
        const cur   = await DB.getSetting(key, '');
        SettingsScreen._editField(key, label, type, cur);
      });
    });
  },

  _editField(key, label, type, current) {
    Modal.show({
      title: label + ' Düzenle',
      message: '',
      centered: true,
      actions: []
    });

    const modalCard = document.getElementById('modal-card');
    const inputId = 'settings-edit-input';
    const inputEl = document.createElement('input');
    inputEl.type  = type || 'text';
    inputEl.id    = inputId;
    inputEl.className = 'form-input';
    inputEl.value = current || '';
    inputEl.style.marginBottom = '16px';

    const actionsEl = document.getElementById('modal-actions');
    actionsEl.parentNode.insertBefore(inputEl, actionsEl);

    actionsEl.innerHTML = '';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost btn-block';
    cancelBtn.textContent = 'İptal';
    cancelBtn.onclick = Modal.hide;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block';
    saveBtn.textContent = 'Kaydet';
    saveBtn.onclick = async () => {
      const val = document.getElementById(inputId)?.value.trim();
      await DB.setSetting(key, val);
      Modal.hide();
      Toast.show('Kaydedildi ✓', 'success');
      SettingsScreen.render(document.getElementById('main-content'));
    };

    actionsEl.appendChild(cancelBtn);
    actionsEl.appendChild(saveBtn);
    inputEl.focus();
  },

  async _toggleNotif(toggleEl) {
    const isOn = !toggleEl.classList.contains('on');
    toggleEl.classList.toggle('on', isOn);
    await DB.setSetting('notifEnabled', isOn);
    if (isOn && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          Toast.show('Bildirim izni verilmedi. iOS\'ta Safari ayarlarından etkinleştirin.', 'error', 4000);
          toggleEl.classList.remove('on');
          await DB.setSetting('notifEnabled', false);
        } else {
          Toast.show('Bildirimler etkinleştirildi ✓', 'success');
        }
      } catch(e) {
        Toast.show('iOS Safari bildirimleri desteklemiyor olabilir.', 'error', 4000);
      }
    }
  },

  _manageProgram() {
    Toast.show('Program özelliği yakında eklenecek.', 'info');
  },

  async _exportData() {
    const [logs, workouts, settings] = await Promise.all([
      DB.getAll('logs'),
      DB.getAll('workouts'),
      DB.getAll('settings')
    ]);

    const data = { exportedAt: new Date().toISOString(), logs, workouts, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fittrack-backup-${Utils.todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Dışa aktarma tamamlandı ✓', 'success');
  },

  _confirmReset() {
    Modal.confirm('Verileri Sıfırla', 'TÜM antrenman loglarınız ve ayarlarınız silinecek. Bu işlem geri alınamaz!', async () => {
      const db = DB._db;
      const tx = db.transaction(['logs', 'settings'], 'readwrite');
      tx.objectStore('logs').clear();
      tx.objectStore('settings').clear();
      tx.oncomplete = () => {
        Toast.show('Veriler sıfırlandı.', 'success');
        SettingsScreen.render(document.getElementById('main-content'));
      };
    });
  }
};

/* ──────────────────────────────────────────────
   Helper — kısa spacing
   ────────────────────────────────────────────── */
function _sp(n) {
  const map = { 1:'4px', 2:'8px', 3:'12px', 4:'16px', 5:'20px', 6:'24px', 8:'32px' };
  return map[n] || n + 'px';
}

/* ──────────────────────────────────────────────
   App — Başlatma
   ────────────────────────────────────────────── */
const App = {
  async init() {
    try {
      await DB.open();
      await DB.seedIfEmpty();

      // Kaydedilmiş aktif antrenman var mı kontrol et
      const restored = await ActiveWorkout._restoreState();

      // Tab click
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const route = btn.dataset.route;
          if (route) Router.navigate(route);
        });
      });

      // Modal overlay click dışı kapanma
      document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) Modal.hide();
      });

      // Restore varsa aktif ekrana git, yoksa home
      if (restored) {
        Router.navigate('active');
      } else {
        Router.navigate('home');
      }
    } catch (err) {
      console.error('[FitTrack] Init hatası:', err);
      document.getElementById('main-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-title">Başlatma Hatası</div>
          <div class="empty-state-sub">${err.message || 'Bilinmeyen hata'}</div>
        </div>
      `;
    }
  }
};

/* Başlat */
document.addEventListener('DOMContentLoaded', () => App.init());
