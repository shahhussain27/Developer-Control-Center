import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Folder, Activity, Play, Square, ExternalLink, RefreshCw } from 'lucide-react'
import { Project, ProcessState } from '../../../common/types'
import { cn } from '../../lib/utils'
import { ProfileManager } from '../profiles/ProfileManager'
import { ProjectTypeIcon } from './ProjectTypeIcon'
import { PROJECT_TYPE_LABELS } from '../../lib/projectIcons'

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
  const isRunning = processState.status === 'running'
  const isStarting = processState.status === 'starting'
  const isError = processState.status === 'error'

  return (
    <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-muted/50 transition-all hover:border-primary/50">
      <CardHeader className="flex flex-row items-center justify-between px-8 pt-8 pb-4 space-y-0">
        <CardTitle className="text-lg font-bold truncate max-w-[200px]" title={project.name}>
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
            <div className="group/path cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <Folder className="w-3.5 h-3.5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Storage Path</span>
              </div>
              <p className="text-xs font-mono text-white/60 truncate group-hover/path:text-primary transition-colors">
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
              className="flex-1 h-11 rounded-xl font-bold gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-transform"
              onClick={() => onRun(project.id, '', project.path, project.projectType)}
            >
              <Play className="w-4 h-4 fill-current" />
              INITIALIZE
            </Button>
          )}
          <ProfileManager 
            projectId={project.id} 
            onRunProfile={(profileId) => onRunProfile(profileId, project.id)} 
          />
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95">
            <ExternalLink className="w-4 h-4 opacity-60" />
          </Button>
        </CardFooter>
      </Card>
  )
}
