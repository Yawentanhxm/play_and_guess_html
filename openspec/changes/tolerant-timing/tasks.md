## 1. 宽容时值窗口（js/game.js）

- [x] 1.1 在文件顶部常量区新增 `const TIMING_TOLERANCE = 0.75;`
- [x] 1.2 在 `advanceToNextNoteWithDelay()` 中，将 `setTimeout` 的等待时间从 `duration`（完整时值 ms）改为 `duration * TIMING_TOLERANCE`；音频播放时长 `noteDurationSec` 保持不变

## 2. 错音有声反馈（js/game.js）

- [x] 2.1 新增工具函数 `noteToMidi(note, octave, keySignature)`：根据简谱数字、八度、调号反算 MIDI 音高
- [x] 2.2 在 `_handleNoteInput()` 的错音分支中，调用 `noteToMidi(pressed.note, pressed.octave, this.currentSong.keySignature)` 获取按键对应的 MIDI 音高，并用 `audioManager.playNoteByMidi(midi, 0.15)` 播放短促音效
