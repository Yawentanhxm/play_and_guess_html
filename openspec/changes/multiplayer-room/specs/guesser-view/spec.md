## ADDED Requirements

### Requirement: 猜题者实时简谱
猜题者 SHALL 看到随弹奏实时更新的简谱（已弹音符标记为 played），并在本地听到弹奏音符的声音。

#### Scenario: 收到音符事件
- **WHEN** 猜题者收到 `note` 消息
- **THEN** 本地调用 `audioManager.playNoteByMidi(midiNote, 0.4)` 发声，并将简谱中对应位置标记为 played 样式

### Requirement: 三选一猜题
猜题者 SHALL 在游戏期间看到三个歌名选项，点击一次提交猜测，提交后选项锁定（不可再次点击）。

#### Scenario: 猜题者猜对
- **WHEN** 猜题者点击正确选项
- **THEN** 服务端记录猜对时间，广播分数更新，该猜题者选项高亮绿色，其他人收到"XX 猜对了！"提示

#### Scenario: 猜题者猜错
- **WHEN** 猜题者点击错误选项
- **THEN** 该选项高亮红色，不可再次提交，服务端不加分

#### Scenario: 仅一次机会
- **WHEN** 猜题者已提交过猜测（无论对错）
- **THEN** 其他选项不可点击，UI 显示已作答状态

### Requirement: 游戏结束展示
游戏结束（50s 到时或全员猜对）后 SHALL 显示结算页，展示正确答案、本轮得分排名。

#### Scenario: 收到 game_end
- **WHEN** 客户端收到 `game_end` 消息
- **THEN** 显示正确歌名、所有人的昵称和得分，房主看到"再来一轮"按钮
