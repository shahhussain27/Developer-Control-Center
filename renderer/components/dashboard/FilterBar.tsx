import React from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ProjectFilters, isFilterEmpty, DEFAULT_FILTERS } from '../../lib/filterTypes'
import { ProjectTypeIcon } from './ProjectTypeIcon'
import { PROJECT_TYPE_LABELS } from '../../lib/projectIcons'
import { ProjectType, ProcessStatus, Runtime } from '../../../common/types'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// Option definitions — derived from shared types, not hardcoded strings
// ---------------------------------------------------------------------------

const PROJECT_TYPE_OPTIONS: ProjectType[] = [
  'nextjs', 'react', 'nextron', 'electron', 'node', 'python', 'unity', 'unreal', 'generic',
]

const RUNTIME_OPTIONS: Runtime[] = ['node', 'python', 'unity', 'unreal']

const STATUS_OPTIONS: ProcessStatus[] = ['running', 'starting', 'stopped', 'error']

const STATUS_COLORS: Record<ProcessStatus, string> = {
  running: 'text-green-400',
  starting: 'text-blue-400',
  stopped: 'text-white/40',
  error: 'text-red-400',
}

// ---------------------------------------------------------------------------
// Sub-component: SelectChip — a pill-style toggle button
// ---------------------------------------------------------------------------

interface SelectChipProps<T extends string> {
  value: T
  active: boolean
  onToggle: (v: T | '') => void
  children: React.ReactNode
  className?: string
}

function SelectChip<T extends string>({
  value,
  active,
  onToggle,
  children,
  className,
}: SelectChipProps<T>) {
  return (
    <button
      type="button"
      onClick={() => onToggle(active ? '' : value)}
      className={cn(
        'h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5',
        active
          ? 'bg-primary text-primary-foreground border-primary/80 shadow-md shadow-primary/20'
          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80',
        className,
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// FilterSection — labelled group of chips
// ---------------------------------------------------------------------------

interface FilterSectionProps {
  label: string
  children: React.ReactNode
}

const FilterSection: React.FC<FilterSectionProps> = ({ label, children }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-[9px] uppercase font-black tracking-widest text-white/30 w-14 shrink-0">
      {label}
    </span>
    {children}
  </div>
)

// ---------------------------------------------------------------------------
// FilterBar (main export)
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters: ProjectFilters
  onChange: (filters: ProjectFilters) => void
  /** Total projects count, displayed alongside the result count. */
  totalCount: number
  /** Filtered results count shown in the result indicator. */
  filteredCount: number
  /** Whether the filter panel is expanded. */
  expanded: boolean
  onToggleExpanded: () => void
  sortMode: 'lastModified' | 'mostUsed'
  onSortModeChange: (mode: 'lastModified' | 'mostUsed') => void
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  totalCount,
  filteredCount,
  expanded,
  onToggleExpanded,
  sortMode,
  onSortModeChange,
}) => {
  const empty = isFilterEmpty(filters)

  const setField = <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K],
  ) => onChange({ ...filters, [key]: value })

  const reset = () => onChange({ ...DEFAULT_FILTERS })

  const activeFilterCount = [
    filters.projectType !== '',
    filters.runtime !== '',
    filters.status !== '',
    filters.search !== '',
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-3">
      {/* ---- Top row: search + toggle ---- */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Search by name or path…"
            value={filters.search}
            onChange={(e) => setField('search', e.target.value)}
            className="pl-9 h-9 bg-white/5 border-white/10 rounded-xl text-sm focus:ring-primary/30 focus:bg-white/8 transition-all"
          />
          {filters.search !== '' && (
            <button
              type="button"
              onClick={() => setField('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleExpanded}
          className={cn(
            'h-9 px-4 rounded-xl gap-2 border-white/10 transition-all',
            expanded ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-white/5 text-white/50',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-wider">Filters</span>
          {activeFilterCount > 0 && (
            <Badge className="ml-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Result count */}
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest whitespace-nowrap">
          {empty
            ? `${totalCount} projects`
            : <span>
              <span className="text-primary">{filteredCount}</span>
              {' / '}{totalCount}
            </span>
          }
        </div>

        {/* Clear all */}
        {!empty && (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] font-bold text-white/30 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        {/* Sort Toggle */}
        <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5 ml-auto">
          <button
            onClick={() => onSortModeChange('lastModified')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sortMode === 'lastModified' ? "bg-primary text-primary-foreground shadow-sm" : "text-white/40 hover:text-white/80"
            )}
          >
            Recent
          </button>
          <button
            onClick={() => onSortModeChange('mostUsed')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sortMode === 'mostUsed' ? "bg-primary text-primary-foreground shadow-sm" : "text-white/40 hover:text-white/80"
            )}
          >
            Frequent
          </button>
        </div>
      </div>

      {/* ---- Expanded filter panel ---- */}
      {expanded && (
        <div
          className={cn(
            'p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3',
            'animate-in fade-in slide-in-from-top-2 duration-150',
          )}
        >
          {/* Project Type chips */}
          <FilterSection label="Type">
            {PROJECT_TYPE_OPTIONS.map((type) => (
              <SelectChip<ProjectType>
                key={type}
                value={type}
                active={filters.projectType === type}
                onToggle={(v) => setField('projectType', v as ProjectType | '')}
              >
                <ProjectTypeIcon type={type} size={11} />
                {PROJECT_TYPE_LABELS[type]}
              </SelectChip>
            ))}
          </FilterSection>

          {/* Runtime chips */}
          <FilterSection label="Runtime">
            {RUNTIME_OPTIONS.map((rt) => (
              <SelectChip<Runtime>
                key={rt}
                value={rt}
                active={filters.runtime === rt}
                onToggle={(v) => setField('runtime', v as Runtime | '')}
              >
                {rt.toUpperCase()}
              </SelectChip>
            ))}
          </FilterSection>

          {/* Status chips */}
          <FilterSection label="Status">
            {STATUS_OPTIONS.map((status) => (
              <SelectChip<ProcessStatus>
                key={status}
                value={status}
                active={filters.status === status}
                onToggle={(v) => setField('status', v as ProcessStatus | '')}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block', {
                  'bg-green-500': status === 'running',
                  'bg-blue-400': status === 'starting',
                  'bg-white/20': status === 'stopped',
                  'bg-red-500': status === 'error',
                })} />
                <span className={filters.status === status ? '' : STATUS_COLORS[status]}>
                  {status}
                </span>
              </SelectChip>
            ))}
          </FilterSection>
        </div>
      )}
    </div>
  )
}
