import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export type EnvironmentStatus = 'installed' | 'outdated' | 'missing'

export interface EnvironmentCheckResult {
    tool: string
    status: EnvironmentStatus
    version?: string
    message?: string
}

export class EnvironmentService {
    /**
     * Run a CLI command simply to get stdout safely.
     */
    private static async getRawVersion(command: string): Promise<string | null> {
        try {
            const { stdout } = await execAsync(command)
            return stdout.trim()
        } catch {
            return null
        }
    }

    public static async checkNode(): Promise<EnvironmentCheckResult> {
        const output = await this.getRawVersion('node -v')
        if (!output) {
            return { tool: 'Node.js', status: 'missing', message: 'Node.js is not installed' }
        }
        const version = output.replace('v', '')
        return { tool: 'Node.js', status: 'installed', version }
    }

    public static async checkNpm(): Promise<EnvironmentCheckResult> {
        const output = await this.getRawVersion('npm -v')
        if (!output) {
            return { tool: 'npm', status: 'missing', message: 'npm is not installed' }
        }
        return { tool: 'npm', status: 'installed', version: output }
    }

    public static async checkPython(): Promise<EnvironmentCheckResult> {
        let output = await this.getRawVersion('python -V')
        if (!output) {
            output = await this.getRawVersion('python3 -V')
        }

        if (!output) {
            return { tool: 'Python', status: 'missing', message: 'Python is not installed or not in PATH' }
        }
        const version = output.replace('Python ', '')
        return { tool: 'Python', status: 'installed', version }
    }

    public static async checkFlutter(): Promise<EnvironmentCheckResult> {
        const output = await this.getRawVersion('flutter --version')
        if (!output) {
            return { tool: 'Flutter', status: 'missing', message: 'Flutter SDK is not installed or not in PATH' }
        }
        const match = output.match(/Flutter (\d+\.\d+\.\d+)/)
        const version = match ? match[1] : 'Unknown'
        return { tool: 'Flutter', status: 'installed', version }
    }

    public static async checkAll(): Promise<EnvironmentCheckResult[]> {
        const checks = [
            this.checkNode(),
            this.checkNpm(),
            this.checkPython(),
            this.checkFlutter()
        ]
        return Promise.all(checks)
    }
}
