## ADDED Requirements

### Requirement: 从多轨 MIDI 中识别并提取主旋律轨道
系统 SHALL 对每条有音符的轨道计算旋律得分，选取得分最高的轨道作为旋律来源，而非简单取第一条轨道。

#### Scenario: 单轨 MIDI
- **WHEN** MIDI 文件只有一条含音符的轨道
- **THEN** 系统 SHALL 直接使用该轨道，无需评分

#### Scenario: 多轨 MIDI，有明显旋律轨
- **WHEN** MIDI 文件有多条轨道，其中一条的旋律得分明显高于其他
- **THEN** 系统 SHALL 选取得分最高的轨道提取音符

#### Scenario: 旋律得分计算
- **WHEN** 对某轨道计算旋律得分
- **THEN** 得分 SHALL 综合以下三项：
  - 单音率（同时只有一个音符发声的比例）× 100（权重最高）
  - 音符数量得分（归一化到 0-30）
  - 音域居中得分：平均 MIDI 音高在 55-80 时 +20，否则按偏差扣分

### Requirement: 过滤和弦/伴奏中的同时多音符
系统 SHALL 在提取旋律后，对同一时刻（相同 startTime）发音的多个音符，只保留音高最高的一个。

#### Scenario: 同一时刻多个音符
- **WHEN** 旋律轨中存在 startTime 相同的多个音符
- **THEN** 系统 SHALL 只保留其中 MIDI 音高值最大的音符，丢弃其余

#### Scenario: 同一时刻单个音符
- **WHEN** 某 startTime 只有一个音符
- **THEN** 系统 SHALL 正常保留该音符，不做过滤
