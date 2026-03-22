/**
 * server.js — 你弹我猜多人模式服务端
 * 提供：① HTTP 静态文件服务  ② WebSocket 实时通信
 * 启动：node server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ─── MIME 类型映射（Task 1.3）─────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mid':  'audio/midi',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── HTTP 静态文件服务（Task 1.2 + 1.3）──────────────────────
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // 解码 URL 中的中文及特殊字符（如 %E6%B5%81%E8%A1%8C → 流行）
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { decoded = urlPath; }

  const filePath = path.join(ROOT, decoded);
  const ext      = path.extname(filePath).toLowerCase();
  const mime     = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// ─── 房间状态（Task 2.1）─────────────────────────────────────
const rooms = new Map(); // roomCode → RoomState
let songIndex = null;    // data/index.json 缓存

function loadSongIndex() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'data', 'index.json'), 'utf-8');
    songIndex = JSON.parse(raw);
    console.log(`[Server] Loaded ${songIndex.length} songs from index`);
  } catch (e) {
    console.warn('[Server] Failed to load data/index.json:', e.message);
    songIndex = [];
  }
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 去掉 I/O 避免混淆
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// ─── 广播工具（Task 3.3 辅助）────────────────────────────────
let _clientIdSeq = 0;

function broadcast(room, msg, excludeId = null) {
  const json = JSON.stringify(msg);
  room.members.forEach((m, id) => {
    if (id === excludeId) return;
    if (m.ws.readyState === 1 /* OPEN */) m.ws.send(json);
  });
}

function sendTo(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function membersPayload(room) {
  return Array.from(room.members.entries()).map(([id, m]) => ({
    id,
    name:  m.name,
    score: m.score,
    isHost: id === room.hostId,
  }));
}

// ─── 分数结算（Task 3.4 + 3.5）───────────────────────────────
const GUESSER_SCORES = [5, 2, 1]; // 第1/2/3名

function endRound(room, timedOut = false) {
  if (room.status !== 'playing') return;
  room.status = 'ended';
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }

  const scores = membersPayload(room);
  const isLastRound = room.currentRound >= room.totalRounds;

  // 广播本轮结束（含原曲文件路径供客户端播放）
  broadcast(room, {
    type:        'round_end',
    answer:      room.song.name,
    songFile:    room.song.file,   // 客户端用于试听原曲
    timedOut,
    scores,
    currentRound: room.currentRound,
    totalRounds:  room.totalRounds,
    isLastRound,
  });

  if (isLastRound) {
    // 所有轮次结束，1s 后广播最终结算
    room.timer = setTimeout(() => {
      broadcast(room, { type: 'game_over', scores });
      room.status = 'lobby';
    }, 1000);
  } else {
    // 还有下一轮，1s 后自动开始
    room.timer = setTimeout(() => startNextRound(room), 1000);
  }
}

// ─── 开始下一轮 ──────────────────────────────────────────────
function startNextRound(room) {
  if (room.status !== 'ended') return;
  room.currentRound++;

  // 轮换弹奏者：按 performerOrder 顺序
  const orderLen = room.performerOrder.length;
  const perfId   = room.performerOrder[(room.currentRound - 1) % orderLen];

  // 换弹奏者后更新 hostId（本轮弹奏者）
  room.roundHostId = perfId;

  const song = pickSong(room);
  if (!song) return;

  room.status       = 'playing';
  room.correctOrder = [];
  room.members.forEach(m => { m.hasGuessed = false; });

  room.members.forEach((m, id) => {
    const payload = {
      type: 'game_start',
      options: song.options,
      startTime: Date.now(),
      currentRound: room.currentRound,
      totalRounds:  room.totalRounds,
      performerName: room.members.get(perfId)?.name || '',
    };
    if (id === perfId) payload.songName = song.name;
    sendTo(m.ws, payload);
  });

  room.timer = setTimeout(() => endRound(room, true), 50000);
}

