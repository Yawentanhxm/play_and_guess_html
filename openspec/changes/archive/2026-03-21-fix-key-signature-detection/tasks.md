## 1. 修复 detectKeySignature —— 正确读取 @tonejs/midi 的 Key Signature 字段

- [x] 1.1 在 `game.js` 的 `detectKeySignature()` 中，将 `track.keySignatures[0].key` 改为同时读取 `key` 和 `scale` 字段
- [x] 1.2 实现 key+scale → KEY_SIGNATURES 键名的映射逻辑（`major` 直接用 key，`minor` 在 key 后加 `'m'`）
- [x] 1.3 加入映射结果的有效性校验：若映射后的键不存在于 `KEY_SIGNATURES`，则回退到 `detectKeyByTonal()`
- [x] 1.4 添加调试日志，打印读取到的原始 keySignatures 内容及映射结果

## 2. 修复 detectKeyByNoteDistribution —— 根音加权逻辑

- [x] 2.1 将 `noteStarts` 的语义从"首次出现的 MIDI tick 时间"改为"首次出现的音符序列编号"（用独立计数器 `noteOrderIndex` 递增）
- [x] 2.2 确认阈值 `< 5` 语义正确（前 5 个不同音高），无需修改阈值本身

## 3. 增强 detectKeyByNoteDistribution —— 平行调终止音加权

- [x] 3.1 在所有 note 统计完成后，取末尾 `Math.max(10, Math.floor(allNotes.length * 0.1))` 个音符
- [x] 3.2 统计该末尾区段各音高出现次数，存入 `endingCounts` 数组
- [x] 3.3 在候选调评分循环中，若 `endingCounts[key.root] > 0`，额外加分 `endingCounts[key.root] * 5`

## 4. 验证

- [x] 4.1 打开游戏，加载「花海 钢琴版.mid」，在浏览器控制台确认 `detectKeySignature` 输出正确调号
- [x] 4.2 对比修复前后简谱前 10 个音符是否与已知乐谱吻合（A大调 1 2 3 5 5 确认正确）
- [x] 4.3 确认无控制台报错、回退逻辑正常触发
