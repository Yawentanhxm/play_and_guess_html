## ADDED Requirements

### Requirement: WebSocket 消息协议
服务端 SHALL 通过 WebSocket 处理以下客户端消息类型：`create`、`join`、`start`、`note`、`guess`、`ping`。

#### Scenario: 消息路由
- **WHEN** 服务端收到任意 JSON 消息
- **THEN** 根据 `type` 字段路由到对应处理器，未知类型返回 error

### Requirement: 静态文件服务
服务端 SHALL 使用内置 `http` 模块在同一端口（3000）提供静态文件服务，支持 `.html/.js/.css/.mid/.json` 文件类型。

#### Scenario: 访问静态资源
- **WHEN** 客户端 GET 请求 `/room.html` 或 `/js/audio.js`
- **THEN** 服务端返回正确 Content-Type 的文件内容，状态码 200

#### Scenario: 文件不存在
- **WHEN** 客户端请求不存在的路径
- **THEN** 服务端返回 404

### Requirement: 心跳与断线检测
服务端 SHALL 每 30 秒检测一次客户端连接，断线成员 SHALL 被移出房间并广播成员更新。

#### Scenario: 客户端断线
- **WHEN** WebSocket 连接关闭（close 事件）
- **THEN** 服务端移除该成员，若房间为空则删除房间，否则广播 `members_update`

#### Scenario: 弹奏者断线
- **WHEN** 房主 WebSocket 断线且游戏进行中
- **THEN** 服务端广播 `game_end`，房间状态置为 ended
