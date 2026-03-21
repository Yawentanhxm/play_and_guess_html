class MIDIParser {
    static async loadMIDI(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        return this.parse(bytes);
    }

    static parse(bytes) {
        let offset = 0;

        if (this.readString(bytes, offset, 4) !== 'MThd') {
            throw new Error('Invalid MIDI file: missing MThd header');
        }
        offset += 4;

        const headerLength = this.read32(bytes, offset);
        offset += 4;

        const format = this.read16(bytes, offset);
        offset += 2;

        const numTracks = this.read16(bytes, offset);
        offset += 2;

        const division = this.read16(bytes, offset);
        offset += 2;

        const tracks = [];
        for (let t = 0; t < numTracks; t++) {
            const track = this.parseTrack(bytes, offset, division);
            tracks.push(track);
            offset = track.endOffset;
        }

        return {
            format,
            division,
            tracks,
            tempo: tracks[0]?.tempo || 120
        };
    }

    static parseTrack(bytes, startOffset, division) {
        let offset = startOffset;
        const events = [];
        let runningStatus = 0;
        let cumulativeTime = 0;
        let tempo = 120;

        if (this.readString(bytes, offset, 4) !== 'MTrk') {
            return { events: [], endOffset: offset };
        }
        offset += 4;

        const trackLength = this.read32(bytes, offset);
        offset += 4;

        const trackEnd = offset + trackLength;

        while (offset < trackEnd) {
            const deltaTime = this.readVarLen(bytes, offset);
            offset += this.getVarLenLength(bytes, offset);

            cumulativeTime += deltaTime;

            let status = bytes[offset];
            if (status >= 0x80) {
                runningStatus = status;
                offset++;
            } else if (runningStatus === 0) {
                break;
            }

            const eventType = runningStatus >> 4;
            const channel = runningStatus & 0x0f;

            if (eventType === 0x9 && bytes[offset + 1] !== 0) {
                const note = bytes[offset + 1];
                const velocity = bytes[offset + 2];
                events.push({
                    type: 'noteOn',
                    note,
                    velocity,
                    time: cumulativeTime
                });
                offset += 3;
            } else if (eventType === 0x8 || (eventType === 0x9 && bytes[offset + 1] === 0)) {
                const note = bytes[offset + 1];
                events.push({
                    type: 'noteOff',
                    note,
                    time: cumulativeTime
                });
                offset += 3;
            } else if (eventType === 0xC) {
                offset += 2;
            } else if (eventType === 0xB) {
                offset += 3;
            } else if (eventType === 0xFF) {
                const metaType = bytes[offset];
                const metaLength = bytes[offset + 1];
                offset += 2 + metaLength;

                if (metaType === 0x51 && metaLength === 3) {
                    const microsecondsPerBeat = (bytes[offset - 3] << 16) | (bytes[offset - 2] << 8) | bytes[offset - 1];
                    tempo = Math.round(60000000 / microsecondsPerBeat);
                }
            } else {
                offset++;
            }
        }

        return {
            events,
            tempo,
            endOffset: trackEnd
        };
    }

    static readString(bytes, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(bytes[offset + i]);
        }
        return str;
    }

    static read16(bytes, offset) {
        return (bytes[offset] << 8) | bytes[offset + 1];
    }

    static read32(bytes, offset) {
        return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    }

    static readVarLen(bytes, offset) {
        let value = 0;
        while (bytes[offset] & 0x80) {
            value = (value << 7) | (bytes[offset] & 0x7f);
            offset++;
        }
        value = (value << 7) | bytes[offset];
        return value;
    }

    static getVarLenLength(bytes, offset) {
        let length = 0;
        while (bytes[offset + length] & 0x80) {
            length++;
        }
        return length + 1;
    }

    static extractMelody(midiData) {
        let track = null;
        
        for (let i = 0; i < midiData.tracks.length; i++) {
            const t = midiData.tracks[i];
            if (t.events && t.events.length > 10) {
                track = t;
                break;
            }
        }
        
        if (!track) {
            track = midiData.tracks[0];
        }
        
        const allNotes = [];
        let noteStartTimes = new Map();
        const tempo = midiData.tempo || 120;
        
        for (const event of track.events) {
            if (event.type === 'noteOn' && event.velocity > 0) {
                const midiNote = event.note;
                if (midiNote < 21 || midiNote > 108) continue;
                noteStartTimes.set(midiNote, event.time);
            } else if (event.type === 'noteOff' || (event.type === 'noteOn' && event.velocity === 0)) {
                const midiNote = event.note;
                if (midiNote < 21 || midiNote > 108) continue;
                const startTime = noteStartTimes.get(midiNote);
                if (startTime !== undefined) {
                    allNotes.push({
                        note: midiNote,
                        startTime,
                        endTime: event.time
                    });
                    noteStartTimes.delete(midiNote);
                }
            }
        }

        allNotes.sort((a, b) => a.startTime - b.startTime);

        const firstNoteTime = allNotes[0]?.startTime || 0;
        const quarterNoteTime = (60000 / tempo) * (midiData.division / 96);

        const notes = [];
        let lastNoteNum = 1;
        
        for (const n of allNotes) {
            const midiNote = n.note;
            
            const startDelta = (n.startTime - firstNoteTime) / quarterNoteTime;
            const duration = (n.endTime - n.startTime) / quarterNoteTime;

            const noteInOctave = midiNote % 12;
            const pitchClasses = [0,1,2,3,4,5,6,7,8,9,10,11];
            const jianpuMap = [1,1,2,2,3,4,4,5,5,6,6,7];
            let noteNum = jianpuMap[noteInOctave];
            
            if (noteNum < 1) noteNum = 1;
            if (noteNum > 7) noteNum = 7;

            let durationValue = 1;
            if (duration >= 3.5) durationValue = 2;
            else if (duration >= 1.75) durationValue = 1.5;
            else if (duration <= 0.75) durationValue = 0.5;

            notes.push({
                note: noteNum,
                duration: durationValue,
                midiNote: midiNote,
                _startTime: startDelta
            });
            
            lastNoteNum = noteNum;
        }

        return notes;
    }
}

window.MIDIParser = MIDIParser;
