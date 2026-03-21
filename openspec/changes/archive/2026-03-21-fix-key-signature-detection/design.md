## Context

本项目是一个"你弹我猜"HTML 音乐游戏，从 MIDI 文件中提取旋律并转为简谱（数字谱）供玩家弹奏。调号识别是整个音符转换流水线的入口：错误的调号会导致后续所有简谱数字都出错。

当前调号检测采用三级回退机制：
1. 读取 MIDI Key Signature Meta 事件 (`0xFF 0x59`)
2. 使用 Tonal.js `Key.detect()`
3. 自研音符分布统计算法

**问题所在**：
- `MIDIParser.js` 的 `parseTrack()` 从未解析 `0xFF 0x59`，第一级永远失败
- 自研算法的 root 加权逻辑用 MIDI tick 时间与字面数字 5 比较，永远不触发
- 平行调（如 C大调 vs Am小调）音阶完全相同，无法通过音阶得分区分

**注意**：游戏实际使用 `@tonejs/midi` 库（`Midi.fromUrl()`）而非自写的 `MIDIParser` 类来加载 MIDI。`@tonejs/midi` 会在 `midiData.tracks[i].keySignatures[]` 中自动填充 Key Signature 信息。因此修复重点应在 `game.js` 的 `detectKeySignature()` 函数对该字段的读取逻辑上。

## Goals / Non-Goals

**Goals:**
- 正确读取 `@tonejs/midi` 解析出的 Key Signature 信息，将其映射到 `KEY_SIGNATURES` 表
- 修复 `detectKeyByNoteDistribution()` 中根音加权的 tick vs index 比较错误
- 增强平行调区分能力（加入根音位置权重和终止音权重）

**Non-Goals:**
- 重写 `MIDIParser` 类（该类在主游戏流程中未被使用）
- 支持和声小调/旋律小调的检测
- 多调号（同一曲子中途转调）处理

## Decisions

### 决策 1：优先使用 `@tonejs/midi` 的 Key Signature 字段

**选择**：`detectKeySignature()` 直接读取 `track.keySignatures[0]`，该字段由 `@tonejs/midi` 自动填充，包含 `{ key, scale }` 信息（如 `{ key: 'C', scale: 'major' }`）。

**为何不修复 MIDIParser**：游戏主流程调用 `Midi.fromUrl()` 而非 `MIDIParser`，修复后者对当前 Bug 无效。

**映射逻辑**：`@tonejs/midi` 返回的 key 格式如 `C major` / `A minor`，需将其映射到 `KEY_SIGNATURES` 的键名（`'C'` / `'Am'`）。

### 决策 2：修复根音加权——改用音符顺序序号

**当前问题**：`noteStarts[pitchClass] = note.time` 存储的是 MIDI tick 时间（0、96、480 等），而 `< 5` 的阈值是按音符顺序设计的。

**修复方案**：改为存储"该音符在序列中首次出现的顺序编号"（从 0 起计），阈值保持 `< 5`，语义变为"根音是否在前 5 个不同音高中出现"。

### 决策 3：平行调区分——加入终止音（末尾音符）权重

**方案**：在 `detectKeyByNoteDistribution()` 中取曲子最后 10% 的音符，统计其中最频繁出现的音高作为"终止音"。若终止音与某调的 root 吻合，额外加分（`+5 * count`）。

大调曲子倾向于结束在主音，小调亦然，这比仅靠音阶音符覆盖率更具区分度。

## Risks / Trade-offs

- **`@tonejs/midi` Key Signature 字段可能为空**（很多 MIDI 文件没有写 Meta 事件）→ 回退到 Tonal.js 再回退到分布算法，现有流程不变，风险低
- **终止音加权在短曲子上效果有限**（样本量不足）→ 仅作加分项，不作决定性依据，可接受
- **平行调在某些曲子上仍可能判断错误**（如五声音阶曲子）→ 该场景超出当前修复范围
