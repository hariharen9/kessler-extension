import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DEFAULT_RULES, DANGER_ZONE, Tier, RuleTarget } from './rules';

const execAsync = promisify(exec);

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
    const scanGitIgnoredFlag = config.get<boolean>('scanGitIgnored') ?? false;
    
    const combinedDangerZone = [...DANGER_ZONE, ...customDangerZone];

    for (const root of rootPaths) {
        await scanDirectory(root, projects, excludeFolders, combinedDangerZone, showDeepArtifacts, scanGitIgnoredFlag);
    }
    return projects;
}

async function isTrackedByGit(projectRoot: string, artifactPath: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`git ls-files "${artifactPath}"`, { cwd: projectRoot });
        return stdout.trim().length > 0;
    } catch {
        return false;
    }
}

async function scanGitIgnored(projectRoot: string, existingArtifacts: Artifact[], dangerZone: string[]): Promise<Artifact[]> {
    try {
        // --others: show untracked files
        // --ignored: show ignored files
        // --exclude-standard: use standard gitignore rules
        // --directory: show directories instead of files inside them
        const { stdout } = await execAsync(`git ls-files --others --ignored --exclude-standard --directory`, { cwd: projectRoot });
        const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const newArtifacts: Artifact[] = [];
        const existingPaths = existingArtifacts.map(a => a.path);

        for (const line of lines) {
            // ONLY consider directories (they end with a slash in git ls-files output)
            if (!line.endsWith('/')) continue;
            
            const cleanName = line.slice(0, -1);
            
            // Skip if it's in the danger zone
            if (dangerZone.includes(cleanName)) continue;

            // Build set of all known rule target paths to filter out
            let isRuleTarget = false;
            for (const rule of DEFAULT_RULES) {
                for (const target of rule.targets) {
                    if (target.path === cleanName) isRuleTarget = true;
                    if (target.path.includes('*')) {
                        const regex = new RegExp('^' + target.path.replace(/\*/g, '.*') + '$');
                        if (regex.test(cleanName)) isRuleTarget = true;
                    }
                }
                if (rule.triggers.includes(cleanName)) isRuleTarget = true;
            }

            if (isRuleTarget) continue;

            const targetPath = path.join(projectRoot, cleanName);

            // Skip if already covered by existing artifact (exact match or parent dir)
            let isCovered = false;
            for (const ep of existingPaths) {
                if (targetPath === ep || targetPath.startsWith(ep + path.sep)) {
                    isCovered = true;
                    break;
                }
            }

            if (isCovered) continue;

            try {
                const stats = await fs.promises.stat(targetPath);
                if (stats) {
                    const size = await calculateSize(targetPath);
                    if (size > 0) {
                        newArtifacts.push({ path: targetPath, size, tier: 'ignored' });
                    }
                }
            } catch {
                // Ignore missing/permission errors
            }
        }
        return newArtifacts;

    } catch {
        return []; // Not a git repo or error
    }
}

async function scanDirectory(
    dir: string, 
    projects: Project[], 
    excludeFolders: string[], 
    dangerZone: string[],
    showDeepArtifacts: boolean,
    scanGitIgnoredFlag: boolean
) {
    let entries: fs.Dirent[];
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }

    const entryNames = entries.map(e => e.name);

    let matchedRule = DEFAULT_RULES.find(r => 
        r.triggers.some(t => entryNames.includes(t))
    );

    if (matchedRule) {
        const project: Project = { path: dir, type: matchedRule.name, artifacts: [], totalSize: 0 };

        for (const target of matchedRule.targets) {
            if (!showDeepArtifacts && target.tier === 'deep') continue;
            if (dangerZone.includes(target.path)) continue;

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
                        const isTracked = await isTrackedByGit(dir, targetPath);
                        if (isTracked) continue;

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

        // --- GITIGNORE SCANNING ---
        if (scanGitIgnoredFlag) {
            const ignoredArtifacts = await scanGitIgnored(dir, project.artifacts, dangerZone);
            for (const ig of ignoredArtifacts) {
                project.artifacts.push(ig);
                project.totalSize += ig.size;
            }
        }

        if (project.artifacts.length > 0) {
            projects.push(project);
        }
    }

    for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
            if (excludeFolders.includes(entry.name)) continue;
            if (matchedRule && matchedRule.targets.some(t => t.path === entry.name)) continue;
            if (entry.name === 'node_modules') continue;
            
            await scanDirectory(path.join(dir, entry.name), projects, excludeFolders, dangerZone, showDeepArtifacts, scanGitIgnoredFlag);
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
