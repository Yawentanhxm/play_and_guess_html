class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isSupported = true;
        this.initAudio();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.isSupported = false;
        }
    }

    ensureContext() {
        if (!this.audioContext) {
            this.initAudio();
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 自由模式：开始持续发声（直到 stopNote 被调用）
    startNote(midiNote) {
        if (!this.isSupported || !this.audioContext) return;
        if (!midiNote) return;
        this.ensureContext();
        this.stopNote(midiNote); // 防止重复
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // 10ms 渐入防爆音

        oscillator.start(now);

        if (!this._activeNodes) this._activeNodes = {};
        this._activeNodes[midiNote] = { oscillator, gainNode };
    }

    // 自由模式：松键，渐出后停止
    stopNote(midiNote) {
        if (!this._activeNodes || !this._activeNodes[midiNote]) return;
        const { oscillator, gainNode } = this._activeNodes[midiNote];
        const now = this.audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.08); // 80ms 渐出
        oscillator.stop(now + 0.08);
        delete this._activeNodes[midiNote];
    }

    playNote(noteNumber, duration = 0.3) {
        if (!this.isSupported || !this.audioContext) return;
        this.ensureContext();
        const frequency = NOTE_FREQUENCIES[noteNumber];
        if (!frequency) return;
        this._playFrequency(frequency, duration);
    }

    // 根据 MIDI 音高直接计算频率并播放（支持所有调号和八度）
    // MIDI 标准：A4 = MIDI 69 = 440Hz，每升高1半音 × 2^(1/12)
    playNoteByMidi(midiNote, duration = 0.5) {
        if (!this.isSupported || !this.audioContext) return;
        if (!midiNote) return;
        this.ensureContext();
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        this._playFrequency(frequency, duration);
    }

    _playFrequency(frequency, duration) {
        const now = this.audioContext.currentTime;
        // 最短播 0.3s，最长 3s
        const soundDur = Math.min(Math.max(duration, 0.3), 3.0);

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);

        // 原始音色：直接从 0.3 开始，指数衰减到结束
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + soundDur);

        oscillator.start(now);
        oscillator.stop(now + soundDur);
    }

    playCorrect() {
        if (!this.isSupported || !this.audioContext) return;

        this.ensureContext();

        const frequencies = [523.25, 659.25, 783.99];
        const duration = 0.15;

        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

            const startTime = this.audioContext.currentTime + index * duration;
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }

    playWrong() {
        if (!this.isSupported || !this.audioContext) return;

        this.ensureContext();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    playComplete() {
        if (!this.isSupported || !this.audioContext) return;

        this.ensureContext();

        const melody = [523.25, 659.25, 783.99, 1046.50];
        const duration = 0.2;

        melody.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

            const startTime = this.audioContext.currentTime + index * duration;
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }
}

const audioManager = new AudioManager();
