import React, { useState, useEffect, useCallback } from 'react'
import { Zap, RefreshCw, Trash2, ExternalLink, AlertCircle, ShieldCheck, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Input } from '../ui/input'
import { PortInfo, Project } from '../../../common/types'
import { cn } from '../../lib/utils'

interface PortConflictViewProps {
  projects: Project[]
}

export const PortConflictView: React.FC<PortConflictViewProps> = ({ projects }) => {
  const [ports, setPorts] = useState<PortInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchPorts = useCallback(async () => {
    setLoading(true)
    try {
      const activePorts = await window.ipc.getActivePorts()
      setPorts(activePorts)
    } catch (error) {
      console.error('Failed to fetch ports:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPorts()
    // Periodic refresh
    const interval = setInterval(fetchPorts, 10000)
    return () => clearInterval(interval)
  }, [fetchPorts])

  const handleKill = async (pid: number) => {
    if (confirm(`Are you sure you want to terminate process ${pid}?`)) {
      try {
        await window.ipc.killProcessByPid(pid)
        await fetchPorts()
      } catch (error) {
        alert('Failed to terminate process.')
      }
    }
  }

  const filteredPorts = ports.filter(p => 
    p.port.toString().includes(searchTerm) ||
    p.pid.toString().includes(searchTerm) ||
    p.processName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.port - b.port)

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic opacity-90 flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
            Port Resolver
          </h2>
          <p className="text-muted-foreground mt-2 text-sm font-medium opacity-60">
            Monitor active ports and resolve project execution conflicts.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
            <Input 
              placeholder="Search ports, PIDs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary/40 text-xs"
            />
          </div>
          <Button 
            onClick={fetchPorts} 
            disabled={loading}
            variant="outline"
            className="h-10 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all font-bold text-xs gap-2"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            REFRESH
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card/20 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div className="col-span-2">Port & Protocol</div>
          <div className="col-span-2">Process ID</div>
          <div className="col-span-4">Identification</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredPorts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                <ShieldCheck className="w-16 h-16 mb-4" />
                <p className="text-lg font-bold tracking-tight">System is Clear</p>
                <p className="text-xs uppercase font-black tracking-widest mt-1">No active port conflicts detected</p>
              </div>
            ) : (
              filteredPorts.map((portInfo) => (
                <div 
                  key={`${portInfo.port}-${portInfo.pid}`}
                  className="grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="text-xs font-black text-primary">{portInfo.port}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">TCP / IP</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <code className="text-[11px] font-mono font-bold text-white/60 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                      PID: {portInfo.pid}
                    </code>
                  </div>

                  <div className="col-span-4 flex items-center gap-3">
                    {portInfo.projectId ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                          {portInfo.projectName}
                        </span>
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Active Project</span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white/60 truncate max-w-[150px]">
                          {portInfo.processName || 'Unknown Process'}
                        </span>
                        <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">External System</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-center">
                    {portInfo.state === 'LISTENING' ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-black rounded-lg py-1 px-3">
                        LISTENING
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-black rounded-lg py-1 px-3">
                        {portInfo.state}
                      </Badge>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end gap-2">
                    {portInfo.projectId && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-lg hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
                        title="Focus Project"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      onClick={() => handleKill(portInfo.pid)}
                      size="icon" 
                      className="h-9 w-9 rounded-lg hover:bg-red-500/20 text-red-500/60 hover:text-red-500 transition-all active:scale-95"
                      title="Kill Process"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex gap-6">
        <Card className="flex-1 bg-primary/5 border-primary/20 rounded-3xl overflow-hidden glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Conflict Awareness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              If a project fails to start with <span className="text-primary font-bold">EADDRINUSE</span>, identify the conflicting PID above and terminate it. Always verify the process name before killing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
