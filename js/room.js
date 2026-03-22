/**
 * js/room.js — 多人房间前端逻辑
 * Tasks 4.3, 5.1-5.5, 6.1-6.5, 7.1-7.4
 */

// ─── 全局状态 ─────────────────────────────────────────────────
// 暴露到 window 以便模式切换时可断开连接
window.roomState = null;
const state = window.roomState = {
  ws:         null,
  myId:       null,
  isHost:     false,
  roomCode:   null,
  role:       null,      // 'performer' | 'guesser'
  song:       null,      // { songName?, options, notes: [] }
  noteIndex:  0,
  hasGuessed: false,
  guessedCorrect: false, // 本轮是否猜对
  countdownTimer: null,
  scoreSnapshot: {},     // id → score (开局前)
};

// ROOM_KEY_MAP：多人模式键盘字母 → {note, octave}
const ROOM_KEY_MAP = {
  'q':{note:1,octave:1},'w':{note:2,octave:1},'e':{note:3,octave:1},
  'r':{note:4,octave:1},'t':{note:5,octave:1},'y':{note:6,octave:1},'u':{note:7,octave:1},
  'a':{note:1,octave:0},'s':{note:2,octave:0},'d':{note:3,octave:0},
  'f':{note:4,octave:0},'g':{note:5,octave:0},'h':{note:6,octave:0},'j':{note:7,octave:0},
  'z':{note:1,octave:-1},'x':{note:2,octave:-1},'c':{note:3,octave:-1},
  'v':{note:4,octave:-1},'b':{note:5,octave:-1},'n':{note:6,octave:-1},'m':{note:7,octave:-1},
};

// ─── 默认昵称计数器 ───────────────────────────────────────────
let _guestCount = 0;
function defaultName() { return `神秘音乐家${++_guestCount}`; }

// ─── DOM 引用 ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
console.log('[room.js] 开始初始化，createBtn=', document.getElementById('createBtn'));
const entryView     = $('entryView');
const lobbyView     = $('lobbyView');
const performerView = $('performerView');
const guesserView   = $('guesserView');
const resultView    = $('resultView');

// ─── 视图切换 ─────────────────────────────────────────────────
function showView(view) {
  // 确保多人容器本身可见
  const mc = document.getElementById('multiContainer');
  if (mc) mc.classList.remove('hidden');
  // 切换内部子视图
  [entryView, lobbyView, performerView, guesserView, resultView]
    .forEach(v => v && v.classList.add('hidden'));
  if (view) view.classList.remove('hidden');
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  const wrap  = $('toastWrap');
  const el    = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ─── 成员列表渲染 ─────────────────────────────────────────────
function renderMembers(members) {
  const list = $('membersList');
  list.innerHTML = members.map(m => `
    <div class="member-item">
      <div class="member-avatar">${m.name.charAt(0)}</div>
      <div class="member-name">${escHtml(m.name)}${m.id === state.myId ? ' <small style="color:#c084fc">(你)</small>' : ''}</div>
      ${m.isHost ? '<span class="member-badge badge-host">弹奏者</span>' : ''}
      <span class="member-badge badge-score">${m.score} 分</span>
    </div>`).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── 简谱渲染 ─────────────────────────────────────────────────
// notes 格式：[{note:1-7, octave:-1/0/1, midiNote}, ...]
// 由服务端 game_start 携带（Task 3.2 中 pickSong 未解析 MIDI，
// 简谱直接由弹奏者端在弹奏时实时推送过来，猜题者端动态追加）
function renderSheet(containerId, notes, activeIndex = -1) {
  const el = $(containerId);
  el.innerHTML = '';
  notes.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'mp-note' +
      (i === activeIndex ? ' active' : i < activeIndex ? ' played' : '');
    div.dataset.index = i;

    const dots = n.octave === 1 ? '·' : n.octave === -1 ? ',' : '';
    div.innerHTML = `<span class="octave-dots">${n.octave === 1 ? dots : ''}</span>
                     <span>${n.note}</span>
                     <span class="octave-dots">${n.octave === -1 ? dots : ''}</span>`;
    el.appendChild(div);
  });
}

// ─── 猜题者：追加一个音符 ────────────────────────────────────
function appendNoteToGuesserSheet(noteData) {
  if (!state.song) return;
  if (!state.song.notes) state.song.notes = [];
  state.song.notes.push(noteData);
  renderSheet('guesserSheet', state.song.notes, state.song.notes.length);
}

