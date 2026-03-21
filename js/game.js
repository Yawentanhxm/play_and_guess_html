const KEY_SIGNATURES = {
    'C':  { name: 'C大调', scale: [0, 2, 4, 5, 7, 9, 11], root: 0 },
    'G':  { name: 'G大调', scale: [0, 2, 4, 6, 7, 9, 11], root: 7 },
    'D':  { name: 'D大调', scale: [1, 2, 4, 6, 7, 9, 11], root: 2 },
    'A':  { name: 'A大调', scale: [1, 2, 4, 6, 8, 9, 11], root: 9 },
    'E':  { name: 'E大调', scale: [1, 3, 4, 6, 8, 9, 11], root: 4 },
    'B':  { name: 'B大调', scale: [1, 3, 5, 6, 8, 10, 11], root: 11 },
    'F#': { name: 'F#大调', scale: [1, 3, 5, 6, 8, 10, 11], root: 6 },
    'F':  { name: 'F大调', scale: [0, 2, 4, 5, 7, 9, 10], root: 5 },
    'Bb': { name: 'Bb大调', scale: [0, 2, 3, 5, 7, 8, 10], root: 10 },
    'Eb': { name: 'Eb大调', scale: [0, 1, 3, 5, 7, 8, 10], root: 3 },
    'Ab': { name: 'Ab大调', scale: [0, 1, 3, 5, 6, 8, 10], root: 8 },
    'Db': { name: 'Db大调', scale: [0, 1, 3, 4, 6, 8, 10], root: 1 },
    'Am': { name: 'A小调', scale: [0, 2, 4, 5, 7, 9, 11], root: 9 },
    'Em': { name: 'E小调', scale: [0, 2, 4, 6, 7, 9, 11], root: 4 },
    'Bm': { name: 'B小调', scale: [1, 2, 4, 6, 7, 9, 11], root: 11 },
    'F#m': { name: 'F#小调', scale: [1, 2, 4, 6, 8, 9, 11], root: 6 },
    'C#m': { name: 'C#小调', scale: [1, 3, 4, 6, 8, 9, 11], root: 1 },
    'Dm': { name: 'D小调', scale: [0, 2, 4, 5, 7, 9, 10], root: 2 },
    'Gm': { name: 'G小调', scale: [0, 2, 3, 5, 7, 8, 10], root: 7 },
    'Cm': { name: 'C小调', scale: [0, 1, 3, 5, 7, 8, 10], root: 0 },
};

function detectKeySignature(midiData) {
    for (const track of midiData.tracks) {
        if (track.keySignatures && track.keySignatures.length > 0) {
            const ks = track.keySignatures[0];
            console.log('MIDI Meta Event 原始 keySignatures[0]:', JSON.stringify(ks));

            // @tonejs/midi 返回格式：{ key: 'C', scale: 'major' } 或 { key: 'A', scale: 'minor' }
            // 也可能是字符串 'C major' / 'A minor'
            let rawKey = '';
            let rawScale = '';

            if (typeof ks === 'string') {
                // 格式: 'C major' / 'A minor'
                const parts = ks.trim().split(/\s+/);
                rawKey = parts[0] || '';
                rawScale = parts[1] || 'major';
            } else if (ks && typeof ks === 'object') {
                rawKey = ks.key || '';
                rawScale = ks.scale || 'major';
            }

            // 映射到 KEY_SIGNATURES 键名
            const isMinor = rawScale.toLowerCase().includes('minor');
            const mappedKey = isMinor ? rawKey + 'm' : rawKey;

            console.log('调号映射结果:', rawKey, '+', rawScale, '→', mappedKey);

            if (KEY_SIGNATURES[mappedKey]) {
                console.log('使用 MIDI Meta 调号:', mappedKey);
                return mappedKey;
            }

            console.log('映射键不在 KEY_SIGNATURES 中，回退到分析...');
        }
    }

    console.log('无有效 Meta Event 调号，使用 Tonal.js 分析...');
    return detectKeyByTonal(midiData);
}

