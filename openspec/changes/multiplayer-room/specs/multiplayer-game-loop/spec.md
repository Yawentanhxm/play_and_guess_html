## ADDED Requirements

### Requirement: 游戏开始
房主 SHALL 能在大厅点击"开始游戏"，服务端随机选曲、构造三个选项，并向弹奏者发送含歌名的 `game_start` 消息，向猜题者发送不含歌名的版本。

#### Scenario: 房主开始游戏
- **WHEN** 房主点击"开始游戏"（房间至少 2 人）
- **THEN** 服务端选曲，向弹奏者发送 `{type:"game_start", song:{name, notes, keySignature, options}}`，向猜题者发送 `{type:"game_start", song:{notes, keySignature, options}}`（无 name），50s 倒计时开始

#### Scenario: 人数不足
- **WHEN** 房间仅有 1 人时房主点击开始
- **THEN** 服务端返回 error，提示"至少需要 2 名玩家"

### Requirement: 50s 倒计时
服务端 SHALL 在游戏开始后启动 50s 倒计时，到时自动结束本轮并广播结算结果。

#### Scenario: 倒计时结束
- **WHEN** 50s 计时器到期
- **THEN** 服务端广播 `game_end`，包含正确答案和所有人分数

#### Scenario: 全员猜对提前结束
- **WHEN** 所有猜题者均已猜对
- **THEN** 服务端立即广播 `game_end`，不等待倒计时

### Requirement: 分数结算
系统 SHALL 按猜对顺序给猜题者加分（第1名+5，第2名+2，第3名+1，第4名及之后+0），弹奏者每有一人猜对 +2 分。

#### Scenario: 猜对计分
- **WHEN** 猜题者提交正确答案
- **THEN** 服务端根据当前 `correctOrder` 长度决定得分，分数实时广播给全房间

#### Scenario: 弹奏者得分
- **WHEN** 任意猜题者猜对
- **THEN** 弹奏者分数 +2，广播更新后的分数

### Requirement: 再来一轮
游戏结束后房主 SHALL 能点击"再来一轮"，重置本轮数据并重新进入大厅。

#### Scenario: 再来一轮
- **WHEN** 房主点击"再来一轮"
- **THEN** 房间状态置为 lobby，所有人分数保留，广播 `back_to_lobby`
