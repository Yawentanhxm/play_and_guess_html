## Why

游戏使用 MIDI 文件作为曲库，需要正确识别每首曲子的调号（Key Signature）才能将 MIDI 音符转换为准确的简谱数字。当前实现存在多处错误，导致调号识别完全依赖于缺陷的回退逻辑，简谱数字经常出错，影响游戏可玩性。

## What Changes

- 修复 `midi-parser.js` 中 `parseTrack()` 未解析 MIDI Key Signature Meta 事件（`0xFF 0x59`）的缺陷，使调号信息能从 MIDI 文件中直接读取
- 修复 `game.js` 中 `detectKeyByNoteDistribution()` 的根音加权逻辑，`noteStarts[root] < 5` 将 MIDI tick 时间误作音符顺序序号比较，导致加权永远不生效
- 改进 `detectKeyByNoteDistribution()` 中平行调的区分逻辑，C大调与Am小调音阶相同，当前评分无法区分二者

## Capabilities

### New Capabilities

- `midi-key-signature-parsing`: 从 MIDI Meta 事件（`0xFF 0x59`）中正确解析并返回调号信息
- `key-detection-by-note-distribution`: 当 MIDI Meta 信息缺失时，通过音符分布统计准确推断调号，修复加权逻辑与平行调区分

### Modified Capabilities

<!-- 无现有 spec 需修改 -->

## Impact

- `js/midi-parser.js`：`parseTrack()` 方法新增 Key Signature Meta 事件解析
- `js/game.js`：`detectKeyByNoteDistribution()` 根音加权逻辑修复；平行调区分逻辑增强
- 所有使用 MIDI 文件的歌曲均受益，简谱展示更准确
