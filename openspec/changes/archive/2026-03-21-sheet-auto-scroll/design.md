## Context

简谱按小节分行渲染在 `.sheet-display`（max-height: 260px, overflow-y: auto）中。`highlightNote(index)` 负责给当前音符加 `.active` class，但没有任何滚动逻辑。

## Goals / Non-Goals

**Goals:** 当前高亮音符所在的 `.sheet-row` 滚出容器视野时，自动平滑滚入  
**Non-Goals:** 折叠已完成的行、预滚动（提前显示下一行）

## Decisions

### 使用 `scrollIntoView` + `block: 'nearest'`

```javascript
// highlightNote() 里：
activeNoteEl?.closest('.sheet-row')
             ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
```

- `block: 'nearest'`：行在视野内 → 不滚动；行在视野外 → 最小距离滚入，不会过度跳动
- `behavior: 'smooth'`：平滑过渡，视觉自然
- `closest('.sheet-row')`：以行为滚动单位，而非单个音符，避免频繁跳动

> 注意：`scrollIntoView` 是相对于**最近的可滚动祖先**生效，`.sheet-display` 设有 `overflow-y: auto` 因此会正确响应。
