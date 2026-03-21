# midi-key-signature-parsing Specification

## Purpose
TBD - created by archiving change fix-key-signature-detection. Update Purpose after archive.
## Requirements
### Requirement: 从 @tonejs/midi 正确读取 Key Signature Meta 信息
系统 SHALL 在 `detectKeySignature()` 中遍历所有 track，若任一 track 的 `keySignatures` 数组非空，则使用第一个 Key Signature 条目作为调号来源。

#### Scenario: MIDI 文件含有 Key Signature Meta 事件
- **WHEN** `@tonejs/midi` 解析 MIDI 文件后，某 track 的 `keySignatures[0]` 存在
- **THEN** `detectKeySignature()` SHALL 将其 `{ key, scale }` 映射为 `KEY_SIGNATURES` 中对应的键名并返回（如 `{ key: 'C', scale: 'major' }` → `'C'`，`{ key: 'A', scale: 'minor' }` → `'Am'`）

#### Scenario: 映射 minor 调号
- **WHEN** `keySignatures[0].scale` 包含 `'minor'` 字符串
- **THEN** 系统 SHALL 将 key 名称加上 `'m'` 后缀构成映射键（如 `'A'` → `'Am'`），若该键不在 `KEY_SIGNATURES` 中则回退到分布检测

#### Scenario: 映射 major 调号
- **WHEN** `keySignatures[0].scale` 包含 `'major'` 字符串
- **THEN** 系统 SHALL 直接使用 key 名称（如 `'C'`），若该键不在 `KEY_SIGNATURES` 中则回退到分布检测

#### Scenario: MIDI 文件不含 Key Signature Meta 事件
- **WHEN** 所有 track 的 `keySignatures` 均为空或不存在
- **THEN** 系统 SHALL 回退到 `detectKeyByTonal()` 进行推断，行为与修复前一致

