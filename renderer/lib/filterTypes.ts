import { ProcessStatus, ProjectType, Runtime } from '../../common/types'

/**
 * The serialisable filter state. Every field is optional — absent means "all".
 * Derives entirely from project metadata: no synthetic or mocked fields.
 */
export interface ProjectFilters {
  /** Free-text match against project name and path (case-insensitive). */
  search: string
  /** Restrict to a specific projectType. Empty string = all. */
  projectType: ProjectType | ''
  /** Restrict to a specific runtime. Empty string = all. */
  runtime: Runtime | ''
  /** Restrict to projects with a given process status. Empty string = all. */
  status: ProcessStatus | ''
}

/** The canonical empty / reset filter state. */
export const DEFAULT_FILTERS: ProjectFilters = {
  search:      '',
  projectType: '',
  runtime:     '',
  status:      '',
}

/** True when the filter state is equivalent to "show everything". */
export const isFilterEmpty = (f: ProjectFilters): boolean =>
  f.search === '' &&
  f.projectType === '' &&
  f.runtime === '' &&
  f.status === ''