// ─── 倒计时 ──────────────────────────────────────────────────
function startCountdown(startTime, totalMs, barId, textId) {
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  const bar  = $(barId);
  const text = $(textId);

  function tick() {
    const elapsed = Date.now() - startTime;
    const remain  = Math.max(0, totalMs - elapsed);
    const pct     = (remain / totalMs) * 100;
    bar.style.width  = pct + '%';
    text.textContent = Math.ceil(remain / 1000) + 's';
    if (remain <= 0) clearInterval(state.countdownTimer);
  }
  tick();
  state.countdownTimer = setInterval(tick, 500);
}

// ─── 键盘高亮（弹奏者） ───────────────────────────────────────
function highlightKey(note, octave) {
  document.querySelectorAll('#performerView .key').forEach(k => {
    k.classList.remove('active');
    if (parseInt(k.dataset.note) === note && parseInt(k.dataset.octave) === octave) {
      k.classList.add('active');
    }
  });
}

// ─── WebSocket 连接 ───────────────────────────────────────────
function connect(onOpen) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws    = new WebSocket(`${proto}://${location.host}`);
  state.ws    = ws;

  ws.onopen  = onOpen;
  ws.onmessage = e => handleServerMsg(JSON.parse(e.data));
  ws.onerror   = () => showToast('⚠️ 连接出错，请刷新页面');
  ws.onclose   = () => showToast('⚠️ 连接断开');
}

function send(msg) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(msg));
  }
}

