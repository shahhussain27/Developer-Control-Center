import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { DownloadCloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export const UpdateManager: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle')
    const [progress, setProgress] = useState<number>(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [versionInfo, setVersionInfo] = useState<any>(null)
    const [currentVersion, setCurrentVersion] = useState<string>('')

    useEffect(() => {
        // Fetch current app version
        window.ipc.getAppVersion().then(ver => setCurrentVersion(ver)).catch(console.error)

        // Setup IPC listeners
        const unsubs = [
            window.ipc.onUpdateChecking(() => setStatus('checking')),
            window.ipc.onUpdateAvailable((info) => {
                setStatus('available')
                setVersionInfo(info)
            }),
            window.ipc.onUpdateNotAvailable(() => setStatus('not-available')),
            window.ipc.onUpdateError((err) => {
                setStatus('error')
                setErrorMessage(err)
            }),
            window.ipc.onUpdateDownloadProgress((prog) => {
                setStatus('downloading')
                setProgress(prog.percent)
            }),
            window.ipc.onUpdateDownloaded(() => setStatus('downloaded')),
        ]

        return () => {
            unsubs.forEach(unsub => unsub())
        }
    }, [])

    const handleCheckUpdate = async () => {
        setStatus('checking')
        setErrorMessage(null)
        try {
            await window.ipc.checkForUpdate()
        } catch (e: any) {
            setStatus('error')
            setErrorMessage(e.message || String(e))
        }
    }

    const handleDownloadUpdate = async () => {
        setStatus('downloading')
        try {
            await window.ipc.downloadUpdate()
        } catch (e: any) {
            setStatus('error')
            setErrorMessage(e.message || String(e))
        }
    }

    const handleInstallUpdate = () => {
        window.ipc.installUpdate()
    }

    return (
        <Card className="bg-card/30 border-muted/50 backdrop-blur-xl mt-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black italic uppercase tracking-wider flex items-center gap-2">
                            <DownloadCloud className="w-5 h-5 text-blue-400" />
                            Application Updates
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Keep your Developer Control Center up to date
                        </CardDescription>
                    </div>
                    {currentVersion && (
                        <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs font-mono text-white/70">
                            v{currentVersion}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white/90">
                            {status === 'idle' && 'Ready to check for updates'}
                            {status === 'checking' && 'Checking for updates...'}
                            {status === 'available' && `Update available: ${versionInfo?.version || ''}`}
                            {status === 'not-available' && 'You are up to date!'}
                            {status === 'downloading' && `Downloading update... ${Math.round(progress)}%`}
                            {status === 'downloaded' && 'Update ready to install'}
                            {status === 'error' && 'Error checking for updates'}
                        </span>
                        {errorMessage && (
                            <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errorMessage}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {['idle', 'not-available', 'error'].includes(status) && (
                            <Button
                                variant="outline"
                                className="h-9 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest"
                                onClick={handleCheckUpdate}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Check Now
                            </Button>
                        )}

                        {status === 'checking' && (
                            <Button disabled variant="outline" className="h-9 rounded-lg border-white/10 bg-white/5 text-xs font-bold uppercase tracking-widest">
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Checking...
                            </Button>
                        )}

                        {status === 'available' && (
                            <Button
                                className="h-9 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-6"
                                onClick={handleDownloadUpdate}
                            >
                                Download
                            </Button>
                        )}

                        {status === 'downloading' && (
                            <div className="flex items-center gap-3 w-32">
                                <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {status === 'downloaded' && (
                            <Button
                                className="h-9 bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase tracking-widest px-6"
                                onClick={handleInstallUpdate}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Restart & Install
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
