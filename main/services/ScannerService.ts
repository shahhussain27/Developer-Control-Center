import fs from 'fs'
import path from 'path'
import { Project, ProjectType } from '../../common/types'
import { v4 as uuidv4 } from 'uuid'
import { SettingsService } from './SettingsService'
import { BrowserWindow } from 'electron'
import fg from 'fast-glob'

export class ScannerService {
  private static readonly IGNORE_FOLDERS = new Set([
    'node_modules', '.git', 'build', 'dist', 'out', 'bin', 'obj', 'Library', 'Temp', 'coverage', '.next'
  ])
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

    try {
      // Find indicators of projects up to depth 5
      // This is dramatically faster than manual fs traversal and doesn't block the UI thread
      const entries = await fg([
        '**/package.json',
        '**/requirements.txt',
        '**/pyproject.toml',
        '**/*.uproject',
        '**/ProjectSettings/ProjectVersion.txt'
      ], {
        cwd: basePath,
        ignore: Array.from(this.IGNORE_FOLDERS).map(f => `**/${f}/**`),
        deep: this.MAX_DEPTH + 1, // +1 because ProjectSettings is a subfolder
        absolute: true,
        onlyFiles: true,
        suppressErrors: true
      })

      const uniqueDirs = new Set<string>()
      for (const entry of entries) {
        // If it was ProjectSettings/ProjectVersion.txt, the project root is one level higher
        const dir = entry.endsWith('ProjectVersion.txt')
          ? path.dirname(path.dirname(entry))
          : path.dirname(entry)
        uniqueDirs.add(dir)
      }

      for (const dir of uniqueDirs) {
        const project = this.detectProject(dir)
        if (project) {
          projects.push(project)
        }
      }
    } catch (e) {
      console.error(`Error scanning directory ${basePath}:`, e)
    }

    // Update cache
    projects.forEach(p => this.projectsCache.set(p.id, p))

    return projects
  }

  public static getProject(id: string): Project | undefined {
    return this.projectsCache.get(id)
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
        const scripts = pkg.scripts || {}

        let projectType: ProjectType = 'node'
        let detectedBy = 'package.json'

        let confidenceScore: 'high' | 'medium' | 'low' = 'low'

        // Check for runnable scripts
        if (scripts.start || scripts.dev || scripts.build) {
          confidenceScore = 'medium'
        }

        // Framework checks (automatic high confidence)
        if (deps['nextron']) {
          projectType = 'nextron'
          detectedBy = 'package.json (nextron)'
          confidenceScore = 'high'
        } else if (deps['electron']) {
          projectType = 'electron'
          detectedBy = 'package.json (electron)'
          confidenceScore = 'high'
        } else if (deps['next']) {
          projectType = 'nextjs'
          confidenceScore = 'high'
        } else if (deps['react']) {
          projectType = 'react'
          confidenceScore = 'medium'
        }

        // Structural checks
        if (fs.existsSync(path.join(projectPath, 'src'))) {
          confidenceScore = confidenceScore === 'low' ? 'medium' : 'high'
        }

        const frameworkConfigs = ['next.config.js', 'vite.config.ts', 'vite.config.js', 'angular.json', 'vue.config.js', 'gatsby-config.js']
        for (const config of frameworkConfigs) {
          if (fs.existsSync(path.join(projectPath, config))) {
            confidenceScore = 'high'
            break
          }
        }

        // If it's a bare package.json with no scripts, no src, no framework config -> likely a dependency artifact/sub-module. Ignore it.
        if (confidenceScore === 'low') {
          return null
        }

        const project: Project = {
          id: uuidv4(),
          name,
          path: projectPath,
          projectType,
          runtime: 'node',
          detectedBy,
          lastModified,
          confidenceScore
        }
        triggerSizeCalculation(project)
        return project
      } catch (e) {
        // Fallback to generic Node if JSON is invalid but treat as low confidence -> ignore
        return null
      }
    }

    // Python
    if (fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
      const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'python', runtime: 'python', detectedBy: 'python indicators', lastModified, confidenceScore: 'high' }
      triggerSizeCalculation(project)
      return project
    }

    // Unity
    if (fs.existsSync(path.join(projectPath, 'Assets')) &&
      fs.existsSync(path.join(projectPath, 'ProjectSettings'))) {
      const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'unity', runtime: 'unity', detectedBy: 'Unity folders', lastModified, confidenceScore: 'high' }
      triggerSizeCalculation(project)
      return project
    }

    // Unreal
    const files = fs.readdirSync(projectPath)
    const uproject = files.find(f => f.endsWith('.uproject'))
    if (uproject) {
      const project: Project = { id: uuidv4(), name, path: projectPath, projectType: 'unreal', runtime: 'unreal', detectedBy: uproject, lastModified, confidenceScore: 'high' }
      triggerSizeCalculation(project)
      return project
    }

    return null
  }
}
