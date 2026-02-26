import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import pidusage from 'pidusage'
import {
  ProcessEntry,
  ProcessState,
  ProcessStats,
  ProjectType,
  SpawnError,
  SpawnErrorCode,
  LogEntry,
} from '../../common/types'
import { SettingsService } from './SettingsService'
import { RingBuffer } from './RingBuffer'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum log lines retained per process (ring buffer capacity). */
const LOG_BUFFER_SIZE = 1000

/**
 * Minimum allowed monitoring interval in milliseconds.
 * Values below this threshold would cause excessive resource usage.
 */
const MIN_MONITOR_INTERVAL_MS = 1500

/** Actual monitoring poll interval used. */
const MONITOR_INTERVAL_MS = 2000

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * Primary process registry, keyed by PID.
 * This is the single source of truth for all spawned processes.
 */
const registry = new Map<number, ProcessEntry>()

/**
 * Reverse lookup index: projectId → active PID.
 * A project may have at most one active PID at any time.
 */
const projectIndex = new Map<string, number>()

/**
 * Raw ChildProcess handles, keyed by PID.
 * Used by stop/kill logic to issue signals.
 */
const processHandles = new Map<number, ChildProcess>()

/**
 * Per-process log ring buffers, keyed by PID.
 * Evicts oldest entries when capacity is reached.
 */
const logBuffers = new Map<number, RingBuffer<LogEntry>>()

// ---------------------------------------------------------------------------
// COMMAND_MAP
// ---------------------------------------------------------------------------

const COMMAND_MAP: Record<ProjectType, string> = {
  nextron: 'npm run dev',
  electron: 'npm run dev',
  node: 'npm run dev',
  python: 'python main.py',
  unity: '',   // Handled via settings path
  unreal: '',   // Handled via settings path
  generic: 'npm start',
  nextjs: 'npm run dev',
  react: 'npm run dev',
}

// ---------------------------------------------------------------------------
// ProcessService
// ---------------------------------------------------------------------------

export class ProcessService {
  private static eventEmitter: (channel: string, data: unknown) => void = () => { /* noop until set */ }
  private static monitoringInterval: NodeJS.Timeout | null = null

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  public static setEventEmitter(emitter: (channel: string, data: unknown) => void): void {
    this.eventEmitter = emitter
    this.startMonitoring()
  }

