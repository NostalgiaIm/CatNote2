# CatNote

[中文说明](./README.zh-CN.md)

[![Version](https://img.shields.io/badge/version-v1.0-blue)](./package.json)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-green)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/NostalgiaIm/CatNote2?label=release)](https://github.com/NostalgiaIm/CatNote2/releases)

![CatNote cover](assets/cover.png)

## Introduction

CatNote, also named 喵喵便签, is a lightweight Windows x64 desktop sticky-note app built with Electron, HTML, CSS, and JavaScript. It stores notes locally in JSON, supports multiple themes, global search, free card dragging, desktop notes, always-on-top windows, quick note creation, and automatic saving.

The project can run directly from source, or be packaged as a standalone Windows desktop app. Release packages are published through GitHub Releases instead of being committed to the repository, because the Windows app packages are larger than GitHub's normal single-file repository limit.

## Features

- Smart search: filter notes from the top search box by title, content, or update information.
- Free dragging: drag a note from any non-input and non-button area.
- Background panning: long-press the right mouse button outside the search area to move the background, with notes attached to the background.
- Auto arrange: use `Edit -> Arrange` to sort all notes horizontally by last modified time, with up to 6 notes per row.
- Multi-theme support: light red, light blue, light green, light pink, light gray, black and white, and the original theme.
- Per-card themes: each note can have its own theme without changing the global theme.
- Desktop notes: copy a note into an independent desktop sticky-note window.
- Desktop note editing: detached desktop notes can be modified and saved.
- Always on top: desktop notes can stay above other windows.
- Global shortcut: press `Ctrl + Q` while the app is running in the background to create a new desktop note.
- Auto save: note edits are saved automatically after typing.
- Local storage: note data is stored in `notes.json` for simple backup and migration.

## System Requirements

- OS: Windows 10 or Windows 11, 64-bit
- Recommended resolution: 1366 x 768 or higher
- Source mode: Node.js 18+ and npm
- Portable release: no extra Node.js installation required

## Download And Run

### Recommended: GitHub Releases

1. Open the [Releases page](https://github.com/NostalgiaIm/CatNote2/releases).
2. Download `CatNote-win-x64-portable.zip` or `CatNote-win-x64-installer.zip`.
3. For the portable version, unzip it and run `CatNote/CatNote.exe`.
4. For the installer package, unzip it and run `install.bat`.

The installer package copies the app to `%LOCALAPPDATA%\CatNote` and creates a desktop shortcut.

### Run From Source

```bash
npm install
npm start
```

On Windows, you can also double-click `start.bat`.

## Usage

| Action | How to use it |
| --- | --- |
| Create a note | Click the `+` button, or press `Ctrl + Q` while the app is running |
| Search notes | Type keywords in the top search box |
| Drag a note | Hold any non-input and non-button area of the card |
| Pan the background | Long-press the right mouse button outside the search bar and move the mouse |
| Change global theme | Click the theme button beside the search box |
| Change card theme | Open the card menu and choose `Change Theme` |
| Add to desktop | Open the card menu and choose `Add to Desktop` |
| Edit desktop note | Click `Edit` on the detached desktop note |
| Keep desktop note on top | Click `Always on Top` on the desktop note |
| Arrange notes | Use `Edit -> Arrange` |
| Delete a note | Open the card menu, choose `Delete`, then confirm |

## Development And Build

- Framework: Electron
- UI: HTML / CSS / JavaScript
- Main process: `mian.js`
- Data storage: local JSON
- App icon source: `assets/icon-source.jpg`
- Generated app icons: `assets/app-icon.png`, `assets/app-icon.ico`
- Cover image: `assets/cover.png`
- Build scripts: `scripts/build-icon.js`, `scripts/build-cover.js`, `scripts/apply-exe-icon.py`, `scripts/package-win.js`

Common commands:

```bash
npm run build:icon
npm run build:cover
npm run package:win
npm run build:win
```

Main build outputs:

```text
dist/win-x64/CatNote/CatNote.exe
dist/CatNote-win-x64-portable.zip
dist/CatNote-win-x64-installer.zip
dist/installer/install.bat
```

By default, the packaging script creates a stable portable zip and a script-based installer zip. To try generating an IExpress `.exe` installer on Windows, set `CREATE_IEXPRESS=1` before running `npm run package:win`.

## GitHub Release Packaging

This repository includes a GitHub Actions workflow at `.github/workflows/release.yml`.

- Pushing a tag such as `v1.0.0` builds the Windows x64 app and attaches the package files to a GitHub Release.
- Running the workflow manually from the Actions tab builds the same package files and stores them as workflow artifacts.
- Large release packages are not committed into the Git repository, so they will appear on the Releases page instead of the normal file browser.

To publish a release from a local clone:

```bash
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

## Project Structure

```text
CatNote/
|-- .github/workflows/    # GitHub Actions release packaging
|-- assets/               # icon source, generated app icons, and cover image
|-- scripts/              # icon, cover, EXE icon, and Windows package scripts
|-- index.html            # renderer UI
|-- mian.js               # Electron main process
|-- notes.json            # local note data
|-- package.json          # npm scripts and metadata
|-- package-lock.json     # dependency lockfile
|-- README.md             # English documentation
|-- README.zh-CN.md       # Chinese documentation
|-- LICENSE               # MIT license
`-- start.bat             # Windows source-mode launcher
```

## Contributing

Issues and pull requests are welcome.

1. Fork this repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes.
4. Push your branch.
5. Open a pull request.

## License

This project is released under the MIT License. See [LICENSE](./LICENSE) for details.

## Changelog

### v1.0 - 2026-07-21

- Integrated the Electron desktop app source.
- Added search, dragging, arranging, theme switching, desktop notes, always-on-top mode, deletion confirmation, auto save, and global shortcut support.
- Generated the cat note-taking app icon and project cover image.
- Added Windows x64 portable and installer packaging scripts.
- Added GitHub Actions release packaging.

CatNote keeps small ideas tidy, visible, and warm.
