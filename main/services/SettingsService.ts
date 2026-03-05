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
  },
  ignoredProjects: {
    type: 'array',
    items: { type: 'string' },
    default: []
  },
  projectAliases: {
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
      projectUsage: this.store.get('projectUsage') as Record<string, number> || {},
      ignoredProjects: this.store.get('ignoredProjects') as string[] || [],
      projectAliases: this.store.get('projectAliases') as Record<string, string> || {}
    }
  }

  public static saveSettings(settings: Settings): void {
    this.store.set('scanLocations', settings.scanLocations)
    this.store.set('unityPath', settings.unityPath || '')
    this.store.set('unrealPath', settings.unrealPath || '')
    this.store.set('customIdes', settings.customIdes || [])
    this.store.set('projectUsage', settings.projectUsage || {})
    this.store.set('ignoredProjects', settings.ignoredProjects || [])
    this.store.set('projectAliases', settings.projectAliases || {})
  }

  public static incrementProjectUsage(projectId: string): void {
    const settings = this.getSettings()
    const usage = settings.projectUsage || {}
    usage[projectId] = (usage[projectId] || 0) + 1
    this.saveSettings({ ...settings, projectUsage: usage })
  }

  public static ignoreProject(path: string): void {
    const settings = this.getSettings()
    const ignored = new Set(settings.ignoredProjects || [])
    ignored.add(path)
    this.saveSettings({ ...settings, ignoredProjects: Array.from(ignored) })
  }

  public static setProjectAlias(path: string, alias: string): void {
    const settings = this.getSettings()
    const aliases = { ...(settings.projectAliases || {}) }
    if (alias.trim() === '') {
      delete aliases[path] // Remove alias if empty
    } else {
      aliases[path] = alias
    }
    this.saveSettings({ ...settings, projectAliases: aliases })
  }

  public static addLocation(locationPath: string): void {
    const settings = this.getSettings()
    if (!settings.scanLocations.includes(locationPath)) {
      this.saveSettings({ ...settings, scanLocations: [...settings.scanLocations, locationPath] })
    }
  }

  public static removeLocation(locationPath: string): void {
    const settings = this.getSettings()
    this.saveSettings({
      ...settings,
      scanLocations: settings.scanLocations.filter(loc => loc !== locationPath)
    })
  }
}
