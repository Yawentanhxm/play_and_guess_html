## Why

简谱内容超过容器高度（max-height: 260px，约 4 行）时，玩家需要手动向下滚动才能看到当前应弹的音符，与键盘提示脱节，严重影响游戏体验。

## What Changes

- 在 `highlightNote()` 中加入自动滚动逻辑：当高亮音符所在行不在视野内时，平滑滚动到该行
- 使用 `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` —— 行已在视野内时不触发滚动，只在需要时才滚，避免每个音符都跳动

## Capabilities

### Modified Capabilities

- `sheet-auto-scroll`: 简谱容器跟随当前弹奏进度自动滚动

## Impact

- `js/game.js`：`highlightNote()` 方法新增一行滚动逻辑
