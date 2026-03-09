<div align="center">

# 🛰️ Kessler for VS Code

<!-- <img src="https://raw.githubusercontent.com/hariharen9/kessler-extension/refs/heads/main/assets/icon.png" alt="Kessler Banner" width="20%" /> -->

**Clear the orbital debris from your local development environment.**

[![Installs](https://img.shields.io/visual-studio-marketplace/i/hariharen.kessler-vscode?style=for-the-badge&logo=visual-studio-code&color=007ACC&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=hariharen.kessler-vscode)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/hariharen.kessler-vscode?style=for-the-badge&color=E3B341&logo=star&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=hariharen.kessler-vscode)
[![Version](https://img.shields.io/visual-studio-marketplace/v/hariharen.kessler-vscode?style=for-the-badge&color=00ADD8&label=version)](https://marketplace.visualstudio.com/items?itemName=hariharen.kessler-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

</div>

> **Kessler Syndrome** (noun): A theoretical scenario in which the density of objects in low Earth orbit is high enough that collisions between objects could cause a cascade, generating space debris that increases the likelihood of further collisions.

**For developers, your hard drive is low Earth orbit.** 

Over time, it gets clogged with `node_modules`, `targets`, stray `build/` folders, forgotten Python virtual environments, and intermediate Rust targets. This **digital space debris** silently consumes hundreds of gigabytes until your system grinds to a halt.

**Kessler for VS Code** is an intelligent, completely native extension that lives right in your status bar. It silently scans your workspace, calculates the weight of your debris, and lets you safely sweep it away without ever leaving your editor.

> 💡 **Did you know?** This extension is the native VS Code brainchild of the [original Kessler CLI & TUI](https://github.com/hariharen9/kessler). If you love terminal tools and blazingly fast Go applications, be sure to check out the main project!

---

## ✨ Features

- **📡 Live Telemetry:** A sleek, unintrusive status bar item (`🗑️ 🛰️ Kessler: 1.2 GB`) that live-updates as you work.
- **👁️ Inline Debris Lens:** A subtle visual indicator (●) appears next to known debris folders right in your VS Code File Explorer. Right-click any marked folder to instantly "Vaporize Debris" without opening the Launchpad.
- **🔄 Auto-Clean on Branch Switch:** (The "Phantom Artifact" Fixer) Prevent ghost bugs by having Kessler automatically vaporize compilation caches (like `target/` or `.next/`) the moment you switch Git branches.
- **🧠 Context-Aware Engine:** Automatically targets safe artifacts based on project triggers (e.g., `package.json`, `Cargo.toml`, `requirements.txt`). Supports over 30+ ecosystems!
- **🛡️ Safety First:** Moves debris to your native **OS Trash Bin** instead of a permanent `rm -rf`. You always have an "Undo" button.
- **🎯 The Launchpad:** A beautiful QuickPick UI that groups debris by project type and pre-selects 100% regeneratable caches while leaving compiled builds unchecked for your protection.
- **🚫 .kesslerignore Support:** Drop a `.kesslerignore` file in any directory to tell Kessler to skip it and all its subdirectories completely.
- **🚨 Size Alerts:** Get notified when your orbital debris exceeds a configurable threshold (e.g., 5GB), so you can clear the path before your disk fills up.
- **⚡ Zero Dependencies:** Written in pure TypeScript using native VS Code File System APIs. Blazingly fast, lightweight, and completely secure.

---

## 🎮 How it Works

1. Open any project or massive parent folder in VS Code.
2. Kessler quietly scans the background and reports the total debris weight in the bottom-right status bar.
3. Click the status bar item (or run the command `Kessler: Clean Orbital Debris`).
4. Select the `node_modules` or `target` folders you want to vaporize.
5. Watch the lasers fire and reclaim your disk space!

<div align="center">
  <i>"That's one small delete for man, one giant cleanup for mankind."</i>
</div>

---

## ⚙️ Configuration

Kessler is highly customizable. Open your VS Code Settings (`Cmd/Ctrl + ,`) and search for **"Kessler"** to adjust your orbit:

| Setting | Description |
| :--- | :--- |
| `kessler.debrisColor` | Choose your preferred status bar alert color (*Error Red, Warning Yellow, Info Blue, or stealth mode*). |
| `kessler.showDeepArtifacts` | Toggle whether "deep" tier artifacts (like `dist/`, `build/`) appear in the launchpad menu. |
| `kessler.customDangerZone` | Add proprietary file/folder names (e.g., `my-secret-key.pem`) that Kessler should **never** touch. |
| `kessler.excludeFolders` | Folders to completely skip during the background scan to improve performance (defaults to `.git`). |
| `kessler.sizeThresholdGB` | Total debris size (in GB) that triggers a warning notification. Set to 0 to disable. |
| `kessler.autoScanInterval` | Interval (in seconds) for automatic background scans to update debris size. Set to 0 to disable. |
| `kessler.enableDebrisLens` | Show a subtle visual indicator (●) next to known debris folders in the VS Code File Explorer. |
| `kessler.autoCleanOnBranchSwitch` | Automatically vaporize build artifacts (e.g., target, .next) when a Git branch switch is detected. |
| `kessler.branchSwitchCleanupTargets` | An array of folder names to safely clean on branch switch (if `autoCleanOnBranchSwitch` is enabled). |

---

## 🌍 Supported Ecosystems

Kessler ships with pre-configured intelligence for the entire developer universe:

*   **Web & Node:** Next.js, Nuxt, SvelteKit, Turbo, Parcel, Angular, node_modules.
*   **Data Science:** Python `__pycache__`, Jupyter checkpoints, WandB logs, MLRuns, `.venv`.
*   **Systems & Backend:** Rust (`target/`), Go (`bin/`, `vendor/`), Java, C#, C/C++, PHP, Ruby, Elixir.
*   **Mobile & Games:** iOS (`DerivedData`), Android (`.gradle`), Flutter (`.dart_tool`), Unreal Engine, Godot.
*   **Cloud & IaC:** Terraform, Serverless, AWS SAM, Amplify, Supabase.
*   **Global Caches:** `.DS_Store`, `Thumbs.db`, `.idea`, `.vscode`.

---

## 🤝 Contributing

Found a rogue piece of space debris that Kessler missed? Contributions are highly welcome! 

1. Fork the repository.
2. Add your ecosystem to the `DEFAULT_RULES` array in `src/rules.ts`.
3. Submit a Pull Request!

---

<div align="center">
  Built with ❤️ by <b><a href="https://hariharen.site">Hariharen</a></b>
  <br><br>
  <a href="https://www.buymeacoffee.com/hariharen">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="160">
  </a>
</div>
