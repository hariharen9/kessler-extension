"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanWorkspace = scanWorkspace;
const fs = require("fs");
const path = require("path");
const rules_1 = require("./rules");
async function scanWorkspace(rootPaths) {
    const projects = [];
    for (const root of rootPaths) {
        await scanDirectory(root, projects);
    }
    return projects;
}
async function scanDirectory(dir, projects) {
    let entries;
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    const entryNames = entries.map(e => e.name);
    // Check if it's a project (matches any rule triggers)
    let matchedRule = rules_1.DEFAULT_RULES.find(r => r.triggers.some(t => entryNames.includes(t)));
    if (matchedRule) {
        const project = { path: dir, type: matchedRule.name, artifacts: [], totalSize: 0 };
        for (const target of matchedRule.targets) {
            if (rules_1.DANGER_ZONE.includes(target.path))
                continue;
            const targetPath = path.join(dir, target.path);
            try {
                const stats = await fs.promises.stat(targetPath);
                if (stats) {
                    const size = await calculateSize(targetPath);
                    if (size > 0) {
                        project.artifacts.push({ path: targetPath, size, tier: target.tier });
                        project.totalSize += size;
                    }
                }
            }
            catch {
                // Ignore missing files
            }
        }
        if (project.artifacts.length > 0) {
            projects.push(project);
        }
    }
    // Recurse into subdirectories (skipping hidden and common heavy folders)
    for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
            // Don't recurse into known targets
            if (matchedRule && matchedRule.targets.some(t => t.path === entry.name))
                continue;
            if (entry.name === 'node_modules')
                continue;
            await scanDirectory(path.join(dir, entry.name), projects);
        }
    }
}
async function calculateSize(itemPath) {
    let totalSize = 0;
    try {
        const stats = await fs.promises.stat(itemPath);
        if (stats.isFile()) {
            return stats.size;
        }
        else if (stats.isDirectory()) {
            const entries = await fs.promises.readdir(itemPath, { withFileTypes: true });
            // Using Promise.all for speed
            const sizes = await Promise.all(entries.map(entry => calculateSize(path.join(itemPath, entry.name))));
            totalSize = sizes.reduce((a, b) => a + b, 0);
        }
    }
    catch {
        // Ignore permissions/missing errors
    }
    return totalSize;
}
//# sourceMappingURL=scanner.js.map