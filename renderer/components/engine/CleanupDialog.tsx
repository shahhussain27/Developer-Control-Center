import React, { useState } from 'react'
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'

interface CleanupDialogProps {
    projectId: string
    projectName: string
    projectType: 'unity' | 'unreal'
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export const CleanupDialog: React.FC<CleanupDialogProps> = ({
    projectId,
    projectName,
    projectType,
    isOpen,
    onOpenChange
}) => {
    const [isCleaning, setIsCleaning] = useState(false)
    const [result, setResult] = useState<{ bytes: number, folders: string[] } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleCleanup = async () => {
        setIsCleaning(true)
        setError(null)
        setResult(null)
        try {
            const res = await window.ipc.cleanProject(projectId)
            setResult({ bytes: res.bytesFreed, folders: res.foldersDeleted })
        } catch (e: any) {
            setError(e.message || 'Failed to clean project')
        } finally {
            setIsCleaning(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        // Reset state after closing animation
        setTimeout(() => {
            setResult(null)
            setError(null)
        }, 300)
    }

    // Format bytes to MB/GB
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const targetFolders = projectType === 'unity'
        ? ['Library', 'Temp', 'Logs', 'obj']
        : ['Binaries', 'Intermediate', 'Saved', 'DerivedDataCache']

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] bg-background border-muted/50">
                <DialogHeader className="border-b border-white/5 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Trash2 className="w-5 h-5 text-orange-400" />
                        Project Cleanup
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {result ? (
                        <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in zoom-in-95">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-white mb-1">Cleanup Complete</h3>
                                <p className="text-sm font-bold text-green-400">Reclaimed {formatBytes(result.bytes)}</p>
                                {result.folders.length > 0 && (
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2">
                                        Cleaned: {result.folders.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-400">Safe Clean Operation</h4>
                                        <p className="text-xs text-orange-400/80 leading-relaxed mt-1">
                                            Are you sure you want to clean <strong>{projectName}</strong>? This will safely remove generated engine caches without touching your source assets or configuration.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 px-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Target Directories</h4>
                                <div className="flex flex-wrap gap-2">
                                    {targetFolders.map(f => (
                                        <span key={f} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-white/60">/{f}</span>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-xs text-red-400 font-bold">{error}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="border-t border-white/5 pt-4">
                    {result ? (
                        <Button onClick={handleClose} className="w-full font-bold h-10">Done</Button>
                    ) : (
                        <div className="flex gap-3 w-full sm:justify-end">
                            <Button variant="ghost" onClick={handleClose} disabled={isCleaning} className="font-bold">Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={handleCleanup}
                                disabled={isCleaning}
                                className="font-bold gap-2 shadow-lg shadow-orange-500/10 bg-orange-500 hover:bg-orange-600 text-white border-orange-400/30"
                            >
                                {isCleaning ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                {isCleaning ? 'Cleaning...' : 'Confirm Cleanup'}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
