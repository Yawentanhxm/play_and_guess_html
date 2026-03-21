## Context

现有项目是纯前端静态 HTML 游戏（无服务端）。本次在 `feature/multiplayer-room` 分支新增多人实时对战模式，引入 Node.js WebSocket 服务端。单机模式 `index.html` 完整保留。

现有可复用资源：
- `js/audio.js` - Web Audio 发声（猜题者用于回放弹奏音符）
- `js/data.js` + `data/index.json` - MIDI 曲库索引
- `css/style.css` - 设计系统变量（颜色/字体/间距）
- `js/game.js` 中的 MIDI 解析与简谱渲染逻辑（可提取复用）

## Goals / Non-Goals

**Goals:**
- 支持创建/加入 4 位字母房间码
- 房主自动成为弹奏者，其余人为猜题者
- 弹奏者看到歌名+简谱+旋律提示音，通过键盘弹奏广播音符
- 猜题者实时看到弹奏音符高亮，50s 内三选一（仅一次机会）
- 分数结算：猜对 +5/+2/+1，弹奏者每猜对 +2
- 局域网可用（`node server.js`）

**Non-Goals:**
- 账号系统、持久化存储
- 超过 8 人的大房间
- 弹奏者轮换（本期固定房主为弹奏者）
- MIDI 音频流同步（只同步音符事件）

## Decisions

### D1: 通信层 — WebSocket over HTTP 轮询
**选择**: `ws` 库（Node.js 原生 WebSocket）  
**理由**: 轻量零依赖，局域网延迟 <5ms，音符事件需要实时推送  
**替代**: Socket.io（过重），SSE（单向）

### D2: 房间状态管理 — 服务端内存 Map
**选择**: `Map<roomCode, RoomState>` 存内存  
**理由**: 无需数据库，重启即清空符合派对游戏场景  
**数据结构**:
```
RoomState {
  code: string          // 4位房间码
  hostId: string        // 房主 WS id（弹奏者）
  members: Map<id, {name, score, ws, hasGuessed}>
  song: SongInfo        // 当前歌曲{name, options, notes, keySignature}
  status: 'lobby'|'playing'|'ended'
  timer: NodeJS.Timer
  correctOrder: string[] // 猜对顺序
}
```

### D3: 歌曲选择 — 服务端从索引随机挑选
**选择**: 服务端 `data/index.json` 随机选曲，构造三个干扰项  
**理由**: 保证猜题者看不到答案，只有弹奏者知道  

### D4: 音符广播格式
```json
{ "type": "note", "midiNote": 64, "noteNum": 3, "octave": 0 }
```
猜题者收到后：本地 `audioManager.playNoteByMidi()` 发声 + 高亮简谱

### D5: 页面分离 — room.html 独立于 index.html
**选择**: 新建 `room.html` + `js/room.js` + `css/room.css`  
**理由**: 避免污染单机游戏逻辑，共享 audio.js / tonal.js

### D6: 服务端同时提供静态文件
**选择**: `server.js` 用 `http` 模块同时 serve 静态文件  
**端口**: 3000（`http://localhost:3000`）

## Risks / Trade-offs

- **网络抖动**: 音符事件丢包 → 简谱可能不同步；缓解：猜题者端按序号渲染
- **弹奏者断线**: 房间进入 ended 状态，广播通知 → 缓解：心跳检测 30s 超时
- **`data/index.json` 歌曲名重复**: 干扰项可能撞到正确答案 → 缓解：去重后随机

## Migration Plan

1. `npm install ws` 安装依赖
2. `node server.js` 启动（端口 3000）
3. 访问 `http://localhost:3000/room.html` 进入多人模式
4. 单机模式访问 `http://localhost:3000/index.html`（不变）

## Open Questions

- 弹奏者可以用"旋律提示"按钮预听一遍原曲吗？→ 本期不实现
