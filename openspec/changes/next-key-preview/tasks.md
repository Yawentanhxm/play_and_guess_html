## 1. 扩展 highlightKey 支持下一键（js/game.js）

- [x] 1.1 修改 `highlightKey(note, octave, nextNote, nextOctave)` 签名，在清除所有 `.active` / `.key-next` 后，给当前键加 `.active`，给下一键加 `.key-next`（若与当前键相同则跳过）
- [x] 1.2 所有调用 `highlightKey()` 的地方传入 next 参数（`playNotes()`、`advanceToNextNoteWithDelay()`、`advanceToNextNote()`）

## 2. 扩展 highlightNote 支持下一音符简谱高亮（js/game.js）

- [x] 2.1 修改 `highlightNote(index)` 在遍历时，对 `i === index + 1` 的元素添加 `.note-next` class

## 3. 新增 renderPreviewBar（js/game.js）

- [x] 3.1 新增 `renderPreviewBar(currentIndex)` 方法：根据当前/下一音符计算键名，更新 `#previewBar` 的 innerHTML
- [x] 3.2 键名映射表（八度+note → 键盘字母）：高八度 `[Q,W,E,R,T,Y,U]`，中 `[A,S,D,F,G,H,J]`，低 `[Z,X,C,V,B,N,M]`
- [x] 3.3 八度显示：高八度加 `↑`，低八度加 `↓`，中八度不加
- [x] 3.4 在每次调用 `highlightKey()` 的地方同时调用 `renderPreviewBar()`
- [x] 3.5 答题/结束阶段清空预告栏：在 `startAnswerPhase()` 里隐藏 `#previewBar`

## 4. HTML + CSS（index.html / css/style.css）

- [x] 4.1 在 `index.html` 键盘区域下方（`play-bottom` 上方）新增 `<div id="previewBar" class="preview-bar"></div>`
- [x] 4.2 `css/style.css` 新增 `.key-next` 样式：橙色 `#fb923c` 边框 + 淡橙底色，无动画
- [x] 4.3 `css/style.css` 新增 `.note-next` 样式：淡橙色底色 `rgba(251,146,60,0.2)`
- [x] 4.4 `css/style.css` 新增 `.preview-bar` 预告栏样式：横排居中，两端分别显示 NOW 和 NEXT，字体稍小
