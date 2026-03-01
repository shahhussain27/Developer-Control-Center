import { useState, useCallback, useEffect } from 'react'
import {
  Project,
  ProcessState,
  Settings,
  LogEntry,
  ProcessStats,
  SpawnError,
  ProjectType,
} from '../../common/types'

/** Maximum log entries kept in renderer state (per project). */
const RENDERER_LOG_CAP = 500

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [processStates, setProcessStates] = useState<Record<string, ProcessState>>({})
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({})
  const [processStats, setProcessStats] = useState<Record<string, ProcessStats>>({})
  const [settings, setSettings] = useState<Settings>({ scanLocations: [] })
  const [lastError, setLastError] = useState<SpawnError | null>(null)

  // ---------------------------------------------------------------------------
  // Boot: load settings + auto-scan saved locations
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadInitialData = async () => {
      const s = await window.ipc.getSettings()
      setSettings(s)

      for (const loc of s.scanLocations) {
        const detected = await window.ipc.scanDirectory(loc)
        setProjects(prev => {
          const existingPaths = new Set(prev.map((p: Project) => p.path))
          const newProjects = detected.filter((p: Project) => !existingPaths.has(p.path))
          return newProjects.length > 0 ? [...prev, ...newProjects] : prev
        })
      }
    }

    loadInitialData()
  }, [])

  // ---------------------------------------------------------------------------
  // Push subscriptions (process-log, process-stats, process-state)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Streaming log lines — bounded ring-style cap in renderer
    const unsubLog = window.ipc.onLog((log: LogEntry) => {
      setLogs((prev: Record<string, LogEntry[]>) => {
        const existing = prev[log.projectId] ?? []
        // Keep at most RENDERER_LOG_CAP entries — evict oldest
        const next = existing.length >= RENDERER_LOG_CAP
          ? [...existing.slice(existing.length - (RENDERER_LOG_CAP - 1)), log]
          : [...existing, log]
        return { ...prev, [log.projectId]: next }
      })
    })

    // Resource stats
    const unsubStats = window.ipc.onStats((stats: ProcessStats) => {
      setProcessStats((prev: Record<string, ProcessStats>) => ({
        ...prev,
        [stats.projectId]: stats,
      }))
    })

    // Authoritative process state pushes from main process
    const unsubState = window.ipc.onProcessState(
      (payload: { projectId: string } & ProcessState) => {
        const { projectId, ...state } = payload
        setProcessStates((prev: Record<string, ProcessState>) => ({
          ...prev,
          [projectId]: state,
        }))
      },
    )

    // Project data updates (like async size calculation)
    const unsubProjectUpdate = window.ipc.onProjectUpdated?.((updatedProject: Project) => {
      setProjects((prev: Project[]) => {
        const idx = prev.findIndex(p => p.id === updatedProject.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = updatedProject
        return next
      })
    })

    return () => {
      unsubLog()
      unsubStats()
      unsubState()
      if (unsubProjectUpdate) unsubProjectUpdate()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // User Actions
  // ---------------------------------------------------------------------------

  const scan = useCallback(async () => {
    const dir = await window.ipc.selectDirectory()
    if (!dir) return

    setLoading(true)
    try {
      const detected = await window.ipc.scanDirectory(dir)
      setProjects((prev: Project[]) => {
        const existingPaths = new Set(prev.map((p: Project) => p.path))
        const newProjects = detected.filter((p: Project) => !existingPaths.has(p.path))
        return newProjects.length > 0 ? [...prev, ...newProjects] : prev
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const runCommand = useCallback(async (
    projectId: string,
    command: string,
    cwd: string,
    type: ProjectType | string,
  ) => {
    // Optimistic UI: show starting state immediately
    setProcessStates((prev: Record<string, ProcessState>) => ({
      ...prev,
      [projectId]: { pid: null, status: 'starting' },
    }))

    // Clear stale logs for this project session
    setLogs((prev: Record<string, LogEntry[]>) => ({ ...prev, [projectId]: [] }))
    setProcessStats((prev: Record<string, ProcessStats>) => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
    setLastError(null)

    const result = await window.ipc.runCommand(projectId, command, cwd, type as ProjectType)

    if ('error' in result) {
      const err = result.error as SpawnError
      setLastError(err)
      setProcessStates((prev: Record<string, ProcessState>) => ({
        ...prev,
        [projectId]: {
          pid: null,
          status: 'error',
          error: `[${err.code}] ${err.message}`,
        },
      }))
      return
    }

    // Main process will push authoritative state via process-state channel.
    // Set a provisional running state here so the UI is responsive.
    setProcessStates((prev: Record<string, ProcessState>) => ({
      ...prev,
      [projectId]: { pid: result.pid, status: 'running' },
    }))
  }, [])

  const stopCommand = useCallback(async (projectId: string) => {
    await window.ipc.stopCommand(projectId)
    setProcessStates((prev: Record<string, ProcessState>) => ({
      ...prev,
      [projectId]: { pid: null, status: 'stopped' },
    }))
  }, [])

  const refreshStatus = useCallback(async (projectId: string) => {
    const state = await window.ipc.getProcessStatus(projectId)
    setProcessStates((prev: Record<string, ProcessState>) => ({
      ...prev,
      [projectId]: state,
    }))
  }, [])

  const runProfile = useCallback(async (profileId: string, projectId: string) => {
    setProcessStates((prev: Record<string, ProcessState>) => ({
      ...prev,
      [projectId]: { pid: null, status: 'starting' },
    }))
    setLogs((prev: Record<string, LogEntry[]>) => ({ ...prev, [projectId]: [] }))
    setLastError(null)

    try {
      await window.ipc.runProfile(profileId)
      await refreshStatus(projectId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setProcessStates((prev: Record<string, ProcessState>) => ({
        ...prev,
        [projectId]: { pid: null, status: 'error', error: msg },
      }))
    }
  }, [refreshStatus])

  const stopProfile = useCallback(async (profileId: string, projectId: string) => {
    await window.ipc.stopProfile(profileId)
    setProcessStates((prev: Record<string, ProcessState>) => ({
      ...prev,
      [projectId]: { pid: null, status: 'stopped' },
    }))
  }, [])

  return {
    projects,
    setProjects,
    loading,
    processStates,
    logs,
    settings,
    setSettings,
    scan,
    runCommand,
    stopCommand,
    refreshStatus,
    processStats,
    runProfile,
    stopProfile,
    lastError,
  }
}
