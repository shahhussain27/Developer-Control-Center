import { spawn } from 'child_process'
import { IdeInfo, IdeLaunchError } from '../../common/types'
import { SettingsService } from './SettingsService'

export class IdeService {
  private static supportedIdes = [
    { name: 'Visual Studio Code', executables: ['Code.exe', 'Code'] },
    { name: 'VS Code Insiders', executables: ['Code - Insiders.exe'] },
    { name: 'WebStorm', executables: ['webstorm64.exe'] },
    { name: 'IntelliJ IDEA', executables: ['idea64.exe'] },
    { name: 'PyCharm', executables: ['pycharm64.exe'] }
  ]

  /**
   * Spawns 'where' command to find paths for a given executable name.
   */
  private static async findExecutablePath(executable: string): Promise<string | null> {
    return new Promise((resolve) => {
      // Windows 'where' command will output the absolute path(s) to the exec
      const proc = spawn('where', [executable])

      let out = ''
      proc.stdout.on('data', (d) => { out += d.toString() })

      proc.on('close', (code) => {
        if (code === 0 && out.trim()) {
          // 'where' might return multiple lines if found in multiple PATH locations; take the first one
          const firstPath = out.trim().split('\n')[0].trim()
          resolve(firstPath)
        } else {
          resolve(null)
        }
      })

      proc.on('error', () => {
        resolve(null)
      })
    })
  }

  private static cachedIdes: IdeInfo[] | null = null;
  private static detectPromise: Promise<IdeInfo[]> | null = null;

  /**
   * Detects available system IDEs from the supported list by checking the PATH
   */
  public static async detectIdes(): Promise<IdeInfo[]> {
    if (this.cachedIdes) return this.cachedIdes;
    if (this.detectPromise) return this.detectPromise;

    this.detectPromise = (async () => {
      const detected: IdeInfo[] = []

      await Promise.all(this.supportedIdes.map(async (ideDef) => {
        for (const exec of ideDef.executables) {
          const path = await this.findExecutablePath(exec)
          if (path) {
            detected.push({
              name: ideDef.name,
              path
            })
            break // Found the first executable for this IDE type, stop looking for alternatives
          }
        }
      }))

      this.cachedIdes = detected;
      return detected;
    })();

    return this.detectPromise;
  }

  /**
   * Lists all IDEs by combining detected system IDEs and Custom IDEs from settings
   */
  public static async listIdes(): Promise<IdeInfo[]> {
    const detected = await this.detectIdes()
    const settings = SettingsService.getSettings()
    const custom = settings.customIdes || []

    return [...detected, ...custom]
  }

  /**
   * Launches the given IDE with the project path.
   * Emits a structured IdeLaunchError if it fails.
   */
  public static launchIde(idePath: string, projectPath: string, ideName: string): Promise<void | { error: IdeLaunchError }> {
    return new Promise((resolve) => {
      try {
        const isWin = process.platform === 'win32'
        // On Windows with shell: true, command strings with spaces need surrounding quotes
        const cmd = isWin ? `"${idePath}"` : idePath
        const args = isWin ? [`"${projectPath}"`] : [projectPath]

        const proc = spawn(cmd, args, {
          detached: true,
          stdio: 'ignore',
          shell: isWin
        })

        proc.on('error', (err: Error & { code?: string }) => {
          let code: IdeLaunchError['code'] = 'SPAWN_FAILURE'
          if (err.code === 'ENOENT') code = 'EXECUTABLE_MISSING'
          if (err.code === 'EACCES') code = 'PERMISSION_DENIED'

          resolve({
            error: {
              code,
              message: err.message,
              projectId: 'UNKNOWN', // Doesn't strictly map to a single project instance run
              ideName
            }
          })
        })

        // Let it run independently
        if (proc.pid) {
          proc.unref()
          resolve() // Successfully spawned
        }
      } catch (err: any) {
        resolve({
          error: {
            code: 'SPAWN_FAILURE',
            message: err.message || 'Unknown spawn error',
            projectId: 'UNKNOWN',
            ideName
          }
        })
      }
    })
  }
}
