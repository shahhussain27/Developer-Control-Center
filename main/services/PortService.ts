import { spawn } from 'child_process'
import { PortInfo } from '../../common/types'
import { ScannerService } from './ScannerService'
import { ProcessService } from './ProcessService'

export class PortService {
  /**
   * Scans active ports on the system using netstat (Windows specific)
   * Maps ports to PIDs and attempts to identify known projects.
   */
  public static async getActivePorts(): Promise<PortInfo[]> {
    return new Promise((resolve, reject) => {
      const portsMap: Map<number, PortInfo> = new Map()
      const child = spawn('netstat', ['-ano', '-p', 'tcp'], { shell: true })
      let output = ''

      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      child.on('close', async () => {
        const lines = output.split('\n')
        const portIdentificationPromises: Promise<void>[] = []

        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length < 5 || parts[0] !== 'TCP') continue

          const localAddress = parts[1]
          const state = parts[3]
          const pid = parseInt(parts[4])

          const portStr = localAddress.split(':').pop()
          if (!portStr) continue
          const port = parseInt(portStr)

          if (isNaN(port) || isNaN(pid) || state !== 'LISTENING') continue
          if (portsMap.has(port)) continue

          const portInfo: PortInfo = {
            port,
            pid,
            protocol: 'TCP',
            state,
          }

          portsMap.set(port, portInfo)
          portIdentificationPromises.push(this.identifyProjectAsync(portInfo))
        }

        // Wait for all async IDs to finish including process name lookups
        await Promise.all(portIdentificationPromises)
        resolve(Array.from(portsMap.values()))
      })

      child.on('error', (error: Error) => {
        console.error('[PortService] Error running netstat:', error)
        reject(new Error('Failed to scan active ports'))
      })
    })
  }

  private static async identifyProjectAsync(portInfo: PortInfo): Promise<void> {
    // 1. Deterministic Project ID from ancestry
    const projectId = await ProcessService.identifyProjectIdFromPid(portInfo.pid)
    if (projectId) {
      const project = ScannerService.getProject(projectId)
      if (project) {
        portInfo.projectId = projectId
        portInfo.projectName = project.name
      }
    }

    // 2. Get process name using tasklist (spawn instead of exec)
    return new Promise((resolve) => {
      const child = spawn('tasklist', ['/FI', `PID eq ${portInfo.pid}`, '/NH', '/FO', 'CSV'], { shell: true })
      let output = ''

      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      child.on('close', () => {
        if (output.trim()) {
          // Output format: "Image Name","PID","Session Name","Session#","Mem Usage"
          const parts = output.trim().split(',')
          if (parts.length > 0) {
            portInfo.processName = parts[0].replace(/"/g, '')
          }
        }
        resolve()
      })

      child.on('error', () => resolve())
    })
  }
}
