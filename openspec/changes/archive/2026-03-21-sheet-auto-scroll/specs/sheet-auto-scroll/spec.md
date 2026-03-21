## Purpose

当简谱内容超出容器可视高度时，随弹奏进度自动将当前音符所在行平滑滚入视野，消除玩家需要手动滚动的交互障碍，保持简谱与键盘提示的视觉同步。

## ADDED Requirements

### Requirement: 简谱随弹奏进度自动滚动
`highlightNote()` 在高亮当前音符后 SHALL 将该音符所在的 `.sheet-row` 滚入 `.sheet-display` 的可视区域。

#### Scenario: 当前行已在视野内
- **WHEN** 高亮音符所在的 `.sheet-row` 已完全或部分在 `.sheet-display` 可视区域内
- **THEN** 容器 SHALL 不发生任何滚动，界面保持稳定

#### Scenario: 当前行滚出视野（向下）
- **WHEN** 弹奏进度推进到新的一行，该行位于容器可视区域下方
- **THEN** `.sheet-display` SHALL 平滑滚动，使该行进入视野（`behavior: 'smooth', block: 'nearest'`）

#### Scenario: 歌曲重新开始
- **WHEN** 游戏重新开始，`highlightNote(0)` 被调用
- **THEN** `.sheet-display` SHALL 滚回顶部，显示第一行