function detectKeyByTonal(midiData) {
    // 只用旋律轨道的音符，减少伴奏干扰
    const melodyTrack = selectMelodyTrack(midiData.tracks);
    const sourceTrack = melodyTrack || midiData.tracks[0];

    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const notes = [];
    for (const note of (sourceTrack?.notes || [])) {
        notes.push(noteNames[note.midi % 12]);
    }

    console.log('Tonal 分析音符数量:', notes.length, '样本:', notes.slice(0, 20).join(','));

    if (typeof Tonal !== 'undefined') {
        // Tonal 返回格式如 "G major" / "A minor"，需拆分映射到 KEY_SIGNATURES
        const tryDetect = (fn) => {
            try { return fn(); } catch(e) { return null; }
        };

        const keyResult =
            tryDetect(() => Tonal.Key?.detect(notes)) ||
            tryDetect(() => Tonal.Detect?.key(notes));

        console.log('Tonal 检测结果:', keyResult);

        if (keyResult && keyResult.length > 0) {
            const raw = keyResult[0]; // e.g. "G major" 或 "A minor"
            if (typeof raw === 'string') {
                const parts = raw.trim().split(/\s+/);
                const rootPart = parts[0]; // "G"
                const scalePart = (parts[1] || 'major').toLowerCase();
                const isMinor = scalePart.includes('minor');
                const mappedKey = isMinor ? rootPart + 'm' : rootPart;
                console.log('Tonal 调号映射:', raw, '→', mappedKey);
                if (KEY_SIGNATURES[mappedKey]) {
                    return mappedKey;
                }
            } else if (KEY_SIGNATURES[raw]) {
                return raw;
            }
        }
    } else {
        console.log('Tonal 未加载');
    }

    return detectKeyByNoteDistribution(midiData);
}

function detectKeyByNoteDistribution(midiData) {
    const noteCounts = new Array(12).fill(0);
    // 修复：记录每个音高首次出现的「顺序编号」而非 MIDI tick 时间
    const noteFirstOrder = {};  // pitchClass → 首次出现的序号（0起）
    let noteOrderIndex = 0;
    const allNotes = [];        // 用于末尾终止音分析

    for (const track of midiData.tracks) {
        for (const note of track.notes) {
            const pitchClass = note.midi % 12;
            noteCounts[pitchClass]++;
            allNotes.push(pitchClass);

            if (noteFirstOrder[pitchClass] === undefined) {
                noteFirstOrder[pitchClass] = noteOrderIndex;
            }
            noteOrderIndex++;
        }
    }

    console.log('音符分布:', noteCounts.map((c, i) => `${i}:${c}`).join(', '));

    // 终止音加权：取末尾 max(10, 10%) 个音符统计分布
    const endingCount = Math.max(10, Math.floor(allNotes.length * 0.1));
    const endingNotes = allNotes.slice(-endingCount);
    const endingCounts = new Array(12).fill(0);
    for (const pc of endingNotes) {
        endingCounts[pc]++;
    }
    console.log('末尾音符分布（终止音加权样本）:', endingCounts.map((c, i) => `${i}:${c}`).join(', '));

    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
    const minorKeys = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'Dm', 'Gm', 'Cm'];

    let bestKey = 'C';
    let bestScore = -Infinity;

    for (const keyName of [...majorKeys, ...minorKeys]) {
        const key = KEY_SIGNATURES[keyName];
        if (!key) continue;

        let score = 0;
        const scale = key.scale;

        for (let i = 0; i < 12; i++) {
            if (scale.includes(i)) {
                score += noteCounts[i] * 2;
            } else {
                score -= noteCounts[i];
            }
        }

        const root = key.root;
        if (noteCounts[root] > 0) {
            // 修复：用顺序编号（< 5 = 前5个不同音高）而非 MIDI tick 时间
            const isLikelyRoot = noteFirstOrder[root] !== undefined && noteFirstOrder[root] < 5;
            if (isLikelyRoot) {
                score += noteCounts[root] * 3;
            }
        }

        // 终止音加权：末尾区段中根音出现越多越可能是该调
        if (endingCounts[root] > 0) {
            score += endingCounts[root] * 5;
        }

        const dominant = (root + 7) % 12;
        const subdominant = (root + 5) % 12;
        score += noteCounts[dominant] + noteCounts[subdominant];

        if (score > bestScore) {
            bestScore = score;
            bestKey = keyName;
        }
    }
    
    console.log('分析得出调号:', bestKey, '得分:', bestScore);
    return bestKey;
}

