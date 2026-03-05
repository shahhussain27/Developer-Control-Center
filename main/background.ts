import path from 'path'
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers/index'
import { ScannerService } from './services/ScannerService'
import { ProcessService } from './services/ProcessService'
import { SettingsService } from './services/SettingsService'
import { DoctorService } from './services/DoctorService'
import { ProfileService } from './services/ProfileService'
import { PortService } from './services/PortService'
import { IdeService } from './services/IdeService'
import { QuickActionService } from './services/QuickActionService'
import { EngineService } from './services/EngineService'
import { BuildProfileService } from './services/BuildProfileService'
import { ProjectType, Settings, StartupProfile, SpawnError, BuildProfile } from '../common/types'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

// ---------------------------------------------------------------------------
// App Bootstrap
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

  ; (async () => {
    await app.whenReady()

    // Create Splash Screen
    splashWindow = new BrowserWindow({
      width: 500,
      height: 300,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
    })
    const splashPath = path.join(__dirname, '../resources/splash.html')
    splashWindow.loadFile(splashPath).catch((err) => console.log('Splash load error:', err))

    mainWindow = createWindow('main', {
      width: 1200,
      height: 800,
      frame: false,          // Custom window chrome — Task Group 5
      show: false,           // Start hidden until ready
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    })

    // Listen for main window being ready to show
    mainWindow.once('ready-to-show', () => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
      }
      mainWindow?.show()
    })

    if (isProd) {
      await mainWindow.loadURL('app://./home')
    } else {
      const port = process.argv[2]
      await mainWindow.loadURL(`http://localhost:${port}/home`)
      // mainWindow.webContents.openDevTools()
    }

    ProcessService.setEventEmitter((channel, data) => {
      mainWindow?.webContents.send(channel, data)
    })
  })()

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------

app.on('before-quit', () => {
  ProcessService.shutdown()
})

app.on('window-all-closed', () => {
  app.quit()
})

// ---------------------------------------------------------------------------
// Custom Window Controls (Task Group 5)
// Fire-and-forget — use ipcMain.on, NOT ipcMain.handle
// ---------------------------------------------------------------------------

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return
  mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize()
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

// ---------------------------------------------------------------------------
// File System Dialogs
// ---------------------------------------------------------------------------

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'app'] }
    ]
  })
  return result.filePaths[0]
})

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

// ---------------------------------------------------------------------------
// Project Scanning
// ---------------------------------------------------------------------------

ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
  return await ScannerService.scanDirectory(dirPath)
})

import { EnvironmentService } from './services/EnvironmentService'
import { CreationService } from './services/CreationService'

// ---------------------------------------------------------------------------
// Environment Checking
// ---------------------------------------------------------------------------

ipcMain.handle('check-environment', async () => {
  return EnvironmentService.checkAll()
})

// ---------------------------------------------------------------------------
// Project Creation
// ---------------------------------------------------------------------------

ipcMain.handle('create-project', async (_event, type: ProjectType, name: string, directory: string) => {
  return CreationService.createProject(type, name, directory, (data) => {
    CreationService.emitCreationLog(data)
  })
})

// ---------------------------------------------------------------------------
// Project Lifecycle
// ---------------------------------------------------------------------------

ipcMain.handle('ignore-project', async (_event, pathStr: string) => {
  // Remove from scan registry first (prevents it re-appearing on next rescan)
  SettingsService.removeLocation(pathStr)
  // Mark as ignored (in case the folder is ever re-added as a sub-path)
  SettingsService.ignoreProject(pathStr)
})

ipcMain.handle('rename-project', async (_event, pathStr: string, newName: string) => {
  SettingsService.setProjectAlias(pathStr, newName)
})

import * as fs from 'fs'

ipcMain.handle('delete-project-permanent', async (_event, pathStr: string) => {
  try {
    fs.rmSync(pathStr, { recursive: true, force: true })

    // Remove from scan registry (if the project path itself was added as a scan location)
    SettingsService.removeLocation(pathStr)

    // Also ignore it so it won't re-appear if the folder is ever recreated
    SettingsService.ignoreProject(pathStr)

    // Clear any stored alias for this path
    SettingsService.setProjectAlias(pathStr, '')
  } catch (err: any) {
    throw new Error(`Failed to delete project: ${err.message}`)
  }
})

// ---------------------------------------------------------------------------
// Process Management
// ---------------------------------------------------------------------------

ipcMain.handle('run-command', async (
  _event,
  projectId: string,
  command: string,
  cwd: string,
  type: ProjectType,
): Promise<{ pid: number } | { error: SpawnError }> => {
  return ProcessService.runCommand(projectId, command, cwd, type)
})

