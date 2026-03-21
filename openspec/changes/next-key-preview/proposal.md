## Why

玩家弹奏时需要在简谱、键位标识之间来回切换注意力，导致跟不上节奏。通过在键盘上同时高亮「当前键」和「下一个键」，并在键盘下方显示预告栏，玩家只需盯着键盘区域就能连续弹奏，大幅降低认知负担。

## What Changes

- 键盘高亮区分两个状态：当前键（亮紫色 + 脉冲动画）、下一个键（橙色淡高亮 + 静止）
- 键盘下方新增预告栏：固定显示 `NOW: [键位=音符]  →  NEXT: [键位=音符]`
- 简谱区：下一个音符加淡橙色底色，配合键盘提示

## Capabilities

### New Capabilities

- `next-key-preview`: 键盘双键高亮 + 预告栏，引导玩家连续弹奏

## Impact

- `js/game.js`：`highlightKey()` 扩展支持 next 音符；`highlightNote()` 同时高亮 next 音符；`advanceToNextNoteWithDelay()` 传入 next 信息；新增 `renderPreviewBar()` 更新预告栏
- `index.html`：键盘下方新增 `#previewBar` 预告栏 HTML
- `css/style.css`：`.key-next` 样式（橙色）；`.note-next` 样式；预告栏样式
