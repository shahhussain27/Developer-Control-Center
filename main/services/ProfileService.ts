import Store from 'electron-store'
import { StartupProfile } from '../../common/types'
import { ProcessService } from './ProcessService'

const schema: any = {
  profiles: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        projectId: { type: 'string' },
        name: { type: 'string' },
        commands: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              command: { type: 'string' },
              args: { type: 'array', items: { type: 'string' } },
              cwd: { type: 'string' }
            }
          }
        }
      }
    }
  }
}

export class ProfileService {
  private static store = new Store({ schema })
  private static runningProfiles: Map<string, boolean> = new Map()

  public static getProfiles(projectId: string): StartupProfile[] {
    const allProfiles = this.store.get('profiles') as StartupProfile[]
    return allProfiles.filter(p => p.projectId === projectId)
  }

  public static saveProfile(profile: StartupProfile): void {
    const allProfiles = this.store.get('profiles') as StartupProfile[]
    const index = allProfiles.findIndex(p => p.id === profile.id)
    if (index !== -1) {
      allProfiles[index] = profile
    } else {
      allProfiles.push(profile)
    }
    this.store.set('profiles', allProfiles)
  }

  public static deleteProfile(profileId: string): void {
    const allProfiles = this.store.get('profiles') as StartupProfile[]
    const filtered = allProfiles.filter(p => p.id !== profileId)
    this.store.set('profiles', filtered)
  }

  public static async runProfile(profileId: string): Promise<void> {
    const allProfiles = this.store.get('profiles') as StartupProfile[]
    const profile = allProfiles.find(p => p.id === profileId)
    if (!profile) throw new Error('Profile not found')

    if (this.runningProfiles.get(profileId)) {
      throw new Error('Profile is already running')
    }

    this.runningProfiles.set(profileId, true)

    try {
      for (const cmd of profile.commands) {
        if (!this.runningProfiles.get(profileId)) {
          console.log(`[ProfileService] Profile ${profile.name} stopped manually.`)
          break
        }
        
        console.log(`[ProfileService] Running command: ${cmd.command} ${cmd.args.join(' ')}`)
        await ProcessService.runRawCommandAsync(profile.projectId, cmd.command, cmd.args, cmd.cwd || '.')
      }
    } catch (error) {
      console.error(`[ProfileService] Error executing profile ${profile.name}:`, error)
      throw error
    } finally {
      this.runningProfiles.delete(profileId)
    }
  }

  public static stopProfile(profileId: string): void {
    const allProfiles = this.store.get('profiles') as StartupProfile[]
    const profile = allProfiles.find(p => p.id === profileId)
    if (profile) {
      this.runningProfiles.set(profileId, false)
      ProcessService.stopCommand(profile.projectId)
    }
  }
}
