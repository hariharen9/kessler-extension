import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DEFAULT_RULES, DANGER_ZONE, Tier } from './rules';

export interface Artifact {
    path: string;
    size: number;
    tier: Tier;
}

export interface Project {
    path: string;
    type: string;
    artifacts: Artifact[];
    totalSize: number;
}

export async function scanWorkspace(rootPaths: string[]): Promise<Project[]> {
    const projects: Project[] = [];
    
    // Read VS Code settings
    const config = vscode.workspace.getConfiguration('kessler');
    const excludeFolders = config.get<string[]>('excludeFolders') || ['.git'];
    const customDangerZone = config.get<string[]>('customDangerZone') || [];
    const showDeepArtifacts = config.get<boolean>('showDeepArtifacts') ?? true;
    
    const combinedDangerZone = [...DANGER_ZONE, ...customDangerZone];

    for (const root of rootPaths) {
        await scanDirectory(root, projects, excludeFolders, combinedDangerZone, showDeepArtifacts);
    }
    return projects;
}

async function scanDirectory(
    dir: string, 
    projects: Project[], 
    excludeFolders: string[], 
    dangerZone: string[],
    showDeepArtifacts: boolean
) {
    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }

    const entryNames = entries.map(e => e.name);

    // Check if it's a project (matches any rule triggers)
    let matchedRule = DEFAULT_RULES.find(r => 
        r.triggers.some(t => entryNames.includes(t))
    );

    if (matchedRule) {
        const project: Project = { path: dir, type: matchedRule.name, artifacts: [], totalSize: 0 };

        for (const target of matchedRule.targets) {
            if (!showDeepArtifacts && target.tier === 'deep') continue;
            if (dangerZone.includes(target.path)) continue;

            // Handle basic wildcard matching (e.g. *.test)
            let matchingEntries = [target.path];
            if (target.path.includes('*')) {
                const regex = new RegExp('^' + target.path.replace(/\*/g, '.*') + '$');
                matchingEntries = entryNames.filter(name => regex.test(name));
            }

            for (const matchName of matchingEntries) {
                if (dangerZone.includes(matchName)) continue;
                
                const targetPath = path.join(dir, matchName);
                try {
                    const stats = await fs.promises.stat(targetPath);
                    if (stats) {
                        const size = await calculateSize(targetPath);
                        if (size > 0) {
                            project.artifacts.push({ path: targetPath, size, tier: target.tier });
                            project.totalSize += size;
                        }
                    }
                } catch {
                    // Ignore missing files
                }
            }
        }

        if (project.artifacts.length > 0) {
            projects.push(project);
        }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
            // Respect user exclusions
            if (excludeFolders.includes(entry.name)) continue;

            // Don't recurse into known targets
            if (matchedRule && matchedRule.targets.some(t => t.path === entry.name)) continue;
            if (entry.name === 'node_modules') continue;
            
            await scanDirectory(path.join(dir, entry.name), projects, excludeFolders, dangerZone, showDeepArtifacts);
        }
    }
}

async function calculateSize(itemPath: string): Promise<number> {
    let totalSize = 0;
    try {
        const stats = await fs.promises.stat(itemPath);
        if (stats.isFile()) {
            return stats.size;
        } else if (stats.isDirectory()) {
            const entries = await fs.promises.readdir(itemPath, { withFileTypes: true });
            // Using Promise.all for speed
            const sizes = await Promise.all(
                entries.map(entry => calculateSize(path.join(itemPath, entry.name)))
            );
            totalSize = sizes.reduce((a, b) => a + b, 0);
        }
    } catch {
        // Ignore permissions/missing errors
    }
    return totalSize;
}
