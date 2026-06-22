// Build a Windows x64 portable Electron app and, when available, an IExpress installer.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Keep Chinese output as Unicode escapes so this script stays ASCII-safe in any terminal.
const zh = {
    productName: '\u55b5\u55b5\u4fbf\u7b3a',
    portableLauncher: '\u542f\u52a8\u55b5\u55b5\u4fbf\u7b3a.bat',
    projectLauncher: '\u542f\u52a8\u9879\u76ee\u7248.bat',
    shortcutName: '\u55b5\u55b5\u4fbf\u7b3a.lnk',
    installerName: '\u55b5\u55b5\u4fbf\u7b3a\u5b89\u88c5\u5305',
    buildNotes: '\u6253\u5305\u8bf4\u660e.txt',
    installDone: '\u55b5\u55b5\u4fbf\u7b3a\u5df2\u5b89\u88c5\u5230 %TARGET%',
    shortcutDone: '\u684c\u9762\u5feb\u6377\u65b9\u5f0f\u5df2\u521b\u5efa\u3002',
    installSkipped: '\u672c\u673a IExpress \u672a\u80fd\u751f\u6210 EXE \u5b89\u88c5\u5305\uff0c\u8bf7\u76f4\u63a5\u4f7f\u7528\u4fbf\u643a\u7248\u6216 dist/installer/install.bat\u3002'
};

// Project paths used by both portable packaging and installer generation.
const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const runtimeDir = path.join(root, 'node_modules', 'electron', 'dist');
const appName = 'Miaomiao Notes';
const exeName = 'MiaomiaoNotes.exe';
const portableDir = path.join(distRoot, 'win-x64', appName);
const installerDir = path.join(distRoot, 'installer');
const portableZip = path.join(distRoot, 'MiaomiaoNotes-win-x64-portable.zip');
const installerZip = path.join(installerDir, path.basename(portableZip));
const installerExe = path.join(installerDir, 'MiaomiaoNotes-win-x64-setup.exe');
const iconPath = path.join(root, 'assets', 'app-icon.ico');

function removePath(target) {
    // Remove only generated packaging paths.
    fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(target) {
    // Create parent folders before writing generated files.
    fs.mkdirSync(target, { recursive: true });
}

function copyFile(source, target) {
    // Copy one file while creating the target folder first.
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
}

function copyDir(source, target, filter = () => true) {
    // Recursively copy a folder, preserving Electron runtime layout.
    ensureDir(target);

    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);

        if (!filter(sourcePath, entry)) {
            continue;
        }

        if (entry.isDirectory()) {
            copyDir(sourcePath, targetPath, filter);
        } else if (entry.isFile()) {
            copyFile(sourcePath, targetPath);
        }
    }
}

function writeAppPackage() {
    // Put the app source into Electron's resources/app folder.
    const appDir = path.join(portableDir, 'resources', 'app');
    ensureDir(appDir);

    const includeFiles = [
        'index.html',
        'mian.js',
        'notes.json',
        'package.json',
        'package-lock.json',
        '.npmrc'
    ];

    for (const file of includeFiles) {
        const source = path.join(root, file);
        if (fs.existsSync(source)) {
            copyFile(source, path.join(appDir, file));
        }
    }

    copyDir(path.join(root, 'assets'), path.join(appDir, 'assets'));
    copyDir(path.join(root, 'scripts'), path.join(appDir, 'scripts'));
}

function writeLaunchers() {
    // Add a launcher beside the portable executable and one launcher for project-mode startup.
    const portableBat = path.join(portableDir, zh.portableLauncher);
    const rootBat = path.join(root, zh.projectLauncher);

    fs.writeFileSync(portableBat, [
        '@echo off',
        'chcp 65001 >nul',
        'cd /d "%~dp0"',
        `"${exeName}"`,
        ''
    ].join('\r\n'), 'utf8');

    fs.writeFileSync(rootBat, [
        '@echo off',
        'chcp 65001 >nul',
        'cd /d "%~dp0"',
        'npm start',
        ''
    ].join('\r\n'), 'utf8');
}

