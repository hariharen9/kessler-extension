import * as vscode from 'vscode';
import { scanWorkspace, Project, Artifact } from './scanner';
import { formatBytes } from './utils';

let statusBarItem: vscode.StatusBarItem;
let cachedProjects: Project[] = [];
let lastThresholdAlertSize: number = 0; // Tracks if we've already alerted for this "surge"

export function activate(context: vscode.ExtensionContext) {
    console.log('Kessler VS Code is now active');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'kessler.showLaunchpad';
    context.subscriptions.push(statusBarItem);

    const disposable = vscode.commands.registerCommand('kessler.showLaunchpad', showLaunchpad);
    context.subscriptions.push(disposable);

    const rescanDisposable = vscode.commands.registerCommand('kessler.rescan', updateDebrisStatus);
    context.subscriptions.push(rescanDisposable);

    // Initial scan
    updateDebrisStatus();

    // Rescan when workspace folders change
    vscode.workspace.onDidChangeWorkspaceFolders(() => updateDebrisStatus());
}

async function updateDebrisStatus() {
    if (!vscode.workspace.workspaceFolders) {
        statusBarItem.hide();
        return;
    }

    statusBarItem.text = '$(sync~spin) Kessler: Scanning...';
    statusBarItem.show();

    // Run the scanner in the background
    const paths = vscode.workspace.workspaceFolders.map(f => f.uri.fsPath);
    cachedProjects = await scanWorkspace(paths);

    let totalSize = 0;
    for (const p of cachedProjects) {
        totalSize += p.totalSize;
    }

    if (totalSize > 0) {
        statusBarItem.text = `$(trash) 🛰️ Kessler: ${formatBytes(totalSize)}`;

        // --- SIZE THRESHOLD ALERT ---
        const config = vscode.workspace.getConfiguration('kessler');
        const thresholdGB = config.get<number>('sizeThresholdGB') || 0;
        const thresholdBytes = thresholdGB * 1024 * 1024 * 1024;

        if (thresholdGB > 0 && totalSize > thresholdBytes) {
            if (lastThresholdAlertSize === 0) {
                vscode.window.showWarningMessage(
                    `🛰️ Kessler: Orbital debris has reached ${formatBytes(totalSize)}! Your orbit is getting crowded.`,
                    "Open Launchpad"
                ).then(selection => {
                    if (selection === "Open Launchpad") {
                        vscode.commands.executeCommand('kessler.showLaunchpad');
                    }
                });
                lastThresholdAlertSize = totalSize;
            }
        } else {
            lastThresholdAlertSize = 0;
        }

        let safeSize = 0, deepSize = 0, ignoredSize = 0;
        for (const p of cachedProjects) {
            for (const a of p.artifacts) {
                if (a.tier === 'safe') safeSize += a.size;
                else if (a.tier === 'deep') deepSize += a.size;
                else if (a.tier === 'ignored') ignoredSize += a.size;
            }
        }

        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.appendMarkdown(`**🛰️ Kessler Orbital Telemetry**\n\n`);
        tooltip.appendMarkdown(`Found debris across **${cachedProjects.length} projects**:\n\n`);
        if (safeSize > 0) tooltip.appendMarkdown(`🟢 **Safe Caches:** ${formatBytes(safeSize)}\n\n`);
        if (deepSize > 0) tooltip.appendMarkdown(`🟠 **Deep Artifacts:** ${formatBytes(deepSize)}\n\n`);
        if (ignoredSize > 0) tooltip.appendMarkdown(`🟡 **User Ignored:** ${formatBytes(ignoredSize)}\n\n`);
        tooltip.appendMarkdown(`---\n*Click to open the Launchpad and clean your orbit.*`);
        
        statusBarItem.tooltip = tooltip;
        
        const colorPref = config.get<string>('debrisColor') || 'none';
        
        if (colorPref === 'error') {
            statusBarItem.color = new vscode.ThemeColor('errorForeground');
        } else if (colorPref === 'warning') {
            statusBarItem.color = new vscode.ThemeColor('list.warningForeground');
        } else if (colorPref === 'info') {
            statusBarItem.color = new vscode.ThemeColor('textLink.foreground');
        } else {
            statusBarItem.color = undefined;
        }
    } else {
        lastThresholdAlertSize = 0; // Reset on clean
        statusBarItem.text = `$(check) 🛰️ Kessler: Clean`;
        statusBarItem.tooltip = `Orbit is clear!`;
        statusBarItem.color = undefined;
    }
}

