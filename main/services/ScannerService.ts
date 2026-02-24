import fs from 'fs'
import path from 'path'
import { Project, ProjectType } from '../../common/types'
import { v4 as uuidv4 } from 'uuid'

export class ScannerService {
  private static readonly IGNORE_FOLDERS = new Set(['node_modules', '.git', 'build', 'dist', 'out', 'bin', 'obj', 'Library', 'Temp'])
  private static readonly MAX_DEPTH = 5
  private static projectsCache: Map<string, Project> = new Map()

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

        return { id: uuidv4(), name, path: projectPath, projectType, runtime: 'node', detectedBy }
      } catch (e) {
        // Fallback to generic Node if JSON is invalid
        return { id: uuidv4(), name, path: projectPath, projectType: 'node', runtime: 'node', detectedBy: 'package.json (invalid)' }
      }
    }
    
    // Python
    if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || 
        fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
      return { id: uuidv4(), name, path: projectPath, projectType: 'python', runtime: 'python', detectedBy: 'python indicators' }
    }
    
    // Unity
    if (fs.existsSync(path.join(projectPath, 'Assets')) && 
        fs.existsSync(path.join(projectPath, 'ProjectSettings'))) {
      return { id: uuidv4(), name, path: projectPath, projectType: 'unity', runtime: 'unity', detectedBy: 'Unity folders' }
    }
    
    // Unreal
    const files = fs.readdirSync(projectPath)
    const uproject = files.find(f => f.endsWith('.uproject'))
    if (uproject) {
      return { id: uuidv4(), name, path: projectPath, projectType: 'unreal', runtime: 'unreal', detectedBy: uproject }
    }

    return null
  }
}