function writeInstallerFiles() {
    // Prepare the files IExpress packs into the setup executable.
    removePath(installerDir);
    ensureDir(installerDir);
    copyFile(portableZip, installerZip);

    const installBat = path.join(installerDir, 'install.bat');
    const shortcutVbs = path.join(installerDir, 'create-shortcut.vbs');
    const sedPath = path.join(installerDir, 'iexpress.sed');
    const zipName = path.basename(installerZip);

    fs.writeFileSync(shortcutVbs, [
        'Set shell = CreateObject("WScript.Shell")',
        'desktop = shell.SpecialFolders("Desktop")',
        'target = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\MiaomiaoNotes\\MiaomiaoNotes.exe"',
        'icon = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\MiaomiaoNotes\\resources\\app\\assets\\app-icon.ico"',
        `Set link = shell.CreateShortcut(desktop & "\\${zh.shortcutName}")`,
        'link.TargetPath = target',
        'link.WorkingDirectory = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\MiaomiaoNotes"',
        'link.IconLocation = icon',
        'link.Save'
    ].join('\r\n'), 'utf8');

    fs.writeFileSync(installBat, [
        '@echo off',
        'chcp 65001 >nul',
        'set "TARGET=%LOCALAPPDATA%\\MiaomiaoNotes"',
        `set "ZIP=%~dp0${zipName}"`,
        'set "WORK=%TEMP%\\MiaomiaoNotesInstall"',
        'if exist "%WORK%" rmdir /S /Q "%WORK%"',
        'if not exist "%TARGET%" mkdir "%TARGET%"',
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath \\"%ZIP%\\" -DestinationPath \\"%WORK%\\" -Force"',
        'xcopy /E /I /Y "%WORK%\\Miaomiao Notes\\*" "%TARGET%\\" >nul',
        'cscript //nologo "%~dp0create-shortcut.vbs"',
        `echo ${zh.installDone}`,
        `echo ${zh.shortcutDone}`,
        'pause',
        ''
    ].join('\r\n'), 'utf8');

    fs.writeFileSync(sedPath, [
        '[Version]',
        'Class=IEXPRESS',
        'SEDVersion=3',
        '[Options]',
        'PackagePurpose=InstallApp',
        'ShowInstallProgramWindow=1',
        'HideExtractAnimation=0',
        'UseLongFileName=1',
        'InsideCompressed=0',
        'CAB_FixedSize=0',
        'CAB_ResvCodeSigning=0',
        'RebootMode=N',
        'InstallPrompt=%InstallPrompt%',
        'DisplayLicense=%DisplayLicense%',
        'FinishMessage=%FinishMessage%',
        'TargetName=%TargetName%',
        'FriendlyName=%FriendlyName%',
        'AppLaunched=%AppLaunched%',
        'PostInstallCmd=%PostInstallCmd%',
        'AdminQuietInstCmd=%AdminQuietInstCmd%',
        'UserQuietInstCmd=%UserQuietInstCmd%',
        'SourceFiles=SourceFiles',
        '[Strings]',
        'InstallPrompt=',
        'DisplayLicense=',
        'FinishMessage=',
        `TargetName=${installerExe}`,
        `FriendlyName=${zh.installerName}`,
        'AppLaunched=install.bat',
        'PostInstallCmd=<None>',
        'AdminQuietInstCmd=',
        'UserQuietInstCmd=',
        `FILE0=${path.basename(installerZip)}`,
        'FILE1=install.bat',
        'FILE2=create-shortcut.vbs',
        '[SourceFiles]',
        `SourceFiles0=${installerDir}\\`,
        '[SourceFiles0]',
        '%FILE0%=',
        '%FILE1%=',
        '%FILE2%=',
        ''
    ].join('\r\n'), 'utf8');

    return sedPath;
}

function run(command, args, options = {}) {
    // Run build tools with a timeout so packaging cannot hang forever.
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: options.timeout || 120000,
        windowsHide: true
    });

    if (result.error) {
        throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`);
    }

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout || ''}\n${result.stderr || ''}`);
    }

    return result.stdout;
}

function createPortableZip() {
    // Zip the portable app folder for easy distribution.
    removePath(portableZip);
    run('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Compress-Archive -LiteralPath '${portableDir}' -DestinationPath '${portableZip}' -Force`
    ], { timeout: 180000 });
}

function createInstaller() {
    // Use Windows' built-in IExpress when it is available; keep the portable build even if it fails.
    const sedPath = writeInstallerFiles();

    if (process.env.SKIP_IEXPRESS === '1') {
        return false;
    }

    try {
        run('iexpress.exe', ['/N', sedPath], { timeout: 90000 });
        return fs.existsSync(installerExe);
    } catch (error) {
        console.warn(error.message);
        return false;
    }
}

function writeBuildNotes(installerCreated) {
    // Write a short human-readable map of generated artifacts.
    const notes = [
        `${zh.productName} Windows x64 build`,
        '',
        `Portable app: ${portableDir}`,
        `Portable zip: ${portableZip}`,
        `Executable: ${path.join(portableDir, exeName)}`,
        installerCreated ? `Installer: ${installerExe}` : zh.installSkipped,
        `Icon: ${iconPath}`,
        '',
        'Project mode:',
        'npm start',
        zh.projectLauncher
    ].join('\r\n');

    fs.writeFileSync(path.join(distRoot, zh.buildNotes), notes, 'utf8');
}

function main() {
    // Validate the local Electron runtime before building any generated outputs.
    if (!fs.existsSync(runtimeDir)) {
        throw new Error(`Electron runtime not found: ${runtimeDir}`);
    }

    console.log('Building portable folder...');
    removePath(path.join(distRoot, 'win-x64'));
    ensureDir(portableDir);
    copyDir(runtimeDir, portableDir);

    // Rename Electron's executable to the app executable name.
    const electronExe = path.join(portableDir, 'electron.exe');
    const appExe = path.join(portableDir, exeName);
    if (fs.existsSync(electronExe)) {
        fs.renameSync(electronExe, appExe);
    }

    writeAppPackage();
    writeLaunchers();

    console.log('Creating portable zip...');
    createPortableZip();

    console.log('Creating installer...');
    const installerCreated = createInstaller();
    writeBuildNotes(installerCreated);

    console.log(`Portable app: ${portableDir}`);
    console.log(`Portable zip: ${portableZip}`);
    console.log(`Executable: ${appExe}`);
    console.log(installerCreated ? `Installer: ${installerExe}` : 'Installer: skipped because IExpress failed');
    console.log(`Icon: ${iconPath}`);
}

main();
