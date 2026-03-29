/* exercises.js — FitTrack Egzersiz Kütüphanesi */
/* 54 egzersiz: Push×8, Pull×8, Legs×8, Core×8, FullBody×6, Cardio×6, Esneklik×10 */

const EXERCISE_DATA = [
  /* ── PUSH ─────────────────────────────────── */
  {
    id: 'ex_bench_press',
    name: 'Bench Press',
    nameTR: 'Göğüs',
    category: 'Push',
    muscleGroup: 'Göğüs (Pectoralis Major)',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Sırtüstü yat, bar omuz genişliğinde tut. Göğse indir, tam uzayana kadar it.',
    isCustom: false
  },
  {
    id: 'ex_incline_bench',
    name: 'Incline Bench Press',
    nameTR: 'Üst Göğüs',
    category: 'Push',
    muscleGroup: 'Üst Göğüs, Ön Omuz',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: '30-45° eğimli bankta göğüs presi uygula. Üst göğüs vurgusu için.',
    isCustom: false
  },
  {
    id: 'ex_overhead_press',
    name: 'Overhead Press',
    nameTR: 'Omuz',
    category: 'Push',
    muscleGroup: 'Ön/Yan Omuz, Triceps',
    equipment: 'Barbell',
    type: 'weight',
    icon: '💪',
    instructions: 'Ayakta dur, bar çeneye yakın tut. Başın üstüne kadar it, kontrollü indir.',
    isCustom: false
  },
  {
    id: 'ex_lateral_raise',
    name: 'Lateral Raise',
    nameTR: 'Yan Omuz',
    category: 'Push',
    muscleGroup: 'Yan Omuz (Medial Deltoid)',
    equipment: 'Dumbbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Dumbbellları yanlara kaldır. Dirsekler hafif bükülü, omuz hizasına kadar.',
    isCustom: false
  },
  {
    id: 'ex_front_raise',
    name: 'Front Raise',
    nameTR: 'Ön Omuz',
    category: 'Push',
    muscleGroup: 'Ön Omuz (Anterior Deltoid)',
    equipment: 'Dumbbell',
    type: 'weight',
    icon: '💪',
    instructions: 'Dumbbellları öne kaldır. Omuz hizasına kadar kontrollü.',
    isCustom: false
  },
  {
    id: 'ex_tricep_pushdown',
    name: 'Tricep Pushdown',
    nameTR: 'Triceps',
    category: 'Push',
    muscleGroup: 'Triceps',
    equipment: 'Cable',
    type: 'weight',
    icon: '💪',
    instructions: 'Kablo makinesinde, kolları aşağı it. Dirsekleri sabitle.',
    isCustom: false
  },
  {
    id: 'ex_skull_crusher',
    name: 'Skull Crusher',
    nameTR: 'Triceps İzole',
    category: 'Push',
    muscleGroup: 'Triceps',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Sırtüstü yat, bar alın üstüne indir. Dirsekleri sabit tut.',
    isCustom: false
  },
  {
    id: 'ex_pushup',
    name: 'Push-Up',
    nameTR: 'Şınav',
    category: 'Push',
    muscleGroup: 'Göğüs, Triceps, Ön Omuz',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Eller omuz genişliğinde, vücut düz. Göğsü yere değdir, tam uzat.',
    isCustom: false
  },

  /* ── PULL ─────────────────────────────────── */
  {
    id: 'ex_deadlift',
    name: 'Deadlift',
    nameTR: 'Ölü Kaldırış',
    category: 'Pull',
    muscleGroup: 'Sırt, Gluteus, Hamstring',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Bar ayak önünde, kalçaları aşağı çek. Sırtı düz tut, kalça ile it.',
    isCustom: false
  },
  {
    id: 'ex_pullup',
    name: 'Pull-Up',
    nameTR: 'Barfikse',
    category: 'Pull',
    muscleGroup: 'Latissimus, Biceps',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Çubuğa sarıl, göğsü bar hizasına kadar çek. Kontrollü in.',
    isCustom: false
  },
  {
    id: 'ex_barbell_row',
    name: 'Barbell Row',
    nameTR: 'Bent-Over Row',
    category: 'Pull',
    muscleGroup: 'Sırt, Arka Omuz',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: '45° öne eğil, barı göbek hizasına çek. Kürek kemiklerini sık.',
    isCustom: false
  },
  {
    id: 'ex_cable_row',
    name: 'Cable Row',
    nameTR: 'Kablo Rowing',
    category: 'Pull',
    muscleGroup: 'Orta Sırt, Biceps',
    equipment: 'Cable',
    type: 'weight',
    icon: '💪',
    instructions: 'Otur, kabloya uzan. Göğse doğru çek, kürek kemiklerini bir araya getir.',
    isCustom: false
  },
  {
    id: 'ex_lat_pulldown',
    name: 'Lat Pulldown',
    nameTR: 'Lat Pulldown',
    category: 'Pull',
    muscleGroup: 'Latissimus, Biceps',
    equipment: 'Cable',
    type: 'weight',
    icon: '💪',
    instructions: 'Geniş tutuşta bar göğse indir. Dirsekleri aşağı çek.',
    isCustom: false
  },
  {
    id: 'ex_bicep_curl',
    name: 'Bicep Curl',
    nameTR: 'Biceps Curl',
    category: 'Pull',
    muscleGroup: 'Biceps',
    equipment: 'Dumbbell',
    type: 'weight',
    icon: '💪',
    instructions: 'Dumbbellları sıkı tut, dirsekten bükerek curl yap. Üste sık.',
    isCustom: false
  },
  {
    id: 'ex_hammer_curl',
    name: 'Hammer Curl',
    nameTR: 'Hammer Curl',
    category: 'Pull',
    muscleGroup: 'Biceps, Brachialis',
    equipment: 'Dumbbell',
    type: 'weight',
    icon: '💪',
    instructions: 'Nötr tutuş (başparmak üstte) ile curl yap.',
    isCustom: false
  },
  {
    id: 'ex_face_pull',
    name: 'Face Pull',
    nameTR: 'Arka Omuz',
    category: 'Pull',
    muscleGroup: 'Arka Omuz, Rotator Cuff',
    equipment: 'Cable',
    type: 'weight',
    icon: '💪',
    instructions: 'İp ucunu yüze doğru çek. Dirsekler omuz hizasında, dışa aç.',
    isCustom: false
  },

  /* ── LEGS ─────────────────────────────────── */
  {
    id: 'ex_squat',
    name: 'Squat',
    nameTR: 'Squat',
    category: 'Legs',
    muscleGroup: 'Quadriceps, Gluteus, Hamstring',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Bar omuzda, kalçaları paralele kadar indir. Topukları yerden kesmeden kalk.',
    isCustom: false
  },
  {
    id: 'ex_rdl',
    name: 'Romanian Deadlift',
    nameTR: 'RDL',
    category: 'Legs',
    muscleGroup: 'Hamstring, Gluteus',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Dizler hafif bükülü, kalçaları geri it. Omurgayı düz tut.',
    isCustom: false
  },
  {
    id: 'ex_leg_press',
    name: 'Leg Press',
    nameTR: 'Bacak Pres',
    category: 'Legs',
    muscleGroup: 'Quadriceps, Gluteus',
    equipment: 'Machine',
    type: 'weight',
    icon: '🦵',
    instructions: 'Ayaklar omuz genişliğinde platforma koy. Alt 90°ye kadar indir.',
    isCustom: false
  },
  {
    id: 'ex_leg_curl',
    name: 'Leg Curl',
    nameTR: 'Hamstring Curl',
    category: 'Legs',
    muscleGroup: 'Hamstring',
    equipment: 'Machine',
    type: 'weight',
    icon: '🦵',
    instructions: 'Yüzüstü ya da oturarak makinede bacağı bükerek topuğu kalçaya yaklaştır.',
    isCustom: false
  },
  {
    id: 'ex_leg_ext',
    name: 'Leg Extension',
    nameTR: 'Quads İzole',
    category: 'Legs',
    muscleGroup: 'Quadriceps',
    equipment: 'Machine',
    type: 'weight',
    icon: '🦵',
    instructions: 'Makinede bacağı tam uzat, 1 sn tut, kontrollü indir.',
    isCustom: false
  },
  {
    id: 'ex_calf_raise',
    name: 'Calf Raise',
    nameTR: 'Baldır',
    category: 'Legs',
    muscleGroup: 'Gastrocnemius, Soleus',
    equipment: 'Machine',
    type: 'weight',
    icon: '🦵',
    instructions: 'Parmak uçlarında yüksel, tam iniş. 1 sn üstte tut.',
    isCustom: false
  },
  {
    id: 'ex_bulgarian',
    name: 'Bulgarian Split Squat',
    nameTR: 'Bulgar Squat',
    category: 'Legs',
    muscleGroup: 'Quadriceps, Gluteus',
    equipment: 'Dumbbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Arka ayak banka üstünde. Ön diz 90° bükülerek indir.',
    isCustom: false
  },
  {
    id: 'ex_hip_thrust',
    name: 'Hip Thrust',
    nameTR: 'Kalça İtme',
    category: 'Legs',
    muscleGroup: 'Gluteus Maximus',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Sırtı bankaya daya, bar kalça üstünde. Kalçayı tavana doğru it, üstte sık.',
    isCustom: false
  },

  /* ── CORE ─────────────────────────────────── */
  {
    id: 'ex_plank',
    name: 'Plank',
    nameTR: 'Plank',
    category: 'Core',
    muscleGroup: 'Core, Karın',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Önkol ve parmak uçlarında dur. Vücut düz çizgi, nefes al.',
    isCustom: false
  },
  {
    id: 'ex_crunch',
    name: 'Crunch',
    nameTR: 'Karın Kası',
    category: 'Core',
    muscleGroup: 'Rectus Abdominis',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Sırtüstü yat, eller ensede. Kürek kemiğini yerden kaldır.',
    isCustom: false
  },
  {
    id: 'ex_leg_raise',
    name: 'Leg Raise',
    nameTR: 'Bacak Kaldırma',
    category: 'Core',
    muscleGroup: 'Alt Karın',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Sırtüstü düz bacak, 90° kaldır, yavaş indir.',
    isCustom: false
  },
  {
    id: 'ex_cable_crunch',
    name: 'Cable Crunch',
    nameTR: 'Kablo Karın',
    category: 'Core',
    muscleGroup: 'Rectus Abdominis',
    equipment: 'Cable',
    type: 'weight',
    icon: '💪',
    instructions: 'Diz üstünde ipi ense arkasında tut. Karın kasılarak öne eğil.',
    isCustom: false
  },
  {
    id: 'ex_ab_wheel',
    name: 'Ab Wheel',
    nameTR: 'Ab Tekerleği',
    category: 'Core',
    muscleGroup: 'Tüm Core',
    equipment: 'Ab Wheel',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Dizler yerde, tekerleği öne ilet. Tam uzayıp geri çek.',
    isCustom: false
  },
  {
    id: 'ex_russian_twist',
    name: 'Russian Twist',
    nameTR: 'Oblique',
    category: 'Core',
    muscleGroup: 'Obliques',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'V pozisyonunda otur, gövdeyi sağa-sola döndür.',
    isCustom: false
  },
  {
    id: 'ex_dead_bug',
    name: 'Dead Bug',
    nameTR: 'Dead Bug',
    category: 'Core',
    muscleGroup: 'Core Stabilizasyon',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Sırtüstü, kollar tavana uzanmış. Karşılıklı kol-bacağı uzat.',
    isCustom: false
  },
  {
    id: 'ex_pallof',
    name: 'Pallof Press',
    nameTR: 'Pallof Press',
    category: 'Core',
    muscleGroup: 'Anti-Rotasyon Core',
    equipment: 'Cable',
    type: 'weight',
    icon: '💪',
    instructions: 'Yanlamasına kablo tut. Kolları öne uzat, core sabit tut.',
    isCustom: false
  },

  /* ── FULL BODY ────────────────────────────── */
  {
    id: 'ex_power_clean',
    name: 'Power Clean',
    nameTR: 'Power Clean',
    category: 'Full Body',
    muscleGroup: 'Tüm Vücut',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Yerden patlayıcı çekiş, bar göğse kaçırılır. Olimpik hareket.',
    isCustom: false
  },
  {
    id: 'ex_thruster',
    name: 'Thruster',
    nameTR: 'Thruster',
    category: 'Full Body',
    muscleGroup: 'Bacak, Omuz',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Front squat + overhead press kombinasyonu. Tek hamlede yap.',
    isCustom: false
  },
  {
    id: 'ex_burpee',
    name: 'Burpee',
    nameTR: 'Burpee',
    category: 'Full Body',
    muscleGroup: 'Tüm Vücut, Cardio',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🤸',
    instructions: 'Squat → eller yere → şınav konumu → ayakları çek → sıçra.',
    isCustom: false
  },
  {
    id: 'ex_turkish_getup',
    name: 'Turkish Get-Up',
    nameTR: 'Türk Kalkışı',
    category: 'Full Body',
    muscleGroup: 'Kor, Omuz, Kalça',
    equipment: 'Kettlebell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Yatarak tek kolda kettlebell tut, adım adım ayağa kalk.',
    isCustom: false
  },
  {
    id: 'ex_kb_swing',
    name: 'Kettlebell Swing',
    nameTR: 'KB Salınım',
    category: 'Full Body',
    muscleGroup: 'Kalça, Sırt, Core',
    equipment: 'Kettlebell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Kalçadan patlayıcı öne çekiş. KB omuz hizasına yüksel.',
    isCustom: false
  },
  {
    id: 'ex_bear_complex',
    name: 'Bear Complex',
    nameTR: 'Bear Complex',
    category: 'Full Body',
    muscleGroup: 'Tüm Vücut',
    equipment: 'Barbell',
    type: 'weight',
    icon: '🏋️',
    instructions: 'Power Clean → Front Squat → Push Press → Back Squat → Push Press. 1 tekrar.',
    isCustom: false
  },

  /* ── CARDIO ───────────────────────────────── */
  {
    id: 'ex_treadmill',
    name: 'Treadmill',
    nameTR: 'Koşu Bandı',
    category: 'Cardio',
    muscleGroup: 'Kardiyovasküler',
    equipment: 'Machine',
    type: 'cardio',
    icon: '🏃',
    instructions: 'Süre ve mesafe belirle. Isınma için 5 dk yürüyüşle başla.',
    isCustom: false
  },
  {
    id: 'ex_rowing',
    name: 'Rowing Machine',
    nameTR: 'Kürek Makinası',
    category: 'Cardio',
    muscleGroup: 'Tüm Vücut, Kardiyovasküler',
    equipment: 'Machine',
    type: 'cardio',
    icon: '🚣',
    instructions: 'Bacakla it, arkaya yaslan, kollarla çek. Sırayı koru.',
    isCustom: false
  },
  {
    id: 'ex_bike',
    name: 'Stationary Bike',
    nameTR: 'Bisiklet',
    category: 'Cardio',
    muscleGroup: 'Quadriceps, Kardiyovasküler',
    equipment: 'Machine',
    type: 'cardio',
    icon: '🚴',
    instructions: 'Sele yüksekliğini ayarla. Sabit ya da interval antrenman yap.',
    isCustom: false
  },
  {
    id: 'ex_elliptical',
    name: 'Elliptical',
    nameTR: 'Eliptik',
    category: 'Cardio',
    muscleGroup: 'Tüm Vücut, Eklem Dostu',
    equipment: 'Machine',
    type: 'cardio',
    icon: '🏃',
    instructions: 'Düşük darbe, yüksek kardio. Kolları da kullan.',
    isCustom: false
  },
  {
    id: 'ex_jumprope',
    name: 'Jump Rope',
    nameTR: 'Atlama İpi',
    category: 'Cardio',
    muscleGroup: 'Kardiyovasküler, Koordinasyon',
    equipment: 'Jump Rope',
    type: 'cardio',
    icon: '🪢',
    instructions: 'Bilekte döndür. 30s on / 30s off interval dene.',
    isCustom: false
  },
  {
    id: 'ex_stairclimber',
    name: 'Stair Climber',
    nameTR: 'Merdiven',
    category: 'Cardio',
    muscleGroup: 'Gluteus, Quadriceps, Cardio',
    equipment: 'Machine',
    type: 'cardio',
    icon: '🪜',
    instructions: 'Yavaş ve kontrollü adım. Tırmana yardım için korkuluğa yaslanma.',
    isCustom: false
  },

  /* ── ESNEKLİK / MOBİLİTE ─────────────────── */
  {
    id: 'ex_hip_flexor',
    name: 'Hip Flexor Stretch',
    nameTR: 'Kalça Fleksörü Germe',
    category: 'Esneklik',
    muscleGroup: 'Kalça Fleksörü',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Öne hamle, arka diz yerde. 30s tut.',
    isCustom: false
  },
  {
    id: 'ex_pigeon',
    name: 'Pigeon Pose',
    nameTR: 'Güvercin Pozu',
    category: 'Esneklik',
    muscleGroup: 'Gluteus, Kalça Dışı',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Ön bacak yatay, arka bacak uzanmış. Her iki yanda 60s tut.',
    isCustom: false
  },
  {
    id: 'ex_thoracic',
    name: 'Thoracic Rotation',
    nameTR: 'Sırt Rotasyonu',
    category: 'Esneklik',
    muscleGroup: 'Torasik Omurga',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Dört ayak pozisyonu, bir eli ense arkasında. Yavaş döndür.',
    isCustom: false
  },
  {
    id: 'ex_cat_cow',
    name: 'Cat-Cow',
    nameTR: 'Kedi-İnek',
    category: 'Esneklik',
    muscleGroup: 'Omurga, Core',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Dört ayak, nefes alarak arkaçuk yüksel, verirken batır.',
    isCustom: false
  },
  {
    id: 'ex_worlds_greatest',
    name: "World's Greatest Stretch",
    nameTR: 'Dünyanın En İyi Germe',
    category: 'Esneklik',
    muscleGroup: 'Tüm Vücut Mobilite',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Hamle pozisyonu, bir el yerde, diğer göğse. Kademe ilerlet.',
    isCustom: false
  },
  {
    id: 'ex_foam_roll',
    name: 'Foam Roll',
    nameTR: 'Köpük Silindir',
    category: 'Esneklik',
    muscleGroup: 'Tüm Kas Grupları',
    equipment: 'Foam Roller',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Tetik noktada 30-60s dur. Sırt, Quads, IT Band üzer.',
    isCustom: false
  },
  {
    id: 'ex_shoulder_circle',
    name: 'Shoulder Circles',
    nameTR: 'Omuz Dönüşleri',
    category: 'Esneklik',
    muscleGroup: 'Omuz Rotator Cuff',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Kolları yanda büyük daireler. İleri 10 + geri 10.',
    isCustom: false
  },
  {
    id: 'ex_hamstring_stretch',
    name: 'Hamstring Stretch',
    nameTR: 'Arka Bacak Germe',
    category: 'Esneklik',
    muscleGroup: 'Hamstring',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Otur, bacak uzanmış, parmak ucuna uzan. 30s tut.',
    isCustom: false
  },
  {
    id: 'ex_chest_opener',
    name: 'Chest Opener',
    nameTR: 'Göğüs Açma',
    category: 'Esneklik',
    muscleGroup: 'Göğüs, Ön Omuz',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Eller arkada kenetli, göğsü açarak kolları gerin.',
    isCustom: false
  },
  {
    id: 'ex_child_pose',
    name: "Child's Pose",
    nameTR: 'Çocuk Pozu',
    category: 'Esneklik',
    muscleGroup: 'Sırt, Kalça, Omuz',
    equipment: 'Bodyweight',
    type: 'bodyweight',
    icon: '🧘',
    instructions: 'Kollar öne uzanmış, kalçalar topuklara. Derin nefes al.',
    isCustom: false
  }
];