function midiToJianpu(midiNote, keySignature) {
    const key = KEY_SIGNATURES[keySignature] || KEY_SIGNATURES['C'];
    const noteInOctave = midiNote % 12;

    const scale = key.scale; // 按音高值排序，如G大调=[0,2,4,6,7,9,11]

    // 关键修复：从根音位置开始重排 scale，使 root 对应 note=1
    // G大调: root=7, rootIndex=4, orderedScale=[7,9,11,0,2,4,6]
    //        → G=1, A=2, B=3, C=4, D=5, E=6, F#=7  ✅
    const rootIndex = scale.indexOf(key.root);
    const orderedScale = rootIndex <= 0
        ? scale
        : [...scale.slice(rootIndex), ...scale.slice(0, rootIndex)];

    let noteNum = orderedScale.indexOf(noteInOctave);

    if (noteNum === -1) {
        // 不在音阶内（半音），找最近的音阶音（考虑环形距离）
        let minDist = 13;
        for (let i = 0; i < orderedScale.length; i++) {
            const diff = Math.abs(noteInOctave - orderedScale[i]);
            const dist = Math.min(diff, 12 - diff);
            if (dist < minDist) {
                minDist = dist;
                noteNum = i;
            }
        }
    }

    // 计算八度：以调号根音为基准，而非以 C 为界
    // 先找根音在"中八度"的 MIDI 音高（固定在 60-71 范围内，即 C4-B4）
    let middleRoot = key.root;
    while (middleRoot < 60) middleRoot += 12;
    while (middleRoot >= 72) middleRoot -= 12;
    // 例：A大调 root=9 → middleRoot=69(A4)，octave 0 = A4~G#5
    //     C大调 root=0 → middleRoot=60(C4)，octave 0 = C4~B4（与原来一致）
    const rawOctave = Math.floor((midiNote - middleRoot) / 12);
    const octave = Math.max(-1, Math.min(1, rawOctave));

    return { noteNum: noteNum + 1, octave };
}

// 任务1.1：旋律轨道识别算法
function selectMelodyTrack(tracks) {
    const tracksWithNotes = tracks.filter(t => t.notes && t.notes.length > 0);
    if (tracksWithNotes.length === 0) return null;
    if (tracksWithNotes.length === 1) return tracksWithNotes[0];

    let bestTrack = null;
    let bestScore = -Infinity;

    for (const track of tracksWithNotes) {
        const notes = track.notes;
        const avgMidi = notes.reduce((s, n) => s + n.midi, 0) / notes.length;

        // 平均音高是最可靠的旋律判据：
        // 钢琴右手旋律通常在 MIDI 55-84（G3-C6）
        // 左手伴奏通常低于 MIDI 55
        // 权重：平均音高 × 2（主要判据）+ 音符数量辅助
        const pitchScore = avgMidi * 2;

        // 音符数量（辅助，归一化最多20分，避免伴奏音符多压过旋律）
        const noteCountScore = Math.min(20, notes.length / 10);

        // 单音率（辅助，最多20分）
        const timeGroups = new Map();
        for (const note of notes) {
            const t = Math.round(note.time * 100);
            if (!timeGroups.has(t)) timeGroups.set(t, []);
            timeGroups.get(t).push(note);
        }
        const monoRate = timeGroups.size > 0
            ? [...timeGroups.values()].filter(g => g.length === 1).length / timeGroups.size
            : 0;
        const monoScore = monoRate * 20;

        const score = pitchScore + noteCountScore + monoScore;
        console.log(`轨道 "${track.name || '未命名'}"：平均音高=${avgMidi.toFixed(1)} 音符数=${notes.length} 单音率=${(monoRate*100).toFixed(1)}% 得分=${score.toFixed(1)}`);

        if (score > bestScore) {
            bestScore = score;
            bestTrack = track;
        }
    }

    console.log('选定旋律轨道:', bestTrack?.name || '未命名', '得分:', bestScore.toFixed(1));
    return bestTrack;
}

function extractNotesFromMidi(midiData) {
    const keySignature = detectKeySignature(midiData);
    const keyInfo = KEY_SIGNATURES[keySignature] || KEY_SIGNATURES['C'];
    console.log('检测到调号:', keyInfo.name);

    // 任务1.2：使用旋律轨道识别，替代原来的"取第一条≥10音符轨"
    const melodyTrack = selectMelodyTrack(midiData.tracks);
    if (!melodyTrack) return { notes: [], keySignature, keyName: keyInfo.name };

    // 任务1.3：过滤同时多音符，每个 tick 位置只保留最高音
    // 用 note.ticks（MIDI原生整数 tick）而非浮点秒数，精确识别同拍和弦
    const timeGroups = new Map();
    for (const note of melodyTrack.notes) {
        const midiNote = note.midi;
        if (midiNote < 24 || midiNote > 108) continue;
        // 优先用 ticks（精确），回退到 100ms 精度的秒数
        const t = note.ticks !== undefined ? note.ticks : Math.round(note.time * 100);
        if (!timeGroups.has(t) || timeGroups.get(t).midi < midiNote) {
            timeGroups.set(t, note);
        }
    }

    // 按时间排序（ticks 本身就是时间顺序）
    const sortedNotes = [...timeGroups.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, note]) => note);

    const notes = [];
    for (const note of sortedNotes) {
        const midiNote = note.midi;
        // 任务2.1 + 2.2：计算 note + octave
        const { noteNum, octave } = midiToJianpu(midiNote, keySignature);

        let durationValue = 1;
        if (note.duration >= 3.5) durationValue = 2;
        else if (note.duration >= 1.75) durationValue = 1.5;
        else if (note.duration <= 0.75) durationValue = 0.5;

        notes.push({
            note: noteNum,
            octave,              // -1=低, 0=中, 1=高
            duration: durationValue,
            midiNote,
            _startTime: note.time
        });
    }

    return { notes, keySignature, keyName: keyInfo.name };
}