ipcMain.handle('stop-command', async (_event, projectId: string) => {
  ProcessService.stopCommand(projectId)
})

ipcMain.handle('get-process-status', async (_event, projectId: string) => {
  return ProcessService.getStatus(projectId)
})

ipcMain.handle('get-process-logs', async (_event, pid: number) => {
  return ProcessService.getLogsForPid(pid)
})

ipcMain.handle('send-process-input', async (_event, pid: number, input: string) => {
  return ProcessService.sendInput(pid, input)
})

ipcMain.handle('start-interactive-shell', async (_event, projectId: string, cwd: string) => {
  return ProcessService.startInteractiveShell(projectId, cwd)
})

ipcMain.handle('send-shell-input', async (_event, projectId: string, input: string) => {
  return ProcessService.sendShellInput(projectId, input)
})

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

ipcMain.handle('get-settings', async () => {
  return SettingsService.getSettings()
})

ipcMain.handle('save-settings', async (_event, settings: Settings) => {
  SettingsService.saveSettings(settings)
})

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

ipcMain.handle('doctor-check', async (_event, projectId: string) => {
  return await DoctorService.checkProject(projectId)
})

// ---------------------------------------------------------------------------
// Startup Profiles
// ---------------------------------------------------------------------------

ipcMain.handle('get-profiles', async (_event, projectId: string) => {
  return ProfileService.getProfiles(projectId)
})

ipcMain.handle('save-profile', async (_event, profile: StartupProfile) => {
  return ProfileService.saveProfile(profile)
})

ipcMain.handle('delete-profile', async (_event, profileId: string) => {
  return ProfileService.deleteProfile(profileId)
})

ipcMain.handle('run-profile', async (_event, profileId: string) => {
  try {
    return await ProfileService.runProfile(profileId)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Run profile error:', msg)
    throw error
  }
})

ipcMain.handle('stop-profile', async (_event, profileId: string) => {
  return ProfileService.stopProfile(profileId)
})

// ---------------------------------------------------------------------------
// Build Profiles
// ---------------------------------------------------------------------------

ipcMain.handle('get-build-profiles', async (_event, projectId: string) => {
  return BuildProfileService.getProfiles(projectId)
})

ipcMain.handle('save-build-profile', async (_event, profile: BuildProfile) => {
  return BuildProfileService.saveProfile(profile)
})

ipcMain.handle('delete-build-profile', async (_event, profileId: string) => {
  return BuildProfileService.deleteProfile(profileId)
})

ipcMain.handle('run-build-profile', async (_event, profileId: string) => {
  return await BuildProfileService.executeBuild(profileId)
})

// ---------------------------------------------------------------------------
// Engine Services (Diagnostics & Cleanup)
// ---------------------------------------------------------------------------

ipcMain.handle('detect-engine-version', async (_event, projectId: string) => {
  return await EngineService.detectEngineVersion(projectId)
})

ipcMain.handle('clean-project', async (_event, projectId: string) => {
  return await EngineService.cleanProject(projectId)
})

// ---------------------------------------------------------------------------
// Port Scanner
// ---------------------------------------------------------------------------

ipcMain.handle('get-active-ports', async () => {
  return await PortService.getActivePorts()
})

ipcMain.handle('kill-process-by-pid', async (_event, pid: number) => {
  return await ProcessService.killProcessByPid(pid)
})

// ---------------------------------------------------------------------------
// IDE Integration
// ---------------------------------------------------------------------------

ipcMain.handle('ide-detect', async () => {
  return await IdeService.detectIdes()
})

ipcMain.handle('ide-list', async () => {
  return await IdeService.listIdes()
})

ipcMain.handle('ide-launch', async (_event, idePath: string, projectPath: string) => {
  // Use a default name for error tracking if needed
  const name = path.basename(idePath)
  return await IdeService.launchIde(idePath, projectPath, name)
})

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

ipcMain.handle('quick-actions-list', async () => {
  return QuickActionService.getCatalog()
})

ipcMain.handle('quick-actions-execute', async (_event, actionId: string, projectId: string) => {
  return await QuickActionService.execute(actionId, projectId)
})

// ---------------------------------------------------------------------------
// Auto Updater
// ---------------------------------------------------------------------------

import { autoUpdater } from 'electron-updater'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents.send('update-checking')
})

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info)
})

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents.send('update-not-available', info)
})

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-error', err.message || err.toString())
})

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('update-download-progress', progressObj)
})

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info)
})

ipcMain.handle('check-for-update', async () => {
  return await autoUpdater.checkForUpdates()
})

ipcMain.handle('download-update', async () => {
  return await autoUpdater.downloadUpdate()
})

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
