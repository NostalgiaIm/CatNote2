# 喵喵便签 CatNote

[English](./README.md)

[![版本](https://img.shields.io/badge/版本-v1.0-blue)](./package.json)
[![平台](https://img.shields.io/badge/平台-Windows%20x64-green)](./package.json)
[![许可证](https://img.shields.io/badge/许可证-MIT-yellow)](./LICENSE)
[![发布版](https://img.shields.io/github/v/release/NostalgiaIm/CatNote2?label=release)](https://github.com/NostalgiaIm/CatNote2/releases)

![喵喵便签封面](assets/cover.png)

## 简介

喵喵便签 CatNote 是一款面向 Windows x64 平台的轻量级桌面便签工具，基于 Electron、HTML、CSS 和 JavaScript 构建，使用本地 JSON 保存数据。

它提供多主题、全局搜索、自由拖动、桌面便签、窗口置顶、快速创建和自动保存等功能，适合记录碎片化信息、灵感和日常摘录。项目既可以从源码直接运行，也可以打包成独立 Windows 桌面应用。

安装包不会直接提交到仓库文件列表中，因为 Windows 打包文件体积较大，超过 GitHub 普通仓库单文件限制。请在 GitHub Releases 页面下载便携版或安装包。

## 功能特性

- 智能搜索：通过顶部搜索栏，按标题、内容或修改信息快速筛选便签。
- 自由拖动：卡片的非输入、非按键区域均可拖动。
- 背景移动：在搜索栏之外长按右键并移动鼠标，可拖动背景，卡片会吸附在背景上一起移动。
- 一键整理：在 `Edit -> 整理` 中按最后修改时间横向排序，每行最多 6 张便签。
- 多主题支持：淡红、淡蓝、淡绿、淡粉、淡灰、黑白和原色等主题。
- 单卡独立主题：每张便签可单独设置配色，不影响全局主题。
- 添加到桌面：可将当前便签复制为独立桌面便签窗口。
- 桌面便签编辑：拖出的桌面便签支持修改、保存和摘录。
- 窗口置顶：桌面便签可设置为始终显示在其他窗口上方。
- 全局快捷键：程序后台运行时，按 `Ctrl + Q` 快速创建桌面便签。
- 自动保存：用户输入完成后自动保存，不需要手动点击保存。
- 本地存储：数据保存在 `notes.json`，便于备份和迁移。

## 系统要求

- 操作系统：Windows 10 / Windows 11，64 位
- 分辨率：建议 1366 x 768 或更高
- 源码运行：需要 Node.js 18+ 和 npm
- 便携版运行：无需额外安装 Node.js

## 下载与运行

### 推荐方式：GitHub Releases

1. 打开 [Releases 页面](https://github.com/NostalgiaIm/CatNote2/releases)。
2. 下载 `CatNote-win-x64-portable.zip` 或 `CatNote-win-x64-installer.zip`。
3. 便携版解压后运行 `CatNote/CatNote.exe`。
4. 安装包解压后运行 `install.bat`。

安装脚本会将应用复制到 `%LOCALAPPDATA%\CatNote`，并在桌面创建快捷方式。

### 从源码启动

```bash
npm install
npm start
```

Windows 下也可以双击 `start.bat` 启动。

## 使用指南

| 操作 | 方法 |
| --- | --- |
| 新建便签 | 点击主界面 `+` 按钮，或后台按 `Ctrl + Q` |
| 搜索便签 | 在顶部搜索框输入关键词 |
| 拖动便签 | 按住卡片的非输入、非按键区域拖动 |
| 拖动背景 | 在搜索栏外长按右键并移动鼠标 |
| 修改全局主题 | 点击搜索框左侧的主题按钮 |
| 修改卡片主题 | 打开卡片菜单并选择“修改主题” |
| 添加到桌面 | 打开卡片菜单并选择“添加到桌面” |
| 编辑桌面便签 | 点击桌面便签上的“修改” |
| 置顶桌面便签 | 点击桌面便签上的“置顶 / 取消置顶” |
| 一键整理 | 菜单栏 `Edit -> 整理` |
| 删除便签 | 卡片菜单 -> “删除” -> 确定 |

## 开发与构建

- 开发框架：Electron
- 前端实现：HTML / CSS / JavaScript
- 主进程文件：`mian.js`
- 数据存储：本地 JSON
- 应用图标源图：`assets/icon-source.jpg`
- 生成图标：`assets/app-icon.png`、`assets/app-icon.ico`
- 封面图：`assets/cover.png`
- 构建脚本：`scripts/build-icon.js`、`scripts/build-cover.js`、`scripts/apply-exe-icon.py`、`scripts/package-win.js`

常用命令：

```bash
npm run build:icon
npm run build:cover
npm run package:win
npm run build:win
```

构建后的主要产物：

```text
dist/win-x64/CatNote/CatNote.exe
dist/CatNote-win-x64-portable.zip
dist/CatNote-win-x64-installer.zip
dist/installer/install.bat
```

默认会生成稳定的便携版 zip 和脚本式安装包 zip。如果需要在 Windows 上尝试生成 IExpress `.exe` 安装器，可以设置 `CREATE_IEXPRESS=1` 后重新运行 `npm run package:win`。

## GitHub Release 打包

本仓库已加入 GitHub Actions 工作流：`.github/workflows/release.yml`。

- 推送 `v1.0.0` 这类标签时，会自动构建 Windows x64 应用，并把安装包上传到 GitHub Release。
- 在 Actions 页面手动运行工作流时，也会构建同样的安装包，并保存为 workflow artifacts。
- 体积较大的安装包不会提交到 Git 仓库，所以请在 Releases 页面查看和下载。

本地发布命令示例：

```bash
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

## 项目结构

```text
CatNote/
|-- .github/workflows/    # GitHub Actions 发布打包
|-- assets/               # 图标源图、应用图标和封面图
|-- scripts/              # 图标、封面、EXE 图标和 Windows 打包脚本
|-- index.html            # 主界面
|-- mian.js               # Electron 主进程
|-- notes.json            # 本地便签数据
|-- package.json          # 项目配置与 npm 脚本
|-- package-lock.json     # 依赖锁定
|-- README.md             # 英文说明
|-- README.zh-CN.md       # 中文说明
|-- LICENSE               # MIT 许可证
`-- start.bat             # Windows 源码启动脚本
```

## 贡献

欢迎提交 Issue 或 Pull Request 来改进本项目。

1. Fork 本仓库。
2. 创建功能分支：`git checkout -b feature/your-feature`。
3. 提交修改。
4. 推送分支。
5. 创建 Pull Request。

## 许可证

本项目基于 MIT 许可证开源，详情请参阅 [LICENSE](./LICENSE)。

## 更新日志

### v1.0 - 2026-07-21

- 整合 Electron 桌面应用源码。
- 完成搜索、拖动、整理、主题切换、桌面便签、置顶、删除确认、自动保存和全局快捷键等功能。
- 生成猫猫记笔记应用图标与项目封面图。
- 完成 Windows x64 便携版和安装包打包脚本。
- 添加 GitHub Actions 发布打包流程。

喵喵便签 CatNote，让灵感有序，让记录更温暖。
