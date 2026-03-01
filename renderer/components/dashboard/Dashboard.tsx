import React, { useState } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { FilterBar } from './FilterBar'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { PlusCircle, RefreshCw } from 'lucide-react'
import { Sidebar, ViewType } from '../layout/Sidebar'
import { WindowControls } from '../layout/WindowControls'
import { NetworkView } from '../network/NetworkView'
import { SettingsView } from '../settings/SettingsView'
import { ResourcesView } from '../resources/ResourcesView'
import { PortConflictView } from '@/components/network/PortConflictView'
import { Project } from '../../../common/types'
import { ProjectFilters, DEFAULT_FILTERS } from '../../lib/filterTypes'
import { applyFilters } from '../../lib/projectFilters'

export const Dashboard: React.FC = () => {
  const {
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
    processStats,
    runProfile,
  } = useProjects()

  const [currentView, setCurrentView] = useState<ViewType>('projects')
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [sortMode, setSortMode] = useState<'lastModified' | 'mostUsed'>('lastModified')

  // Pure, no-mutation application of filter state
  const baseFiltered = applyFilters(projects, filters, processStates)
  const filteredProjects = [...baseFiltered].sort((a, b) => {
    if (sortMode === 'lastModified') {
      return (b.lastModified || 0) - (a.lastModified || 0)
    } else {
      const aUsage = settings.projectUsage?.[a.id] || 0
      const bUsage = settings.projectUsage?.[b.id] || 0
      return bUsage - aUsage
    }
  })

  const renderContent = () => {
    switch (currentView) {
      case 'network':
        return (
          <NetworkView
            projects={projects}
            processStates={processStates}
            logs={logs}
            onStop={stopCommand}
          />
        )
      case 'resources':
        return (
          <ResourcesView
            projects={projects}
            processStates={processStates}
            processStats={processStats}
          />
        )
      case 'ports':
        return (
          <PortConflictView
            projects={projects}
          />
        )
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSave={async (s) => {
              setSettings(s)
              await window.ipc.saveSettings(s)
            }}
            onAddLocation={async () => {
              const dirPath = await window.ipc.selectDirectory()
              if (dirPath) {
                const newSettings = { ...settings, scanLocations: [...settings.scanLocations, dirPath] }
                setSettings(newSettings)
                await window.ipc.saveSettings(newSettings)

                const detected = await window.ipc.scanDirectory(dirPath)
                setProjects((prev: Project[]) => {
                  const existingPaths = new Set(prev.map((p: Project) => p.path))
                  const newProjects = detected.filter((p: Project) => !existingPaths.has(p.path))
                  return newProjects.length > 0 ? [...prev, ...newProjects] : prev
                })
              }
            }}
          />
        )

      default: {
        if (projects.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="p-8 rounded-full bg-primary/10 border border-primary/20 shadow-2xl shadow-primary/10">
                <PlusCircle className="w-16 h-16 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Welcome to DCC</h2>
                <p className="text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
                  Your high-performance workspace. Select a project directory to begin orchestration.
                </p>
              </div>
              <Button onClick={scan} size="lg" className="px-10 h-14 text-lg rounded-2xl shadow-xl shadow-primary/20">
                Get Started
              </Button>
            </div>
          )
        }

        return (
          <div className="flex flex-col h-full gap-4">
            {/* Filter bar — scoped to the projects view only */}
            <div
              className="shrink-0"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <FilterBar
                filters={filters}
                onChange={setFilters}
                totalCount={projects.length}
                filteredCount={filteredProjects.length}
                expanded={filterExpanded}
                onToggleExpanded={() => setFilterExpanded((v) => !v)}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
              />
            </div>

            {/* Project grid */}
            <ScrollArea className="flex-1 pr-4">
              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center animate-in fade-in duration-300">
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest">No matching projects</p>
                  <p className="text-white/20 text-xs mt-1">Adjust or clear your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-8">
                  {filteredProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      processState={processStates[project.id] ?? { pid: null, status: 'stopped' }}
                      onRun={runCommand}
                      onStop={stopCommand}
                      onRunProfile={runProfile}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )
      }
    }
  }

  return (
    <div className="flex h-screen bg-[#050505] text-foreground overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — webkit-app-region: drag makes the whole header draggable.
             Interactive child elements must override with webkit-app-region: no-drag */}
        <header
          className="flex items-center justify-between px-6 py-4 border-b border-white/5 glass z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* Left: traffic light window controls + view title */}
          <div
            className="flex items-center gap-4"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowControls />
            <h1 className="text-2xl font-black tracking-tighter uppercase italic opacity-90 ml-3 select-none">
              {currentView === 'projects' ? 'Project HUB' : currentView.toUpperCase()}
            </h1>
          </div>

          {/* Right: action controls */}
          <div
            className="flex items-center gap-3"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {currentView === 'projects' && (
              <Button
                onClick={scan}
                disabled={loading}
                className="h-11 px-6 rounded-xl gap-2 font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95"
              >
                <PlusCircle className="w-5 h-5 font-bold" />
                IMPORT
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
          {renderContent()}
        </main>

        {/* Footer / Status Bar */}
        <footer className="px-10 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="opacity-40">Registry</span>
              <span className="text-foreground">{projects.length} Nodes</span>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
              <span className="opacity-40">Active</span>
              <span className="text-primary">
                {Object.values(processStates).filter(s => s.status === 'running').length} Processes
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Secure
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
