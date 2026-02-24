export type ProjectType = 'nextjs' | 'react' | 'node' | 'unity' | 'python' | 'unreal' | 'generic' | 'electron' | 'nextron'
export type Runtime = 'node' | 'unity' | 'python' | 'unreal'

export type CheckStatus = 'OK' | 'WARNING' | 'ERROR'

export interface CheckResult {
  status: CheckStatus
  message: string
}

export interface DiagnosticResult {
  projectId: string
  checks: CheckResult[]
}

export interface Project {
  id: string
  name: string
  path: string
  projectType: ProjectType
  runtime: Runtime
  detectedBy: string
}

export type ProcessStatus = 'stopped' | 'running' | 'starting' | 'error'

export interface ProcessState {
  pid: number | null
  status: ProcessStatus
  lastOutput?: string
  error?: string
}

/** Structured registry entry — keyed by PID in the main process */
export interface ProcessEntry {
  pid: number
  projectId: string
  command: string
  startTime: number
  status: 'running' | 'stopped' | 'error'
}

export interface ProcessStats {
  projectId: string
  pid: number
  cpu: number
  memory: number
  timestamp: number
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

export type SpawnErrorCode =
  | 'EXECUTABLE_MISSING'
  | 'SPAWN_FAILURE'
  | 'PERMISSION_DENIED'
  | 'SCRIPT_ERROR'
  | 'UNKNOWN'

export interface SpawnError {
  code: SpawnErrorCode
  message: string
  projectId: string
}

// ---------------------------------------------------------------------------
// Settings & Profiles
// ---------------------------------------------------------------------------

export interface Settings {
  scanLocations: string[]
  unityPath?: string
  unrealPath?: string
}

export interface StartupCommand {
  id: string
  command: string
  args: string[]
  cwd?: string
}

export interface StartupProfile {
  id: string
  projectId: string
  name: string
  commands: StartupCommand[]
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export interface PortInfo {
  port: number
  pid: number
  protocol: string
  state: string
  processName?: string
  projectId?: string
  projectName?: string
}

// ---------------------------------------------------------------------------
// IPC Contract
// ---------------------------------------------------------------------------

export interface IpcHandlers {
  'scan-directory': (path: string) => Promise<Project[]>
  'run-command': (projectId: string, command: string, cwd: string, type: ProjectType) => Promise<{ pid: number } | { error: SpawnError }>
  'stop-command': (projectId: string) => Promise<void>
  'get-process-status': (projectId: string) => Promise<ProcessState>
  'get-process-logs': (pid: number) => Promise<LogEntry[]>
  'select-directory': () => Promise<string>
  'select-file': () => Promise<string>
  'get-settings': () => Promise<Settings>
  'save-settings': (settings: Settings) => Promise<void>
  'doctor-check': (projectId: string) => Promise<DiagnosticResult>
  // Profile Handlers
  'get-profiles': (projectId: string) => Promise<StartupProfile[]>
  'save-profile': (profile: StartupProfile) => Promise<void>
  'delete-profile': (profileId: string) => Promise<void>
  'run-profile': (profileId: string) => Promise<void>
  'stop-profile': (profileId: string) => Promise<void>
  // Port Handlers
  'get-active-ports': () => Promise<PortInfo[]>
  'kill-process-by-pid': (pid: number) => Promise<void>
  // Window Controls (fire-and-forget via ipcRenderer.send)
  'window-minimize': () => void
  'window-maximize': () => void
  'window-close': () => void
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export interface LogEntry {
  projectId: string
  pid: number
  data: string
  timestamp: number
  type: 'stdout' | 'stderr'
}
