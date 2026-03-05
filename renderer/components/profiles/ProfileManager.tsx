import React, { useState, useEffect } from 'react'
import {
  Plus, Trash2, Play, Settings2, Save, X, Info, ChevronRight,
  Zap, Terminal, Clock, BookOpen, Layers, ArrowDown, HelpCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { StartupProfile, StartupCommand } from '../../../common/types'

interface ProfileManagerProps {
  projectId: string
  onRunProfile: (profileId: string) => void
}

// ─── Example profile templates shown to new users ───────────────────────────
const EXAMPLE_PROFILES = [
  {
    name: 'Web Dev Setup',
    description: 'Start all tools for Next.js / MERN development.',
    icon: '🌐',
    steps: ['npm → run dev', 'open → localhost:3000']
  },
  {
    name: 'Full-Stack Debug',
    description: 'Run frontend, backend, and open dev tools together.',
    icon: '🐛',
    steps: ['node → server.js', 'npm → run dev']
  },
  {
    name: 'Game Dev Setup',
    description: 'Prepare Unity development environment quickly.',
    icon: '🎮',
    steps: ['code → .', 'start → unity']
  }
]

// ─── Tooltip (Native via title attribute constraint)
const Tip = React.forwardRef<HTMLElement, { text: string; children: React.ReactElement }>(({ text, children, ...props }, ref) => {
  return React.cloneElement(children, {
    title: text,
    ...props,
    ref: (node: HTMLElement) => {
      // Handle both the forwarded ref and the child's own ref if it has one
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLElement>).current = node

      const childRef = (children as any).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef) childRef.current = node
    }
  })
})
Tip.displayName = 'Tip'

