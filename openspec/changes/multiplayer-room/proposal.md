## Why

当前游戏是单机模式（一人弹奏、一人猜），缺乏社交互动。多人房间模式让玩家可以创建/加入房间，一人弹奏其余人实时猜歌，带来真实的"你弹我猜"派对体验。

## What Changes

- **新增 Node.js WebSocket 服务端** (`server.js`)，管理房间状态、广播消息
- **新增多人房间入口页** (`room.html`)，支持创建/加入房间
- **新增弹奏者视图**：看到歌名+简谱+旋律提示音，通过键盘弹奏将音符广播给所有人
- **新增猜题者视图**：实时听到弹奏音符，50s 内从三个选项中选择歌名（仅一次机会）
- **新增分数系统**：猜对者 +5/+2/+1（按先后），弹奏者每有一人猜对 +2
- **新增房间状态同步**：倒计时、弹奏进度、猜题结果实时广播

## Capabilities

### New Capabilities

- `room-management`: 房间创建、加入、角色分配（房主=弹奏者）、成员列表维护
- `websocket-server`: Node.js WS 服务端，处理 join/start/note/guess/end 消息
- `multiplayer-game-loop`: 多人游戏轮次控制（50s 倒计时、轮次结束判定、分数结算）
- `performer-view`: 弹奏者页面——显示歌名、简谱、旋律提示音，弹奏后广播 note 事件
- `guesser-view`: 猜题者页面——实时显示弹奏的简谱音符，三选一猜题，结果展示

### Modified Capabilities

（无已有 spec 需修改，单机游戏逻辑保持不变）

## Impact

- **新增依赖**: `ws`（Node.js WebSocket 库）
- **新增文件**: `server.js`, `room.html`, `css/room.css`, `js/room.js`
- **不影响**: 现有 `index.html` 单机模式完整保留
- **部署变化**: 需从 `node server.js` 启动，不再是纯静态文件
