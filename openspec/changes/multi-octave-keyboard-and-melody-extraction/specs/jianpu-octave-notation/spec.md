## ADDED Requirements

### Requirement: 音符数据包含八度信息
系统 SHALL 在从 MIDI 提取音符时，为每个音符计算并存储 `octave` 字段（整数，-1/0/1），`note` 字段保持 1-7 范围不变。

#### Scenario: 中八度音符（MIDI 48-71，C3-B4）
- **WHEN** MIDI 音高在 48-71 范围内
- **THEN** 对应音符的 `octave` SHALL 为 `0`

#### Scenario: 高八度音符（MIDI 72-95，C5-B6）
- **WHEN** MIDI 音高在 72-95 范围内
- **THEN** 对应音符的 `octave` SHALL 为 `1`

#### Scenario: 低八度音符（MIDI 24-47，C1-B2）
- **WHEN** MIDI 音高在 24-47 范围内
- **THEN** 对应音符的 `octave` SHALL 为 `-1`

#### Scenario: 超出三八度范围的音符
- **WHEN** MIDI 音高超出 24-95 范围
- **THEN** `octave` SHALL 钳制（clamp）到 -1 或 1（取最近边界值）

### Requirement: 简谱渲染显示八度符号
系统 SHALL 在简谱显示中，对低八度音符数字下方加点，对高八度音符数字上方加点，中八度无符号。

#### Scenario: 高八度音符渲染
- **WHEN** 渲染 `octave === 1` 的音符
- **THEN** 数字上方 SHALL 显示一个小圆点（通过 CSS class `octave-high` 实现）

#### Scenario: 中八度音符渲染
- **WHEN** 渲染 `octave === 0` 的音符
- **THEN** 数字 SHALL 正常显示，无附加符号

#### Scenario: 低八度音符渲染
- **WHEN** 渲染 `octave === -1` 的音符
- **THEN** 数字下方 SHALL 显示一个小圆点（通过 CSS class `octave-low` 实现）
