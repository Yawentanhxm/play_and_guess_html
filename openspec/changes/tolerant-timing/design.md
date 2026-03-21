## Context

`advanceToNextNoteWithDelay()` 计算 `beatDuration * noteDuration` 毫秒作为等待时间，`isProcessingNote = true` 在整个期间锁住键盘。宽容判定需要将锁定时间缩短，但音频仍按完整时值播放（不截断）。

## Goals / Non-Goals

**Goals:**
- 键盘解锁时间 = 原曲时值 × 0.75（比当前提前 25%）
- 错音按下时播放对应频率的短促音效（0.15s），给玩家声音反馈
- 宽容系数作为常量 `TIMING_TOLERANCE = 0.75`，方便日后调整

**Non-Goals:**
- 音频播放时长不变（仍按完整时值播），只是键盘解锁提前
- 不引入「允许拖拍」（玩家比原曲慢很多时自动等待）

## Decisions

### 宽容系数 0.75

```
原曲 120BPM 四分音符：
  完整时值 = 500ms
  键盘解锁 = 500 × 0.75 = 375ms  ← 比原来提前 125ms，约合半拍宽容
  音频仍播 500ms（不截断）
```

这意味着玩家在音符还在响的时候就可以按下一个键，体感更流畅，类似「轻触即过」的手感。

### 错音有声反馈

错音按下时用 `audioManager.playNoteByMidi(pressedMidi, 0.15)` 播放对应键的音高，时长极短（0.15s）不干扰节奏，让玩家知道自己按了哪个音，便于自我纠正。

需要从键位反推 MIDI 音高：已知 `note`（1-7）和 `octave`（-1/0/1），结合当前调号的 `orderedScale` 和 `middleRoot` 反算 MIDI 音高。
