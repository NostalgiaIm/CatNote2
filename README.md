# 喵喵便签

[![版本](https://img.shields.io/badge/版本-v1.0-blue)](./package.json)
[![平台](https://img.shields.io/badge/平台-Windows%20x64-green)](./package.json)
[![许可证](https://img.shields.io/badge/许可证-ISC-yellow)](./package.json)

---

## 目录

- 简介
- 功能特性
- 系统要求
- 安装与运行
- 使用指南
- 开发与构建
- 项目结构
- 贡献
- 许可证
- 更新日志

---

## 简介

喵喵便签（CatNote）是一款面向 Windows x64 的轻量级桌面便签工具，基于 Electron、HTML、CSS 和 JavaScript 构建，使用本地 JSON 保存数据。

它支持多主题、全局搜索、卡片拖动、桌面便签、快速创建、自动保存等功能，适合记录碎片化信息与日常摘录。

当前仓库提供的是源码版，`dist/` 等应用端打包产物不纳入版本库。

---

## 功能特性

- 智能搜索：通过顶部搜索栏，按标题、内容或修改时间快速筛选便签。
- 自由拖动：便签卡片可在页面中任意拖拽布局。
- 一键整理：在 Edit 菜单中点击“整理”，便签按最后修改时间自动重排。
- 多级主题：支持淡蓝、淡粉、淡绿、淡灰、淡红、黑白和原色等主题。
- 单卡主题：每张便签都可以单独修改主题样式。
- 添加到桌面：可将当前便签复制为桌面卡片，方便单独查看。
- 窗口置顶：桌面便签可保持在其他窗口之上，不易被遮挡。
- 全局快捷键：程序后台运行时，按 `Ctrl + Q` 可快速新建便签。
- 自动保存：内容修改后自动保存，无需手动点保存按钮。
- 本地存储：所有数据保存在 `notes.json`，便于备份与迁移。

---

## 系统要求

- 操作系统：Windows 10 / Windows 11（64 位）
- 运行环境：Node.js 18+ 和 npm（源码运行时需要）
- 分辨率：建议 1366 × 768 或更高

---

## 安装与运行

### 源码运行

1. 克隆或下载本仓库源码。
2. 在项目目录执行：

```bash
npm install
npm start
```

3. 也可以双击 `run_server.bat` 启动项目。

### 图标与打包

```bash
npm run build:icon
npm run package:win
npm run build:win
```

- `build:icon` 会生成 `assets/app-icon.png` 和 `assets/app-icon.ico`。
- `package:win` 会生成 Windows x64 便携版到 `dist/win-x64/Miaomiao Notes/`，并输出压缩包。
- `build:win` 会先生成图标，再执行打包流程。

注：安装包脚本会在可用环境下尝试生成安装器；如果当前环境不可用，便携版仍可直接使用。

---

## 使用指南

| 操作 | 方法 |
| --- | --- |
| 新建便签 | 主界面点击 `+`，或后台按 `Ctrl + Q` |
| 搜索便签 | 在顶部搜索框输入关键词 |
| 拖动便签 | 按住卡片的非输入区域拖动 |
| 修改主题 | 点击卡片右上角的主题按钮 |
| 添加到桌面 | 在卡片菜单中选择“添加到桌面” |
| 一键整理 | 在 Edit 菜单中选择“整理” |
| 退出程序 | 关闭窗口或通过菜单退出 |

---

## 开发与构建

- 开发框架：Electron
- 前端实现：HTML / CSS / JavaScript
- 数据存储：本地 JSON
- 应用图标：`assets/icon-source.jpg` 为源图，脚本自动生成 `assets/app-icon.png` 和 `assets/app-icon.ico`
- 构建脚本：`scripts/build-icon.js`、`scripts/package-win.js`

常用命令：

```bash
npm run build:icon
npm run package:win
npm run build:win
```

---

## 项目结构

```text
CatNote/
├─ assets/            # 图标源图与生成结果
├─ scripts/           # 图标处理与 Windows 打包脚本
├─ index.html         # 主界面
├─ mian.js            # Electron 主进程
├─ notes.json         # 本地便签数据
├─ package.json       # 项目配置与脚本
├─ package-lock.json  # 依赖锁定
└─ run_server.bat     # Windows 快速启动
```

---

## 贡献

欢迎提交 Issue 或 Pull Request 来完善这个项目。

建议流程：

1. Fork 仓库
2. 新建分支
3. 提交修改
4. 推送分支
5. 创建 Pull Request

---

## 许可证

本项目当前以 `package.json` 中的 `ISC` 许可证为准。

---

## 更新日志

### v2.0（2026-06-22）

- 完成 Electron 版喵喵便签基础功能
- 支持搜索、拖动、整理、主题切换、桌面便签、快捷新建与自动保存
- 补充应用图标与 Windows x64 打包脚本