class Game {
    constructor() {
        this.currentLevel = 1;
        this.score = 0;
        this.isPlaying = false;
        this.isAnswering = false;
        this.isProcessingNote = false;
        this.currentSong = null;
        this.currentNoteIndex = 0;
        this.timeRemaining = ANSWER_TIME;
        this.timerInterval = null;
        this.playInterval = null;
        this.songOrder = [];
        this.currentSongIndex = 0;
        this.currentCategory = null;

        this.initElements();
        this.initEventListeners();
        this.createStars();
    }

    initElements() {
        this.startScreen = document.getElementById('startScreen');
        this.categoryScreen = document.getElementById('categoryScreen');
        this.playScreen = document.getElementById('playScreen');
        this.answerScreen = document.getElementById('answerScreen');
        this.resultOverlay = document.getElementById('resultOverlay');
        this.endScreen = document.getElementById('endScreen');

        this.scoreDisplay = document.getElementById('score');
        this.levelDisplay = document.getElementById('level');
        this.keySignatureDisplay = document.getElementById('keySignature');
        this.sheetDisplay = document.getElementById('sheetDisplay');
        this.keyboardGuide = document.getElementById('keyboardGuide');
        this.playTips = document.getElementById('playTips');
        this.timerProgress = document.getElementById('timerProgress');
        this.timerText = document.getElementById('timerText');
        this.optionsContainer = document.getElementById('options');
        this.resultIcon = document.getElementById('resultIcon');
        this.resultText = document.getElementById('resultText');
        this.resultSong = document.getElementById('resultSong');
        this.finalScore = document.getElementById('finalScore');
        this.scoreText = document.getElementById('scoreText');

        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.categoryButtons = document.querySelectorAll('.category-btn');
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => {
            console.log('Start button clicked, will load MIDI when game starts');
            this.startGame();
        });
        this.restartBtn.addEventListener('click', () => this.restartGame());

