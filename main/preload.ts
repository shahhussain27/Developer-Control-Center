import { contextBridge, ipcRenderer } from 'electron'
import {
  Project,
  ProcessState,
  Settings,
  LogEntry,
  ProcessStats,
  SpawnError,
  StartupProfile,
  PortInfo,
  DiagnosticResult,
  ProjectType,
} from '../common/types'

// ---------------------------------------------------------------------------
// Typed IPC Handler
// ---------------------------------------------------------------------------

const handler = {
  // ----- Generic escape valves (avoid using these for new features) --------
  send(channel: string, value: unknown): void {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void): () => void {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },
  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    return ipcRenderer.invoke(channel, ...args)
  },

  // ----- File System -------------------------------------------------------
  selectDirectory: (): Promise<string> =>
    ipcRenderer.invoke('select-directory'),
  selectFile: (): Promise<string> =>
    ipcRenderer.invoke('select-file'),

  // ----- Scanning ----------------------------------------------------------
  scanDirectory: (dirPath: string): Promise<Project[]> =>
    ipcRenderer.invoke('scan-directory', dirPath),

  // ----- Process Management ------------------------------------------------
  runCommand: (
    projectId: string,
    command: string,
    cwd: string,
    type: ProjectType,
  ): Promise<{ pid: number } | { error: SpawnError }> =>
    ipcRenderer.invoke('run-command', projectId, command, cwd, type),

  stopCommand: (projectId: string): Promise<void> =>
    ipcRenderer.invoke('stop-command', projectId),

  getProcessStatus: (projectId: string): Promise<ProcessState> =>
    ipcRenderer.invoke('get-process-status', projectId),

  getProcessLogs: (pid: number): Promise<LogEntry[]> =>
    ipcRenderer.invoke('get-process-logs', pid),

  // ----- Settings ----------------------------------------------------------
  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Settings): Promise<void> =>
    ipcRenderer.invoke('save-settings', settings),

  // ----- Environment Doctor ------------------------------------------------
  doctorCheck: (projectId: string): Promise<DiagnosticResult> =>
    ipcRenderer.invoke('doctor-check', projectId),

  // ----- Push Events -------------------------------------------------------
  onLog: (callback: (log: LogEntry) => void): (() => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      data: LogEntry,
    ) => callback(data)
    ipcRenderer.on('process-log', subscription)
    return () => ipcRenderer.removeListener('process-log', subscription)
  },

  onStats: (callback: (stats: ProcessStats) => void): (() => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      data: ProcessStats,
    ) => callback(data)
    ipcRenderer.on('process-stats', subscription)
    return () => ipcRenderer.removeListener('process-stats', subscription)
  },

  onProcessState: (
    callback: (payload: { projectId: string } & ProcessState) => void,
  ): (() => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      data: { projectId: string } & ProcessState,
    ) => callback(data)
    ipcRenderer.on('process-state', subscription)
    return () => ipcRenderer.removeListener('process-state', subscription)
  },

  // ----- Startup Profiles --------------------------------------------------
  getProfiles: (projectId: string): Promise<StartupProfile[]> =>
    ipcRenderer.invoke('get-profiles', projectId),
  saveProfile: (profile: StartupProfile): Promise<void> =>
    ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (profileId: string): Promise<void> =>
    ipcRenderer.invoke('delete-profile', profileId),
  runProfile: (profileId: string): Promise<void> =>
    ipcRenderer.invoke('run-profile', profileId),
  stopProfile: (profileId: string): Promise<void> =>
    ipcRenderer.invoke('stop-profile', profileId),

  // ----- Network / Ports ---------------------------------------------------
  getActivePorts: (): Promise<PortInfo[]> =>
    ipcRenderer.invoke('get-active-ports'),
  killProcessByPid: (pid: number): Promise<void> =>
    ipcRenderer.invoke('kill-process-by-pid', pid),

  // ----- Custom Window Controls (Task Group 5) ----------------------------
  // Use send (fire-and-forget) — these map to ipcMain.on in main process
  windowMinimize: (): void => ipcRenderer.send('window-minimize'),
  windowMaximize: (): void => ipcRenderer.send('window-maximize'),
  windowClose:    (): void => ipcRenderer.send('window-close'),
}

contextBridge.exposeInMainWorld('ipc', handler)

export type IpcHandler = typeof handler
