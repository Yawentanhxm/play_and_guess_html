## Purpose

在键盘上同时高亮当前键和下一个键，并在键盘下方显示预告栏，引导玩家连续弹奏。

## ADDED Requirements

### Requirement: 键盘双键高亮
系统 SHALL 在弹奏阶段同时高亮当前音符对应的键（`.active`，亮紫色脉冲）和下一个音符对应的键（`.key-next`，橙色淡高亮）。当两者为同一个键时，只显示 `.active`。

#### Scenario: 当前键与下一键不同
- **WHEN** `currentNoteIndex` 和 `currentNoteIndex+1` 对应不同的 note+octave 组合
- **THEN** 当前键 SHALL 显示 `.active` 样式，下一个键 SHALL 显示 `.key-next` 样式

#### Scenario: 当前键与下一键相同
- **WHEN** 两个相邻音符的 note+octave 完全相同
- **THEN** 该键 SHALL 只显示 `.active`，不叠加 `.key-next`

#### Scenario: 最后一个音符
- **WHEN** `currentNoteIndex` 是最后一个音符，无下一个
- **THEN** 只显示 `.active`，不显示任何 `.key-next`

### Requirement: 简谱下一音符淡高亮
系统 SHALL 给 `currentNoteIndex+1` 对应的简谱音符元素添加 `.note-next` class（淡橙色底色）。

#### Scenario: 存在下一个音符
- **WHEN** `currentNoteIndex+1 < notes.length`
- **THEN** 对应简谱元素 SHALL 有 `.note-next` class

### Requirement: 预告栏显示
系统 SHALL 在键盘下方的 `#previewBar` 中实时显示当前和下一个音符的键位信息。

#### Scenario: 弹奏进行中
- **WHEN** 弹奏阶段 `isPlaying === true`
- **THEN** 预告栏 SHALL 显示 `NOW [键名·音符]  →  NEXT [键名·音符]`

#### Scenario: 最后一个音符
- **WHEN** 没有下一个音符
- **THEN** NEXT 部分 SHALL 显示 `--`

#### Scenario: 弹奏结束或答题阶段
- **WHEN** `isPlaying === false`
- **THEN** 预告栏 SHALL 清空或隐藏
