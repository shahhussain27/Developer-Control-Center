export type ProjectType = 'nextjs' | 'react' | 'node' | 'unity' | 'python' | 'unreal' | 'generic' | 'electron' | 'nextron' | 'react-native' | 'flutter'
export type Runtime = 'node' | 'unity' | 'python' | 'unreal' | 'flutter'

export type CheckStatus = 'OK' | 'WARNING' | 'ERROR'

export interface CheckResult {
  status: CheckStatus
  message: string
}

export interface DiagnosticResult {
  projectId: string
  checks: CheckResult[]
}

export interface IdeInfo {
  name: string
  path: string
}

export interface Project {
  id: string
  name: string
  path: string
  projectType: ProjectType
  runtime: Runtime
  detectedBy: string
  size?: number
  lastModified?: number
  confidenceScore?: 'high' | 'medium' | 'low'
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
  type: ProjectType
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

export interface IdeLaunchError extends SpawnError {
  ideName: string
}

export interface QuickActionError {
  projectId: string
  actionId: string
  message: string
}

// ---------------------------------------------------------------------------
// Settings & Profiles
// ---------------------------------------------------------------------------

export interface Settings {
  scanLocations: string[]
  unityPath?: string
  unrealPath?: string
  customIdes?: IdeInfo[]
  projectUsage?: Record<string, number>
  ignoredProjects?: string[]
  projectAliases?: Record<string, string>
}

export interface StartupCommand {
  id: string
  command: string
  args: string[]
  cwd?: string
  delayMs?: number  // Delay in ms before executing this step
  label?: string    // Human-readable step label
}

export interface StartupProfile {
  id: string
  projectId: string
  name: string
  description?: string  // What this profile does
  commands: StartupCommand[]
}

// ---------------------------------------------------------------------------
// Engine Builds & Cleanup
// ---------------------------------------------------------------------------

export interface BuildProfile {
  id: string
  projectId: string
  name: string
  engine: 'unity' | 'unreal'
  arguments: string[]
  outputPath: string
}

export interface EngineDetectionResult {
  installedVersion?: string
  requiredVersion?: string
  isMatch: boolean
}

export interface CleanupResult {
  bytesFreed: number
  foldersDeleted: string[]
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export type EnvironmentStatus = 'installed' | 'outdated' | 'missing'

export interface EnvironmentCheckResult {
  tool: string
  status: EnvironmentStatus
  version?: string
  message?: string
}

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
  'send-process-input': (pid: number, input: string) => Promise<void>
  'start-interactive-shell': (projectId: string, cwd: string) => Promise<{ pid?: number, error?: SpawnError }>
  'send-shell-input': (projectId: string, input: string) => Promise<void>
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

  // Build Profile Handlers
  'get-build-profiles': (projectId: string) => Promise<BuildProfile[]>
  'save-build-profile': (profile: BuildProfile) => Promise<void>
  'delete-build-profile': (profileId: string) => Promise<void>
  'run-build-profile': (profileId: string) => Promise<void | { error: SpawnError }>

  // Project Creation
  'create-project': (type: ProjectType, name: string, directory: string) => Promise<string>

  // Engine Diagnostics & Cleanup
  'detect-engine-version': (projectId: string) => Promise<EngineDetectionResult>
  'check-environment': () => Promise<EnvironmentCheckResult[]>
  'clean-project': (projectId: string) => Promise<CleanupResult>

  // Project Lifecycle Management
  'ignore-project': (path: string) => Promise<void>
  'rename-project': (path: string, newName: string) => Promise<void>
  'delete-project-permanent': (path: string) => Promise<void>

  // Port Handlers
  'get-active-ports': () => Promise<PortInfo[]>
  'kill-process-by-pid': (pid: number) => Promise<void>
  // IDE Handlers
  'ide-detect': () => Promise<IdeInfo[]>
  'ide-list': () => Promise<IdeInfo[]>
  'ide-launch': (idePath: string, projectPath: string) => Promise<void | { error: IdeLaunchError }>
  // Quick Actions
  'quick-actions-list': () => Promise<QuickAction[]>
  'quick-actions-execute': (actionId: string, projectId: string) => Promise<void | { error: QuickActionError }>
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
  type: 'stdout' | 'stderr' | 'shell-stdout' | 'shell-stderr'
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

export interface QuickActionCondition {
  requiresRunning?: boolean
  requiresStopped?: boolean
  requiresPorts?: boolean
  requiresLogs?: boolean
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  action: string
  conditions?: QuickActionCondition
}
