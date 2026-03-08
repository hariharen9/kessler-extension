"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const scanner_1 = require("./scanner");
const utils_1 = require("./utils");
let statusBarItem;
let cachedProjects = [];
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
        statusBarItem.tooltip = `Found ${cachedProjects.length} projects with debris. Click to clean.`;
        const config = vscode.workspace.getConfiguration('kessler');
        const colorPref = config.get('debrisColor') || 'error';
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
    for (const project of cachedProjects) {
        // Add a separator for the project
        items.push({
            label: project.type,
            description: vscode.workspace.asRelativePath(project.path),
            kind: vscode.QuickPickItemKind.Separator
        });
        // Add the artifacts as pickable items
        for (const artifact of project.artifacts) {
            const relativePath = vscode.workspace.asRelativePath(artifact.path);
            const itemLabel = `$(file-directory) ${relativePath}`;
            items.push({
                label: itemLabel,
                description: `[${artifact.tier}] ${(0, utils_1.formatBytes)(artifact.size)}`,
                picked: artifact.tier === 'safe' // Pre-select safe tier by default
            });
            artifactMap.set(itemLabel, artifact);
        }
    }
    const selectedItems = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select debris to safely move to OS Trash',
        title: 'Kessler: Orbital Cleanup'
    });
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