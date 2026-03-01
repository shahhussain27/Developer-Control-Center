import fs from 'fs'
import path from 'path'
import { Project, ProjectType } from '../../common/types'
import { v4 as uuidv4 } from 'uuid'
import { SettingsService } from './SettingsService'
import { BrowserWindow } from 'electron'

export class ScannerService {
  private static readonly IGNORE_FOLDERS = new Set(['node_modules', '.git', 'build', 'dist', 'out', 'bin', 'obj', 'Library', 'Temp'])
  private static readonly MAX_DEPTH = 5
  private static projectsCache: Map<string, Project> = new Map()

  public static async findProjectById(projectId: string): Promise<Project | null> {
    const cached = this.projectsCache.get(projectId)
    if (cached) return cached
    return null
  }

  public static findProjectByPath(projectPath: string): string | null {
    // Normalize both paths for consistent comparison
    const normalizedTarget = path.normalize(projectPath)
    for (const [id, project] of this.projectsCache.entries()) {
      if (path.normalize(project.path) === normalizedTarget) {
        return id
      }
    }
    return null
  }

  private static async calculateSizeSafe(folderPath: string): Promise<number> {
    let totalSize = 0
    try {
      if (!fs.existsSync(folderPath)) return 0

      const statFiles = async (currentPath: string) => {
        try {
          const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name)
            if (entry.isDirectory()) {
              if (!this.IGNORE_FOLDERS.has(entry.name)) {
                await statFiles(fullPath)
              }
            } else {
              try {
                const stats = await fs.promises.stat(fullPath)
                totalSize += stats.size
              } catch (e) {
                // ignore
              }
            }
          }
        } catch (e) {
          // ignore permission errors, etc
        }
      }
      await statFiles(folderPath)
    } catch (e) {
      // ignore
    }
    return totalSize
  }

  public static async scanDirectory(basePath: string): Promise<Project[]> {
    const projects: Project[] = []
    await this.walk(basePath, 0, projects)

    // Update cache
    projects.forEach(p => this.projectsCache.set(p.id, p))

    return projects
  }

  public static getProject(id: string): Project | undefined {
    return this.projectsCache.get(id)
  }

  private static async walk(currentPath: string, depth: number, projects: Project[]): Promise<void> {
    if (depth > this.MAX_DEPTH) return

    try {
      const stats = fs.statSync(currentPath)
      if (!stats.isDirectory()) return

      const folderName = path.basename(currentPath)
      if (this.IGNORE_FOLDERS.has(folderName)) return

      // Attempt to detect if current folder is a project
      const project = this.detectProject(currentPath)
      if (project) {
        projects.push(project)
        // Usually, projects don't nest (e.g., node project inside node project)
        // But for things like monorepos, we might want to continue.
        // For simplicity in V1/V2, we stop at the first project detected in a branch.
        return
      }

      // If not a project, look deeper
      const entries = fs.readdirSync(currentPath)
      for (const entry of entries) {
        await this.walk(path.join(currentPath, entry), depth + 1, projects)
      }
    } catch (e) {
      console.error(`Error walking ${currentPath}:`, e)
    }
  }

  private static detectProject(projectPath: string): Project | null {
    const name = path.basename(projectPath)

    let lastModified = 0
    try {
      const stats = fs.statSync(projectPath)
      lastModified = stats.mtimeMs
    } catch (e) {
      // ignore
    }

    const triggerSizeCalculation = (project: Project) => {
      this.calculateSizeSafe(projectPath).then(size => {
        project.size = size
        this.projectsCache.set(project.id, project)
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('project-updated', project))
      }).catch(() => { })
    }

    // Node / React / Next.js / Electron / Nextron
    const packageJsonPath = path.join(projectPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }

        let projectType: ProjectType = 'node'
        let detectedBy = 'package.json'

        if (deps['nextron']) {
          projectType = 'nextron'
          detectedBy = 'package.json (nextron)'
        } else if (deps['electron']) {
          projectType = 'electron'
          detectedBy = 'package.json (electron)'
        } else if (deps['next']) {
          projectType = 'nextjs'
        } else if (deps['react']) {
          projectType = 'react'
        }

        const project: Project = { id: uuidv4(), name, path: projectPath, projectType, runtime: 'node', detectedBy, lastModified }
        triggerSizeCalculation(project)
        return project
      } catch (e) {
        // Fallback to generic Node if JSON is invalid
        const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'node', runtime: 'node', detectedBy: 'package.json (invalid)', lastModified }
        triggerSizeCalculation(project)
        return project
      }
    }

    // Python
    if (fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
      const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'python', runtime: 'python', detectedBy: 'python indicators', lastModified }
      triggerSizeCalculation(project)
      return project
    }

    // Unity
    if (fs.existsSync(path.join(projectPath, 'Assets')) &&
      fs.existsSync(path.join(projectPath, 'ProjectSettings'))) {
      const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'unity', runtime: 'unity', detectedBy: 'Unity folders', lastModified }
      triggerSizeCalculation(project)
      return project
    }

    // Unreal
    const files = fs.readdirSync(projectPath)
    const uproject = files.find(f => f.endsWith('.uproject'))
    if (uproject) {
      const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'unreal', runtime: 'unreal', detectedBy: uproject, lastModified }
      triggerSizeCalculation(project)
      return project
    }

    return null
  }
}
