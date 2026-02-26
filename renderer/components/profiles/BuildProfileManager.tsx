import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Hammer, Settings2, Save, X, Folder } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { BuildProfile } from '../../../common/types'

interface BuildProfileManagerProps {
    projectId: string
    engine: 'unity' | 'unreal'
    onRunBuild: (profileId: string) => void
}

const UNITY_PRESETS = [
    { label: 'Win64', args: '-buildTarget Win64 -executeMethod BuildUtils.Build' },
    { label: 'Android APK', args: '-buildTarget Android -executeMethod BuildUtils.BuildAndroid' },
    { label: 'Android AAB', args: '-buildTarget Android -executeMethod BuildUtils.BuildAndroidAppBundle' },
    { label: 'WebGL', args: '-buildTarget WebGL -executeMethod BuildUtils.BuildWebGL' },
    { label: 'iOS', args: '-buildTarget iOS -executeMethod BuildUtils.BuildiOS' }
]

export const BuildProfileManager: React.FC<BuildProfileManagerProps> = ({
    projectId,
    engine,
    onRunBuild
}) => {
    const [profiles, setProfiles] = useState<BuildProfile[]>([])
    const [editingProfile, setEditingProfile] = useState<BuildProfile | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadProfiles()
        }
    }, [isOpen, projectId])

    const loadProfiles = async () => {
        const data = await window.ipc.getBuildProfiles(projectId)
        setProfiles(data)
    }

    const handleCreateProfile = () => {
        const newProfile: BuildProfile = {
            id: Math.random().toString(36).substring(2, 11),
            projectId,
            name: 'New Build Profile',
            engine,
            arguments: [],
            outputPath: ''
        }
        setEditingProfile(newProfile)
    }

    const handleSaveProfile = async () => {
        if (!editingProfile) return
        await window.ipc.saveBuildProfile(editingProfile)
        setEditingProfile(null)
        loadProfiles()
    }

    const handleDeleteProfile = async (profileId: string) => {
        await window.ipc.deleteBuildProfile(profileId)
        loadProfiles()
    }

    const handleSelectOutput = async () => {
        const p = await window.ipc.selectDirectory()
        if (p && editingProfile) {
            setEditingProfile({ ...editingProfile, outputPath: p })
        }
    }

    const getEnginePlaceholder = () => {
        if (engine === 'unity') return '-buildTarget Win64 -executeMethod BuildUtils.Build'
        return '-server -noclient'
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all active:scale-95 shadow-lg shadow-orange-500/5 group"
                >
                    <Hammer className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] bg-background border-muted/50 max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl shadow-orange-500/10">
                <DialogHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-orange-500/10 to-transparent">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-orange-400">
                        <Hammer className="w-5 h-5" />
                        Build Profiles
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {!editingProfile ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-semibold text-white/60">Manage engine build variants</h3>
                                <Button onClick={handleCreateProfile} size="sm" className="gap-2 h-9 rounded-lg font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20">
                                    <Plus className="w-4 h-4" /> New Build
                                </Button>
                            </div>
                            {profiles.length === 0 ? (
                                <div className="text-center py-12 text-white/20 border border-dashed border-white/10 rounded-xl bg-white/5">
                                    No build profiles created yet.
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {profiles.map(profile => (
                                        <Card key={profile.id} className="p-4 bg-white/5 border-white/10 hover:border-orange-500/40 transition-colors flex items-center justify-between group">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h4 className="font-bold text-sm mb-1 truncate text-white/90 group-hover:text-orange-400 transition-colors">{profile.name}</h4>
                                                <p className="text-[10px] text-white/40 font-mono truncate">{profile.arguments.join(' ') || 'No custom arguments'}</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 px-3 text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 font-bold rounded-lg"
                                                    onClick={() => { onRunBuild(profile.id); setIsOpen(false); }}
                                                >
                                                    <Hammer className="w-4 h-4 gap-1.5 fill-current/20" /> Run Build
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
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                <Input
                                    placeholder="Build Profile Name"
                                    value={editingProfile.name}
                                    onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                    className="flex-1 h-10 border-none bg-transparent focus-visible:ring-0 text-lg font-bold px-3 placeholder:text-white/20"
                                />
                                <Button variant="ghost" size="icon" onClick={() => setEditingProfile(null)} className="h-10 w-10 rounded-lg hover:bg-white/10 shrink-0">
                                    <X className="w-5 h-5 opacity-40 hover:opacity-100 transition-opacity" />
                                </Button>
                            </div>

                            <div className="space-y-4 px-2">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Custom Arguments</h4>
                                    <p className="text-[10px] text-white/30 leading-relaxed mb-3">
                                        Define engine-specific build arguments (e.g. methods and targets). Base batch attributes are included naturally.
                                    </p>
                                    <Input
                                        placeholder={`e.g. ${getEnginePlaceholder()}`}
                                        value={editingProfile.arguments.join(' ')}
                                        onChange={e => setEditingProfile({
                                            ...editingProfile,
                                            arguments: e.target.value.split(' ').filter(a => a !== '')
                                        })}
                                        className="h-11 bg-black/40 border-white/10 rounded-lg text-xs font-mono focus:border-orange-500/50 shadow-inner"
                                    />

                                    {engine === 'unity' && (
                                        <div className="pt-2 animate-in fade-in">
                                            <h5 className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Build Templates</h5>
                                            <div className="flex flex-wrap gap-1.5">
                                                {UNITY_PRESETS.map(preset => (
                                                    <Button
                                                        key={preset.label}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 px-2 text-[9px] bg-white/5 border-white/10 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                                                        onClick={() => setEditingProfile({
                                                            ...editingProfile,
                                                            name: `${preset.label} Build`,
                                                            arguments: preset.args.split(' ')
                                                        })}
                                                    >
                                                        {preset.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Target Output Location</h4>
                                    <p className="text-[10px] text-white/30 leading-relaxed mb-3">
                                        (Discretionary) Only required if your custom build script demands an absolute output location path injected.
                                    </p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 h-11 bg-black/40 border border-white/10 rounded-lg px-3 flex items-center overflow-hidden">
                                            <span className="text-xs font-mono text-white/60 truncate">
                                                {editingProfile.outputPath || 'Default Project Folder'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={handleSelectOutput}
                                            className="h-11 px-4 border-white/10 bg-white/5 hover:bg-white/10 font-bold tracking-wide"
                                        >
                                            <Folder className="w-4 h-4 mr-2 opacity-60" />
                                            Browse
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-white/5 px-2">
                                <Button variant="ghost" onClick={() => setEditingProfile(null)} className="font-bold">Cancel</Button>
                                <Button
                                    onClick={handleSaveProfile}
                                    className="gap-2 font-bold h-11 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 text-white border border-orange-400/30"
                                >
                                    <Save className="w-4 h-4 drop-shadow-md" /> Save Layout
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