// ─── 服务端消息处理 ───────────────────────────────────────────
function handleServerMsg(msg) {
  switch (msg.type) {

    // Task 4.3：joined
    case 'joined': {
      state.myId     = msg.yourId;
      state.isHost   = msg.isHost;
      state.roomCode = msg.roomCode;

      $('roomCodeDisplay').textContent = msg.roomCode;
      renderMembers(msg.members || []);

      const startBtn  = $('roomStartBtn');
      const lobbyHint = $('lobbyHint');
      if (state.isHost) {
        startBtn.classList.remove('hidden');
        lobbyHint.classList.add('hidden');
      }
      showView(lobbyView);
      break;
    }

    // 成员更新
    case 'members_update':
      renderMembers(msg.members || []);
      break;

    // Task 5.1 / 6.1：game_start
    case 'game_start': {
      const isPerformer = msg.songName !== undefined;
      state.role     = isPerformer ? 'performer' : 'guesser';
      state.noteIndex = 0;
      state.hasGuessed    = false;
      state.guessedCorrect = false;
      state.song     = {
        songName: msg.songName || null,
        options:  msg.options || [],
        notes:    [],
      };
      // 记录开局分数快照（用于结算时计算本轮得分）
      state.scoreSnapshot = {};

      if (isPerformer) {
        // 弹奏者视图：复用单人模式界面（Task 5.1）
        // 挂钩子：每次按对音符 → 广播给猜题者
        window.onRoomNoteCorrect = (note) => {
          send({ type: 'note', midiNote: note.midiNote, noteNum: note.note, octave: note.octave ?? 0 });
        };
        // 挂钩子：弹奏结束 → 通知服务器结束本轮
        window.onRoomPerformerFinished = () => {
          window.onRoomNoteCorrect = null;
          window.onRoomPerformerFinished = null;
          // 回到多人界面（等待服务器推 game_end）
          if (window._gameInstance) window._gameInstance.endRoomPerformerMode();
          send({ type: 'performer_done' });
        };
        // 等 MIDI 曲库加载完后再启动弹奏
        const startPerformer = () => {
          const localSong = (typeof SONGS !== 'undefined')
            ? SONGS.find(s => s.name === msg.songName)
            : null;
          if (!localSong) {
            showToast('⚠️ 找不到歌曲数据：' + msg.songName);
            return;
          }
          if (window._gameInstance) {
            window._gameInstance.startRoomPerformerMode(localSong);
          }
        };

        if (window._gameInstance && window._gameInstance._songsLoaded) {
          startPerformer();
        } else if (window._gameInstance) {
          // 曲库还在加载中，等加载完再启动
          window.onSongsReady = startPerformer;
          showToast('🎵 曲库加载中，请稍候...');
        } else {
          showToast('⚠️ 游戏实例未就绪，请刷新页面');
        }
      } else {
        // 猜题者视图（Task 6.1）
        $('guesserSheet').innerHTML = '';
        renderGuessOptions(msg.options);
        startCountdown(msg.startTime, 50000, 'gCountdownBar', 'gCountdownText');
        // 提前激活 AudioContext，确保后续收到 note 时能正常发声
        const actx = audioManager.audioContext;
        if (actx && actx.state === 'suspended') actx.resume();
        showView(guesserView);
      }
      break;
    }

    // Task 6.2：猜题者收到音符
    case 'note': {
      if (state.role !== 'guesser') return;
      const ctx = audioManager.audioContext;
      const play = () => audioManager.playNoteByMidi(msg.midiNote, 0.4);
      // AudioContext 可能因无用户交互而处于 suspended，需先 resume
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(play);
      } else {
        play();
      }
      appendNoteToGuesserSheet({ note: msg.noteNum, octave: msg.octave, midiNote: msg.midiNote });
      break;
    }

    // Task 5.5 / 6.4：score_update
    case 'score_update': {
      const g = msg.guesser;
      if (g.id === state.myId) {
        state.guessedCorrect = true;  // ← 标记本人猜对
        showToast(`✅ 你猜对了！+${g.points} 分`);
      } else if (state.role === 'performer') {
        showToast(`🎉 ${escHtml(g.name)} 猜对了！你 +2 分`);
      } else {
        showToast(`🎵 ${escHtml(g.name)} 猜对了！`);
      }
      break;
    }

    // Task 6.3：猜错反馈
    case 'guess_result': {
      if (!msg.correct) showToast('❌ 猜错了，继续加油！');
      break;
    }

    // 本轮结束（含原曲播放 + 倒计时进入下一轮）
    case 'round_end': {
      if (state.countdownTimer) clearInterval(state.countdownTimer);
      document.removeEventListener('keydown', handlePerformerKey);
      document.removeEventListener('keyup', handlePerformerKeyUp);
      if (state.role === 'performer' && window._gameInstance) {
        window._gameInstance.endRoomPerformerMode();
      }

      // 判断本人是否猜对（弹奏者不参与猜题，特殊提示）
      const isPerformer   = state.role === 'performer';
      const iGuessedRight = !isPerformer && state.guessedCorrect;

      // 结果标题区域差异化
      const resultAnswerEl = $('resultAnswer');
      resultAnswerEl.textContent = msg.answer;

      // 差异化横幅
      const bannerEl = $('resultBanner');
      if (bannerEl) {
        if (isPerformer) {
          bannerEl.textContent  = '🎹 本轮你是弹奏者';
          bannerEl.className    = 'result-banner performer';
        } else if (iGuessedRight) {
          bannerEl.textContent  = '🎉 猜对了！';
          bannerEl.className    = 'result-banner correct';
        } else {
          bannerEl.textContent  = '😢 没猜中，答案是';
          bannerEl.className    = 'result-banner wrong';
        }
        bannerEl.classList.remove('hidden');
      }

      const tbody  = $('scoreTableBody');
      const sorted = [...(msg.scores || [])].sort((a, b) => b.score - a.score);
      tbody.innerHTML = sorted.map((m, i) => {
        const roundPts = m.score - (state.scoreSnapshot[m.id] || 0);
        const isMe     = m.id === state.myId;
        return `<tr class="${isMe ? 'me' : ''}">
          <td>${i + 1}</td>
          <td>${escHtml(m.name)}${m.isHost ? ' 🎹' : ''}${isMe ? ' (你)' : ''}</td>
          <td style="color:${roundPts > 0 ? '#34d399' : 'inherit'}">+${roundPts}</td>
          <td><strong>${m.score}</strong></td>
        </tr>`;
      }).join('');

      $('replayBtn').classList.add('hidden');
      $('resultHint').textContent = msg.isLastRound
        ? '🏆 全部轮次结束，正在结算...'
        : `第 ${msg.currentRound}/${msg.totalRounds} 轮结束，5 秒后自动开始下一轮...`;
      $('resultHint').classList.remove('hidden');

      // 播放原曲
      _playResultMidi(msg.songFile);
      _startResultCountdown(5, msg.isLastRound);
      showView(resultView);
      break;
    }

    // 全部轮次结束 → 最终总结算
    case 'game_over': {
      if (state._resultCountdownTimer) clearInterval(state._resultCountdownTimer);
      _stopResultMidi();
      $('resultHint').textContent = '🎊 游戏结束！';
      if (state.isHost) {
        $('replayBtn').textContent = '🔄 再来一局';
        $('replayBtn').classList.remove('hidden');
        $('resultHint').classList.add('hidden');
      }
      break;
    }

    // Task 7.4：back_to_lobby
    case 'back_to_lobby': {
      state.role           = null;
      state.song           = null;
      state.noteIndex      = 0;
      state.hasGuessed     = false;
      state.guessedCorrect = false;
      _stopResultMidi();
      renderMembers(msg.members || []);
      $('replayBtn').classList.add('hidden');
      $('resultHint').classList.remove('hidden');
      showView(lobbyView);
      break;
    }

    case 'error':
      showToast('⚠️ ' + msg.message);
      $('entryError').textContent = msg.message;
      break;
  }
}

