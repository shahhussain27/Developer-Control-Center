import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { ProjectType } from '../../common/types'
import { BrowserWindow } from 'electron'

export class CreationService {
    /**
     * Spawns the CLI project creation command and streams logs back to the renderer.
     * Resolves when the creation process exits successfully.
     */
    public static async createProject(
        type: ProjectType,
        name: string,
        directory: string,
        onLog: (data: string) => void
    ): Promise<string> {
        const targetPath = path.join(directory, name)

        // Make sure we don't overwrite
        if (fs.existsSync(targetPath)) {
            throw new Error(`Directory already exists: ${targetPath}`)
        }

        let command = ''
        let args: string[] = []

        const isWin = process.platform === 'win32'
        const shellCommand = isWin ? 'cmd.exe' : 'sh'

        // Determine scaffolding commands based on type
        switch (type) {
            case 'react':
                command = 'npm'
                args = ['create', 'vite@latest', name, '--', '--template', 'react-ts']
                break
            case 'nextjs':
                command = 'npx'
                args = ['create-next-app@latest', name, '--yes', '--eslint', '--typescript', '--tailwind', '--src-dir', '--app', '--import-alias', '"@/*"']
                break
            case 'node': {
                // ─────────────────────────────────────────────
                // Full Express / Node Starter Scaffold
                // ─────────────────────────────────────────────
                fs.mkdirSync(targetPath, { recursive: true })

                const dirs = [
                    path.join(targetPath, 'src'),
                    path.join(targetPath, 'routes'),
                    path.join(targetPath, 'controllers'),
                    path.join(targetPath, 'middlewares'),
                    path.join(targetPath, 'config'),
                ]
                for (const d of dirs) fs.mkdirSync(d, { recursive: true })

                // package.json
                const pkgJson = {
                    name,
                    version: '1.0.0',
                    description: `${name} — Express REST API`,
                    main: 'src/index.js',
                    scripts: {
                        start: 'node src/index.js',
                        dev: 'nodemon src/index.js',
                    },
                    keywords: [],
                    author: '',
                    license: 'ISC',
                }
                fs.writeFileSync(
                    path.join(targetPath, 'package.json'),
                    JSON.stringify(pkgJson, null, 2),
                )

                // src/index.js — Express server entry point
                fs.writeFileSync(
                    path.join(targetPath, 'src', 'index.js'),
                    `require('dotenv').config()
const express = require('express')
const apiRouter = require('../routes')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Mount API routes
app.use('/api', apiRouter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`)
})

module.exports = app
`
                )

                // routes/index.js
                fs.writeFileSync(
                    path.join(targetPath, 'routes', 'index.js'),
                    `const { Router } = require('express')
const router = Router()

// Example route — replace with your own
router.get('/test', (_req, res) => {
  res.json({ message: 'API is working!' })
})

module.exports = router
`
                )

                // controllers/.gitkeep, middlewares/.gitkeep
                fs.writeFileSync(path.join(targetPath, 'controllers', '.gitkeep'), '')
                fs.writeFileSync(path.join(targetPath, 'middlewares', '.gitkeep'), '')

                // config/index.js
                fs.writeFileSync(
                    path.join(targetPath, 'config', 'index.js'),
                    `module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
}
`
                )

                // .env
                fs.writeFileSync(
                    path.join(targetPath, '.env'),
                    `PORT=3000\nNODE_ENV=development\n`
                )

                // .gitignore
                fs.writeFileSync(
                    path.join(targetPath, '.gitignore'),
                    `node_modules/\n.env\ndist/\nbuild/\n*.log\n`
                )

                // README.md
                fs.writeFileSync(
                    path.join(targetPath, 'README.md'),
                    `# ${name}\n\nA Node.js + Express REST API starter.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nServer runs on [http://localhost:3000](http://localhost:3000).\n\n## Endpoints\n\n| Method | Route | Description |\n|--------|-------|-------------|\n| GET | /health | Health check |\n| GET | /api/test | Example API route |\n`
                )

                // Now run npm install in the created directory
                command = 'npm'
                args = ['install', '--save', 'express', 'dotenv', '--save-dev', 'nodemon']
                directory = targetPath
                break
            }
            case 'python':
                // Create directory and virtual env
                fs.mkdirSync(targetPath, { recursive: true })
                command = 'python'
                args = ['-m', 'venv', 'venv']
                directory = targetPath
                break
            case 'flutter':
                command = 'flutter'
                args = ['create', name]
                break
            case 'react-native':
                command = 'npx'
                args = ['react-native@latest', 'init', name]
                break
            case 'electron':
                command = 'npx'
                args = ['create-electron-app', name]
                break
            case 'nextron':
                command = 'npx'
                args = ['create-nextron-app', name]
                break
            case 'unity': {
                const { unityPath } = require('./SettingsService').SettingsService.getSettings() // Lazy load to avoid circular init issues if any
                if (!unityPath || !fs.existsSync(unityPath)) {
                    throw new Error('Unity executable path is not configured or invalid in Settings.')
                }
                command = `"${unityPath}"`
                args = ['-createProject', `"${targetPath}"`, '-batchmode', '-quit', '-logFile', '-']
                break
            }
            case 'unreal': {
                const { unrealPath } = require('./SettingsService').SettingsService.getSettings()
                if (!unrealPath) {
                    throw new Error('Unreal Engine UePrjCreator path is not configured in Settings.')
                }
                command = `"${unrealPath}"`
                args = [`"${path.join(targetPath, name + '.uproject')}"`]
                fs.mkdirSync(targetPath, { recursive: true })
                break
            }
            default:
                throw new Error(`Creation for project type '${type}' is not supported yet.`)
        }

        return new Promise((resolve, reject) => {
            onLog(`Starting creation for ${type}: ${command} ${args.join(' ')}\n`)

            let fullStderr = ''

            const child = spawn(command, args, {
                cwd: directory,
                shell: true,
                env: { ...process.env, FORCE_COLOR: '1' } // Force color output for ansi rendering
            })

            child.stdout.on('data', (data) => {
                onLog(data.toString())
            })

            child.stderr.on('data', (data) => {
                const text = data.toString()
                fullStderr += text
                onLog(text)
            })

            child.on('error', (err) => {
                onLog(`\n[Error] Failed to start process: ${err.message}\n`)
                reject({ message: err.message, stderr: fullStderr, exitCode: -1 })
            })

            child.on('close', (code) => {
                if (code === 0) {
                    onLog(`\n✅ Successfully created project: ${name}\n`)
                    // For node and python where we created the folder ourselves, return targetPath
                    resolve(targetPath)
                } else {
                    onLog(`\n❌ Process exited with code ${code}\n`)
                    reject({ message: `Creation process exited with code ${code}`, stderr: fullStderr, exitCode: code })
                }
            })
        })
    }

    /**
     * Broadcasts a creation log event to all renderer windows.
     */
    public static emitCreationLog(data: string) {
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('creation-log', data)
        })
    }
}