        this.categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.selectCategory(category);
            });
        });

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        this.optionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) {
                this.handleAnswer(parseInt(e.target.dataset.index));
            }
        });
    }

    generateSongOrder() {
        this.songOrder = [...Array(SONGS.length).keys()];
        for (let i = this.songOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.songOrder[i], this.songOrder[j]] = [this.songOrder[j], this.songOrder[i]];
        }
        this.currentSongIndex = 0;
    }

    createStars() {
        const starsContainer = document.getElementById('stars');
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (2 + Math.random() * 2) + 's';
            starsContainer.appendChild(star);
        }
    }

    startGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.updateDisplay();
        
        this.loadMIDISongs().then(() => {
            console.log('MIDI loading complete, showing category screen');
            this.showCategoryScreen();
        });
    }

    async loadMIDISongs() {
        console.log('Starting to load MIDI files...');
        
        for (const midiFile of MIDI_FILES) {
            try {
                console.log('Loading:', `data/${midiFile.file}`);
                const pathParts = midiFile.file.split('/');
                const category = pathParts[0];
                console.log('Category:', category);
                
                const midiData = await Midi.fromUrl(`data/${midiFile.file}`);
                const { notes, keySignature, keyName } = extractNotesFromMidi(midiData);
                console.log('Notes extracted:', notes.length);
                
                if (notes.length > 0) {
                    console.log('=== 花海 MIDI音符分析 ===');
                    console.log('调号:', keyName);
                    const sample = notes.slice(0, 10).map(n => ({
                        midi: n.midiNote,
                        jianpu: n.note,
                        duration: n.duration
                    }));
                    console.log(JSON.stringify(sample, null, 2));
                    console.log('前30个简谱:', notes.slice(0, 30).map(n => n.note).join(','));
                    console.log('====================');
                    
                    SONGS.push({
                        id: Date.now() + Math.random(),
                        name: midiFile.name,
                        category: category,
                        tempo: midiData.bpm,
                        notes: notes,
                        keySignature: keySignature,
                        keyName: keyName,
                        options: midiFile.options,
                        isMIDI: true
                    });
                }
            } catch (e) {
                console.error(`Failed to load ${midiFile.file}:`, e);
            }
        }
        
        console.log('Loaded songs:', SONGS.length);
        if (SONGS.length > 0) {
            console.log('First song notes sample:', SONGS[0].notes.slice(0, 10));
        }
        console.log('SONGS:', SONGS);
    }

    restartGame() {
        this.endScreen.classList.add('hidden');
        this.showCategoryScreen();
    }

    updateDisplay() {
        this.scoreDisplay.textContent = this.score;
        this.levelDisplay.textContent = this.currentLevel;
    }

    startLevel() {
        if (this.currentSongIndex >= this.songOrder.length) {
            this.showEndScreen();
            return;
        }

        const songId = this.songOrder[this.currentSongIndex];
        this.currentSong = SONGS.find(s => s.id === songId);
        
        if (!this.currentSong) {
            this.showEndScreen();
            return;
        }
        
        this.currentNoteIndex = 0;
        this.isPlaying = true;
        this.isAnswering = false;
        this.updateDisplay();
        
        if (this.currentSong.keyName) {
            this.keySignatureDisplay.textContent = `调号: ${this.currentSong.keyName}`;
        } else {
            this.keySignatureDisplay.textContent = '';
        }

        this.showScreen('play');
        this.renderSheet();
        this.renderKeyboard();
        this.playTips.textContent = '请跟随简谱弹奏...';
        this.playNotes();
    }

    showScreen(screen) {
        this.startScreen.classList.add('hidden');
        this.categoryScreen.classList.add('hidden');
        this.playScreen.classList.add('hidden');
        this.answerScreen.classList.add('hidden');
        this.resultOverlay.classList.add('hidden');
        this.endScreen.classList.add('hidden');

        switch (screen) {
            case 'start':
                this.startScreen.classList.remove('hidden');
                break;
            case 'category':
                this.categoryScreen.classList.remove('hidden');
                break;
            case 'play':
                this.playScreen.classList.remove('hidden');
                break;
            case 'answer':
                this.answerScreen.classList.remove('hidden');
                break;
            case 'result':
                this.resultOverlay.classList.remove('hidden');
                break;
            case 'end':
                this.endScreen.classList.remove('hidden');
                break;
        }
    }

    showCategoryScreen() {
        this.showScreen('category');
    }

    selectCategory(category) {
        console.log('selectCategory called, category:', category);
        console.log('SONGS at selectCategory:', SONGS);
        
        this.currentCategory = category;
        const categorySongs = SONGS.filter(song => song.category === category);
        console.log('categorySongs:', categorySongs);
        
        if (categorySongs.length === 0) {
            alert('该分类下没有歌曲');
            return;
        }
        
        this.songOrder = [];
        const shuffled = [...categorySongs];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const selectedCount = Math.min(TOTAL_LEVELS, shuffled.length);
        for (let i = 0; i < selectedCount; i++) {
            this.songOrder.push(shuffled[i].id);
        }
        
        this.currentSongIndex = 0;
        this.startLevel();
    }

    renderSheet() {
        this.sheetDisplay.innerHTML = '';
        const notes = this.currentSong.notes;
        const tempo = this.currentSong.tempo || 120;

        // 按小节分组：每小节总时值 = 4拍（4/4拍），累计时值满4拍则换小节
        // 每行4小节，小节间加竖线分隔符
        const BEATS_PER_MEASURE = 4;
        const MEASURES_PER_ROW = 4;

        // 先把音符分组成小节
        const measures = [];   // measures[i] = [ noteData, ... ]
        let currentMeasure = [];
        let beatAccum = 0;

        notes.forEach((noteData) => {
            currentMeasure.push(noteData);
            beatAccum += noteData.duration;
            if (beatAccum >= BEATS_PER_MEASURE) {
                measures.push(currentMeasure);
                currentMeasure = [];
                beatAccum = 0;
            }
        });
        if (currentMeasure.length > 0) measures.push(currentMeasure);

        // 按行渲染：每行 MEASURES_PER_ROW 个小节
        let noteGlobalIndex = 0;
        for (let rowStart = 0; rowStart < measures.length; rowStart += MEASURES_PER_ROW) {
            const rowMeasures = measures.slice(rowStart, rowStart + MEASURES_PER_ROW);
            const rowEl = document.createElement('div');
            rowEl.className = 'sheet-row';

            // 行首小节线
            rowEl.appendChild(this._makeBarLine('row-start'));

            rowMeasures.forEach((measure, mIdx) => {
                const measureEl = document.createElement('div');
                measureEl.className = 'sheet-measure';

                measure.forEach((noteData) => {
                    const noteElement = document.createElement('span');
                    noteElement.className = 'note';
                    noteElement.textContent = this.formatNote(noteData.note);
                    noteElement.dataset.index = noteGlobalIndex++;

                    if (noteData.duration >= 2) noteElement.classList.add('long');
                    else if (noteData.duration === 1.5) noteElement.classList.add('dotted');
                    else if (noteData.duration <= 0.5) noteElement.classList.add('short');

                    if (noteData.octave === 1) noteElement.classList.add('octave-high');
                    else if (noteData.octave === -1) noteElement.classList.add('octave-low');

                    measureEl.appendChild(noteElement);
                });

                rowEl.appendChild(measureEl);
                // 每小节后加竖线
                rowEl.appendChild(this._makeBarLine(mIdx === rowMeasures.length - 1 ? 'row-end' : 'mid'));
            });

            this.sheetDisplay.appendChild(rowEl);
        }
    }

    _makeBarLine(type) {
        const bar = document.createElement('span');
        bar.className = `bar-line bar-line--${type}`;
        bar.textContent = type === 'row-end' ? '‖' : '|';
        return bar;
    }

    formatNote(noteNum) {
        if (noteNum === 1) return '1';
        if (noteNum === 2) return '2';
        if (noteNum === 3) return '3';
        if (noteNum === 4) return '4';
        if (noteNum === 5) return '5';
        if (noteNum === 6) return '6';
        if (noteNum === 7) return '7';
        return noteNum.toString();
    }

    renderKeyboard() {
        const keys = this.keyboardGuide.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('active', 'pressed');
        });
    }

    playNotes() {
        this.playTips.textContent = '请按下对应按键...';
        this.highlightNote(0);
        const firstNote = this.currentSong.notes[0];
        this.highlightKey(firstNote.note, firstNote.octave ?? 0);

        // 30秒弹奏时限：时间到强制进入答题
        const PLAY_TIME_LIMIT = 30000;
        this.playTimeLimit = setTimeout(() => {
            if (!this.isPlaying || this.isAnswering) return;
            console.log('弹奏时间到，自动进入答题');
            this._skipToAnswer();
        }, PLAY_TIME_LIMIT);

        // 倒计时提示更新
        let remaining = 30;
        this.playCountdown = setInterval(() => {
            remaining--;
            if (remaining <= 0 || !this.isPlaying || this.isAnswering) {
                clearInterval(this.playCountdown);
                return;
            }
            this.playTips.textContent = `请按下对应按键... (${remaining}s)`;
        }, 1000);

        // Enter 键直接答题
        this._enterHandler = (e) => {
            if (e.key === 'Enter' && this.isPlaying && !this.isAnswering) {
                this._skipToAnswer();
            }
        };
        document.addEventListener('keydown', this._enterHandler);
    }

    _skipToAnswer() {
        this.clearPlayInterval();
        this.isPlaying = false;
        this.isProcessingNote = false;
        const keys = this.keyboardGuide.querySelectorAll('.key');
        keys.forEach(key => key.classList.remove('active', 'pressed'));
        document.removeEventListener('keydown', this._enterHandler);
        this.startAnswerPhase();
    }

    advanceToNextNoteWithDelay() {
        // 播放时长由原曲 tempo + 音符时值决定，与用户输入速度无关
        // isProcessingNote = true 在整个等待期间锁住输入，用户无法提前按下一个键
        const tempo = this.currentSong.tempo || 120;
        const currentNoteDuration = this.currentSong.notes[this.currentNoteIndex].duration;
        const beatDuration = 60000 / tempo;           // 一拍多少 ms
        const duration = beatDuration * currentNoteDuration; // 本音符时值 ms

        setTimeout(() => {
            if (!this.isPlaying) {
                this.isProcessingNote = false;
                return;
            }

            this.currentNoteIndex++;

            if (this.currentNoteIndex >= this.currentSong.notes.length) {
                // 所有音符弹完，清除时限定时器
                this.clearPlayInterval();
                const keys = this.keyboardGuide.querySelectorAll('.key');
                keys.forEach(key => key.classList.remove('active'));
                audioManager.playComplete();
                setTimeout(() => {
                    this.isProcessingNote = false;
                    this.startAnswerPhase();
                }, 500);
                return;
            }

            this.highlightNote(this.currentNoteIndex);
            const n = this.currentSong.notes[this.currentNoteIndex];
            this.highlightKey(n.note, n.octave ?? 0);
            this.playTips.textContent = '请按下对应按键...';
            this.isProcessingNote = false;
        }, duration);
    }

    highlightNote(index) {
        const notes = this.sheetDisplay.querySelectorAll('.note');
        notes.forEach((note, i) => {
            note.classList.remove('active', 'played', 'missed');
            if (i < index) {
                note.classList.add('played');
            } else if (i === index) {
                note.classList.add('active');
            }
        });
    }

    // 任务5.2：highlightKey 支持 octave 参数
    highlightKey(note, octave = 0) {
        const keys = this.keyboardGuide.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('active');
            if (parseInt(key.dataset.note) === note &&
                parseInt(key.dataset.octave) === octave) {
                key.classList.add('active');
            }
        });
    }

    clearPlayInterval() {
        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        // 清除弹奏时限定时器
        if (this.playTimeLimit) {
            clearTimeout(this.playTimeLimit);
            this.playTimeLimit = null;
        }
        if (this.playCountdown) {
            clearInterval(this.playCountdown);
            this.playCountdown = null;
        }
    }

    handleKeyPress(e) {
        if (!this.isPlaying || this.isAnswering || this.isProcessingNote) return;

        // 任务5.3：三排键盘映射表 key → { note, octave }
        const FULL_KEY_MAP = {
            // 高八度 Q-U → note 1-7, octave 1
            'q': { note: 1, octave: 1 }, 'w': { note: 2, octave: 1 },
            'e': { note: 3, octave: 1 }, 'r': { note: 4, octave: 1 },
            't': { note: 5, octave: 1 }, 'y': { note: 6, octave: 1 },
            'u': { note: 7, octave: 1 },
            // 中八度 A-J → note 1-7, octave 0
            'a': { note: 1, octave: 0 }, 's': { note: 2, octave: 0 },
            'd': { note: 3, octave: 0 }, 'f': { note: 4, octave: 0 },
            'g': { note: 5, octave: 0 }, 'h': { note: 6, octave: 0 },
            'j': { note: 7, octave: 0 },
            // 低八度 Z-M → note 1-7, octave -1
            'z': { note: 1, octave: -1 }, 'x': { note: 2, octave: -1 },
            'c': { note: 3, octave: -1 }, 'v': { note: 4, octave: -1 },
            'b': { note: 5, octave: -1 }, 'n': { note: 6, octave: -1 },
            'm': { note: 7, octave: -1 },
        };

        const key = e.key.toLowerCase();
        if (!(key in FULL_KEY_MAP)) return;

        const currentNote = this.currentSong.notes[this.currentNoteIndex];
        const expectedNote = currentNote.note;
        const expectedOctave = currentNote.octave ?? 0;

        const pressed = FULL_KEY_MAP[key];
        const keyElement = this.keyboardGuide.querySelector(
            `[data-note="${pressed.note}"][data-octave="${pressed.octave}"]`
        );

        if (pressed.note === expectedNote && pressed.octave === expectedOctave) {
            this.isProcessingNote = true;

            // 音频时长 = 原曲时值（秒），与 advanceToNextNoteWithDelay 的等待时长严格一致
            const tempo = this.currentSong.tempo || 120;
            const noteDurationSec = (60 / tempo) * currentNote.duration;

            // 音频按原曲时值播放；isProcessingNote=true 会锁住键盘直到这段时间结束
            audioManager.playNoteByMidi(currentNote.midiNote, noteDurationSec);

            if (keyElement) keyElement.classList.add('pressed');

            const noteElement = this.sheetDisplay.querySelector(`[data-index="${this.currentNoteIndex}"]`);
            if (noteElement) {
                noteElement.classList.remove('active');
                noteElement.classList.add('played');
            }

            // 按键高亮持续整个音符时值
            setTimeout(() => {
                if (keyElement) keyElement.classList.remove('pressed');
            }, noteDurationSec * 1000);

            this.playTips.textContent = '等待节奏...';
            this.advanceToNextNoteWithDelay();
        } else {
            if (keyElement) {
                keyElement.classList.add('pressed');
                setTimeout(() => keyElement.classList.remove('pressed'), 150);
            }
        }
    }

    advanceToNextNote() {
        this.currentNoteIndex++;

        if (this.currentNoteIndex >= this.currentSong.notes.length) {
            const keys = this.keyboardGuide.querySelectorAll('.key');
            keys.forEach(key => key.classList.remove('active'));
            audioManager.playComplete();
            setTimeout(() => this.startAnswerPhase(), 500);
            return;
        }

        this.highlightNote(this.currentNoteIndex);
        const nn = this.currentSong.notes[this.currentNoteIndex];
        this.highlightKey(nn.note, nn.octave ?? 0);
        this.playTips.textContent = '请按下对应按键...';
    }

    startAnswerPhase() {
        this.isPlaying = false;
        this.isAnswering = true;
        this.timeRemaining = ANSWER_TIME;

        this.showScreen('answer');
        this.renderOptions();
        this.startTimer();
    }

    renderOptions() {
        const buttons = this.optionsContainer.querySelectorAll('.option-btn');
        const shuffledOptions = this.shuffleArray([...this.currentSong.options]);
        
        buttons.forEach((btn, index) => {
            btn.textContent = shuffledOptions[index];
            btn.dataset.answer = shuffledOptions[index];
            btn.classList.remove('correct', 'wrong');
            btn.disabled = false;
        });
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    startTimer() {
        this.timerProgress.style.strokeDashoffset = '0';
        this.timerProgress.classList.remove('warning', 'danger');

        const circumference = 2 * Math.PI * 45;
        this.timerProgress.style.strokeDasharray = circumference;

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.timerText.textContent = this.timeRemaining;

            const progress = this.timeRemaining / ANSWER_TIME;
            const offset = circumference * (1 - progress);
            this.timerProgress.style.strokeDashoffset = offset;

            if (this.timeRemaining <= 5 && this.timeRemaining > 3) {
                this.timerProgress.classList.add('warning');
            } else if (this.timeRemaining <= 3) {
                this.timerProgress.classList.remove('warning');
                this.timerProgress.classList.add('danger');
            }

            if (this.timeRemaining <= 0) {
                this.clearTimer();
                this.handleTimeout();
            }
        }, 1000);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleTimeout() {
        this.handleAnswer(-1);
    }

    handleAnswer(selectedIndex) {
        if (!this.isAnswering) return;

        this.clearTimer();
        this.isAnswering = false;

        const buttons = this.optionsContainer.querySelectorAll('.option-btn');
        const correctAnswer = this.currentSong.name;
        const selectedAnswer = selectedIndex >= 0 ? buttons[selectedIndex].dataset.answer : null;
        const isCorrect = selectedAnswer === correctAnswer;

        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn === buttons[selectedIndex]) {
                btn.classList.add('wrong');
            }
        });

        if (isCorrect) {
            this.score += POINTS_CORRECT;
            audioManager.playCorrect();
            this.showResult(true);
            this.createCelebration();
        } else {
            audioManager.playWrong();
            this.showResult(false);
        }

        this.resultSong.textContent = correctAnswer;
        this.updateDisplay();

        setTimeout(() => {
            this.nextLevel();
        }, 1500);
    }

    showResult(isCorrect) {
        this.resultIcon.textContent = isCorrect ? '✓' : '✗';
        this.resultIcon.className = 'result-icon ' + (isCorrect ? 'correct' : 'wrong');
        
        this.resultText.textContent = isCorrect ? '正确!' : '错误!';
        this.resultText.className = 'result-text ' + (isCorrect ? 'correct' : 'wrong');

        this.showScreen('result');
    }

    createCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        
        const colors = ['#06d6a0', '#00f5d4', '#7b2cbf', '#ffd166'];
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = '-10px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            celebration.appendChild(particle);
        }
        
        document.body.appendChild(celebration);
        
        setTimeout(() => {
            celebration.remove();
        }, 2500);
    }

    nextLevel() {
        this.resultOverlay.classList.add('hidden');
        
        if (this.currentLevel >= TOTAL_LEVELS) {
            this.showEndScreen();
            return;
        }

        this.currentLevel++;
        this.currentSongIndex++;
        this.updateDisplay();
        this.startLevel();
    }

    showEndScreen() {
        this.finalScore.textContent = this.score;
        
        if (this.score >= 80) {
            this.scoreText.textContent = '太棒了！你是音乐大师！';
        } else if (this.score >= 60) {
            this.scoreText.textContent = '很厉害哦！继续加油！';
        } else if (this.score >= 40) {
            this.scoreText.textContent = '还不错，继续努力！';
        } else {
            this.scoreText.textContent = '再试一次吧！';
        }

        this.showScreen('end');
    }
}