export const ProfileManager: React.FC<ProfileManagerProps> = ({ projectId, onRunProfile }) => {
  const [profiles, setProfiles] = useState<StartupProfile[]>([])
  const [editingProfile, setEditingProfile] = useState<StartupProfile | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [runningId, setRunningId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) loadProfiles()
  }, [isOpen, projectId])

  const loadProfiles = async () => {
    const data = await window.ipc.getProfiles(projectId)
    setProfiles(data)
  }

  const handleCreateProfile = () => {
    const newProfile: StartupProfile = {
      id: Math.random().toString(36).substring(2, 11),
      projectId,
      name: 'My Profile',
      description: '',
      commands: []
    }
    setEditingProfile(newProfile)
  }

  const handleAddCommand = () => {
    if (!editingProfile) return
    const newCommand: StartupCommand = {
      id: Math.random().toString(36).substring(2, 11),
      label: '',
      command: '',
      args: [],
      delayMs: 0
    }
    setEditingProfile({ ...editingProfile, commands: [...editingProfile.commands, newCommand] })
  }

  const handleUpdateCommand = (cmdId: string, updates: Partial<StartupCommand>) => {
    if (!editingProfile) return
    setEditingProfile({
      ...editingProfile,
      commands: editingProfile.commands.map(cmd => cmd.id === cmdId ? { ...cmd, ...updates } : cmd)
    })
  }

  const handleRemoveCommand = (cmdId: string) => {
    if (!editingProfile) return
    setEditingProfile({ ...editingProfile, commands: editingProfile.commands.filter(cmd => cmd.id !== cmdId) })
  }

  const handleSaveProfile = async () => {
    if (!editingProfile) return
    await window.ipc.saveProfile(editingProfile)
    setEditingProfile(null)
    loadProfiles()
  }

  const handleDeleteProfile = async (profileId: string) => {
    await window.ipc.deleteProfile(profileId)
    loadProfiles()
  }

  const handleRun = async (profileId: string) => {
    console.log(profileId)
    setRunningId(profileId)
    onRunProfile(profileId)
    setIsOpen(false)
    setTimeout(() => setRunningId(null), 2000)
  }

  const totalSteps = (p: StartupProfile) => p.commands.length
  const hasDelay = (p: StartupProfile) => p.commands.some(c => (c.delayMs ?? 0) > 0)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Tip text="Startup Profiles — launch multiple tools & commands with one click">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
          >
            <Settings2 className="w-4 h-4 opacity-60" />
          </Button>
        </Tip>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[660px] bg-[#0e0e0e] border-white/10 max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight">Startup Profiles</DialogTitle>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5">
                  Automated launch sequences for this project
                </p>
              </div>
            </div>
            <Tip text="Toggle the info panel">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-white/30 hover:text-white"
                onClick={() => setShowInfo(v => !v)}
              >
                <Info className="w-4 h-4" />
              </Button>
            </Tip>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

          {/* ── Info / Onboarding Panel ─────────────────────────── */}
          {showInfo && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest">What are Startup Profiles?</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                A <span className="text-white font-semibold">Startup Profile</span> is a saved sequence of shell commands that launches automatically when you click <span className="text-primary font-semibold">Run</span>. Use them to start your dev server, open tools, or kick off scripts — all in one click.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {EXAMPLE_PROFILES.map(ex => (
                  <div key={ex.name} className="bg-black/30 border border-white/5 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{ex.icon}</span>
                      <span className="text-[10px] font-black text-white/80">{ex.name}</span>
                    </div>
                    <p className="text-[9px] text-white/40 leading-relaxed">{ex.description}</p>
                    <div className="space-y-0.5 pt-1">
                      {ex.steps.map(s => (
                        <div key={s} className="flex items-center gap-1.5 text-[9px] font-mono text-primary/70">
                          <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2.5 text-[10px] text-white/40">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400/60" />
                <span>Each step runs sequentially. Add a <span className="text-white/60 font-semibold">delay</span> between steps if a service needs time to start before the next one.</span>
              </div>
            </div>
          )}

          {!editingProfile ? (
            <div className="space-y-4">
              {/* ── Header row ───────────────────────────────────── */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  {profiles.length === 0 ? 'No profiles yet' : `${profiles.length} Profile${profiles.length !== 1 ? 's' : ''}`}
                </span>
                <Tip text="Create a new startup sequence for this project">
                  <Button
                    onClick={handleCreateProfile}
                    size="sm"
                    className="gap-2 h-9 rounded-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    New Profile
                  </Button>
                </Tip>
              </div>

              {/* ── Empty state ───────────────────────────────────── */}
              {profiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-xl gap-4 text-center animate-in fade-in duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-primary/40" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/40">No Startup Profiles</p>
                    <p className="text-xs text-white/20 mt-1 max-w-[260px]">
                      Create a profile to launch your dev server, open tools, or run scripts automatically.
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateProfile}
                    size="sm"
                    variant="outline"
                    className="gap-2 border-white/10 hover:bg-white/10 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Your First Profile
                  </Button>
                </div>
              )}

              {/* ── Profile list ──────────────────────────────────── */}
              <div className="grid gap-3">
                {profiles.map(profile => (
                  <Card
                    key={profile.id}
                    className="p-4 bg-white/[0.03] border-white/5 hover:border-primary/30 transition-all group rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-black text-sm truncate">{profile.name}</h4>
                          {hasDelay(profile) && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black border-yellow-500/30 text-yellow-500/70 bg-yellow-500/5">
                              TIMED
                            </Badge>
                          )}
                        </div>
                        {profile.description && (
                          <p className="text-[11px] text-white/40 leading-relaxed truncate mb-2">
                            {profile.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-white/30 font-bold uppercase">
                          <span className="flex items-center gap-1">
                            <Terminal className="w-2.5 h-2.5" />
                            {totalSteps(profile)} step{totalSteps(profile) !== 1 ? 's' : ''}
                          </span>
                          {hasDelay(profile) && (
                            <span className="flex items-center gap-1 text-yellow-500/50">
                              <Clock className="w-2.5 h-2.5" />
                              Delays configured
                            </span>
                          )}
                        </div>
                        {/* Step preview */}
                        {profile.commands.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {profile.commands.slice(0, 3).map((cmd, i) => (
                              <div key={cmd.id} className="flex items-center gap-1.5 text-[9px] font-mono text-white/30">
                                <span className="text-primary/40">{i + 1}.</span>
                                <span className="truncate">{cmd.label || `${cmd.command} ${cmd.args.join(' ')}`.trim() || 'Empty step'}</span>
                                {(cmd.delayMs ?? 0) > 0 && (
                                  <span className="text-yellow-500/40 shrink-0">+{cmd.delayMs}ms delay</span>
                                )}
                              </div>
                            ))}
                            {profile.commands.length > 3 && (
                              <div className="text-[9px] text-white/20">+{profile.commands.length - 3} more steps…</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <Tip text="Run this profile — executes all steps in sequence">
                          <Button
                            size="sm"
                            className="h-9 px-3 gap-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 font-black rounded-lg active:scale-95 transition-transform text-xs"
                            onClick={() => handleRun(profile.id)}
                            disabled={runningId === profile.id}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {runningId === profile.id ? 'Launching…' : 'Run'}
                          </Button>
                        </Tip>
                        <Tip text="Edit this profile">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-white/30 hover:text-white rounded-lg hover:bg-white/10"
                            onClick={() => setEditingProfile(profile)}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                        </Tip>
                        <Tip text="Delete this profile permanently">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                            onClick={() => handleDeleteProfile(profile.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </Tip>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* ── Edit / Create Profile ──────────────────────────── */
            <div className="space-y-5">
              {/* Profile name + description */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Profile name (e.g. Web Dev Setup)"
                    value={editingProfile.name}
                    onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    className="flex-1 h-11 bg-white/5 border-white/10 rounded-xl font-bold focus:ring-primary/50"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingProfile(null)}
                    className="h-11 w-11 rounded-xl shrink-0"
                  >
                    <X className="w-5 h-5 opacity-40" />
                  </Button>
                </div>
                <Input
                  placeholder="Description (optional) — what does this profile launch?"
                  value={editingProfile.description ?? ''}
                  onChange={e => setEditingProfile({ ...editingProfile, description: e.target.value })}
                  className="h-10 bg-white/3 border-white/5 rounded-xl text-sm text-white/60 focus:ring-primary/30"
                />
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Execution Steps</h4>
                    <Tip text="Steps run sequentially, top to bottom. Use delay to wait between them.">
                      <HelpCircle className="w-3 h-3 text-white/20 cursor-help" />
                    </Tip>
                  </div>
                  <Tip text="Add a new command step to this profile">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCommand}
                      className="h-8 text-[10px] gap-1.5 font-black border-white/10 bg-white/5 hover:bg-white/10 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      ADD STEP
                    </Button>
                  </Tip>
                </div>

                {/* Empty steps state */}
                {editingProfile.commands.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl space-y-2">
                    <Terminal className="w-7 h-7 text-white/10 mx-auto" />
                    <p className="text-xs text-white/20">No steps yet</p>
                    <p className="text-[10px] text-white/10 max-w-[220px] mx-auto">
                      Click <span className="text-white/30 font-bold">ADD STEP</span> to define a command. Example: <code className="text-primary/50">npm</code> with args <code className="text-primary/50">run dev</code>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {editingProfile.commands.map((cmd, index) => (
                    <React.Fragment key={cmd.id}>
                      <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-3 group/step hover:border-white/10 transition-colors">
                        {/* Step header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                              {index + 1}
                            </div>
                            <Input
                              placeholder="Step label (optional, e.g. 'Start dev server')"
                              value={cmd.label ?? ''}
                              onChange={e => handleUpdateCommand(cmd.id, { label: e.target.value })}
                              className="h-7 bg-transparent border-0 border-b border-white/5 rounded-none px-0 text-[11px] text-white/50 placeholder:text-white/20 focus:ring-0 focus-visible:ring-0 focus:border-primary/30 w-56"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500/30 hover:text-red-500 rounded-lg opacity-0 group-hover/step:opacity-100 transition-opacity"
                            onClick={() => handleRemoveCommand(cmd.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Command + args */}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/25 block mb-1">Command</label>
                            <Input
                              placeholder="npm / node / python"
                              value={cmd.command}
                              onChange={e => handleUpdateCommand(cmd.id, { command: e.target.value })}
                              className="h-9 bg-black/50 border-white/5 rounded-lg text-xs font-mono focus:border-primary/30"
                            />
                          </div>
                          <div className="col-span-5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/25 block mb-1">Arguments</label>
                            <Input
                              placeholder="run dev  /  server.js"
                              value={cmd.args.join(' ')}
                              onChange={e => handleUpdateCommand(cmd.id, { args: e.target.value.split(' ').filter(a => a !== '') })}
                              className="h-9 bg-black/50 border-white/5 rounded-lg text-xs font-mono focus:border-primary/30"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/25 block mb-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Delay (ms)
                              </span>
                            </label>
                            <Input
                              type="number"
                              placeholder="0"
                              min={0}
                              step={500}
                              value={cmd.delayMs ?? 0}
                              onChange={e => handleUpdateCommand(cmd.id, { delayMs: parseInt(e.target.value) || 0 })}
                              className="h-9 bg-black/50 border-white/5 rounded-lg text-xs font-mono focus:border-primary/30"
                            />
                          </div>
                        </div>

                        {/* Working dir */}
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-white/25 block mb-1">Working Directory (optional — defaults to project root)</label>
                          <Input
                            placeholder="Leave empty to use project root"
                            value={cmd.cwd ?? ''}
                            onChange={e => handleUpdateCommand(cmd.id, { cwd: e.target.value || undefined })}
                            className="h-8 bg-black/30 border-white/5 rounded-lg text-[10px] font-mono text-white/40 focus:border-primary/20"
                          />
                        </div>
                      </div>

                      {/* Arrow connector between steps */}
                      {index < editingProfile.commands.length - 1 && (
                        <div className="flex items-center justify-center">
                          <ArrowDown className="w-3.5 h-3.5 text-white/10" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <p className="text-[10px] text-white/25">
                  {editingProfile.commands.length} step{editingProfile.commands.length !== 1 ? 's' : ''} in sequence
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingProfile(null)}
                    className="font-bold text-sm rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={!editingProfile.name.trim()}
                    className="gap-2 font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/10 active:scale-95 transition-transform"
                  >
                    <Save className="w-4 h-4" />
                    Save Profile
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
