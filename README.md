# CatNote

CatNote is a Windows desktop note app built with Electron. It supports draggable note cards, note themes, desktop note windows, quick note creation, search, auto-save, and local JSON storage.

## Run From Source

```bash
npm install
npm start
```

You can also double-click `run_server.bat` on Windows after dependencies are installed.

## Build Icon

```bash
npm run build:icon
```

The icon source is stored at `assets/icon-source.jpg`, and the generated app icons are `assets/app-icon.png` and `assets/app-icon.ico`.

## Package Windows App

```bash
npm run package:win
```

The packaging script creates a Windows x64 portable app under `dist/`. Build output is intentionally ignored by Git.

## Notes Data

`notes.json` is included as an empty initial data file. Local notes are stored there while running the app.
