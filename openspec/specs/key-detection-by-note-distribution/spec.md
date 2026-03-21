# key-detection-by-note-distribution Specification

## Purpose
TBD - created by archiving change fix-key-signature-detection. Update Purpose after archive.
## Requirements
### Requirement: 根音加权使用音符出现顺序序号而非 MIDI tick 时间
`detectKeyByNoteDistribution()` SHALL 记录各音高首次出现时的顺序编号（从 0 起），而非 MIDI tick 时间值。阈值 `< 5` 的语义 SHALL 为「该音高在前 5 个不重复音高中出现」。

#### Scenario: 根音出现在曲子开头
- **WHEN** 某调号的 root 音高在所有音符中首次出现的顺序编号 < 5
- **THEN** 该调号的得分 SHALL 额外加上 `noteCounts[root] * 3`

#### Scenario: 根音未出现在曲子开头
- **WHEN** 某调号的 root 音高首次出现顺序编号 ≥ 5，或该音高从未出现
- **THEN** 该调号不获得额外加分，继续正常评分流程

### Requirement: 平行调区分——终止音加权
系统 SHALL 在 `detectKeyByNoteDistribution()` 中统计曲子末尾 10% 音符的音高分布，对末尾高频音高与某调 root 吻合的情况额外加分，以区分 scale 相同的平行调（如 C 大调 vs A 小调）。

#### Scenario: 末尾音符根音与候选调 root 吻合
- **WHEN** 取曲子最后 `max(10, totalNotes * 0.1)` 个音符，某音高 `p` 在其中出现次数 > 0，且 `p` 等于某候选调的 `root`
- **THEN** 该候选调得分 SHALL 额外加上 `endingCounts[p] * 5`

#### Scenario: 末尾音符与候选调 root 不匹配
- **WHEN** 末尾区段中无音符等于某候选调的 root
- **THEN** 该候选调不获得终止音加分，其他得分项不受影响

#### Scenario: 曲子音符总数极少（< 10）
- **WHEN** 曲子总音符数 < 10
- **THEN** 终止音加权的样本区段取全部音符，逻辑保持一致，不做特殊处理

