import React, { useState, useEffect, useRef } from 'react'
import { Project, ProcessState, LogEntry } from '../../../common/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { Terminal, Activity, Server, Hash, Clock, XCircle, ChevronRight, SquareTerminal } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import AnsiToHtml from 'ansi-to-html'

const ansiConverter = new AnsiToHtml({
  newline: true,
  escapeXML: true
})

interface NetworkViewProps {
  projects: Project[]
  processStates: Record<string, ProcessState>
  logs: Record<string, LogEntry[]>
  onStop: (projectId: string) => void
}

export const NetworkView: React.FC<NetworkViewProps> = ({ projects, processStates, logs, onStop }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Interactive Console State
  const [inputValue, setInputValue] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const runningProjects = projects.filter(p => processStates[p.id]?.status === 'running')
  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const activeLogs = selectedProjectId ? logs[selectedProjectId] || [] : []

  // Split logs logic
  const activeAppLogs = activeLogs.filter(log => log.type === 'stdout' || log.type === 'stderr')
  const activeShellLogs = activeLogs.filter(log => log.type === 'shell-stdout' || log.type === 'shell-stderr')

  const shellScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeAppLogs])

  useEffect(() => {
    if (shellScrollRef.current) {
      shellScrollRef.current.scrollTop = shellScrollRef.current.scrollHeight
    }
  }, [activeShellLogs])

  // Spawn shell when project is selected
  useEffect(() => {
    if (selectedProject) {
      window.ipc.startInteractiveShell(selectedProject.id, selectedProject.path)
        .catch(err => console.error('Failed to start shell:', err))
    }
  }, [selectedProject])

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !selectedProject) return
    try {
      await window.ipc.sendShellInput(selectedProject.id, inputValue)
      setCommandHistory(prev => [...prev, inputValue])
      setHistoryIndex(-1)
      setInputValue('')
    } catch (err) {
      console.error('Failed to send shell input:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(nextIndex)
        setInputValue(commandHistory[commandHistory.length - 1 - nextIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        setInputValue(commandHistory[commandHistory.length - 1 - nextIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInputValue('')
      }
    }
  }

  // Focus input when project selected
  useEffect(() => {
    if (selectedProjectId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [selectedProjectId])

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-hidden">
        {/* Active Processes List */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden bg-card/50 border-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Active Processes
            </CardTitle>
            <CardDescription>Currently running project services</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {runningProjects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No active processes
                  </div>
                ) : (
                  runningProjects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedProjectId === p.id
                        ? "bg-primary/10 border-primary/50"
                        : "bg-muted/20 border-transparent hover:border-muted/50"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm truncate max-w-[150px]">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">
                          {p.projectType.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                        <div className="flex items-center gap-1 text-green-500">
                          <Hash className="w-3 h-3" />
                          PID: {processStates[p.id]?.pid}
                        </div>
                        <div className="flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          8888
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Real-time Logs Console */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
          {/* Real-time App Logs Console */}
          <Card className="flex flex-col flex-1 overflow-hidden bg-black/40 border-muted/50">
            <CardHeader className="flex flex-row items-center justify-between border-b border-muted/30 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Terminal className="w-5 h-5 text-primary" />
                  Application Logs
                </CardTitle>
                <CardDescription>
                  {selectedProject ? `Runtime output for ${selectedProject.name}` : 'Select a process to view logs'}
                </CardDescription>
              </div>
              {selectedProject && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onStop(selectedProject.id)}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Terminate
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-black/90 relative">
              {!selectedProjectId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30">
                  <Terminal className="w-16 h-16 mb-2 opacity-20" />
                  <span className="text-sm font-mono tracking-widest uppercase">System Idle</span>
                </div>
              ) : (
                <div ref={scrollRef} className="h-full overflow-y-auto p-4 font-mono text-xs scroll-smooth">
                  {activeAppLogs.length === 0 ? (
                    <div className="opacity-30 italic">Waiting for application output...</div>
                  ) : (
                    activeAppLogs.map((log, i) => (
                      <div key={i} className={`mb-1 flex gap-3 ${log.type === 'stderr' ? 'text-red-400' : 'text-emerald-400/90'}`}>
                        <span className="opacity-30 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span
                          className="whitespace-pre-wrap break-all inline-block break-words"
                          dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(log.data) }}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactive Shell Console */}
          <Card className="flex flex-col h-[300px] overflow-hidden bg-black/40 border-muted/50">
            <CardHeader className="border-b border-muted/30 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <SquareTerminal className="w-4 h-4 text-primary" />
                Interactive Terminal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-black/95 relative flex flex-col">
              {!selectedProjectId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground/30">
                  <span className="text-xs font-mono uppercase tracking-widest">Select project to open terminal</span>
                </div>
              ) : (
                <>
                  <div ref={shellScrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs scroll-smooth">
                    {activeShellLogs.map((log, i) => (
                      <div key={i} className={`mb-1 flex gap-2 ${log.type === 'shell-stderr' ? 'text-red-400' : 'text-zinc-300'}`}>
                        <span
                          className="whitespace-pre-wrap break-all inline-block break-words"
                          dangerouslySetInnerHTML={{ __html: ansiConverter.toHtml(log.data) }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Interactive Console Input */}
                  <div className="border-t border-muted/30 p-2 bg-black shrink-0">
                    <form onSubmit={handleCommandSubmit} className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a manual command..."
                        className="flex-1 bg-transparent border-none text-sm font-mono text-emerald-400 focus:outline-none placeholder:text-muted-foreground/30"
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </form>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
