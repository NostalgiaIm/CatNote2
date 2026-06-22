// 引入 Electron 主进程 API：窗口、菜单、进程通信和全局快捷键都在这里统一管理。
const { app, BrowserWindow, Menu, ipcMain, globalShortcut, screen } = require('electron');
// 引入 Node 文件系统模块，用来创建 Electron 的本地用户数据目录。
const fs = require('fs');
// 引入 Node 路径模块，用来拼接跨平台文件路径。
const path = require('path');

// 保存主应用窗口引用，方便菜单、快捷键和桌面便签把事件发送回应用页面。
let mainWindow = null;

// 将 Electron 缓存与用户数据放在项目目录内，避免系统缓存目录权限导致启动失败。
const USER_DATA_DIR = path.join(__dirname, '.electron-user-data');
const APP_ICON = path.join(__dirname, 'assets', 'app-icon.ico');

// 确保项目内的 Electron 用户数据目录存在。
fs.mkdirSync(USER_DATA_DIR, { recursive: true });
// 设置 Electron 用户数据目录，缓存、LocalStorage 等都会写入这里。
app.setPath('userData', USER_DATA_DIR);
// 禁用硬件加速，降低部分 Windows 环境下 GPU 进程崩溃的概率。
app.disableHardwareAcceleration();
// 显式禁用 GPU，配合 disableHardwareAcceleration 做兼容兜底。
app.commandLine.appendSwitch('disable-gpu');

// 转义用户输入内容，避免把便签标题或正文插入桌面窗口 HTML 时破坏页面结构。
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 把传入的便签数据规整成桌面窗口可用的安全对象。
function normalizeDesktopNote(note) {
    return {
        id: String(note.id || ''),
        title: String(note.title || '未命名便签'),
        content: String(note.content || ''),
        updatedAt: String(note.updatedAt || ''),
        theme: String(note.theme || 'default')
    };
}

