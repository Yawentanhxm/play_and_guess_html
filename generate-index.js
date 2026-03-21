/**
 * 扫描 data/ 目录下所有 .mid 文件，生成 data/index.json
 * 运行: node generate-index.js
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT = path.join(DATA_DIR, 'index.json');

function scanDir(dir, baseDir) {
    const result = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...scanDir(fullPath, baseDir));
        } else if (entry.name.toLowerCase().endsWith('.mid')) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            const category = path.relative(baseDir, dir).replace(/\\/g, '/') || '其他';
            // 从文件名提取歌名：去掉扩展名、去掉版本后缀（括号、数字、作者名等）
            let name = path.basename(entry.name, path.extname(entry.name));
            // 清理常见噪音：括号内容、数字后缀、常见前缀
            name = name
                .replace(/[（(【\[](.*?)[）)\]】]/g, '')  // 去括号
                .replace(/[-—–]\s*(周杰伦|钢琴版|完整版|片段|Cover.*|SG.*|伴奏.*)/g, '')
                .replace(/\d+$/, '')   // 去末尾数字
                .replace(/[-—–_\s]+$/, '') // 去末尾符号
                .trim();
            if (!name) name = path.basename(entry.name, path.extname(entry.name));
            result.push({ file: relativePath, name, category });
        }
    }
    return result;
}

const files = scanDir(DATA_DIR, DATA_DIR);

// 按 category + name 排序
files.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

fs.writeFileSync(OUTPUT, JSON.stringify(files, null, 2), 'utf-8');
console.log(`生成完成：${files.length} 个文件 → data/index.json`);
