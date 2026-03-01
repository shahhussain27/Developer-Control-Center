import Store from 'electron-store'
import { Settings } from '../../common/types'

const schema: any = {
  scanLocations: {
    type: 'array',
    items: { type: 'string' },
    default: []
  },
  unityPath: {
    type: 'string',
    default: ''
  },
  unrealPath: {
    type: 'string',
    default: ''
  },
  customIdes: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        path: { type: 'string' }
      },
      required: ['name', 'path']
    },
    default: []
  },
  projectUsage: {
    type: 'object',
    default: {}
  }
}

export class SettingsService {
  private static store = new Store({ schema })

  public static getSettings(): Settings {
    return {
      scanLocations: this.store.get('scanLocations') as string[],
      unityPath: this.store.get('unityPath') as string,
      unrealPath: this.store.get('unrealPath') as string,
      customIdes: this.store.get('customIdes') as any[] || [],
      projectUsage: this.store.get('projectUsage') as Record<string, number> || {}
    }
  }

  public static saveSettings(settings: Settings): void {
    this.store.set('scanLocations', settings.scanLocations)
    this.store.set('unityPath', settings.unityPath || '')
    this.store.set('unrealPath', settings.unrealPath || '')
    this.store.set('customIdes', settings.customIdes || [])
    this.store.set('projectUsage', settings.projectUsage || {})
  }

  public static incrementProjectUsage(projectId: string): void {
    const settings = this.getSettings()
    const usage = settings.projectUsage || {}
    usage[projectId] = (usage[projectId] || 0) + 1
    this.saveSettings({ ...settings, projectUsage: usage })
  }

  public static addLocation(path: string): void {
    const locations = this.getSettings().scanLocations
    if (!locations.includes(path)) {
      this.saveSettings({ scanLocations: [...locations, path] })
    }
  }

  public static removeLocation(path: string): void {
    const locations = this.getSettings().scanLocations
    this.saveSettings({
      scanLocations: locations.filter(loc => loc !== path)
    })
  }
}