// ─── 弹奏者按键处理（Task 5.2 + 5.3）────────────────────────
let _freeActiveNote = null;

function handlePerformerKey(e) {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (!(k in ROOM_KEY_MAP)) return;

  const { note, octave } = ROOM_KEY_MAP[k];
  highlightKey(note, octave);

  // 发声
  const midiNote = noteToMidi(note, octave);
  audioManager.startNote(midiNote);
  _freeActiveNote = midiNote;

  // 追加到简谱
  if (!state.song.notes) state.song.notes = [];
  const index = state.song.notes.length;
  state.song.notes.push({ note, octave, midiNote });

  // 更新弹奏者简谱（实时显示）
  renderSheet('performerSheet', state.song.notes, index + 1);

  // 广播给猜题者（Task 5.3）
  send({ type: 'note', midiNote, noteNum: note, octave, index });
}

function handlePerformerKeyUp(e) {
  if (_freeActiveNote != null) {
    audioManager.stopNote(_freeActiveNote);
    _freeActiveNote = null;
  }
  // 清除键盘高亮
  document.querySelectorAll('#performerView .key').forEach(k => k.classList.remove('active'));
}

// MIDI 音符计算（与 game.js 同逻辑，C大调基准）
function noteToMidi(noteNum, octave) {
  // C大调音阶半音偏移：1→0,2→2,3→4,4→5,5→7,6→9,7→11
  const offsets = [0, 0, 2, 4, 5, 7, 9, 11];
  const base = 60 + offsets[noteNum]; // 中央 C 起
  return base + octave * 12;
}

// ─── 猜题选项渲染（Task 6.1 + 6.3）──────────────────────────
function renderGuessOptions(options) {
  const wrap = $('guessOptions');
  wrap.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn-mp';
    btn.textContent = opt;
    btn.addEventListener('click', () => submitGuess(opt, btn, options));
    wrap.appendChild(btn);
  });
}

function submitGuess(answer, clickedBtn, allOptions) {
  if (state.hasGuessed) return;
  state.hasGuessed = true;

  // 锁定所有按钮（Task 6.3）
  $('guessOptions').querySelectorAll('.option-btn-mp').forEach(b => {
    b.disabled = true;
  });
  clickedBtn.classList.add('pending'); // 等服务端反馈

  send({ type: 'guess', answer });
  $('guesserTip').textContent = '已提交，等待结果...';
}