// ─── 选曲（Task 3.1）─────────────────────────────────────────
function pickSong(room) {
  if (!songIndex || songIndex.length === 0) return null;
  const pick  = songIndex[Math.floor(Math.random() * songIndex.length)];
  const name  = pick.name || path.basename(pick.file, '.mid');

  // 构造 3 个去重干扰项
  const pool    = songIndex.map(s => s.name || path.basename(s.file, '.mid')).filter(n => n !== name);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 2);
  const options  = [name, ...shuffled].sort(() => Math.random() - 0.5);

  room.song = { file: pick.file, name, options, category: pick.category || '' };
  return room.song;
}

// ─── WebSocket 服务（Task 1.2）───────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientId = String(++_clientIdSeq);
  ws._clientId   = clientId;
  ws._roomCode   = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, clientId, msg);
  });

  // Task 2.4：断线处理
  ws.on('close', () => {
    const code = ws._roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    room.members.delete(clientId);

    if (room.members.size === 0) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(code);
      return;
    }

    // 弹奏者断线：结束游戏
    if (clientId === room.hostId && room.status === 'playing') {
      endRound(room, true);
    } else {
      broadcast(room, { type: 'members_update', members: membersPayload(room) });
    }
  });
});

// ─── 消息处理器（Task 2.2 / 2.3 / 3.2 / 3.3 / 3.4 / 3.6）──────
function handleMessage(ws, clientId, msg) {
  switch (msg.type) {

    // Task 2.2：创建房间
    case 'create': {
      const name = (msg.name || '').trim().slice(0, 12) || '匿名';
      const code = generateRoomCode();
      const room = {
        code,
        hostId:  clientId,
        members: new Map(),
        song:    null,
        status:  'lobby',
        timer:   null,
        correctOrder: [],
      };
      room.members.set(clientId, { name, score: 0, ws, hasGuessed: false });
      rooms.set(code, room);
      ws._roomCode = code;

      sendTo(ws, { type: 'joined', roomCode: code, yourId: clientId, isHost: true,
                   members: membersPayload(room) });
      break;
    }

    // Task 2.3：加入房间
    case 'join': {
      const code = (msg.roomCode || '').toUpperCase().trim();
      const name = (msg.name || '').trim().slice(0, 12) || '匿名';

      if (!rooms.has(code)) {
        sendTo(ws, { type: 'error', message: '房间不存在' }); return;
      }
      const room = rooms.get(code);
      if (room.status === 'playing') {
        sendTo(ws, { type: 'error', message: '游戏已开始，请等待下一轮' }); return;
      }

      room.members.set(clientId, { name, score: 0, ws, hasGuessed: false });
      ws._roomCode = code;

      sendTo(ws, { type: 'joined', roomCode: code, yourId: clientId, isHost: false,
                   members: membersPayload(room) });
      broadcast(room, { type: 'members_update', members: membersPayload(room) }, clientId);
      break;
    }

    // Task 3.2：开始游戏
    case 'start': {
      const code = ws._roomCode;
      if (!code || !rooms.has(code)) return;
      const room = rooms.get(code);
      if (clientId !== room.hostId) return;
      if (room.members.size < 2) {
        sendTo(ws, { type: 'error', message: '至少需要 2 名玩家' }); return;
      }

      // 初始化多轮游戏参数
      const validRounds = [3, 5, 10];
      room.totalRounds    = validRounds.includes(msg.rounds) ? msg.rounds : 5;
      room.currentRound   = 1;
      // 按加入顺序构建弹奏者轮转列表
      room.performerOrder = Array.from(room.members.keys());
      room.roundHostId    = room.performerOrder[0]; // 第1轮弹奏者

      const song = pickSong(room);
      if (!song) { sendTo(ws, { type: 'error', message: '暂无曲库数据' }); return; }

      room.status       = 'playing';
      room.correctOrder = [];
      room.members.forEach(m => { m.hasGuessed = false; });

      // 差异化广播：弹奏者含歌名，猜题者不含
      const perfId = room.roundHostId;
      room.members.forEach((m, id) => {
        const payload = {
          type: 'game_start',
          options: song.options,
          startTime: Date.now(),
          currentRound: room.currentRound,
          totalRounds:  room.totalRounds,
          performerName: room.members.get(perfId)?.name || '',
        };
        if (id === perfId) payload.songName = song.name;
        sendTo(m.ws, payload);
      });

      // 50s 倒计时（Task 3.5）
      room.timer = setTimeout(() => endRound(room, true), 50000);
      break;
    }

    // Task 3.3：音符广播（弹奏者 → 所有猜题者）
    case 'note': {
      const code = ws._roomCode;
      if (!code || !rooms.has(code)) return;
      const room = rooms.get(code);
      const perfId = room.roundHostId || room.hostId;
      if (clientId !== perfId || room.status !== 'playing') return;

      broadcast(room, {
        type:     'note',
        midiNote: msg.midiNote,
        noteNum:  msg.noteNum,
        octave:   msg.octave,
        index:    msg.index,
      }, perfId); // 不发给本轮弹奏者自己
      break;
    }

    // 弹奏者弹完通知
    case 'performer_done': {
      const code = ws._roomCode;
      if (!code || !rooms.has(code)) return;
      const room = rooms.get(code);
      const perfId = room.roundHostId || room.hostId;
      if (clientId !== perfId || room.status !== 'playing') return;
      endRound(room, false);
      break;
    }

    // Task 3.4：猜题处理
    case 'guess': {
      const code = ws._roomCode;
      if (!code || !rooms.has(code)) return;
      const room   = rooms.get(code);
      const member = room.members.get(clientId);
      if (!member || member.hasGuessed || room.status !== 'playing') return;
      const currentPerformer = room.roundHostId || room.hostId;
      if (clientId === currentPerformer) return; // 本轮弹奏者不能猜

      member.hasGuessed = true;
      const correct = msg.answer === room.song.name;

      if (correct) {
        room.correctOrder.push(clientId);
        const rank    = room.correctOrder.length;
        const points  = GUESSER_SCORES[rank - 1] ?? 0;
        member.score += points;

        // 本轮弹奏者 +2
        const performer = room.members.get(currentPerformer);
        if (performer) performer.score += 2;

        broadcast(room, {
          type:    'score_update',
          guesser: { id: clientId, name: member.name, points },
          scores:  membersPayload(room),
        });

        // 全员答完（含猜对/猜错）？排除本轮弹奏者
        const guessers = Array.from(room.members.keys()).filter(id => id !== currentPerformer);
        if (guessers.length > 0 && guessers.every(id => room.members.get(id)?.hasGuessed)) {
          endRound(room, false);
        }
      } else {
        // 猜错：只通知本人
        sendTo(ws, { type: 'guess_result', correct: false });
        // 猜错也算答完，检查全员是否都答完
        const guessers2 = Array.from(room.members.keys()).filter(id => id !== currentPerformer);
        if (guessers2.length > 0 && guessers2.every(id => room.members.get(id)?.hasGuessed)) {
          endRound(room, false);
        }
      }
      break;
    }

    // Task 3.6：再来一轮
    case 'replay': {
      const code = ws._roomCode;
      if (!code || !rooms.has(code)) return;
      const room = rooms.get(code);
      if (clientId !== room.hostId) return;

      room.status       = 'lobby';
      room.song         = null;
      room.correctOrder = [];
      room.members.forEach(m => { m.hasGuessed = false; });

      broadcast(room, { type: 'back_to_lobby', members: membersPayload(room) });
      break;
    }

    case 'ping':
      sendTo(ws, { type: 'pong' });
      break;
  }
}

// ─── 启动（Task 1.2）─────────────────────────────────────────
loadSongIndex();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] 你弹我猜 多人服务 running at:`);
  console.log(`  Local:   http://localhost:${PORT}/`);
  console.log(`  Network: http://<your-ip>:${PORT}/`);
});
