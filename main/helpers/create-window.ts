import { screen, BrowserWindow, BrowserWindowConstructorOptions, Rectangle } from 'electron'
import Store from 'electron-store'

interface WindowState {
  x?: number
  y?: number
  width?: number
  height?: number
}

export const createWindow = (
  windowName: string,
  options: BrowserWindowConstructorOptions,
): BrowserWindow => {
  const key  = 'window-state'
  const name = `window-state-${windowName}`
  const store = new Store<Record<string, WindowState>>({ name })

  const defaultSize: WindowState = {
    width:  options.width ?? 1200,
    height: options.height ?? 800,
  }

  const restore = (): WindowState =>
    store.get(key, defaultSize) as WindowState

  const getCurrentPosition = (): WindowState => {
    const [x, y]           = win.getPosition()
    const [width, height]   = win.getSize()
    return { x, y, width, height }
  }

  const windowWithinBounds = (windowState: WindowState, bounds: Rectangle): boolean => {
    return (
      (windowState.x ?? 0)  >= bounds.x &&
      (windowState.y ?? 0)  >= bounds.y &&
      (windowState.x ?? 0) + (windowState.width  ?? 0) <= bounds.x + bounds.width &&
      (windowState.y ?? 0) + (windowState.height ?? 0) <= bounds.y + bounds.height
    )
  }

  const resetToDefaults = (): WindowState => {
    const bounds = screen.getPrimaryDisplay().bounds
    return {
      ...defaultSize,
      x: Math.round((bounds.width  - (defaultSize.width  ?? 1200)) / 2),
      y: Math.round((bounds.height - (defaultSize.height ?? 800))  / 2),
    }
  }

  const ensureVisibleOnSomeDisplay = (windowState: WindowState): WindowState => {
    const visible = screen.getAllDisplays().some(
      (display) => windowWithinBounds(windowState, display.bounds),
    )
    return visible ? windowState : resetToDefaults()
  }

  const saveState = (): void => {
    if (!win.isMinimized() && !win.isMaximized()) {
      Object.assign(state, getCurrentPosition())
    }
    store.set(key, state)
  }

  let state: WindowState = ensureVisibleOnSomeDisplay(restore())

  const win = new BrowserWindow({
    ...state,
    ...options,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      ...options.webPreferences,
    },
  })

  win.on('close', saveState)

  return win
}
