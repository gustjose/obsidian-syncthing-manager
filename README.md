<div align="center">
  <img src="docs/images/plugin-banner.png" alt="Plugin Banner" width="700">
</div>

<p align="center">
  <b>Control, monitor, and visualize your Syncthing synchronization directly inside Obsidian.</b>
</p>

<p align="center" style="margin-top:2rem; margin-bottom: 2rem; display:flex; justify-content: center; gap: 0.5rem;">
  <img src="https://img.shields.io/github/v/release/gustjose/obsidian-syncthing-manager?style=for-the-badge&logo=github&color=0890C2" alt="Latest Release">
  <img src="https://img.shields.io/github/downloads/gustjose/obsidian-syncthing-manager/total?style=for-the-badge&logo=obsidian&color=0890C2" alt="Total Downloads">
  <img src="https://img.shields.io/github/last-commit/gustjose/obsidian-syncthing-manager?style=for-the-badge&color=0890C2" alt="Last Commit">
  <img src="https://img.shields.io/github/license/gustjose/obsidian-syncthing-manager?style=for-the-badge&logo=opensourceinitiative&logoColor=fff&color=0890C2" alt="License">
</p>

<br>

![Plugin Overview](docs/images/overview.gif)

This plugin acts as a bridge to your local Syncthing API, providing real-time file status, a powerful conflict resolver, and tools to keep your vault healthy across Desktop and Mobile devices.

---

## ✨ New in v1.1: Visual Sync

Now you can see exactly what is happening with your files without leaving the editor.

- **Tab Status Icons:** Instant feedback on the file you are editing.
    - 🟠 **Syncing:** Spinning icon indicates the file is being uploaded/downloaded.
    - 🟢 **Synced:** A checkmark appears briefly when synchronization is complete.
- **Smart History:** Know the direction of your data.
    - ↙️ **Incoming:** Changes received from a remote device.
    - ↗️ **Outgoing:** Local changes sent to other devices.

---

## 🚀 Features

- **Real-Time Monitoring:** View your vault status (Synced, Syncing, Disconnected) via the Status Bar or a dedicated Side Panel.
- **Conflict Resolver:** Intelligent detection of `.sync-conflict` files with a **side-by-side diff view** for safe resolution.
- **Visual File Status:** Watch your tabs update in real-time as Syncthing processes your files.
- **.stignore Editor:** Manage ignored files (like `workspace.json` or `.DS_Store`) directly within Obsidian using built-in templates.
- **History Filter:** Keep your activity log clean by hiding system files from the history view.
- **Mobile Optimized:** Responsive design built to work perfectly on Android.
- **Localization:** Fully translated into 🇺🇸 English, 🇧🇷 Portuguese (BR), and 🇷🇺 Russian.

---

## Quick Start

1. **Install:** Use [BRAT](#installation) or download the latest release.
2. **Get API Key:** In Syncthing, navigate to **Actions** > **Settings** > **General** and copy the **API Key**.
3. **Configure:** - Open Obsidian Settings > **Syncthing Manager**.
    - Paste your API Key and click **Test Connection**.
    - **Important:** Select your **Vault Folder** from the dropdown menu to track events.

---

## 📱 Android Setup (Critical)

To use this plugin on Android (via _Syncthing-Fork_ or the official app), you must allow local HTTP connections.

> [!WARNING] > **HTTPS Restriction:** Obsidian Mobile cannot connect to self-signed HTTPS certificates on localhost. You **must disable HTTPS** in the Syncthing App settings. Since the address is restricted to `127.0.0.1`, your traffic remains local and secure.

1. Open Syncthing App > **Settings** > **GUI**.
2. Set **GUI Listen Address** to `127.0.0.1:8384`.
3. **Disable** "Use HTTPS for GUI".
    - _Note: Ensure you have cleared "GUI Authentication User/Password" fields, otherwise the app may enforce HTTPS._
4. Restart the Syncthing App.
5. In Obsidian Plugin Settings, ensure **Use HTTPS** is toggled **OFF**.

### Alternative: Force HTTP (Environment Variable)

If the above method resets or fails, you can force Syncthing to use HTTP using an environment variable.

> [!CAUTION]
> **Side Effect:** This may cause the Syncthing Android App's native UI to stop loading (showing a blank screen or loading spinner). However, the **background service will still run**, and you can access the full Web UI via your browser at `http://127.0.0.1:8384`.

1. Go to **Settings** > **Troubleshooting** > **Environment Variables**.
2. Add the following variable:
    - **Key:** `STGUIADDRESS`
    - **Value:** `http://127.0.0.1:8384`
3. Restart the App.
4. If you need to revert, simply delete this variable.

---

## Features Guide

### ⚔️ Conflict Resolution

When a sync conflict occurs, a red alert will appear in the Syncthing View.

1. Click the alert to open the **Conflict Resolver**.
2. Select **Compare Content** for a side-by-side comparison.
3. Choose:
    - **Keep Original:** Deletes the conflict file.
    - **Use Conflict Version:** Overwrites your local file with the remote version.

![Conflict Modal](docs/images/conflict.png)

### 📂 Ignoring Files (.stignore)

Prevent layout issues by ignoring workspace configuration files.

1. Open **Settings** > **Syncthing Manager** > **Edit .stignore**.
2. Use "Add Common Patterns" to quickly ignore `workspace.json`, `.obsidian/workspace`, or OS files like `.DS_Store`.

---

## FAQ & Troubleshooting

**Q: The tab icon is spinning but never turns green.**

- This usually means Syncthing is still scanning or the file is large. Check the Syncthing GUI web panel for detailed progress.

**Q: Plugin status shows "Disconnected".**

- Verify that the Syncthing service is running.
- Ensure the API Key matches exactly.
- On Android, double-check that HTTPS is disabled in the Syncthing App.

**Q: Is it secure to disable HTTPS on Android?**

- Yes. By setting the **GUI Listen Address** to `127.0.0.1`, access is restricted exclusively to applications running locally on that specific device.

---

## Installation

### BRAT (Beta)

1. Install the **BRAT** plugin from the Obsidian Community Store.
2. Add this repository URL: `https://github.com/gustjose/obsidian-syncthing-manager`.
3. Enable **Syncthing Manager**.

---

## Contributing

Contributions are welcome! If you encounter bugs or have feature requests, please open an issue.

- **Build:** `npm run build`
- **Dev:** `npm run dev`

---

## License

This project is licensed under the [MIT License](LICENSE).  
Copyright © 2025 Gustavo Carreiro.