// 创建一个脱离主应用的桌面便签窗口，支持置顶、编辑和同步回主应用。
function createDesktopCardWindow(note, options = {}) {
    // 先规整原始便签数据，保留原始值用于窗口内编辑和 IPC 同步。
    const rawNote = normalizeDesktopNote(note || {});
    // 再生成转义后的值，专门用于拼接 HTML 字符串。
    const safeNote = {
        id: escapeHtml(rawNote.id),
        title: escapeHtml(rawNote.title),
        content: escapeHtml(rawNote.content),
        updatedAt: escapeHtml(rawNote.updatedAt),
        theme: escapeHtml(rawNote.theme)
    };
    // 读取主屏尺寸，用来把快捷键创建的桌面便签放到屏幕中心。
    const display = screen.getPrimaryDisplay();
    // 计算桌面便签默认位置，普通添加略微靠右下，快捷键添加则居中。
    const windowBounds = options.center
        ? {
            x: Math.round(display.workArea.x + (display.workArea.width - 320) / 2),
            y: Math.round(display.workArea.y + (display.workArea.height - 330) / 2)
        }
        : {};

    // 创建无边框、默认置顶、可缩放的桌面便签窗口。
    const win = new BrowserWindow({
        title: rawNote.title || '未命名便签',
        width: 320,
        height: 330,
        minWidth: 260,
        minHeight: 220,
        alwaysOnTop: true,
        frame: false,
        resizable: true,
        skipTaskbar: false,
        x: windowBounds.x,
        y: windowBounds.y,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 使用 screen-saver 层级，让“置顶”尽量高于普通应用窗口。
    win.setAlwaysOnTop(true, 'screen-saver');

    // 桌面便签页面是一个轻量 HTML，包含查看模式和修改模式。
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${safeNote.title}</title>
    <style>
        /* 全局盒模型，保证窗口内元素尺寸可控。 */
        * { box-sizing: border-box; }

        /* 整个桌面窗口默认可拖动，用户按住空白处即可移动窗口。 */
        body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, "Microsoft YaHei", sans-serif;
            background: transparent;
            -webkit-app-region: drag;
        }

        /* 桌面便签主体，使用与主应用卡片一致的主题变量。 */
        .desktop-card {
            --card-bg: #fffdf6;
            --card-text: #2f2a24;
            --card-border: rgba(90, 70, 45, 0.2);
            --card-shadow: rgba(65, 48, 31, 0.18);
            --card-muted: #766b5f;
            --card-field-bg: #ffffff;
            --card-field-border: #d8c9a9;
            display: flex;
            flex-direction: column;
            width: 100vw;
            min-height: 100vh;
            padding: 12px;
            background: var(--card-bg);
            color: var(--card-text);
            border: 1px solid var(--card-border);
            box-shadow: 0 14px 34px var(--card-shadow);
        }

        /* 淡蓝色桌面便签主题。 */
        .desktop-card[data-theme="blue"] {
            --card-bg: #eef8ff; --card-text: #1d3547; --card-border: rgba(72, 139, 192, 0.38); --card-shadow: rgba(54, 115, 158, 0.2); --card-muted: #55788d; --card-field-border: #aed1ea;
        }

        /* 淡粉色桌面便签主题。 */
        .desktop-card[data-theme="pink"] {
            --card-bg: #fff0f5; --card-text: #4a2734; --card-border: rgba(191, 104, 134, 0.34); --card-shadow: rgba(152, 73, 101, 0.18); --card-muted: #89586b; --card-field-border: #edb5c9;
        }

        /* 淡红色桌面便签主题。 */
        .desktop-card[data-theme="red"] {
            --card-bg: #fff1f0; --card-text: #4a2420; --card-border: rgba(197, 91, 80, 0.34); --card-shadow: rgba(150, 62, 54, 0.18); --card-muted: #8a5952; --card-field-border: #efb5ad;
        }

        /* 淡绿色桌面便签主题。 */
        .desktop-card[data-theme="green"] {
            --card-bg: #eff9f1; --card-text: #253d2c; --card-border: rgba(88, 153, 104, 0.34); --card-shadow: rgba(60, 120, 74, 0.18); --card-muted: #5a7a62; --card-field-border: #b5d5bd;
        }

        /* 淡灰色桌面便签主题。 */
        .desktop-card[data-theme="gray"] {
            --card-bg: #f5f6f8; --card-text: #30343a; --card-border: rgba(103, 111, 122, 0.32); --card-shadow: rgba(69, 75, 84, 0.18); --card-muted: #68707c; --card-field-border: #c6cbd3;
        }

        /* 黑白桌面便签主题。 */
        .desktop-card[data-theme="mono"] {
            --card-bg: #ffffff; --card-text: #111111; --card-border: #111111; --card-shadow: rgba(0, 0, 0, 0.16); --card-muted: #444444; --card-field-border: #777777;
        }

        /* 桌面便签顶部栏，容纳标题和操作按钮。 */
        .desktop-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        }

        /* 桌面便签标题展示样式。 */
        .desktop-title {
            flex: 1;
            min-width: 0;
            margin: 0;
            overflow: hidden;
            font-size: 17px;
            line-height: 1.25;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* 桌面窗口里的按钮不可拖动窗口，避免点击按钮时窗口被拖走。 */
        button {
            -webkit-app-region: no-drag;
            border: none;
            border-radius: 6px;
            padding: 6px 9px;
            background: var(--card-text);
            color: var(--card-bg);
            cursor: pointer;
            font-size: 12px;
        }

        /* 桌面便签正文展示区。 */
        .desktop-content {
            flex: 1;
            overflow: auto;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font-size: 14px;
            line-height: 1.55;
        }

        /* 桌面便签的时间提示。 */
        .desktop-meta {
            margin-top: 10px;
            color: var(--card-muted);
            font-size: 12px;
        }

        /* 桌面便签编辑表单默认隐藏。 */
        .desktop-edit {
            display: none;
            flex: 1;
            gap: 8px;
            flex-direction: column;
            -webkit-app-region: no-drag;
        }

        /* 编辑模式下显示编辑表单。 */
        .desktop-card.is-editing .desktop-edit {
            display: flex;
        }

        /* 编辑模式下隐藏展示正文和时间。 */
        .desktop-card.is-editing .desktop-content,
        .desktop-card.is-editing .desktop-meta {
            display: none;
        }

        /* 桌面便签编辑输入框。 */
        .desktop-input,
        .desktop-textarea {
            width: 100%;
            border: 1px solid var(--card-field-border);
            border-radius: 6px;
            background: var(--card-field-bg);
            color: var(--card-text);
            font-family: Arial, "Microsoft YaHei", sans-serif;
            outline: none;
            -webkit-app-region: no-drag;
        }

        /* 桌面便签标题输入框。 */
        .desktop-input {
            padding: 8px;
            font-size: 15px;
            font-weight: 700;
        }

        /* 桌面便签正文输入框。 */
        .desktop-textarea {
            flex: 1;
            min-height: 130px;
            resize: none;
            padding: 9px;
            font-size: 14px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <section id="card" class="desktop-card" data-theme="${safeNote.theme}">
        <div class="desktop-header">
            <h1 id="titleView" class="desktop-title">${safeNote.title}</h1>
            <button id="editBtn">修改</button>
            <button id="pinBtn">取消置顶</button>
            <button id="closeBtn">关闭</button>
        </div>
        <div id="contentView" class="desktop-content">${safeNote.content || '暂无内容'}</div>
        <div id="metaView" class="desktop-meta">最后修改：${safeNote.updatedAt || '未知'}</div>
        <div class="desktop-edit">
            <input id="titleInput" class="desktop-input" value="${safeNote.title}" placeholder="标题">
            <textarea id="contentInput" class="desktop-textarea" placeholder="正文内容">${safeNote.content}</textarea>
            <button id="saveBtn">保存修改</button>
        </div>
    </section>
    <script>
        // 桌面便签通过 ipcRenderer 把置顶、修改和保存事件发回主进程。
        const { ipcRenderer } = require('electron');
        // 保存桌面便签绑定的主应用卡片 id。
        const noteId = ${JSON.stringify(rawNote.id)};
        // 记录当前桌面便签是否置顶。
        let pinned = true;
        // 缓存常用 DOM 节点，减少重复查询。
        const card = document.getElementById('card');
        const titleView = document.getElementById('titleView');
        const contentView = document.getElementById('contentView');
        const metaView = document.getElementById('metaView');
        const titleInput = document.getElementById('titleInput');
        const contentInput = document.getElementById('contentInput');
        const editBtn = document.getElementById('editBtn');
        const pinBtn = document.getElementById('pinBtn');

        // 切换桌面便签编辑模式，方便用户随时修改或摘录内容。
        editBtn.addEventListener('click', () => {
            const isEditing = card.classList.toggle('is-editing');
            editBtn.textContent = isEditing ? '查看' : '修改';
            if (isEditing) {
                titleInput.focus();
            }
        });

        // 保存桌面便签编辑内容，并同步到主应用里的同一张卡片。
        document.getElementById('saveBtn').addEventListener('click', () => {
            const updatedAt = new Date().toLocaleString();
            const title = titleInput.value.trim() || '未命名便签';
            const content = contentInput.value;
            titleView.textContent = title;
            contentView.textContent = content || '暂无内容';
            metaView.textContent = '最后修改：' + updatedAt;
            card.classList.remove('is-editing');
            editBtn.textContent = '修改';
            ipcRenderer.send('desktop-card:update-note', { id: noteId, title, content, updatedAt });
        });

        // 切换桌面便签是否置顶，默认置顶，点击后可取消。
        pinBtn.addEventListener('click', () => {
            pinned = !pinned;
            pinBtn.textContent = pinned ? '取消置顶' : '置顶';
            ipcRenderer.send('desktop-card:set-always-on-top', pinned);
        });

        // 关闭桌面便签窗口，不影响主应用里的原卡片。
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
        });
    </script>
</body>
</html>`;

    // 加载内联 HTML，避免额外创建文件。
    win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
}

// 创建主应用窗口。
function createWindow() {
    // 主窗口使用现有 index.html，保留 Node 能力以便直接读写 notes.json。
    const win = new BrowserWindow({
        title: '喵喵便签',
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 保存主窗口引用，供菜单和 IPC 使用。
    mainWindow = win;
    // 加载主应用页面。
    win.loadFile(path.join(__dirname, 'index.html'));
    // 主窗口关闭时清理引用，避免发送消息到无效窗口。
    win.on('closed', () => {
        if (mainWindow === win) {
            mainWindow = null;
        }
    });
}

// 配置应用菜单，把“整理”放进 Edit 菜单。
function setupMenu() {
    // Edit 菜单保留常见编辑能力，并新增“整理”。
    const template = [
        {
            label: 'Edit',
            submenu: [
                {
                    label: '整理',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    click: () => {
                        mainWindow?.webContents.send('notes:organize');
                    }
                },
                { type: 'separator' },
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                { role: 'selectAll', label: '全选' }
            ]
        }
    ];

    // 应用菜单安装到当前 Electron 应用。
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 注册后台全局快捷键，应用在后台时也能 Ctrl+Q 快速创建桌面便签。
function registerShortcuts() {
    // Ctrl+Q 通知主窗口创建一张居中的新卡片，并由主窗口同步打开桌面便签。
    globalShortcut.register('CommandOrControl+Q', () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
        }

        mainWindow?.webContents.send('notes:create-quick-desktop');
    });
}

// Electron 准备就绪后创建菜单、主窗口和快捷键。
app.whenReady().then(() => {
    setupMenu();
    createWindow();
    registerShortcuts();

    // macOS 点击 Dock 图标时，如果没有窗口就重新打开主窗口。
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 应用退出前注销全局快捷键，避免系统残留注册。
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// 接收主窗口发来的“添加到桌面”请求，创建独立桌面便签窗口。
ipcMain.on('desktop-card:create', (_event, note, options) => {
    createDesktopCardWindow(note || {}, options || {});
});

// 接收桌面便签窗口的“置顶/取消置顶”请求，并作用于发起请求的窗口。
ipcMain.on('desktop-card:set-always-on-top', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setAlwaysOnTop(Boolean(value), 'screen-saver');
});

// 接收桌面便签窗口的修改结果，再转发给主窗口同步保存到 notes.json。
ipcMain.on('desktop-card:update-note', (_event, notePatch) => {
    mainWindow?.webContents.send('notes:update-from-desktop', notePatch || {});
});

// 关闭全部窗口时退出应用，macOS 保留系统常见行为。
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
