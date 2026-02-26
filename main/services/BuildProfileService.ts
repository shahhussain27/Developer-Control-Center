import Store from 'electron-store'
import path from 'path'
import fs from 'fs'
import { BuildProfile, SpawnError } from '../../common/types'
import { ProcessService } from './ProcessService'
import { ScannerService } from './ScannerService'
import { SettingsService } from './SettingsService'

const schema: any = {
    buildProfiles: {
        type: 'array',
        default: [],
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                projectId: { type: 'string' },
                name: { type: 'string' },
                engine: { type: 'string', enum: ['unity', 'unreal'] },
                arguments: { type: 'array', items: { type: 'string' } },
                outputPath: { type: 'string' }
            }
        }
    }
}

export class BuildProfileService {
    private static store = new Store({ schema })
    private static activeBuilds: Map<string, boolean> = new Map()

    public static getProfiles(projectId: string): BuildProfile[] {
        const all = this.store.get('buildProfiles') as BuildProfile[]
        return all.filter(p => p.projectId === projectId)
    }

    public static saveProfile(profile: BuildProfile): void {
        const all = this.store.get('buildProfiles') as BuildProfile[]
        const index = all.findIndex(p => p.id === profile.id)
        if (index !== -1) {
            all[index] = profile
        } else {
            all.push(profile)
        }
        this.store.set('buildProfiles', all)
    }

    public static deleteProfile(profileId: string): void {
        const all = this.store.get('buildProfiles') as BuildProfile[]
        const filtered = all.filter(p => p.id !== profileId)
        this.store.set('buildProfiles', filtered)
    }

    public static async executeBuild(profileId: string): Promise<void | { error: SpawnError }> {
        const all = this.store.get('buildProfiles') as BuildProfile[]
        const profile = all.find(p => p.id === profileId)
        if (!profile) throw new Error('Build profile not found')

        if (this.activeBuilds.get(profileId)) {
            throw new Error('This build profile is already executing')
        }

        const project = await ScannerService.findProjectById(profile.projectId)
        if (!project) throw new Error('Project context lost')

        const settings = SettingsService.getSettings()

        let execPath: string
        let args: string[]

        if (profile.engine === 'unity') {
            execPath = settings.unityPath || ''
            if (!fs.existsSync(execPath)) {
                return { error: { projectId: project.id, code: 'EXECUTABLE_MISSING', message: 'Unity executable path is missing or invalid in Settings.' } }
            }
            // Unity explicit headless build arguments
            args = ['-batchmode', '-quit', '-projectPath', project.path]
            if (profile.arguments.length > 0) {
                args.push(...profile.arguments)
            }
        } else if (profile.engine === 'unreal') {
            execPath = settings.unrealPath || ''
            if (!fs.existsSync(execPath)) {
                return { error: { projectId: project.id, code: 'EXECUTABLE_MISSING', message: 'Unreal executable path is missing or invalid in Settings.' } }
            }
            // Unreal explicit cooked build arguments
            const files = fs.readdirSync(project.path)
            const uprojectFile = files.find(f => f.endsWith('.uproject'))
            if (!uprojectFile) {
                return { error: { projectId: project.id, code: 'SCRIPT_ERROR', message: 'No .uproject file found in project.' } }
            }

            args = [path.join(project.path, uprojectFile), '-run=BuildCookRun', '-targetplatform=Win64']
            if (profile.arguments.length > 0) {
                args.push(...profile.arguments)
            }
        } else {
            return { error: { projectId: project.id, code: 'UNKNOWN', message: 'Unsupported engine type.' } }
        }

        this.activeBuilds.set(profileId, true)

        try {
            // By using our unified ProcessService.runRawCommand, the build inherently stream logs to the frontend via the `process-log` IPC, 
            // registers in the pid table, and displays in the regular UI log viewer deterministically.
            console.log(`[BuildProfileService] Executing build: ${execPath} ${args.join(' ')}`)
            const res = ProcessService.runRawCommand(project.id, `"${execPath}"`, args, project.path)
            if ('error' in res) {
                return { error: res.error }
            }
        } finally {
            this.activeBuilds.delete(profileId)
        }
    }
}
