import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Play, Settings2, Save, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { StartupProfile, StartupCommand } from '../../../common/types'

interface ProfileManagerProps {
  projectId: string
  onRunProfile: (profileId: string) => void
}


export const ProfileManager: React.FC<ProfileManagerProps> = ({ projectId, onRunProfile }) => {
  const [profiles, setProfiles] = useState<StartupProfile[]>([])
  const [editingProfile, setEditingProfile] = useState<StartupProfile | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProfiles()
    }
  }, [isOpen, projectId])

  const loadProfiles = async () => {
    const data = await window.ipc.getProfiles(projectId)
    setProfiles(data)
  }

  const handleCreateProfile = () => {
    const newProfile: StartupProfile = {
      id: Math.random().toString(36).substring(2, 11), // Using a simple ID generator for renderer
      projectId,
      name: 'New Profile',
      commands: []
    }
    setEditingProfile(newProfile)
  }

  const handleAddCommand = () => {
    if (!editingProfile) return
    const newCommand: StartupCommand = {
      id: Math.random().toString(36).substring(2, 11),
      command: '',
      args: [],
    }
    setEditingProfile({
      ...editingProfile,
      commands: [...editingProfile.commands, newCommand]
    })
  }

  const handleUpdateCommand = (cmdId: string, updates: Partial<StartupCommand>) => {
    if (!editingProfile) return
    setEditingProfile({
      ...editingProfile,
      commands: editingProfile.commands.map(cmd => 
        cmd.id === cmdId ? { ...cmd, ...updates } : cmd
      )
    })
  }

  const handleRemoveCommand = (cmdId: string) => {
    if (!editingProfile) return
    setEditingProfile({
      ...editingProfile,
      commands: editingProfile.commands.filter(cmd => cmd.id !== cmdId)
    })
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95">
          <Settings2 className="w-4 h-4 opacity-60" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-background border-muted/50 max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5">
          <DialogTitle className="text-xl font-bold">Startup Profiles</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
          {!editingProfile ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-white/60">Manage your project startup sequences</h3>
                <Button onClick={handleCreateProfile} size="sm" className="gap-2 h-9 rounded-lg font-bold">
                  <Plus className="w-4 h-4" /> New Profile
                </Button>
              </div>
              {profiles.length === 0 ? (
                <div className="text-center py-12 text-white/20 border border-dashed border-white/10 rounded-xl">
                  No profiles created yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {profiles.map(profile => (
                    <Card key={profile.id} className="p-4 bg-white/5 border-white/10 hover:border-primary/50 transition-colors flex items-center justify-between group">
                      <div>
                        <h4 className="font-bold text-sm mb-1">{profile.name}</h4>
                        <p className="text-[10px] text-white/40 uppercase font-black">{profile.commands.length} Commands</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-9 px-3 text-green-500 hover:text-green-400 hover:bg-green-500/10 font-bold rounded-lg" onClick={() => { onRunProfile(profile.id); setIsOpen(false); }}>
                          <Play className="w-4 h-4 mr-1.5 fill-current" /> Run
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:text-white rounded-lg hover:bg-white/10" onClick={() => setEditingProfile(profile)}>
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg" onClick={() => handleDeleteProfile(profile.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <Input 
                   placeholder="Profile Name" 
                   value={editingProfile.name} 
                   onChange={e => setEditingProfile({...editingProfile, name: e.target.value})}
                   className="flex-1 h-11 bg-white/5 border-white/10 rounded-lg focus:ring-primary/50"
                 />
                 <Button variant="ghost" size="icon" onClick={() => setEditingProfile(null)} className="h-11 w-11 rounded-lg">
                   <X className="w-5 h-5 opacity-40" />
                 </Button>
               </div>

               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Execution Steps</h4>
                   <Button variant="outline" size="sm" onClick={handleAddCommand} className="h-8 text-[10px] gap-1.5 font-black border-white/10 bg-white/5 hover:bg-white/10 rounded-lg">
                     <Plus className="w-3.5 h-3.5" /> ADD STEP
                   </Button>
                 </div>

                 <div className="space-y-3">
                    {editingProfile.commands.map((cmd, index) => (
                      <div key={cmd.id} className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4 group/step">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-black">
                               {index + 1}
                             </div>
                             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sequence Step</span>
                           </div>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500 rounded-lg" onClick={() => handleRemoveCommand(cmd.id)}>
                             <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                         </div>
                         <div className="grid grid-cols-3 gap-3">
                           <div className="col-span-1">
                             <Input 
                               placeholder="Command" 
                               value={cmd.command}
                               onChange={e => handleUpdateCommand(cmd.id, { command: e.target.value })}
                               className="h-10 bg-black/50 border-white/5 rounded-lg text-xs font-mono focus:border-primary/30"
                             />
                           </div>
                           <div className="col-span-2">
                             <Input 
                               placeholder="Arguments (e.g. run dev)" 
                               value={cmd.args.join(' ')}
                               onChange={e => handleUpdateCommand(cmd.id, { args: e.target.value.split(' ').filter(a => a !== '') })}
                               className="h-10 bg-black/50 border-white/5 rounded-lg text-xs font-mono focus:border-primary/30"
                             />
                           </div>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>

               <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                  <Button variant="ghost" onClick={() => setEditingProfile(null)} className="font-bold">Cancel</Button>
                  <Button onClick={handleSaveProfile} className="gap-2 font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/10">
                    <Save className="w-4 h-4" /> Save Profile
                  </Button>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