// ─── 入口事件绑定 ─────────────────────────────────────────────
// 脚本在 </body> 前加载，DOM 已就绪，直接绑定无需等 DOMContentLoaded
function _initRoomEvents() {
    console.log('初始化房间事件绑定');
  // 创建房间
  $('createBtn').addEventListener('click', () => {
    const name = $('nickInput').value.trim() || defaultName();
    connect(() => send({ type: 'create', name }));
  });

  // 加入房间
  $('joinBtn').addEventListener('click', () => {
    const name = $('nickInput').value.trim() || defaultName();
    const code = $('codeInput').value.trim().toUpperCase();
    if (code.length !== 4) { $('entryError').textContent = '请输入 4 位房间码'; return; }
    connect(() => send({ type: 'join', name, roomCode: code }));
  });

  // Enter 键快捷
  $('codeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('joinBtn').click();
  });
  $('nickInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('createBtn').click();
  });

  // 复制房间码（Task 4.4）
  $('roomCodeBox').addEventListener('click', () => {
    navigator.clipboard?.writeText(state.roomCode).then(() => showToast('✅ 房间码已复制'));
  });

  // 开始游戏（多人大厅）
  $('roomStartBtn').addEventListener('click', () => {
    const rounds = parseInt($('roundsWrap')?.dataset.selected || '5');
    send({ type: 'start', rounds });
  });

  // 再来一轮
  $('replayBtn').addEventListener('click', () => {
    send({ type: 'replay' });
  });

  // 触屏键盘支持（弹奏者视图）
  document.querySelectorAll('#performerView .key').forEach(key => {
    key.addEventListener('touchstart', e => {
      e.preventDefault();
      const note   = parseInt(key.dataset.note);
      const octave = parseInt(key.dataset.octave);
      highlightKey(note, octave);
      const midiNote = noteToMidi(note, octave);
      audioManager.startNote(midiNote);
      _freeActiveNote = midiNote;

      if (!state.song || !state.song.notes) return;
      const index = state.song.notes.length;
      state.song.notes.push({ note, octave, midiNote });
      renderSheet('performerSheet', state.song.notes, index + 1);
      send({ type: 'note', midiNote, noteNum: note, octave, index });
    }, { passive: false });

    ['touchend', 'touchcancel'].forEach(ev => {
      key.addEventListener(ev, e => {
        e.preventDefault();
        if (_freeActiveNote != null) { audioManager.stopNote(_freeActiveNote); _freeActiveNote = null; }
        document.querySelectorAll('#performerView .key').forEach(k => k.classList.remove('active'));
      }, { passive: false });
    });
  });
}

// ─── 结算页原曲播放 ───────────────────────────────────────────
let _resultMidiEl = null;

function _playResultMidi(songFile) {
  _stopResultMidi();
  if (!songFile) return;
  const audio = document.createElement('audio');
  audio.src  = `data/${songFile}`;
  audio.autoplay = true;
  audio.volume   = 0.6;
  audio.style.display = 'none';
  document.body.appendChild(audio);
  _resultMidiEl = audio;
}

function _stopResultMidi() {
  if (_resultMidiEl) {
    _resultMidiEl.pause();
    _resultMidiEl.remove();
    _resultMidiEl = null;
  }
}

// ─── 结算页倒计时 ─────────────────────────────────────────────
function _startResultCountdown(seconds) {
  if (state._resultCountdownTimer) clearInterval(state._resultCountdownTimer);
  let remain = seconds;
  const hint = $('resultHint');
  const baseText = hint.textContent;

  state._resultCountdownTimer = setInterval(() => {
    remain--;
    if (remain <= 0) {
      clearInterval(state._resultCountdownTimer);
    } else {
      // 更新倒计时数字
      hint.textContent = baseText.replace(/\d+ 秒/, `${remain} 秒`);
    }
  }, 1000);
}

// ─── 大厅轮数选择 UI（房主可见）─────────────────────────────
function _initRoundsSelector() {
  const startBtn = $('roomStartBtn');
  if (!startBtn) return;

  // 在开始按钮前插入轮数选择
  const wrap = document.createElement('div');
  wrap.id = 'roundsWrap';
  wrap.style.cssText = 'text-align:center;margin-bottom:12px;';
  wrap.innerHTML = `
    <span style="font-size:13px;color:rgba(226,217,243,0.6);margin-right:8px;">选择轮数：</span>
    ${[3,5,10].map(n => `
      <button class="rounds-btn${n===5?' active':''}" data-rounds="${n}"
        style="padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;
               cursor:pointer;margin:0 4px;transition:all .2s;border:1px solid rgba(192,132,252,0.3);
               background:${n===5?'rgba(192,132,252,0.2)':'rgba(255,255,255,0.04)'};
               color:${n===5?'#c084fc':'rgba(226,217,243,0.6)'}">
        ${n} 轮
      </button>`).join('')}
  `;
  startBtn.parentNode.insertBefore(wrap, startBtn);

  // 选中状态切换
  wrap.querySelectorAll('.rounds-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.rounds-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.04)';
        b.style.color = 'rgba(226,217,243,0.6)';
        b.style.borderColor = 'rgba(192,132,252,0.3)';
      });
      btn.style.background = 'rgba(192,132,252,0.2)';
      btn.style.color = '#c084fc';
      btn.style.borderColor = '#c084fc';
      wrap.dataset.selected = btn.dataset.rounds;
    });
  });
  wrap.dataset.selected = '5';
}

_initRoomEvents();
_initRoundsSelector();
