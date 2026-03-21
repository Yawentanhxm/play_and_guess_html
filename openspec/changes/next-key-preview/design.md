## Context

`highlightKey(note, octave)` 当前只给当前音符加 `.active` class。`highlightNote(index)` 只给当前音符加 `.active`。两处都需要扩展支持「下一个」状态。键盘下方需要新增预告栏 DOM 节点。

## Goals / Non-Goals

**Goals:**
- 当前键：`.key-current`（保持现有亮紫色脉冲，改名 class 以示区分）
- 下一个键：`.key-next`（橙色 `#fb923c` 淡高亮，无动画）
- 简谱下一个音符：`.note-next`（淡橙色底色）
- 预告栏：固定在键盘下方，显示 `NOW A=1  →  NEXT S=2`

**Non-Goals:**
- 不显示「下下个」（避免信息过载）
- 当前键和下一个键恰好是同一个键时，优先显示当前键样式

## Decisions

### class 命名
- 当前键：`.active`（保持不变，CSS 改为脉冲动画）
- 下一个键：`.key-next`（新增）
- 简谱下一个：`.note-next`（新增）

### 键位名称显示规则
```
QWERTYUI → 高八度 1-7
ASDFGHJ  → 中八度 1-7
ZXCVBNM  → 低八度 1-7

预告栏格式：
  NOW  [Q · 1↑]     →    NEXT  [A · 1]
        ↑ 键名·音符·八度标记
```

### 同键连续（当前和下一个是同一个键）
- 只显示当前键 `.active`，不叠加 `.key-next`
- 预告栏 NEXT 部分正常显示（提示玩家再按一次同键）