  /** Called once before the app quits to release timers and handles. */
  public static shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    // Best-effort stop all running processes
    for (const pid of Array.from(projectIndex.values())) {
      const entry = registry.get(pid)
      if (entry) this.stopCommand(entry.projectId)
    }
  }

  // -------------------------------------------------------------------------
  // Monitoring
  // -------------------------------------------------------------------------

  private static startMonitoring(): void {
    if (this.monitoringInterval) return

    if (MONITOR_INTERVAL_MS < MIN_MONITOR_INTERVAL_MS) {
      throw new Error(
        `Monitor interval ${MONITOR_INTERVAL_MS}ms is below the minimum ${MIN_MONITOR_INTERVAL_MS}ms.`
      )
    }

    this.monitoringInterval = setInterval(async () => {
      if (registry.size === 0) return

      for (const [pid, entry] of registry.entries()) {
        if (entry.status !== 'running') continue

        try {
          const stats = await pidusage(pid)
          const payload: ProcessStats = {
            projectId: entry.projectId,
            pid,
            cpu: stats.cpu,
            memory: stats.memory / 1024 / 1024, // bytes → MB
            timestamp: Date.now(),
          }
          this.eventEmitter('process-stats', payload)
        } catch {
          // Process may have exited between poll cycles — harmless
          console.warn(`[ProcessService] pidusage failed for PID ${pid} (${entry.projectId})`)
        }
      }
    }, MONITOR_INTERVAL_MS)

    // Do not prevent app exit when the interval is the only thing left running
    this.monitoringInterval.unref()
  }

  // -------------------------------------------------------------------------
  // Error Classification
  // -------------------------------------------------------------------------

  private static classifyError(err: NodeJS.ErrnoException): SpawnErrorCode {
    switch (err.code) {
      case 'ENOENT': return 'EXECUTABLE_MISSING'
      case 'EACCES':
      case 'EPERM': return 'PERMISSION_DENIED'
      case 'EAGAIN':
      case 'EMFILE': return 'SPAWN_FAILURE'
      default: return 'UNKNOWN'
    }
  }

  private static makeSpawnError(
    projectId: string,
    err: NodeJS.ErrnoException,
  ): SpawnError {
    return {
      projectId,
      code: this.classifyError(err),
      message: err.message,
    }
  }

  // -------------------------------------------------------------------------
  // Log Buffer Helpers
  // -------------------------------------------------------------------------

  private static ensureLogBuffer(pid: number): RingBuffer<LogEntry> {
    if (!logBuffers.has(pid)) {
      logBuffers.set(pid, new RingBuffer<LogEntry>(LOG_BUFFER_SIZE))
    }
    return logBuffers.get(pid)!
  }

  private static emitLog(
    pid: number,
    projectId: string,
    data: string,
    type: 'stdout' | 'stderr',
  ): void {
    const entry: LogEntry = { projectId, pid, data, timestamp: Date.now(), type }

    // Store in ring buffer (bounded, main-process side)
    this.ensureLogBuffer(pid).push(entry)

    // Forward to renderer
    this.eventEmitter('process-log', entry)
  }

  /** Retrieve all buffered log lines for a given PID. */
  public static getLogsForPid(pid: number): LogEntry[] {
    return logBuffers.get(pid)?.toArray() ?? []
  }

  // -------------------------------------------------------------------------
  // Spawn Helpers
  // -------------------------------------------------------------------------

  /**
   * Kill a process tree on Windows using `spawn('taskkill')`.
   * Never uses exec() to avoid buffer/security issues.
   */
  private static spawnKill(pid: number): void {
    const killer = spawn('taskkill', ['/F', '/T', '/PID', String(pid)], {
      shell: false,
      stdio: 'ignore',
    })
    killer.on('error', (err) => {
      console.warn(`[ProcessService] taskkill failed for PID ${pid}:`, err.message)
      // Last-resort: direct signal — only works for the root process
      try { process.kill(pid, 'SIGKILL') } catch { /* already gone */ }
    })
  }

  // -------------------------------------------------------------------------
  // Core Process Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Spawn a process for a project type.
   * Returns `{ pid }` on success or `{ error: SpawnError }` on failure.
   */
  public static runCommand(
    projectId: string,
    _command: string,
    cwd: string,
    type: ProjectType,
  ): { pid: number } | { error: SpawnError } {
    // Guarantee no duplicate — stop any existing run for this project first
    this.stopCommand(projectId)

    const settings = SettingsService.getSettings()
    let execPath: string
    let args: string[]
    let useShell: boolean

    if (type === 'unity') {
      if (!settings.unityPath || !fs.existsSync(settings.unityPath)) {
        return {
          error: {
            projectId,
            code: 'EXECUTABLE_MISSING',
            message: 'Unity executable path not configured or not found in Settings',
          },
        }
      }
      execPath = settings.unityPath
      args = ['-projectPath', cwd]
      useShell = false
    } else if (type === 'unreal') {
      if (!settings.unrealPath || !fs.existsSync(settings.unrealPath)) {
        return {
          error: {
            projectId,
            code: 'EXECUTABLE_MISSING',
            message: 'Unreal Engine path not configured or not found in Settings',
          },
        }
      }
      // Cold-path sync read — acceptable here (user-initiated, not in a loop)
      const files = fs.readdirSync(cwd)
      const uproject = files.find(f => f.endsWith('.uproject'))
      if (!uproject) {
        return {
          error: {
            projectId,
            code: 'SCRIPT_ERROR',
            message: 'No .uproject file found in the selected folder',
          },
        }
      }
      execPath = settings.unrealPath
      args = [path.join(cwd, uproject)]
      useShell = false
    } else {
      const fullCmd = COMMAND_MAP[type] || 'npm start'
      const parts = fullCmd.split(' ')
      execPath = parts[0]
      args = parts.slice(1)
      useShell = true // Required for npm / python on most environments
    }

    const commandStr = [execPath, ...args].join(' ')

    let child: ChildProcess
    try {
      child = spawn(execPath, args, {
        cwd,
        shell: useShell,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (rawErr) {
      const err = rawErr as NodeJS.ErrnoException
      console.error(`[ProcessService] Spawn threw for ${projectId}:`, err)
      return { error: this.makeSpawnError(projectId, err) }
    }

    if (child.pid === undefined) {
      return {
        error: {
          projectId,
          code: 'SPAWN_FAILURE',
          message: 'Spawned process did not receive a PID — executable may be missing',
        },
      }
    }

    const pid = child.pid

    // Register in primary registry
    const entry: ProcessEntry = {
      pid,
      projectId,
      command: commandStr,
      startTime: Date.now(),
      status: 'running',
    }
    registry.set(pid, entry)
    projectIndex.set(projectId, pid)
    processHandles.set(pid, child)
    this.ensureLogBuffer(pid).clear() // Fresh buffer for this run

    // Stream stdout
    child.stdout?.on('data', (data: Buffer) => {
      this.emitLog(pid, projectId, data.toString(), 'stdout')
    })

    // Stream stderr
    child.stderr?.on('data', (data: Buffer) => {
      this.emitLog(pid, projectId, data.toString(), 'stderr')
    })

    // Clean exit
    child.on('exit', (code) => {
      // If the PID is no longer in projectIndex, it was manually killed/restarted by stopCommand
      const manualKilled = projectIndex.get(projectId) !== pid
      const finalStatus = (code === 0 || manualKilled) ? 'stopped' : 'error'

      const exitEntry = registry.get(pid)
      if (exitEntry) {
        exitEntry.status = finalStatus
      }

      if (!manualKilled) {
        projectIndex.delete(projectId)
      }
      processHandles.delete(pid)

      const exitStatus: ProcessState = {
        pid: null,
        status: finalStatus,
        error: finalStatus === 'error' ? `Process exited with code ${code}` : undefined,
      }
      this.eventEmitter('process-state', { projectId, ...exitStatus })
      this.emitLog(pid, projectId, `Process exited with code ${code}`, code === 0 ? 'stdout' : 'stderr')
    })

    // Spawn-level errors (e.g. ENOENT after spawn returns)
    child.on('error', (rawErr) => {
      const err = rawErr as NodeJS.ErrnoException
      const errorEntry = registry.get(pid)
      if (errorEntry) errorEntry.status = 'error'

      if (projectIndex.get(projectId) === pid) {
        projectIndex.delete(projectId)
      }
      processHandles.delete(pid)

      const spawnErr = this.makeSpawnError(projectId, err)
      console.error(`[ProcessService] Process error for ${projectId} (PID ${pid}):`, err)
      this.eventEmitter('process-state', { projectId, pid: null, status: 'error', error: spawnErr })
      this.emitLog(pid, projectId, `Process error [${spawnErr.code}]: ${err.message}`, 'stderr')
    })

    this.eventEmitter('process-state', { projectId, pid, status: 'running' })

    return { pid }
  }

  /**
   * Run a raw command (used by ProfileService).
   * Returns `{ pid }` on success or `{ error: SpawnError }` on failure.
   */
  public static runRawCommand(
    projectId: string,
    command: string,
    args: string[],
    cwd: string,
  ): { pid: number } | { error: SpawnError } {
    this.stopCommand(projectId)

    let child: ChildProcess
    try {
      child = spawn(command, args, {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (rawErr) {
      const err = rawErr as NodeJS.ErrnoException
      return { error: this.makeSpawnError(projectId, err) }
    }

    if (child.pid === undefined) {
      return {
        error: {
          projectId,
          code: 'SPAWN_FAILURE',
          message: `Failed to get PID for raw command: ${command}`,
        },
      }
    }

    const pid = child.pid
    const commandStr = [command, ...args].join(' ')

    const entry: ProcessEntry = {
      pid,
      projectId,
      command: commandStr,
      startTime: Date.now(),
      status: 'running',
    }
    registry.set(pid, entry)
    projectIndex.set(projectId, pid)
    processHandles.set(pid, child)
    this.ensureLogBuffer(pid).clear()

    child.stdout?.on('data', (data: Buffer) => {
      this.emitLog(pid, projectId, data.toString(), 'stdout')
    })
    child.stderr?.on('data', (data: Buffer) => {
      this.emitLog(pid, projectId, data.toString(), 'stderr')
    })

    child.on('exit', (code) => {
      const exitEntry = registry.get(pid)
      if (exitEntry) exitEntry.status = code === 0 ? 'stopped' : 'error'
      if (projectIndex.get(projectId) === pid) projectIndex.delete(projectId)
      processHandles.delete(pid)
      this.emitLog(pid, projectId, `Process exited with code ${code}`, code === 0 ? 'stdout' : 'stderr')
    })

    child.on('error', (rawErr) => {
      const err = rawErr as NodeJS.ErrnoException
      const errorEntry = registry.get(pid)
      if (errorEntry) errorEntry.status = 'error'
      if (projectIndex.get(projectId) === pid) projectIndex.delete(projectId)
      processHandles.delete(pid)
      this.emitLog(pid, projectId, `Process error [${this.classifyError(err)}]: ${err.message}`, 'stderr')
    })

    return { pid }
  }

  /**
   * Async wrapper for runRawCommand — resolves on exit code 0, rejects otherwise.
   * Used by ProfileService to await command completion.
   */
  public static runRawCommandAsync(
    projectId: string,
    command: string,
    args: string[],
    cwd: string,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const result = this.runRawCommand(projectId, command, args, cwd)
      if ('error' in result) {
        reject(new Error(`[${result.error.code}] ${result.error.message}`))
        return
      }

      const pid = result.pid
      const child = processHandles.get(pid)
      if (!child) {
        reject(new Error('Process handle not found after spawn'))
        return
      }

      child.once('exit', (code) => {
        if (code === 0) resolve(code ?? 0)
        else reject(new Error(`Process exited with code ${code}`))
      })

      child.once('error', (err) => reject(err))
    })
  }

  // -------------------------------------------------------------------------
  // Stop / Kill
  // -------------------------------------------------------------------------

  public static stopCommand(projectId: string): void {
    const pid = projectIndex.get(projectId)
    if (pid === undefined) return

    const entry = registry.get(pid)
    if (entry) entry.status = 'stopped'

    projectIndex.delete(projectId)
    processHandles.delete(pid)

    // Spawn taskkill — no exec()
    this.spawnKill(pid)

    // Emit stopped deterministically immediately to sync UI prior to async exit fire
    this.eventEmitter('process-state', { projectId, pid: null, status: 'stopped' })
  }

  /**
   * Kill a process by PID regardless of projectId association.
   * Used by the port-conflict resolver.
   */
  public static killProcessByPid(pid: number): Promise<void> {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/F', '/T', '/PID', String(pid)], {
        shell: false,
        stdio: 'ignore',
      })

      killer.on('close', (code) => {
        if (code !== 0) {
          // Fallback: direct signal
          try { process.kill(pid, 'SIGKILL') } catch { /* already gone */ }
        }
        // Clean up registry if this was a managed process
        const entry = registry.get(pid)
        if (entry) {
          projectIndex.delete(entry.projectId)
          processHandles.delete(pid)
          entry.status = 'stopped'
        }
        resolve()
      })

      killer.on('error', () => {
        try { process.kill(pid, 'SIGKILL') } catch { /* already gone */ }
        resolve()
      })
    })
  }

  // -------------------------------------------------------------------------
  // Status Queries
  // -------------------------------------------------------------------------

  /** Returns renderer-compatible ProcessState for a project. */
  public static getStatus(projectId: string): ProcessState {
    const pid = projectIndex.get(projectId)
    if (pid === undefined) return { pid: null, status: 'stopped' }

    const entry = registry.get(pid)
    if (!entry) return { pid: null, status: 'stopped' }

    return {
      pid,
      status: entry.status,
    }
  }

  /** Returns the projectId associated with a given PID (direct lookup). */
  public static getProjectIdByPid(pid: number): string | undefined {
    return registry.get(pid)?.projectId
  }

  /**
   * Determines if a target PID belongs to any managed DCC project by
   * traversing the process ancestry tree (Windows: wmic via spawn).
   */
  public static async identifyProjectIdFromPid(targetPid: number): Promise<string | undefined> {
    // Fast path: direct registry hit
    const directMatch = registry.get(targetPid)
    if (directMatch) return directMatch.projectId

    const processTree = await this.getProcessTree()

    for (const [pid, entry] of registry.entries()) {
      if (this.isDescendantInTree(pid, targetPid, processTree)) {
        return entry.projectId
      }
    }

    return undefined
  }

  private static isDescendantInTree(
    rootPid: number,
    targetPid: number,
    tree: Map<number, number>,
  ): boolean {
    if (rootPid === targetPid) return true

    let current = targetPid
    const visited = new Set<number>() // Prevent infinite loops on cyclic data

    while (current && !visited.has(current)) {
      visited.add(current)
      const parent = tree.get(current)
      if (parent === undefined) break
      if (parent === rootPid) return true
      current = parent
    }

    return false
  }

  /**
   * Builds a ChildPID → ParentPID map using wmic (Windows).
   * Uses spawn to avoid exec() buffer issues.
   */
  public static getProcessTree(): Promise<Map<number, number>> {
    return new Promise((resolve) => {
      const tree = new Map<number, number>()
      const child = spawn('wmic', ['process', 'get', 'ParentProcessId,ProcessId'], {
        shell: false,
        stdio: ['ignore', 'pipe', 'ignore'],
      })

      let output = ''
      child.stdout?.on('data', (data: Buffer) => { output += data.toString() })

      child.on('close', () => {
        for (const line of output.split('\n')) {
          const parts = line.trim().split(/\s+/)
          if (parts.length === 2) {
            const parentPid = parseInt(parts[0], 10)
            const processId = parseInt(parts[1], 10)
            if (!isNaN(parentPid) && !isNaN(processId)) {
              tree.set(processId, parentPid)
            }
          }
        }
        resolve(tree)
      })

      child.on('error', () => resolve(tree))
    })
  }
}
