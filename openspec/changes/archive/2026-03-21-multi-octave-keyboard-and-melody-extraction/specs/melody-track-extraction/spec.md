## Purpose

从多轨 MIDI 文件中自动识别并提取主旋律轨道，过滤伴奏和弦，确保简谱只展示旋律部分，使游戏可玩性不受伴奏噪音干扰。

## ADDED Requirements

### Requirement: 从多轨 MIDI 中识别并提取主旋律轨道
系统 SHALL 对每条有音符的轨道计算韵律得分（平均音高 × 2 + 音符数量得分 + 单音率得分），选取得分最高的轨道作为主旋律来源。

#### Scenario: 单轨 MIDI
- **WHEN** MIDI 文件只有一条含音符的轨道
- **THEN** 系统 SHALL 直接使用该轨道，无需评分

#### Scenario: 多轨 MIDI，有明显旋律轨
- **WHEN** MIDI 文件有多条轨道，其中旋律轨（右手高音区）的综合得分高于伴奏轨（左手低音区）
- **THEN** 系统 SHALL 选取得分最高的轨道提取音符

#### Scenario: 韵律得分计算
- **WHEN** 对某轨道计算韵律得分
- **THEN** 得分 SHALL 为：平均 MIDI 音高 × 2（主要判据）+ 音符数量得分（最多 20 分）+ 单音率得分（最多 20 分）

### Requirement: 过滤同拍多音符（和弦）
系统 SHALL 在提取旋律后，对同一 tick 位置发音的多个音符，只保留音高最高的一个。

#### Scenario: 同一 tick 多个音符
- **WHEN** 旋律轨中存在 `ticks` 相同的多个音符
- **THEN** 系统 SHALL 只保留其中 MIDI 音高值最大的音符，丢弃其余

#### Scenario: 同一 tick 单个音符
- **WHEN** 某 tick 位置只有一个音符
- **THEN** 系统 SHALL 正常保留该音符，不做过滤