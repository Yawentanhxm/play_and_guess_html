## 1. 旋律轨道识别与提取（game.js）

- [x] 1.1 新增 `selectMelodyTrack(tracks)` 函数：对每条轨道计算旋律得分（单音率×100 + 音符数量得分 + 音域居中得分），返回得分最高的轨道
- [x] 1.2 在 `extractNotesFromMidi()` 中将原有的"取第一条事件数≥10 轨道"逻辑替换为调用 `selectMelodyTrack()`
- [x] 1.3 新增同时多音符过滤：对提取出的音符按 startTime 分组，每组只保留 MIDI 音高最高的音符

## 2. 音符数据结构扩展（game.js）

- [x] 2.1 在 `midiToJianpu()` 中新增返回 `octave` 字段，计算公式：`octave = clamp(Math.floor(midiNote / 12) - 5, -1, 1)`
- [x] 2.2 在 `extractNotesFromMidi()` 的音符构建处，将 `octave` 字段存入每个 note 对象

## 3. 键盘 HTML 扩展（index.html）

- [x] 3.1 在 `#keyboardGuide` 中将原有 7 键替换为三排结构：高八度排（Q-U，data-octave="1"）、中八度排（A-J，data-octave="0"）、低八度排（Z-M，data-octave="-1"）
- [x] 3.2 每排添加行标签（"高 ↑" / "中" / "低 ↓"）

## 4. 键盘样式（css/style.css）

- [x] 4.1 新增三排键盘容器样式，三排纵向排列，高排/中排/低排用不同底色区分
- [x] 4.2 新增 `.note.octave-high` 样式：数字上方显示小圆点（`::after` position absolute top）
- [x] 4.3 新增 `.note.octave-low` 样式：数字下方显示小圆点（`::after` position absolute bottom）
- [x] 4.4 确保三排键盘在窗口较小时能横向缩放不溢出

## 5. 游戏逻辑更新（game.js）

- [x] 5.1 更新 `renderSheet()`：根据音符 `octave` 值，给 `.note` 元素添加 `octave-high` 或 `octave-low` class
- [x] 5.2 更新 `highlightKey(note, octave)`：根据 note+octave 找到对应排的对应键并高亮，清除其他排的高亮
- [x] 5.3 更新 `handleKeyPress(e)`：构建按键→{note, octave}的映射表（Q→{1,1}...U→{7,1}，A→{1,0}...J→{7,0}，Z→{1,-1}...M→{7,-1}），判断是否匹配当前音符的 note+octave
- [x] 5.4 更新 `playNotes()` 中调用 `highlightKey` 的地方，传入 octave 参数
