import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Folder, Activity, Play, Square, ExternalLink, RefreshCw, Code, AlertCircle, Code2, Globe, Box, TerminalSquare, AppWindow, MoreVertical, Terminal, Copy, Globe as GlobeIcon, FileText, AlertTriangle, FolderOpen } from 'lucide-react'
import { Project, ProcessState, IdeInfo, QuickAction } from '../../../common/types'
import { DEFAULT_ACTIONS_BY_PROJECT_TYPE } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { ProfileManager } from '../profiles/ProfileManager'
import { ProjectTypeIcon } from './ProjectTypeIcon'
import { PROJECT_TYPE_LABELS } from '../../lib/projectIcons'
import Image from 'next/image'

interface ProjectCardProps {
  project: Project
  processState: ProcessState
  onRun: (projectId: string, command: string, cwd: string, type: string) => void
  onStop: (projectId: string) => void
  onRunProfile: (profileId: string, projectId: string) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  processState,
  onRun,
  onStop,
  onRunProfile
}) => {
  const [ides, setIdes] = React.useState<IdeInfo[]>([])
  const [quickActions, setQuickActions] = React.useState<QuickAction[]>([])
  const [isIdeMenuOpen, setIsIdeMenuOpen] = React.useState(false)
  const [isQuickActionsMenuOpen, setIsQuickActionsMenuOpen] = React.useState(false)
  const [ideError, setIdeError] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const isRunning = processState.status === 'running'
  const isStarting = processState.status === 'starting'
  const isError = processState.status === 'error'

  React.useEffect(() => {
    window.ipc.quickActionsList?.().then(setQuickActions).catch(console.error)
  }, [])

  const refreshIdes = React.useCallback(async () => {
    try {
      const list = await window.ipc.ideList()
      setIdes(list)
    } catch (e) {
      console.error(e)
    }
  }, [])

  React.useEffect(() => {
    refreshIdes()
  }, [refreshIdes])

  const getIdeIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('code')) return <Image src="/icons/vs-code.svg" alt="VS Code" width={15} height={15} />
    if (lower.includes('webstorm')) return <Image src="/icons/webstorm.svg" alt="WebStorm" width={15} height={15} />
    if (lower.includes('intellij')) return <Image src="/icons/intellij.svg" alt="IntelliJ" width={15} height={15} />
    if (lower.includes('pycharm')) return <Image src="/icons/pycharm.svg" alt="PyCharm" width={15} height={15} />
    if (lower.includes('antigravity')) return <Image src="/icons/antigravity.png" alt="Antigravity" width={15} height={15} />
    return <AppWindow className="w-3.5 h-3.5 text-purple-400" />
  }

  const handleIdeLaunch = async (ide: IdeInfo) => {
    setIsIdeMenuOpen(false)
    setIdeError(null)
    const result = await window.ipc.ideLaunch(ide.path, project.path)
    console.log(result)
    if (result && result.error) {
      setIdeError(`Failed to launch ${result.error.ideName}: ${result.error.message}`)
      setTimeout(() => setIdeError(null), 5000)
    }
  }

  const handleQuickAction = async (action: QuickAction) => {
    setIsQuickActionsMenuOpen(false)
    setActionError(null)

    // Handle view_logs specifically for the UI context
    if (action.id === 'view_logs' && processState.pid) {
      // Assuming a modal exists, but for now we follow the existing pattern
      // You'd typically open the logs modal here if available
      return;
    }

    const result = await window.ipc.quickActionsExecute?.(action.id, project.id)
    if (result && result.error) {
      setActionError(`Action Failed: ${result.error.message}`)
      setTimeout(() => setActionError(null), 5000)
    }
  }

  const evaluateCondition = (action: QuickAction) => {
    // 1. Hide actions that are invalid for this projectType
    const validActions = DEFAULT_ACTIONS_BY_PROJECT_TYPE[project.projectType] || []
    if (!validActions.includes(action.id)) {
      return false
    }

    // 2. Evaluate state-based strict conditions
    if (!action.conditions) return true
    if (action.conditions.requiresRunning && !isRunning) return false
    if (action.conditions.requiresStopped && isRunning) return false
    if (action.conditions.requiresPorts && false /* would sync ports here if available on client, assuming passing for now */) return false
    if (action.conditions.requiresLogs && !processState.lastOutput) return false

    return true
  }

  const resolveIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'FolderOpen': return <FolderOpen className="w-3.5 h-3.5" />
      case 'Terminal': return <Terminal className="w-3.5 h-3.5" />
      case 'Copy': return <Copy className="w-3.5 h-3.5" />
      case 'Code': return <Code className="w-3.5 h-3.5" />
      case 'Play': return <Play className="w-3.5 h-3.5" />
      case 'Square': return <Square className="w-3.5 h-3.5" />
      case 'RefreshCw': return <RefreshCw className="w-3.5 h-3.5" />
      case 'Globe': return <GlobeIcon className="w-3.5 h-3.5" />
      case 'FileText': return <FileText className="w-3.5 h-3.5" />
      case 'AlertTriangle': return <AlertTriangle className="w-3.5 h-3.5" />
      default: return <Activity className="w-3.5 h-3.5" />
    }
  }

  return (
    <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-muted/50 transition-all hover:border-green-500/30 hover:shadow-2xl hover:shadow-green-500/10 group/card">
      <CardHeader className="flex flex-row items-center justify-between px-8 pt-8 pb-4 space-y-0">
        <CardTitle className="text-lg font-black tracking-tight truncate max-w-[200px] group-hover/card:text-green-400 transition-colors duration-300" title={project.name}>
          {project.name}
        </CardTitle>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 border border-white/5">
          {isStarting ? (
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
          ) : (
            <div className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                isError ? "bg-red-500" : "bg-white/20"
            )} />
          )}
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            isRunning ? "text-green-500" :
              isStarting ? "text-blue-400" :
                isError ? "text-red-500" : "text-white/40"
          )}>
            {processState.status}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-8 py-4">
        <div className="space-y-4">
          <div className="group/path cursor-pointer relative overflow-hidden rounded-lg p-2 -mx-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <Folder className="w-3.5 h-3.5 text-green-400 opacity-80" />
              <span className="text-[10px] uppercase font-black text-white/50 tracking-wider group-hover/path:text-green-400/70 transition-colors">Storage Path</span>
            </div>
            <p className="text-xs font-mono text-white/60 truncate group-hover/path:text-green-300 transition-colors">
              {project.path}
            </p>
          </div>

          {isError && processState.lastOutput && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] uppercase font-black text-red-500 tracking-wider">EXECUTION ERROR</span>
              </div>
              <p className="text-[10px] font-mono text-red-400 font-bold leading-relaxed break-words">
                {processState.lastOutput}
              </p>
            </div>
          )}

          {actionError && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] uppercase font-black text-orange-500 tracking-wider">ACTION ERROR</span>
              </div>
              <p className="text-[10px] font-mono text-orange-400 font-bold leading-relaxed break-words">
                {actionError}
              </p>
            </div>
          )}

          {ideError && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] uppercase font-black text-orange-500 tracking-wider">IDE LAUNCH ERROR</span>
              </div>
              <p className="text-[10px] font-mono text-orange-400 font-bold leading-relaxed break-words">
                {ideError}
              </p>
            </div>
          )}

          <div className="flex items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <ProjectTypeIcon type={project.projectType} size={14} className="opacity-60" />
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Engine</span>
              </div>
              <Badge
                variant="outline"
                className="h-6 px-3 bg-white/5 border-white/10 rounded-lg text-[10px] font-bold gap-1.5 flex items-center"
              >
                <ProjectTypeIcon type={project.projectType} size={10} />
                <span>{PROJECT_TYPE_LABELS[project.projectType]}</span>
              </Badge>
            </div>
            {isRunning && (
              <div className="animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-green-500 opacity-60" />
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Process ID</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-green-500 tabular-nums">
                  {processState.pid}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-8 pb-8 pt-2 flex gap-3">
        {isRunning || isStarting ? (
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 h-11 rounded-xl font-bold gap-2 shadow-lg shadow-red-500/10 active:scale-95 transition-transform"
            onClick={() => onStop(project.id)}
            disabled={isStarting}
          >
            <Square className="w-4 h-4 fill-current" />
            TERMINATE
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 h-11 rounded-xl font-bold gap-2 text-white bg-gradient-to-r from-purple-600/90 to-green-600/90 hover:from-purple-500 hover:to-green-500 shadow-lg shadow-green-500/20 active:scale-95 transition-all border border-green-400/30"
            onClick={() => onRun(project.id, '', project.path, project.projectType)}
          >
            <Play className="w-4 h-4 fill-current drop-shadow-md" />
            <span className="tracking-wide">INITIALIZE</span>
          </Button>
        )}
        <ProfileManager
          projectId={project.id}
          onRunProfile={(profileId) => onRunProfile(profileId, project.id)}
        />

        {/* Quick Actions Menu */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className={cn("h-11 w-11 rounded-xl border-white/10 transition-all active:scale-95", isQuickActionsMenuOpen ? "bg-white/10" : "bg-white/5 hover:bg-white/10")}
            onClick={() => setIsQuickActionsMenuOpen(!isQuickActionsMenuOpen)}
          >
            <MoreVertical className="w-4 h-4 opacity-60" />
          </Button>

          {isQuickActionsMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#151515] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-2 border-b border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2">Quick Actions</span>
              </div>
              <div className="p-1 flex flex-col max-h-48 overflow-y-auto custom-scrollbar">
                {quickActions.filter(evaluateCondition).map((action) => (
                  <button
                    key={action.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 rounded-lg transition-colors text-left",
                      action.id === 'kill_process' || action.id === 'stop_project' ? 'text-red-400 hover:text-red-300' : 'text-white/80'
                    )}
                    onClick={() => handleQuickAction(action)}
                  >
                    {resolveIcon(action.icon)}
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* IDE Menu */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className={cn("h-11 w-11 rounded-xl border-white/10 transition-all active:scale-95", isIdeMenuOpen ? "bg-white/10" : "bg-white/5 hover:bg-white/10")}
            onClick={() => setIsIdeMenuOpen(!isIdeMenuOpen)}
          >
            <ExternalLink className="w-4 h-4 opacity-60" />
          </Button>

          {isIdeMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#151515] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2">Open With</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={(e) => { e.stopPropagation(); refreshIdes(); }}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              <div className="p-1 flex flex-col max-h-48 overflow-y-auto custom-scrollbar">
                {ides.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">No IDEs Found</span>
                  </div>
                ) : ides.map((ide, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg transition-colors text-left"
                    onClick={() => handleIdeLaunch(ide)}
                  >
                    {getIdeIcon(ide.name)}
                    <span className="truncate">{ide.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
