## 1. 简谱自动滚动（js/game.js）

- [x] 1.1 在 `highlightNote(index)` 方法末尾，取当前 active 音符元素，调用 `closest('.sheet-row')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
- [x] 1.2 在 `renderSheet()` 末尾（或 `highlightNote(0)` 调用处之前），将 `this.sheetDisplay.scrollTop = 0` 重置滚动位置，确保每次新歌从顶部开始
