# 🎵 你弹我猜

> 一款基于简谱的音乐猜歌游戏 —— 跟随简谱弹奏，猜出歌名！

![游戏截图](https://img.shields.io/badge/Platform-Web-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Songs](https://img.shields.io/badge/Songs-220%2B-orange) ![OpenSpec](https://img.shields.io/badge/Built%20with-OpenSpec-purple)

---

## 🧠 开发范式：Spec-Driven Development

本游戏基于 **[OpenSpec](https://github.com/codemaker-ai/openspec)** 规范驱动开发范式构建。

OpenSpec 是一种「先写规格，再写代码」的开发方法论：每一个功能改动都以结构化的 **变更工件（Change Artifacts）** 为驱动，确保设计决策、需求规格和实现任务在落地前就已完整记录。

```
📋 Proposal   →   需求意图与影响范围
🎨 Design     →   技术方案与关键决策
📐 Specs      →   行为规格（Given / When / Then）
✅ Tasks      →   可执行的实现任务清单
```

本仓库的所有核心功能（调号识别修复、多八度键盘、旋律提取算法、移动端适配等）均经过完整的 Spec 流程设计后实现，变更记录保存在 `openspec/changes/` 目录下。

---

## 🎮 游戏玩法

1. 选择歌曲分类（流行 / 儿歌 / 民谣）
2. 游戏随机抽取一首歌，显示**简谱**
3. 按照键盘提示弹奏音符（支持三个八度）
4. 弹奏完成或点击「我猜到了」后进入答题阶段
5. 从三个选项中选出正确的歌名
6. 5 关后结算得分

---

## ✨ 功能特性

- 🎹 **三排 21 键键盘** — 覆盖高/中/低三个八度，支持大多数流行曲目音域
- 🎼 **标准简谱展示** — 按小节分行，支持高低八度圆点标记，自动分段排版
- 🎵 **智能旋律提取** — 自动从多轨 MIDI 中识别主旋律轨道，过滤伴奏和弦
- 🔑 **精准调号识别** — 优先读取 MIDI Meta 事件，回退 Tonal.js 分析，支持全部大小调
- ⏱️ **30 秒弹奏时限** — 倒计时常驻显示，支持随时跳过直接答题
- 📱 **移动端适配** — 支持触屏点击弹奏，响应式布局
- 🎲 **动态干扰选项** — 答题选项从歌库随机抽取，每次都不同
- 🗂️ **歌库自动扫描** — 新增 MIDI 文件后运行脚本即可更新，无需修改代码

---

## 🚀 快速开始

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/Yawentanhxm/play_and_guess_html.git
cd play_and_guess_html

# 启动本地服务器（任选一种）
npx serve .              # Node.js
python -m http.server 8080  # Python 3

# 浏览器访问
open http://localhost:3000
```

### 局域网多人游玩

```bash
# 监听所有网卡，局域网设备可访问
npx serve . --listen tcp://0.0.0.0:3000
```

手机访问 `http://<电脑IP>:3000` 即可（需确保手机与电脑在同一 WiFi，且路由器未开启 AP 隔离）

---

## ⌨️ 键位说明

| 排列 | 键位 | 对应音 |
|------|------|--------|
| 高八度 ↑ | `Q` `W` `E` `R` `T` `Y` `U` | 1̇ 2̇ 3̇ 4̇ 5̇ 6̇ 7̇ |
| 中八度  | `A` `S` `D` `F` `G` `H` `J` | 1 2 3 4 5 6 7 |
| 低八度 ↓ | `Z` `X` `C` `V` `B` `N` `M` | 1̣ 2̣ 3̣ 4̣ 5̣ 6̣ 7̣ |

- **Enter** — 跳过弹奏，直接进入答题

---

## 📁 项目结构

```
你弹我猜_html/
├── index.html              # 游戏主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── game.js             # 游戏核心逻辑
│   ├── audio.js            # 音频播放（Web Audio API）
│   ├── data.js             # 歌单配置 & 常量
│   ├── main.js             # 入口初始化
│   ├── tonejs-midi.js      # @tonejs/midi 本地副本
│   └── tonal.js            # Tonal.js 本地副本
├── data/
│   ├── index.json          # 歌单索引（由脚本生成）
│   └── 流行/               # MIDI 文件目录
│       └── *.mid
└── generate-index.js       # 歌单索引生成脚本
```

---

## 🎵 新增歌曲

1. 将 `.mid` 文件放入 `data/<分类>/` 目录（如 `data/流行/`）
2. 运行索引生成脚本：

```bash
node generate-index.js
```

3. 刷新游戏页面，新歌自动加入歌库 ✅

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| Vanilla JS (ES6+) | 游戏逻辑 |
| Web Audio API | 音符播放合成 |
| [@tonejs/midi](https://github.com/Tonejs/Midi) | MIDI 文件解析 |
| [Tonal.js](https://github.com/tonaljs/tonal) | 调号检测辅助 |
| CSS Variables + Flexbox | 响应式布局 |

---

## 📝 License

MIT © 2026
