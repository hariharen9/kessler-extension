"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const scanner_1 = require("./scanner");
const utils_1 = require("./utils");
let statusBarItem;
let cachedProjects = [];
let lastThresholdAlertSize = 0; // Tracks if we've already alerted for this "surge"
function activate(context) {
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
    // Setup Git Branch Switch Watcher
    setupGitWatcher();
}
function setupGitWatcher() {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
        const initGitApi = () => {
            const gitApi = gitExtension.exports.getAPI(1);
            if (!gitApi)
                return;
            const setupRepo = (repository) => {
                let currentHead = repository.state.HEAD?.name;
                repository.state.onDidChange(async () => {
                    const newHead = repository.state.HEAD?.name;
                    if (currentHead && newHead && currentHead !== newHead) {
                        currentHead = newHead;
                        await handleBranchSwitch(repository.rootUri.fsPath);
                    }
                    else if (!currentHead && newHead) {
                        currentHead = newHead;
                    }
                });
            };
            gitApi.onDidOpenRepository(setupRepo);
            if (gitApi.repositories) {
                gitApi.repositories.forEach(setupRepo);
            }
        };
        if (gitExtension.isActive) {
            initGitApi();
        }
        else {
            gitExtension.activate().then(initGitApi);
        }
    }
}
async function handleBranchSwitch(rootPath) {
    const config = vscode.workspace.getConfiguration('kessler');
    const isAutoCleanEnabled = config.get('autoCleanOnBranchSwitch') ?? false;
    if (!isAutoCleanEnabled)
        return;
    const targets = config.get('branchSwitchCleanupTargets') ?? ["target", ".next", "build", "dist", "out", ".svelte-kit", ".nuxt", ".parcel-cache"];
    // Run scanner for this repository
    const projects = await (0, scanner_1.scanWorkspace)([rootPath]);
    let freedSpace = 0;
    let deletedCount = 0;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Kessler: Branch switch detected. Vaporizing build artifacts...",
        cancellable: false
    }, async (progress) => {
        for (const p of projects) {
            for (const a of p.artifacts) {
                const basename = path.basename(a.path);
                if (targets.includes(basename)) {
                    try {
                        const relativePath = vscode.workspace.asRelativePath(a.path);
                        progress.report({ message: `Sweeping ${relativePath}...` });
                        const uri = vscode.Uri.file(a.path);
                        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
                        freedSpace += a.size;
                        deletedCount++;
                    }
                    catch (err) {
                        console.error(`Failed to trash ${a.path}:`, err);
                    }
                }
            }
        }
    });
    if (deletedCount > 0) {
        vscode.window.showInformationMessage(`✨ Kessler: Branch switch clean complete! Freed ${(0, utils_1.formatBytes)(freedSpace)} from ${deletedCount} build caches.`);
        await updateDebrisStatus();
    }
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
    cachedProjects = await (0, scanner_1.scanWorkspace)(paths);
    let totalSize = 0;
    for (const p of cachedProjects) {
        totalSize += p.totalSize;
    }
    if (totalSize > 0) {
        statusBarItem.text = `$(trash) 🛰️ Kessler: ${(0, utils_1.formatBytes)(totalSize)}`;
        // --- SIZE THRESHOLD ALERT ---
        const config = vscode.workspace.getConfiguration('kessler');
        const thresholdGB = config.get('sizeThresholdGB') || 0;
        const thresholdBytes = thresholdGB * 1024 * 1024 * 1024;
        if (thresholdGB > 0 && totalSize > thresholdBytes) {
            if (lastThresholdAlertSize === 0) {
                vscode.window.showWarningMessage(`🛰️ Kessler: Orbital debris has reached ${(0, utils_1.formatBytes)(totalSize)}! Your orbit is getting crowded.`, "Open Launchpad").then(selection => {
                    if (selection === "Open Launchpad") {
                        vscode.commands.executeCommand('kessler.showLaunchpad');
                    }
                });
                lastThresholdAlertSize = totalSize;
            }
        }
        else {
            lastThresholdAlertSize = 0;
        }
        let safeSize = 0, deepSize = 0, ignoredSize = 0;
        for (const p of cachedProjects) {
            for (const a of p.artifacts) {
                if (a.tier === 'safe')
                    safeSize += a.size;
                else if (a.tier === 'deep')
                    deepSize += a.size;
                else if (a.tier === 'ignored')
                    ignoredSize += a.size;
            }
        }
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.appendMarkdown(`**🛰️ Kessler Orbital Telemetry**\n\n`);
        tooltip.appendMarkdown(`Found debris across **${cachedProjects.length} projects**:\n\n`);
        if (safeSize > 0)
            tooltip.appendMarkdown(`🟢 **Safe Caches:** ${(0, utils_1.formatBytes)(safeSize)}\n\n`);
        if (deepSize > 0)
            tooltip.appendMarkdown(`🟠 **Deep Artifacts:** ${(0, utils_1.formatBytes)(deepSize)}\n\n`);
        if (ignoredSize > 0)
            tooltip.appendMarkdown(`🟡 **User Ignored:** ${(0, utils_1.formatBytes)(ignoredSize)}\n\n`);
        tooltip.appendMarkdown(`---\n*Click to open the Launchpad and clean your orbit.*`);
        statusBarItem.tooltip = tooltip;
        const colorPref = config.get('debrisColor') || 'none';
        if (colorPref === 'error') {
            statusBarItem.color = new vscode.ThemeColor('errorForeground');
        }
        else if (colorPref === 'warning') {
            statusBarItem.color = new vscode.ThemeColor('list.warningForeground');
        }
        else if (colorPref === 'info') {
            statusBarItem.color = new vscode.ThemeColor('textLink.foreground');
        }
        else {
            statusBarItem.color = undefined;
        }
    }
    else {
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
    const items = [];
    const artifactMap = new Map();
    const config = vscode.workspace.getConfiguration('kessler');
    const scanGitIgnoredFlag = config.get('scanGitIgnored') ?? false;
    if (scanGitIgnoredFlag) {
        // Sort artifacts by tier
        const safeArtifacts = [];
        const deepArtifacts = [];
        const ignoredArtifacts = [];
        for (const project of cachedProjects) {
            for (const artifact of project.artifacts) {
                if (artifact.tier === 'safe')
                    safeArtifacts.push({ p: project, a: artifact });
                else if (artifact.tier === 'deep')
                    deepArtifacts.push({ p: project, a: artifact });
                else if (artifact.tier === 'ignored')
                    ignoredArtifacts.push({ p: project, a: artifact });
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
                    description: `[${p.type}] ${(0, utils_1.formatBytes)(a.size)}`,
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
                    description: `[Build/Binaries] ${(0, utils_1.formatBytes)(a.size)}`,
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
                    description: `[Gitignored] ${(0, utils_1.formatBytes)(a.size)}`,
                    picked: false
                });
                artifactMap.set(itemLabel, a);
            }
        }
    }
    else {
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
                    description: `[${artifact.tier}] ${(0, utils_1.formatBytes)(artifact.size)}`,
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
async function handleClean(selectedItems, artifactMap) {
    if (!selectedItems || selectedItems.length === 0) {
        return; // User cancelled or selected nothing
    }
    const trashOption = "Move to OS Trash (Safe)";
    const nukeOption = "Permanently Delete ☢️";
    const action = await vscode.window.showWarningMessage(`Ready to clear ${selectedItems.length} orbital debris items. How would you like to proceed?`, { modal: true }, trashOption, nukeOption);
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
                }
                catch (err) {
                    console.error(`Failed to trash ${artifact.path}:`, err);
                }
            }
        }
    });
    const actionText = useTrash ? "moved to OS Trash" : "permanently deleted";
    vscode.window.showInformationMessage(`✨ Kessler Cleanup Complete! Freed ${(0, utils_1.formatBytes)(freedSpace)} (${actionText})`);
    // Rescan to update the status bar
    await updateDebrisStatus();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map