import React from 'react'

/**
 * Custom window chrome controls.
 *
 * Architecture:
 *  - These buttons emit IPC events via preload: window.ipc.windowMinimize / Maximize / Close
 *  - The main process handles them via ipcMain.on('window-minimize' | 'window-maximize' | 'window-close')
 *  - The renderer NEVER accesses BrowserWindow directly — Task Group 5 constraint satisfied.
 *
 * CSS:
 *  - Must be wrapped in a parent element with `WebkitAppRegion: 'no-drag'`
 *  - to prevent click events from being swallowed by the draggable header region.
 */
export const WindowControls: React.FC = () => {
  const handleMinimize = () => window.ipc.windowMinimize()
  const handleMaximize = () => window.ipc.windowMaximize()
  const handleClose    = () => window.ipc.windowClose()

  return (
    <div
      className="flex items-center gap-1.5"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Minimize */}
      <button
        onClick={handleMinimize}
        title="Minimize"
        className="group w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors flex items-center justify-center"
        aria-label="Minimize window"
      >
        <span className="hidden group-hover:block w-1.5 h-px bg-yellow-900/70 rounded-full" />
      </button>

      {/* Maximize / Restore */}
      <button
        onClick={handleMaximize}
        title="Maximize / Restore"
        className="group w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors flex items-center justify-center"
        aria-label="Maximize or restore window"
      >
        <span className="hidden group-hover:block w-1.5 h-1.5 border border-green-900/70 rounded-[1px]" />
      </button>

      {/* Close */}
      <button
        onClick={handleClose}
        title="Close"
        className="group w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors flex items-center justify-center"
        aria-label="Close window"
      >
        <span className="hidden group-hover:block text-[6px] leading-none text-red-900/80 font-bold select-none">✕</span>
      </button>
    </div>
  )
}
