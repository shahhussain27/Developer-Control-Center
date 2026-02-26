import { shell, clipboard } from 'electron'
import { spawn } from 'child_process'
import { QuickAction, QuickActionError } from '../../common/types'
import { ScannerService } from './ScannerService'
import { ProcessService } from './ProcessService'
import { IdeService } from './IdeService'
import { PortService } from './PortService'

export class QuickActionService {
    private static actions: QuickAction[] = [
        { id: 'open_folder', label: 'Open Folder', icon: 'FolderOpen', action: 'shell:openFolder' },
        { id: 'open_terminal', label: 'Open Terminal Here', icon: 'Terminal', action: 'shell:openTerminal' },
        { id: 'copy_path', label: 'Copy Project Path', icon: 'Copy', action: 'clipboard:copyPath' },
        { id: 'open_ide', label: 'Open in Preferred IDE', icon: 'Code', action: 'ide:openPreferred' },
        { id: 'start_project', label: 'Start Project', icon: 'Play', action: 'project:start', conditions: { requiresStopped: true } },
        { id: 'stop_project', label: 'Stop Project', icon: 'Square', action: 'project:stop', conditions: { requiresRunning: true } },
        { id: 'restart_project', label: 'Restart Project', icon: 'RefreshCw', action: 'project:restart', conditions: { requiresRunning: true } },
        { id: 'open_localhost', label: 'Open Localhost URL', icon: 'Globe', action: 'network:openLocalhost', conditions: { requiresPorts: true } },
        { id: 'view_logs', label: 'View Logs', icon: 'FileText', action: 'process:viewLogs', conditions: { requiresLogs: true } },
        { id: 'kill_process', label: 'Kill Process', icon: 'AlertTriangle', action: 'process:kill', conditions: { requiresRunning: true } },
        { id: 'clean_project', label: 'Clean Project Caches', icon: 'Trash2', action: 'project:clean' }
    ]

    public static getCatalog(): QuickAction[] {
        return this.actions
    }

    public static async execute(actionId: string, projectId: string): Promise<void | { error: QuickActionError }> {
        try {
            const action = this.actions.find(a => a.id === actionId)
            if (!action) throw new Error(`Unknown action: ${actionId}`)

            // Retrieve project context
            const project = await ScannerService.findProjectById(projectId)
            if (!project) throw new Error('Project context not found')

            const processState = await ProcessService.getStatus(projectId)
            const allPorts = await PortService.getActivePorts()
            const ports = allPorts.filter(p => p.projectId === projectId)

            // Valdation Phase
            if (action.conditions?.requiresRunning && processState.status !== 'running') throw new Error('Action requires process to be running')
            if (action.conditions?.requiresStopped && processState.status !== 'stopped' && processState.status !== 'error') throw new Error('Action requires process to be stopped')
            if (action.conditions?.requiresPorts && ports.length === 0) throw new Error('No active ports detected for this project')
            if (action.conditions?.requiresLogs && !processState.lastOutput) throw new Error('No logs available for this project')

            // Execution Phase
            switch (action.action) {
                case 'shell:openFolder':
                    shell.openPath(project.path)
                    break

                case 'shell:openTerminal':
                    spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', ['/c', 'start'], {
                        cwd: project.path,
                        detached: true,
                        shell: process.platform === 'win32'
                    }).unref()
                    break

                case 'clipboard:copyPath':
                    clipboard.writeText(project.path)
                    break

                case 'ide:openPreferred':
                    {
                        const ides = await IdeService.listIdes()
                        if (ides.length > 0) {
                            const res = await IdeService.launchIde(ides[0].path, project.path, ides[0].name)
                            if (res?.error) throw new Error(res.error.message)
                        } else {
                            throw new Error('No IDEs found or configured')
                        }
                    }
                    break

                case 'project:start':
                    await ProcessService.runCommand(projectId, '', project.path, project.projectType)
                    break

                case 'project:stop':
                    ProcessService.stopCommand(projectId)
                    break

                case 'project:restart':
                    ProcessService.stopCommand(projectId)
                    setTimeout(() => {
                        ProcessService.runCommand(projectId, '', project.path, project.projectType)
                    }, 1000)
                    break

                case 'network:openLocalhost':
                    if (ports.length > 0) {
                        shell.openExternal(`http://localhost:${ports[0].port}`)
                    }
                    break

                case 'process:viewLogs':
                    // The UI orchestrates log opening via IPC using existing modal patterns
                    // We will signal renderer or simply no-op here if the UI intercept handles it exclusively
                    // For deterministic integrity, we'll let the renderer handle 'view_logs' conditionally 
                    // but return success here.
                    break

                case 'process:kill':
                    if (processState.pid) {
                        await ProcessService.killProcessByPid(processState.pid)
                    }
                    break

                default:
                    throw new Error(`Execution routing not found for: ${action.action}`)
            }

            return undefined;
        } catch (err: any) {
            return {
                error: {
                    actionId,
                    projectId,
                    message: err.message || 'Unknown execution error'
                }
            }
        }
    }
}
