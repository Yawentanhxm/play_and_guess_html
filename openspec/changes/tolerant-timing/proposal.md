## Why

玩家弹奏时节奏稍慢或稍快是正常现象，当前实现要求玩家精确等待原曲时值才能按下一个键，导致节奏稍慢的玩家感觉「卡顿」，严重影响弹奏体验。

## What Changes

- `advanceToNextNoteWithDelay()` 等待时间改为原曲时值 × 宽容系数（0.75），即音符播放到 75% 时就解锁键盘接受下一个输入
- 错音也能发出声音（用错误音的 MIDI 频率播放一个短促音效），给玩家即时反馈，不再一片寂静

## Capabilities

### Modified Capabilities

- `tolerant-timing`: 弹奏等待时间采用宽容窗口，玩家不需要严格等完整时值才能按下一音

## Impact

- `js/game.js`：`advanceToNextNoteWithDelay()` 等待时长 × 0.75；`_handleNoteInput()` 错音分支加音效反馈
