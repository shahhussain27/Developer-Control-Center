import React from 'react'
import { Project, ProcessState, ProcessStats } from '../../../common/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Progress } from '@/components/ui/progress'
import { Activity, Cpu, HardDrive, Hash, AlertCircle } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'

interface ResourcesViewProps {
  projects: Project[]
  processStates: Record<string, ProcessState>
  processStats: Record<string, ProcessStats>
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({ projects, processStates, processStats }) => {
  const runningProjects = projects.filter(p => processStates[p.id]?.status === 'running')

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tightest">SYSTEM RESOURCES</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Process Monitoring Engine</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Monitoring Active</span>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {runningProjects.length === 0 ? (
            <Card className="col-span-full py-20 bg-card/50 border-dashed border-muted/50 flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No active processes to monitor</p>
            </Card>
          ) : (
            runningProjects.map(p => {
              const stats = processStats[p.id]
              const cpu = stats?.cpu || 0
              const memory = stats?.memory || 0

              return (
                <Card key={p.id} className="bg-card/40 backdrop-blur-md border-muted/50 overflow-hidden group hover:border-primary/30 transition-all">
                  <CardHeader className="pb-4 border-b border-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-sm font-black truncate">{p.name}</CardTitle>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        PID: {processStates[p.id]?.pid}
                      </span>
                    </div>
                    <CardDescription className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 font-mono">
                      <Activity className="w-3 h-3" />
                      Runtime: {p.runtime}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* CPU Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">CPU Usage</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-400">{cpu.toFixed(1)}%</span>
                      </div>
                      <Progress value={cpu} className="h-1.5 bg-blue-400/10" indicatorClassName="bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.4)]" />
                    </div>

                    {/* Memory Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Memory Usage</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">{memory.toFixed(1)} MB</span>
                      </div>
                      <Progress value={Math.min((memory / 2048) * 100, 100)} className="h-1.5 bg-emerald-400/10" indicatorClassName="bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]" />
                      <p className="text-[9px] text-white/30 font-mono text-right">Relative to 2GB</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-muted/30">
                       <div className="flex items-center gap-1.5">
                         <Hash className="w-3 h-3 text-white/30" />
                         <span className="text-[9px] font-mono text-white/30 uppercase">{p.projectType}</span>
                       </div>
                       <span className="text-[9px] font-mono text-white/30">
                         {stats ? new Date(stats.timestamp).toLocaleTimeString() : '--:--:--'}
                       </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
