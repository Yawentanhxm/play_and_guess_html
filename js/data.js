// 流行歌单：每首歌只取一个代表版本，name 是用于猜题的歌名
let MIDI_FILES = [];

async function loadMidiIndex() {
    const resp = await fetch('data/index.json');
    MIDI_FILES = await resp.json();
    console.log(`歌单加载完成：共 ${MIDI_FILES.length} 首，分类：`,
        [...new Set(MIDI_FILES.map(f => f.category))].join('、'));
}

const CATEGORIES = ["儿歌", "流行", "民谣"];
const TOTAL_LEVELS = 5;
const ANSWER_TIME = 15;
const POINTS_CORRECT = 10;

const KEY_MAP = {
    'a': 1, 's': 2, 'd': 3, 'f': 4, 'g': 5, 'h': 6, 'j': 7
};

const NOTE_FREQUENCIES = {
    1: 261.63, 2: 293.66, 3: 329.63, 4: 349.23,
    5: 392.00, 6: 440.00, 7: 493.88
};

const SONGS = [];