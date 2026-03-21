## Why

当前键盘只有一个八度（1-7），无法覆盖大多数流行曲目的实际音域；同时 MIDI 提取时未区分旋律与伴奏，导致简谱中混入和弦/伴奏音符，影响游戏可玩性。

## What Changes

- **BREAKING** 音符数据结构新增八度字段：`octave`（-1=低八度, 0=中八度, 1=高八度），原有 `note` 字段保持 1-7 范围
- 键盘 UI 扩展为三排共 21 键：低八度（Z-M 七键）、中八度（A-J 七键）、高八度（Q-U 七键）
- 简谱渲染支持简谱标准八度符号：低八度数字下方加点，高八度数字上方加点
- MIDI 提取逻辑新增旋律轨道识别：优先选取单音密度最高、音符数最多的主旋律轨，丢弃和弦/伴奏轨

## Capabilities

### New Capabilities

- `multi-octave-keyboard`: 三排 21 键键盘 UI，支持低/中/高三个八度的按键交互与高亮
- `jianpu-octave-notation`: 简谱八度符号渲染，数字下方/上方加点，音符数据含八度信息
- `melody-track-extraction`: 从多轨 MIDI 中识别并提取主旋律轨道，过滤和弦/伴奏音符

### Modified Capabilities

<!-- 无 -->

## Impact

- `js/game.js`：`extractNotesFromMidi()`、`midiToJianpu()`、`renderSheet()`、`renderKeyboard()`、`highlightKey()`、`handleKeyPress()` 均需更新
- `index.html`：键盘 HTML 结构从 7 键扩展为 21 键，三排布局
- `css/style.css`：键盘三排样式，八度标记（上下点）CSS
