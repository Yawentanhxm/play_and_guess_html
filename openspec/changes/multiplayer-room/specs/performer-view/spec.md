## ADDED Requirements

### Requirement: 弹奏者专属视图
弹奏者 SHALL 看到：当前歌名（其他人不可见）、完整简谱、三排键盘，以及"旋律提示"状态（可选）。

#### Scenario: 游戏开始显示歌名
- **WHEN** 弹奏者收到 `game_start` 消息（含 name 字段）
- **THEN** 页面顶部显示"本曲：{歌名}"，显示简谱，键盘高亮第一个待弹音符

### Requirement: 音符广播
弹奏者按下键盘后 SHALL 将弹奏的音符通过 WebSocket 广播给所有猜题者。

#### Scenario: 弹奏者按键
- **WHEN** 弹奏者按下有效键（对应当前音符）
- **THEN** 本地发声，同时发送 `{type:"note", midiNote, noteNum, octave, index}` 至服务端转发

### Requirement: 弹奏进度同步
弹奏者当前音符索引 SHALL 实时同步，使猜题者简谱高亮与弹奏保持一致。

#### Scenario: 音符推进
- **WHEN** 弹奏者成功按对一个音符
- **THEN** 服务端广播该 note 事件，所有猜题者端将对应简谱位置标记为已弹
