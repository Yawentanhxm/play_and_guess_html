# multi-octave-keyboard Specification

## Purpose
TBD - created by archiving change multi-octave-keyboard-and-melody-extraction. Update Purpose after archive.
## Requirements
### Requirement: 键盘支持三个八度共 21 键
系统 SHALL 在游戏界面展示三排键盘：高八度（7键）、中八度（7键）、低八度（7键），分别对应键盘按键 Q-U、A-J、Z-M。

#### Scenario: 高八度键高亮
- **WHEN** 当前应弹音符的 `octave === 1`，`note === N`
- **THEN** 高八度排中 note=N 的键 SHALL 显示高亮激活状态

#### Scenario: 中八度键高亮
- **WHEN** 当前应弹音符的 `octave === 0`，`note === N`
- **THEN** 中八度排中 note=N 的键 SHALL 显示高亮激活状态

#### Scenario: 低八度键高亮
- **WHEN** 当前应弹音符的 `octave === -1`，`note === N`
- **THEN** 低八度排中 note=N 的键 SHALL 显示高亮激活状态

#### Scenario: 按下正确键位
- **WHEN** 玩家按下与当前音符（note + octave）匹配的键盘按键
- **THEN** 该键 SHALL 显示按下效果，游戏 SHALL 推进到下一个音符

#### Scenario: 三排键盘视觉区分
- **WHEN** 键盘渲染时
- **THEN** 三排键盘 SHALL 有明显的视觉区分（颜色/标签），高排标注「高 ↑」，中排标注「中」，低排标注「低 ↓」

