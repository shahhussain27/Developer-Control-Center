import fs from 'fs'
import path from 'path'
import { EngineDetectionResult, CleanupResult, ProjectType } from '../../common/types'
import { SettingsService } from './SettingsService'
import { ScannerService } from './ScannerService'

export class EngineService {
    /**
     * Reads ProjectSettings/ProjectVersion.txt and extracts 'm_EditorVersion'
     */
    public static async detectUnityVersion(projectPath: string): Promise<EngineDetectionResult> {
        const settings = SettingsService.getSettings()

        // Attempt to extract the required version from the project
        let requiredVersion: string | undefined
        const versionFilePath = path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt')

        if (fs.existsSync(versionFilePath)) {
            const content = fs.readFileSync(versionFilePath, 'utf-8')
            const match = content.match(/m_EditorVersion:\s*(.*)/)
            if (match && match[1]) {
                requiredVersion = match[1].trim()
            }
        }

        return {
            installedVersion: settings.unityPath || 'Not Configured',
            requiredVersion,
            // For Unity, we often just check if the executable exists if we can't do a perfect string match,
            // but if we have both, we do a loose includes check as many exe paths have the version in them.
            isMatch: requiredVersion && settings.unityPath ? settings.unityPath.includes(requiredVersion) : false
        }
    }

    /**
     * Reads the .uproject JSON and extracts 'EngineAssociation'
     */
    public static async detectUnrealVersion(projectPath: string): Promise<EngineDetectionResult> {
        const settings = SettingsService.getSettings()
        let requiredVersion: string | undefined

        if (fs.existsSync(projectPath)) {
            const files = fs.readdirSync(projectPath)
            const uprojectFile = files.find(f => f.endsWith('.uproject'))

            if (uprojectFile) {
                try {
                    const content = fs.readFileSync(path.join(projectPath, uprojectFile), 'utf-8')
                    const parsed = JSON.parse(content)
                    if (parsed && parsed.EngineAssociation) {
                        requiredVersion = parsed.EngineAssociation
                    }
                } catch (err) {
                    console.warn('Failed to parse .uproject', err)
                }
            }
        }

        return {
            installedVersion: settings.unrealPath || 'Not Configured',
            requiredVersion,
            isMatch: requiredVersion && settings.unrealPath ? settings.unrealPath.includes(requiredVersion) : false
        }
    }

    public static async detectEngineVersion(projectId: string): Promise<EngineDetectionResult> {
        const project = await ScannerService.findProjectById(projectId)
        if (!project) throw new Error('Project not found')

        if (project.projectType === 'unity') {
            return this.detectUnityVersion(project.path)
        } else if (project.projectType === 'unreal') {
            return this.detectUnrealVersion(project.path)
        }

        throw new Error('Project type does not support engine detection')
    }

    private static async deleteFolderSafe(folderPath: string): Promise<number> {
        if (!fs.existsSync(folderPath)) return 0

        let bytesFreed = 0
        const statFiles = (currentPath: string) => {
            if (fs.existsSync(currentPath)) {
                const stats = fs.statSync(currentPath)
                if (stats.isDirectory()) {
                    const files = fs.readdirSync(currentPath)
                    files.forEach(file => statFiles(path.join(currentPath, file)))
                } else {
                    bytesFreed += stats.size
                }
            }
        }

        statFiles(folderPath)
        fs.rmSync(folderPath, { recursive: true, force: true })
        return bytesFreed
    }

    public static async cleanProject(projectId: string): Promise<CleanupResult> {
        const project = await ScannerService.findProjectById(projectId)
        if (!project) throw new Error('Project not found')

        let targetFolders: string[] = []

        if (project.projectType === 'unity') {
            targetFolders = ['Library', 'Temp', 'Logs', 'obj']
        } else if (project.projectType === 'unreal') {
            targetFolders = ['Binaries', 'Intermediate', 'Saved', 'DerivedDataCache']
        } else {
            throw new Error('Project type does not support automated clean up')
        }

        let totalFreed = 0
        let deleted: string[] = []

        for (const folder of targetFolders) {
            const fullPath = path.join(project.path, folder)
            if (fs.existsSync(fullPath)) {
                const freed = await this.deleteFolderSafe(fullPath)
                totalFreed += freed
                deleted.push(folder)
            }
        }

        return {
            bytesFreed: totalFreed,
            foldersDeleted: deleted
        }
    }
}
