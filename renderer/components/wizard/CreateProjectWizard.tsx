import React, { useState, useEffect, useRef } from 'react'
import { X, Folder, CheckCircle2, AlertTriangle, AlertCircle, TerminalSquare } from 'lucide-react'
import { Button } from '../ui/button'
import { ProjectType, EnvironmentCheckResult } from '../../../common/types'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../../lib/projectIcons'
import AnsiToHtml from 'ansi-to-html'

const ansiConverter = new AnsiToHtml({
    newline: true,
    escapeXML: true,
    colors: {
        2: '#4ade80', // Tailwind green-400
        1: '#fa003f'  // Red
    }
})

interface CreateProjectWizardProps {
    isOpen: boolean
    onClose: () => void
    onCreated: (path: string) => void
}

const SUPPORTED_TYPES: ProjectType[] = [
    'nextjs', 'react', 'node', 'python', 'flutter', 'react-native', 'electron', 'nextron', 'unity', 'unreal'
]

export const CreateProjectWizard: React.FC<CreateProjectWizardProps> = ({ isOpen, onClose, onCreated }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [type, setType] = useState<ProjectType>('nextjs')
    const [name, setName] = useState('')
    const [directory, setDirectory] = useState('')
    const [envChecks, setEnvChecks] = useState<EnvironmentCheckResult[]>([])
    const [checkingEnv, setCheckingEnv] = useState(false)
    const [creating, setCreating] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const logsRef = useRef<HTMLDivElement>(null)
    const [errorDetail, setErrorDetail] = useState<{ message: string; stderr: string; exitCode: number } | null>(null)

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setType('nextjs')
            setName('')
            setDirectory('')
            setLogs([])
            setCreating(false)
            setErrorDetail(null)
            checkEnv()
        }
    }, [isOpen])

    useEffect(() => {
        if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight
        }
    }, [logs])

    useEffect(() => {
        if (isOpen) {
            const unsubscribe = window.ipc.onCreationLog((log) => {
                setLogs(prev => [...prev, log])
            })
            return () => unsubscribe()
        }
    }, [isOpen])

    const checkEnv = async () => {
        setCheckingEnv(true)
        try {
            const results = await window.ipc.checkEnvironment()
            setEnvChecks(results)
        } finally {
            setCheckingEnv(false)
        }
    }

    const handleSelectDir = async () => {
        const dir = await window.ipc.selectDirectory()
        if (dir) setDirectory(dir)
    }

    const handleCreate = async () => {
        setStep(3)
        setCreating(true)
        try {
            const createdPath = await window.ipc.createProject(type, name, directory)
            onCreated(createdPath)
        } catch (err: any) {
            setLogs(prev => [...prev, `\nError: ${err.message}`])
            // Setup detail modal
            setErrorDetail({
                message: err.message || 'Unknown error',
                stderr: err.stderr || 'No stderr output captured.',
                exitCode: err.exitCode ?? -1
            })
        } finally {
            setCreating(false)
        }
    }

    const isCriticalMissing = () => {
        // Check if tools required for the *selected type* are missing
        const needsNode = ['nextjs', 'react', 'node', 'electron', 'nextron', 'react-native'].includes(type)
        const needsPython = type === 'python'
        const needsFlutter = type === 'flutter'

        for (const check of envChecks) {
            if (check.status === 'missing') {
                if (needsNode && (check.tool === 'Node.js' || check.tool === 'npm')) return true
                if (needsPython && check.tool === 'Python') return true
                if (needsFlutter && check.tool === 'Flutter') return true
            }
        }
        return false
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <h2 className="text-lg font-bold">Create New Project</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3 block">
                                    Select Project Type
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {SUPPORTED_TYPES.map(t => {
                                        const Icon = PROJECT_TYPE_ICONS[t]
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => setType(t)}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${type === t
                                                    ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'
                                                    }`}
                                            >
                                                <Icon className="w-6 h-6" />
                                                <span className="text-xs font-semibold">{PROJECT_TYPE_LABELS[t]}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">
                                        Project Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="my-awesome-app"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">
                                        Location
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={directory}
                                            readOnly
                                            placeholder="Select a folder..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm opacity-50 cursor-not-allowed"
                                        />
                                        <Button onClick={handleSelectDir} className="h-auto">
                                            <Folder className="w-4 h-4 mr-2" />
                                            Browse
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2">Environment Validation</h3>
                                <p className="text-white/50 text-sm">Checking your system for required scaffolding tools</p>
                            </div>

                            <div className="space-y-3 bg-black/50 p-6 rounded-xl border border-white/10">
                                {checkingEnv ? (
                                    <div className="text-center py-8 text-primary animate-pulse">Scanning system paths...</div>
                                ) : (
                                    envChecks.map((check, i) => (
                                        <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                {check.status === 'installed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                                {check.status === 'outdated' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                                                {check.status === 'missing' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                                <span className="font-semibold">{check.tool}</span>
                                            </div>
                                            <div className="text-sm">
                                                {check.status === 'installed' && <span className="text-green-500/80">{check.version}</span>}
                                                {check.status === 'outdated' && <span className="text-yellow-500/80">Outdated: {check.version}</span>}
                                                {check.status === 'missing' && <span className="text-red-500/80 text-xs">Not found</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {isCriticalMissing() && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p>Critical dependencies for <strong>{PROJECT_TYPE_LABELS[type]}</strong> are missing. Please install them to proceed.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold">Scaffolding {name}...</h3>
                                {creating ? (
                                    <span className="text-primary text-sm animate-pulse flex items-center gap-2">
                                        <TerminalSquare className="w-4 h-4" /> Running CLI...
                                    </span>
                                ) : (
                                    <span className="text-green-400 text-sm font-bold flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Finished
                                    </span>
                                )}
                            </div>
                            <div
                                ref={logsRef}
                                className="flex-1 bg-black rounded-xl border border-white/10 p-4 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-emerald-400/80 min-h-[300px]"
                                dangerouslySetInnerHTML={{
                                    __html: logs.length === 0 ? 'Warming up engine...' : ansiConverter.toHtml(logs.join(''))
                                }}
                            />
                        </div>
                    )}
                </div>

                {errorDetail && (
                    <div className="absolute inset-0 bg-black/95 z-20 flex flex-col p-6 animate-in slide-in-from-bottom-5">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertCircle className="w-8 h-8" />
                            <div>
                                <h3 className="text-xl font-bold">Initialization Failed</h3>
                                <p className="text-sm text-red-400/80">Process exited with code {errorDetail.exitCode}</p>
                            </div>
                        </div>
                        <div className="flex-1 bg-red-950/20 border border-red-500/20 rounded-xl p-4 overflow-y-auto font-mono text-xs text-red-300">
                            {errorDetail.stderr}
                        </div>
                        <div className="mt-6 flex justify-end gap-3 shrink-0">
                            <Button variant="outline" onClick={() => setErrorDetail(null)} className="border-white/10">
                                Close Details
                            </Button>
                            <Button onClick={onClose} variant="destructive">
                                Cancel Creation
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between p-6 border-t border-white/10 shrink-0 bg-black/20">
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-2 rounded-full transition-all ${step === i ? 'w-10 bg-primary' : step > i ? 'w-4 bg-primary/40' : 'w-4 bg-white/10'}`} />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {step > 1 && step < 3 && (
                            <Button variant="outline" onClick={() => setStep(prev => (prev - 1) as 1 | 2)}>Back</Button>
                        )}

                        {step === 1 && (
                            <Button onClick={() => setStep(2)} disabled={!name.trim() || !directory}>
                                Next: Validate Env
                            </Button>
                        )}

                        {step === 2 && (
                            <Button onClick={handleCreate} disabled={isCriticalMissing()}>
                                Scaffold Project
                            </Button>
                        )}

                        {step === 3 && !creating && (
                            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                                Done
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
