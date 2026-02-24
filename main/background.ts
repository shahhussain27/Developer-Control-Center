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
import { ProjectType, Settings, StartupProfile, SpawnError } from '../common/types'

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

;(async () => {
  await app.whenReady()

  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
    frame: false,          // Custom window chrome — Task Group 5
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
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
// Port Scanner
// ---------------------------------------------------------------------------

ipcMain.handle('get-active-ports', async () => {
  return await PortService.getActivePorts()
})

ipcMain.handle('kill-process-by-pid', async (_event, pid: number) => {
  return await ProcessService.killProcessByPid(pid)
})
