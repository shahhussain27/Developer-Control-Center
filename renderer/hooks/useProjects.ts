import { useState, useCallback, useEffect, useRef } from 'react'
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

/** Returns a deduped array of projects keeping the last entry for each unique path. */
const dedupByPath = (projects: Project[]): Project[] => {
  const map = new Map<string, Project>()
  for (const p of projects) {
    map.set(p.path, p)
  }
  return Array.from(map.values())
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [processStates, setProcessStates] = useState<Record<string, ProcessState>>({})
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({})
  const [processStats, setProcessStats] = useState<Record<string, ProcessStats>>({})
  const [settings, setSettings] = useState<Settings>({ scanLocations: [] })
  const [lastError, setLastError] = useState<SpawnError | null>(null)
  const isSelectingPath = useRef(false)

  // ---------------------------------------------------------------------------
  // Boot: load settings + auto-scan saved locations
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadInitialData = async () => {
      const s = await window.ipc.getSettings()
      setSettings(s)

      // Accumulate all projects across all locations in one pass, then dedup by path.
      // This avoids incremental setState merges that can produce duplicates when
      // the same project folder is a sub-path of multiple scan locations.
      const allDetected: Project[] = []
      for (const loc of s.scanLocations) {
        const detected = await window.ipc.scanDirectory(loc)
        allDetected.push(...detected)
      }
      setProjects(dedupByPath(allDetected))
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
    if (isSelectingPath.current) return
    isSelectingPath.current = true
    try {
      const dir = await window.ipc.selectDirectory()
      if (!dir) return

      setLoading(true)
      try {
        const s = await window.ipc.getSettings()
        const newScanLocs = Array.from(new Set([...s.scanLocations, dir]))
        s.scanLocations = newScanLocs
        await window.ipc.saveSettings(s)
        setSettings(s)

        let allDetected: Project[] = []
        for (const loc of newScanLocs) {
          const detected = await window.ipc.scanDirectory(loc)
          allDetected = [...allDetected, ...detected]
        }
        setProjects(allDetected)
      } finally {
        setLoading(false)
      }
    } finally {
      isSelectingPath.current = false
    }
  }, [])

  const refreshLocations = useCallback(async () => {
    try {
      const s = await window.ipc.getSettings()
      setSettings(s)
      const allDetected: Project[] = []
      for (const loc of s.scanLocations) {
        const detected = await window.ipc.scanDirectory(loc)
        allDetected.push(...detected)
      }
      setProjects(dedupByPath(allDetected))
    } catch (e) {
      console.error('Failed to silently refresh project locations:', e)
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
    refreshLocations,
    runCommand,
    stopCommand,
    refreshStatus,
    processStats,
    runProfile,
    stopProfile,
    lastError,
  }
}
