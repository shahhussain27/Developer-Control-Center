import { Project, ProcessState } from '../../common/types'
import { ProjectFilters } from './filterTypes'

/**
 * Applies all active filters to a project list.
 *
 * Rules:
 * - Pure function — never mutates the input array or any project object.
 * - Derives entirely from existing project metadata + processStates map.
 * - Absent / empty filter fields are treated as "match all".
 * - Search is case-insensitive substring match on name and path.
 * - Status filter requires a processStates lookup; treated as "stopped" when
 *   no entry exists (i.e. process has never been started).
 */
export const applyFilters = (
  projects: Project[],
  filters: ProjectFilters,
  processStates: Record<string, ProcessState>,
): Project[] => {
  const searchLower = filters.search.toLowerCase()

  return projects.filter((project) => {
    // --- Search (name + path) ---
    if (searchLower !== '') {
      const nameMatch = project.name.toLowerCase().includes(searchLower)
      const pathMatch = project.path.toLowerCase().includes(searchLower)
      if (!nameMatch && !pathMatch) return false
    }

    // --- Project Type ---
    if (filters.projectType !== '' && project.projectType !== filters.projectType) {
      return false
    }

    // --- Runtime ---
    if (filters.runtime !== '' && project.runtime !== filters.runtime) {
      return false
    }

    // --- Status ---
    if (filters.status !== '') {
      const state = processStates[project.id]
      const effectiveStatus = state?.status ?? 'stopped'
      if (effectiveStatus !== filters.status) return false
    }

    return true
  })
}

/**
 * Derives the sorted unique set of project types present in the list.
 * Used to populate the type filter dropdown with only relevant options.
 */
export const getAvailableProjectTypes = (projects: Project[]): string[] =>
  Array.from(new Set(projects.map((p) => p.projectType))).sort()

/**
 * Derives the sorted unique set of runtimes present in the list.
 */
export const getAvailableRuntimes = (projects: Project[]): string[] =>
  Array.from(new Set(projects.map((p) => p.runtime))).sort()
