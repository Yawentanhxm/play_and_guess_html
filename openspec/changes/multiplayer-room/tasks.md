## 1. 基础环境

- [x] 1.1 `npm init -y` 并安装 `ws` 依赖，创建 `package.json`
- [x] 1.2 创建 `server.js` 骨架：http 静态文件服务 + WebSocket 服务，监听 3000 端口
- [x] 1.3 配置 MIME 类型映射（.html/.js/.css/.mid/.json），处理 404

## 2. 服务端房间管理

- [x] 2.1 实现 `rooms` Map 和 `generateRoomCode()` 函数（4 位唯一大写字母）
- [x] 2.2 实现 `create` 消息处理：生成房间、加入房间、回复 `joined`（含 host 标志）
- [x] 2.3 实现 `join` 消息处理：校验房间码/状态、加入成员、广播 `members_update`
- [x] 2.4 实现 WebSocket `close` 事件处理：移除成员、空房删除、广播更新、弹奏者断线触发 `game_end`

## 3. 服务端游戏逻辑

- [x] 3.1 加载 `data/index.json`，实现 `pickSong(room)` 随机选曲 + 构造 3 个去重干扰项
- [x] 3.2 实现 `start` 消息处理：人数校验、选曲、差异化广播（弹奏者含歌名，猜题者不含）、启动 50s 定时器
- [x] 3.3 实现 `note` 消息处理：服务端转发给房间内非弹奏者（`broadcast` 辅助函数）
- [x] 3.4 实现 `guess` 消息处理：比对答案、按顺序计分（+5/+2/+1）、弹奏者 +2、广播 `score_update`、判断全员猜对提前结束
- [x] 3.5 实现 `end_round` 广播函数：清定时器、广播 `game_end`（含答案+分数列表）
- [x] 3.6 实现 `replay` 消息处理：状态置 lobby，广播 `back_to_lobby`

## 4. room.html + 公共 UI

- [x] 4.1 创建 `room.html`：大厅入口页（昵称输入、创建/加入按钮、房间码输入框）
- [x] 4.2 创建 `css/room.css`：复用 style.css 变量，新增大厅/弹奏/猜题/结算区样式
- [x] 4.3 创建 `js/room.js` 骨架：WebSocket 连接、消息路由、全局状态（role/roomCode/myId）
- [x] 4.4 实现等待大厅 UI：显示房间码（可复制）、成员列表、房主"开始游戏"按钮

## 5. 弹奏者视图

- [x] 5.1 收到 `game_start` 后切换到弹奏者视图：显示歌名、渲染简谱（复用 renderSheet 逻辑）
- [x] 5.2 实现三排键盘（复用 index.html 键盘 HTML/CSS），绑定 keydown 事件
- [x] 5.3 按对音符：本地发声 + 发送 `note` 消息至服务端 + 推进音符索引 + 高亮下一个
- [x] 5.4 显示 50s 倒计时进度条（从服务端 `game_start` 时间起算）
- [x] 5.5 收到 `score_update` 时显示"XX 猜对了，你 +2 分！"toast 提示

## 6. 猜题者视图

- [x] 6.1 收到 `game_start` 后切换到猜题者视图：渲染空白简谱（仅显示格子，不显示音符）、显示三个选项按钮
- [x] 6.2 收到 `note` 消息：`audioManager.playNoteByMidi()` 发声 + 简谱对应位置标记 played
- [x] 6.3 点击选项：发送 `guess` 消息，锁定所有选项按钮（不可再点）
- [x] 6.4 收到 `score_update`：显示"XX 猜对了！"全局 toast（不泄露答案）
- [x] 6.5 显示 50s 倒计时进度条

## 7. 结算页

- [x] 7.1 收到 `game_end`：切换结算视图，显示正确歌名、所有人昵称+得分（按分数排序）
- [x] 7.2 猜题者结算：高亮自己的行，显示本轮得分（猜对/猜错/未作答）
- [x] 7.3 房主结算：额外显示"再来一轮"按钮，点击发送 `replay` 消息
- [x] 7.4 收到 `back_to_lobby`：所有人切换回大厅等待视图（保留分数）

## 8. 收尾

- [ ] 8.1 验证局域网访问：手机/其他设备通过 IP:3000 可正常进入房间并游戏
- [x] 8.2 更新 `README.md`：添加多人模式启动说明（`npm install` + `node server.js`）