async function showLaunchpad() {
    // If the cache is empty, trigger a quick fresh scan just in case the user recreated debris
    if (cachedProjects.length === 0) {
        await updateDebrisStatus();
    }

    if (cachedProjects.length === 0) {
        vscode.window.showInformationMessage('No space debris found in the current workspace. Orbit is clear! 🛰️');
        return;
    }

    const items: vscode.QuickPickItem[] = [];
    const artifactMap = new Map<string, Artifact>();

    const config = vscode.workspace.getConfiguration('kessler');
    const scanGitIgnoredFlag = config.get<boolean>('scanGitIgnored') ?? false;

    if (scanGitIgnoredFlag) {
        // Sort artifacts by tier
        const safeArtifacts: { p: Project, a: Artifact }[] = [];
        const deepArtifacts: { p: Project, a: Artifact }[] = [];
        const ignoredArtifacts: { p: Project, a: Artifact }[] = [];

        for (const project of cachedProjects) {
            for (const artifact of project.artifacts) {
                if (artifact.tier === 'safe') safeArtifacts.push({ p: project, a: artifact });
                else if (artifact.tier === 'deep') deepArtifacts.push({ p: project, a: artifact });
                else if (artifact.tier === 'ignored') ignoredArtifacts.push({ p: project, a: artifact });
            }
        }

        if (safeArtifacts.length > 0) {
            items.push({
                label: '🟢 SAFE CACHES (Pre-selected)',
                kind: vscode.QuickPickItemKind.Separator
            });
            for (const { p, a } of safeArtifacts) {
                const relativePath = vscode.workspace.asRelativePath(a.path);
                const itemLabel = `$(pass-filled) ${relativePath}`;
                items.push({
                    label: itemLabel,
                    description: `[${p.type}] ${formatBytes(a.size)}`,
                    picked: true
                });
                artifactMap.set(itemLabel, a);
            }
        }

        if (deepArtifacts.length > 0) {
            items.push({
                label: '🟠 DEEP ARTIFACTS (Unselected)',
                kind: vscode.QuickPickItemKind.Separator
            });
            for (const { p, a } of deepArtifacts) {
                const relativePath = vscode.workspace.asRelativePath(a.path);
                const itemLabel = `$(warning) ${relativePath}`;
                items.push({
                    label: itemLabel,
                    description: `[Build/Binaries] ${formatBytes(a.size)}`,
                    picked: false
                });
                artifactMap.set(itemLabel, a);
            }
        }

        if (ignoredArtifacts.length > 0) {
            items.push({
                label: '🟡 USER IGNORED (Review Carefully)',
                kind: vscode.QuickPickItemKind.Separator
            });
            for (const { p, a } of ignoredArtifacts) {
                const relativePath = vscode.workspace.asRelativePath(a.path);
                const itemLabel = `$(eye-closed) ${relativePath}`;
                items.push({
                    label: itemLabel,
                    description: `[Gitignored] ${formatBytes(a.size)}`,
                    picked: false
                });
                artifactMap.set(itemLabel, a);
            }
        }
    } else {
        // Original Project-grouped UI
        for (const project of cachedProjects) {
            items.push({
                label: project.type,
                description: vscode.workspace.asRelativePath(project.path),
                kind: vscode.QuickPickItemKind.Separator
            });

            for (const artifact of project.artifacts) {
                const relativePath = vscode.workspace.asRelativePath(artifact.path);
                const itemLabel = `$(file-directory) ${relativePath}`;
                
                items.push({
                    label: itemLabel,
                    description: `[${artifact.tier}] ${formatBytes(artifact.size)}`,
                    picked: artifact.tier === 'safe'
                });
                artifactMap.set(itemLabel, artifact);
            }
        }
    }

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = items;
    quickPick.canSelectMany = true;
    quickPick.placeholder = 'Select debris to safely move to OS Trash';
    quickPick.title = 'Kessler: Orbital Cleanup';

    // Pre-select items that have the 'picked' property true
    const preSelected = items.filter(item => item.picked);
    quickPick.selectedItems = preSelected;

    // Create a custom Clean button
    const cleanButton = {
        iconPath: new vscode.ThemeIcon('trash'),
        tooltip: 'Clean Selected Debris'
    };
    quickPick.buttons = [cleanButton];

    quickPick.onDidTriggerButton(async (button) => {
        if (button === cleanButton) {
            await handleClean(quickPick.selectedItems, artifactMap);
            quickPick.hide();
        }
    });

    quickPick.onDidAccept(async () => {
        await handleClean(quickPick.selectedItems, artifactMap);
        quickPick.hide();
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
}

async function handleClean(selectedItems: readonly vscode.QuickPickItem[], artifactMap: Map<string, Artifact>) {
    if (!selectedItems || selectedItems.length === 0) {
        return; // User cancelled or selected nothing
    }

    const trashOption = "Move to OS Trash (Safe)";
    const nukeOption = "Permanently Delete ☢️";

    const action = await vscode.window.showWarningMessage(
        `Ready to clear ${selectedItems.length} orbital debris items. How would you like to proceed?`,
        { modal: true },
        trashOption,
        nukeOption
    );

    if (!action) {
        return; // User dismissed the dialog
    }

    const useTrash = action === trashOption;
    let freedSpace = 0;
    
    // Execute cleaning with a progress notification
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: useTrash ? "Kessler: Moving to Trash" : "Kessler: Permanently Nuking Debris",
        cancellable: false
    }, async (progress) => {
        for (const item of selectedItems) {
            const artifact = artifactMap.get(item.label);
            if (artifact) {
                try {
                    const relativePath = vscode.workspace.asRelativePath(artifact.path);
                    progress.report({ message: `Sweeping ${relativePath}...` });
                    
                    const uri = vscode.Uri.file(artifact.path);
                    // Use VS Code's native file system API
                    await vscode.workspace.fs.delete(uri, { recursive: true, useTrash });
                    freedSpace += artifact.size;
                } catch (err) {
                    console.error(`Failed to trash ${artifact.path}:`, err);
                }
            }
        }
    });

    const actionText = useTrash ? "moved to OS Trash" : "permanently deleted";
    vscode.window.showInformationMessage(`✨ Kessler Cleanup Complete! Freed ${formatBytes(freedSpace)} (${actionText})`);
    
    // Rescan to update the status bar
    await updateDebrisStatus();
}

export function deactivate() {}