/* Başlangıç antrenman şablonları */
const WORKOUT_TEMPLATES = [
  {
    id: 'wt_push_a',
    name: 'Push Day A',
    category: 'Push',
    difficulty: 'Orta',
    icon: '💪',
    iconBg: '#FF9F0A',
    exercises: [
      { exerciseId: 'ex_bench_press',   targetSets: 4, targetReps: 8,  restSec: 120, notes: '' },
      { exerciseId: 'ex_incline_bench',  targetSets: 3, targetReps: 10, restSec: 90,  notes: '' },
      { exerciseId: 'ex_overhead_press', targetSets: 3, targetReps: 8,  restSec: 90,  notes: '' },
      { exerciseId: 'ex_lateral_raise',  targetSets: 3, targetReps: 15, restSec: 60,  notes: '' },
      { exerciseId: 'ex_tricep_pushdown',targetSets: 3, targetReps: 12, restSec: 60,  notes: '' }
    ]
  },
  {
    id: 'wt_pull_a',
    name: 'Pull Day A',
    category: 'Pull',
    difficulty: 'Orta',
    icon: '🏋️',
    iconBg: '#0A84FF',
    exercises: [
      { exerciseId: 'ex_deadlift',    targetSets: 4, targetReps: 5,  restSec: 180, notes: '' },
      { exerciseId: 'ex_barbell_row', targetSets: 4, targetReps: 8,  restSec: 90,  notes: '' },
      { exerciseId: 'ex_lat_pulldown',targetSets: 3, targetReps: 10, restSec: 90,  notes: '' },
      { exerciseId: 'ex_bicep_curl',  targetSets: 3, targetReps: 12, restSec: 60,  notes: '' },
      { exerciseId: 'ex_face_pull',   targetSets: 3, targetReps: 15, restSec: 60,  notes: '' }
    ]
  },
  {
    id: 'wt_legs_a',
    name: 'Leg Day A',
    category: 'Legs',
    difficulty: 'Zor',
    icon: '🦵',
    iconBg: '#30D158',
    exercises: [
      { exerciseId: 'ex_squat',    targetSets: 4, targetReps: 8,  restSec: 180, notes: '' },
      { exerciseId: 'ex_rdl',      targetSets: 3, targetReps: 10, restSec: 120, notes: '' },
      { exerciseId: 'ex_leg_press',targetSets: 3, targetReps: 12, restSec: 90,  notes: '' },
      { exerciseId: 'ex_leg_curl', targetSets: 3, targetReps: 12, restSec: 60,  notes: '' },
      { exerciseId: 'ex_calf_raise',targetSets: 4, targetReps: 15, restSec: 60, notes: '' }
    ]
  },
  {
    id: 'wt_fullbody_a',
    name: 'Full Body A',
    category: 'Full Body',
    difficulty: 'Orta',
    icon: '🔥',
    iconBg: '#FF375F',
    exercises: [
      { exerciseId: 'ex_squat',         targetSets: 3, targetReps: 8,  restSec: 120, notes: '' },
      { exerciseId: 'ex_bench_press',   targetSets: 3, targetReps: 8,  restSec: 90,  notes: '' },
      { exerciseId: 'ex_barbell_row',   targetSets: 3, targetReps: 8,  restSec: 90,  notes: '' },
      { exerciseId: 'ex_overhead_press',targetSets: 3, targetReps: 8,  restSec: 90,  notes: '' },
      { exerciseId: 'ex_deadlift',      targetSets: 2, targetReps: 5,  restSec: 180, notes: '' }
    ]
  },
  {
    id: 'wt_upper_a',
    name: 'Upper Body A',
    category: 'Push',
    difficulty: 'Başlangıç',
    icon: '💪',
    iconBg: '#BF5AF2',
    exercises: [
      { exerciseId: 'ex_pushup',       targetSets: 3, targetReps: 15, restSec: 60, notes: '' },
      { exerciseId: 'ex_pullup',       targetSets: 3, targetReps: 8,  restSec: 90, notes: '' },
      { exerciseId: 'ex_overhead_press',targetSets: 3, targetReps: 10, restSec: 60, notes: '' },
      { exerciseId: 'ex_bicep_curl',   targetSets: 3, targetReps: 12, restSec: 60, notes: '' },
      { exerciseId: 'ex_tricep_pushdown',targetSets: 3, targetReps: 12, restSec: 60, notes: '' }
    ]
  },
  {
    id: 'wt_core_blast',
    name: 'Core Blast',
    category: 'Core',
    difficulty: 'Orta',
    icon: '🎯',
    iconBg: '#FFD60A',
    exercises: [
      { exerciseId: 'ex_plank',        targetSets: 3, targetReps: 60, restSec: 60, notes: 'saniye' },
      { exerciseId: 'ex_crunch',       targetSets: 3, targetReps: 20, restSec: 45, notes: '' },
      { exerciseId: 'ex_leg_raise',    targetSets: 3, targetReps: 15, restSec: 60, notes: '' },
      { exerciseId: 'ex_russian_twist',targetSets: 3, targetReps: 20, restSec: 45, notes: 'her taraf' },
      { exerciseId: 'ex_dead_bug',     targetSets: 3, targetReps: 10, restSec: 60, notes: 'her taraf' }
    ]
  }
];
