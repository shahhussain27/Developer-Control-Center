import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import semver from 'semver'
import { CheckResult, DiagnosticResult, ProjectType, Settings } from '../../common/types'
import { SettingsService } from './SettingsService'
import { ScannerService } from './ScannerService'

export class DoctorService {
  public static async checkProject(projectId: string): Promise<DiagnosticResult> {
    const project = ScannerService.getProject(projectId)
    if (!project) {
      return { 
        projectId, 
        checks: [{ status: 'ERROR', message: `Project with ID ${projectId} not found. Please re-scan.` }] 
      }
    }

    return this.runDiagnostic(project.path, project.projectType)
  }

  public static async runDiagnostic(projectPath: string, type: ProjectType): Promise<DiagnosticResult> {
    const checks: CheckResult[] = []

    switch (type) {
      case 'node':
      case 'react':
      case 'nextjs':
      case 'electron':
      case 'nextron':
        await this.checkNodeProject(projectPath, checks)
        break
      case 'python':
        await this.checkPythonProject(projectPath, checks)
        break
      case 'unity':
        await this.checkUnityProject(projectPath, checks)
        break
      case 'unreal':
        await this.checkUnrealProject(projectPath, checks)
        break
      default:
        checks.push({ status: 'WARNING', message: `No specific diagnostics for project type: ${type}` })
    }

    return { projectId: projectPath, checks } // Using path as ID for now if not found
  }

  private static async checkNodeProject(projectPath: string, checks: CheckResult[]) {
    // 1. Node presence & version
    try {
      const nodeVersion = await this.getCommandVersion('node', ['--version'])
      checks.push({ status: 'OK', message: `Node.js found: ${nodeVersion}` })

      // Version compatibility check (if package.json has engines)
      const pkgPath = path.join(projectPath, 'package.json')
      const pkgData = await fs.readFile(pkgPath, 'utf8')
      const pkg = JSON.parse(pkgData)
      
      if (pkg.engines && pkg.engines.node) {
        if (semver.satisfies(nodeVersion, pkg.engines.node)) {
          checks.push({ status: 'OK', message: `Node version ${nodeVersion} satisfies requirement ${pkg.engines.node}` })
        } else {
          checks.push({ status: 'ERROR', message: `Node version ${nodeVersion} does NOT satisfy ${pkg.engines.node}` })
        }
      }
    } catch (e) {
      checks.push({ status: 'ERROR', message: 'Node.js is not installed or not in PATH' })
    }

    // 2. node_modules presence
    const nmPath = path.join(projectPath, 'node_modules')
    if (await this.exists(nmPath)) {
      checks.push({ status: 'OK', message: 'node_modules folder found' })
    } else {
      checks.push({ status: 'ERROR', message: 'node_modules folder is missing. Run install command.' })
    }

    // 3. Package manager detection
    if (await this.exists(path.join(projectPath, 'package-lock.json'))) {
      checks.push({ status: 'OK', message: 'Detected npm as package manager' })
    } else if (await this.exists(path.join(projectPath, 'yarn.lock'))) {
      checks.push({ status: 'OK', message: 'Detected yarn as package manager' })
    } else if (await this.exists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      checks.push({ status: 'OK', message: 'Detected pnpm as package manager' })
    } else {
      checks.push({ status: 'WARNING', message: 'No lockfile found. Manual installation might be needed.' })
    }
  }

  private static async checkPythonProject(projectPath: string, checks: CheckResult[]) {
    // 1. Python presence
    try {
      const pyVersion = await this.getCommandVersion('python', ['--version'])
      checks.push({ status: 'OK', message: `Python found: ${pyVersion}` })
    } catch (e) {
      try {
        const py3Version = await this.getCommandVersion('python3', ['--version'])
        checks.push({ status: 'OK', message: `Python 3 found: ${py3Version}` })
      } catch (e3) {
        checks.push({ status: 'ERROR', message: 'Python is not installed or not in PATH' })
      }
    }

    // 2. Dependency file presence
    const hasReqs = await this.exists(path.join(projectPath, 'requirements.txt'))
    const hasPyProject = await this.exists(path.join(projectPath, 'pyproject.toml'))
    if (hasReqs || hasPyProject) {
      checks.push({ status: 'OK', message: `Dependency file found (${hasReqs ? 'requirements.txt' : 'pyproject.toml'})` })
    } else {
      checks.push({ status: 'WARNING', message: 'No standard Python dependency file found (requirements.txt or pyproject.toml)' })
    }

    // 3. Virtual environment presence
    const venvFolders = ['.venv', 'venv', 'env']
    let venvFound = false
    for (const folder of venvFolders) {
      if (await this.exists(path.join(projectPath, folder))) {
        checks.push({ status: 'OK', message: `Virtual environment found: ${folder}` })
        venvFound = true
        break
      }
    }
    if (!venvFound) {
      checks.push({ status: 'WARNING', message: 'No local virtual environment found (.venv, venv, env)' })
    }
  }

  private static async checkUnityProject(projectPath: string, checks: CheckResult[]) {
    const settings = SettingsService.getSettings()
    
    // 1. Unity executable configured
    if (settings.unityPath) {
      checks.push({ status: 'OK', message: 'Unity path configured in settings' })
      
      // 2. Executable existence
      if (await this.exists(settings.unityPath)) {
        checks.push({ status: 'OK', message: 'Unity executable exists at path' })
      } else {
        checks.push({ status: 'ERROR', message: `Unity executable NOT found at: ${settings.unityPath}` })
      }
    } else {
      checks.push({ status: 'WARNING', message: 'Unity path not configured in settings' })
    }

    // 3. Valid project structure
    const hasAssets = await this.exists(path.join(projectPath, 'Assets'))
    const hasProjectSettings = await this.exists(path.join(projectPath, 'ProjectSettings'))
    if (hasAssets && hasProjectSettings) {
      checks.push({ status: 'OK', message: 'Valid Unity project structure detected' })
    } else {
      checks.push({ status: 'ERROR', message: 'Missing Unity project structure (Assets or ProjectSettings)' })
    }
  }

  private static async checkUnrealProject(projectPath: string, checks: CheckResult[]) {
    const settings = SettingsService.getSettings()

    // 1. UEEditor executable configured
    if (settings.unrealPath) {
      checks.push({ status: 'OK', message: 'Unreal Editor path configured in settings' })

      // 2. Executable existence
      if (await this.exists(settings.unrealPath)) {
        checks.push({ status: 'OK', message: 'Unreal Editor executable exists at path' })
      } else {
        checks.push({ status: 'ERROR', message: `Unreal Editor executable NOT found at: ${settings.unrealPath}` })
      }
    } else {
      checks.push({ status: 'WARNING', message: 'Unreal Editor path not configured in settings' })
    }

    // 3. .uproject existence
    try {
      const files = await fs.readdir(projectPath)
      const uprojectFile = files.find(f => f.endsWith('.uproject'))
      if (uprojectFile) {
        checks.push({ status: 'OK', message: `Unreal project file found: ${uprojectFile}` })
      } else {
        checks.push({ status: 'ERROR', message: 'No .uproject file found in the root directory' })
      }
    } catch (e) {
      checks.push({ status: 'ERROR', message: 'Failed to read project directory' })
    }
  }

  private static async exists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath)
      return true
    } catch {
      return false
    }
  }

  private static getCommandVersion(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args)
      let output = ''
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim().replace(/^v/, ''))
        } else {
          reject(new Error(`Command ${command} exited with code ${code}`))
        }
      })
      child.on('error', (err) => {
        reject(err)
      })
    })
  }
}
