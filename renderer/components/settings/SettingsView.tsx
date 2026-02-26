import React from 'react'
import { Settings } from '../../../common/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FolderPlus, Trash2, HardDrive, ShieldCheck, TerminalSquare, Plus } from 'lucide-react'

interface SettingsViewProps {
  settings: Settings
  onSave: (settings: Settings) => void
  onAddLocation: () => Promise<void>
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, onAddLocation }) => {
  const [newIdeName, setNewIdeName] = React.useState('')
  const [newIdePath, setNewIdePath] = React.useState('')

  const removeLocation = (path: string) => {
    onSave({
      ...settings,
      scanLocations: settings.scanLocations.filter(loc => loc !== path)
    })
  }

  const addCustomIde = () => {
    if (!newIdeName || !newIdePath) return
    const currentIdes = settings.customIdes || []
    onSave({
      ...settings,
      customIdes: [...currentIdes, { name: newIdeName, path: newIdePath }]
    })
    setNewIdeName('')
    setNewIdePath('')
  }

  const removeCustomIde = (path: string) => {
    const currentIdes = settings.customIdes || []
    onSave({
      ...settings,
      customIdes: currentIdes.filter(ide => ide.path !== path)
    })
  }

  return (
    <div className="h-full w-full overflow-y-auto pb-32 pr-4 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tighter uppercase italic opacity-90">System Orchestration</h2>
        <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] font-bold">Preferences & Drive Registry</p>
      </div>

      <Card className="bg-card/30 border-muted/50 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 italic font-black">
                <HardDrive className="w-5 h-5 text-primary" />
                SCAN REGISTRY
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50">
                Configure directories for recursive project discovery
              </CardDescription>
            </div>
            <Button onClick={onAddLocation} className="rounded-xl font-bold h-11 px-6 shadow-xl shadow-primary/20 transition-transform active:scale-95">
              <FolderPlus className="w-4 h-4 mr-2" />
              ADD LOCATION
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-4">
            {settings.scanLocations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest opacity-30">No active scan routes</p>
              </div>
            ) : (
              settings.scanLocations.map((path, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                      <HardDrive className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-mono truncate text-white/80">{path}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                    onClick={() => removeLocation(path)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/30 border-muted/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-black italic uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Unity Executable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              value={settings.unityPath || ''} 
              readOnly 
              placeholder="C:\...\Unity.exe" 
              className="bg-white/5 border-white/10 text-xs font-mono"
            />
            <Button 
              variant="outline" 
              className="w-full h-10 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest"
              onClick={async () => {
                const path = await window.ipc.selectFile()
                if (path) onSave({ ...settings, unityPath: path })
              }}
            >
              Browse Unity.exe
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-muted/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-black italic uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Unreal (UEEditor.exe)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              value={settings.unrealPath || ''} 
              readOnly 
              placeholder="C:\...\UEEditor.exe" 
              className="bg-white/5 border-white/10 text-xs font-mono"
            />
            <Button 
              variant="outline" 
              className="w-full h-10 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest"
              onClick={async () => {
                const path = await window.ipc.selectFile()
                if (path) onSave({ ...settings, unrealPath: path })
              }}
            >
              Browse UEEditor.exe
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/30 border-muted/50 backdrop-blur-xl overflow-hidden mt-8">
        <CardHeader className="border-b border-white/5 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 italic font-black">
                <TerminalSquare className="w-5 h-5 text-purple-400" />
                CUSTOM IDEs
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-50">
                Register executable paths for external editors
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="grid gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-1">Add New Editor</div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <Input
                    placeholder="Editor Name (e.g. Notepad++)"
                    value={newIdeName}
                    onChange={(e) => setNewIdeName(e.target.value)}
                    className="bg-black/20 border-white/10 text-xs font-mono"
                  />
                </div>
                <div className="md:col-span-6 flex gap-2">
                  <Input
                    placeholder="Executable Path (.exe)"
                    value={newIdePath}
                    readOnly
                    className="bg-black/20 border-white/10 text-xs font-mono flex-1 text-white/50"
                  />
                  <Button
                    variant="outline"
                    className="shrink-0 h-10 border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={async () => {
                       const path = await window.ipc.selectFile()
                       if (path) setNewIdePath(path)
                    }}
                  >
                    Browse
                  </Button>
                </div>
                <div className="md:col-span-2">
                  <Button 
                    className="w-full h-10 font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/50"
                    onClick={addCustomIde}
                    disabled={!newIdeName || !newIdePath}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(!settings.customIdes || settings.customIdes.length === 0) ? (
                 <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
                   <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest opacity-30">No custom editors defined</p>
                 </div>
              ) : (
                settings.customIdes.map((ide, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                        <TerminalSquare className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate text-white/90">{ide.name}</span>
                        <span className="text-xs font-mono truncate text-white/40">{ide.path}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 shrink-0"
                      onClick={() => removeCustomIde(ide.path)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

const Server = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
)
