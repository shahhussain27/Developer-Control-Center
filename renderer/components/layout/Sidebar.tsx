import { LayoutGrid, Activity, Settings, ChevronRight, Hash, Cpu, Zap, Globe } from 'lucide-react'
import { cn } from '../../lib/utils'
import Image from 'next/image'

export type ViewType = 'projects' | 'network' | 'settings' | 'resources' | 'ports'

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'projects' as ViewType, label: 'Projects', icon: LayoutGrid },
    { id: 'network' as ViewType, label: 'Network', icon: Globe },
    { id: 'ports' as ViewType, label: 'Port Resolver', icon: Zap },
    { id: 'resources' as ViewType, label: 'Resources', icon: Cpu },
    { id: 'settings' as ViewType, label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="w-64 border-r border-muted/30 bg-card/30 backdrop-blur-xl flex flex-col h-full shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
            <Image src="/images/logo.png" priority={true} alt="Logo" width={32} height={32} className="drop-shadow-[0_0_8px_rgba(50,205,50,0.5)]" />
          </div>
          <span className="font-black tracking-tighter text-md uppercase bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent drop-shadow-sm">
            Control Center
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                isActive
                  ? "bg-gradient-to-r from-purple-500/10 to-green-500/10 text-green-400 shadow-lg shadow-green-500/5 border border-green-500/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "group-hover:scale-110 transition-transform")} />
              <span className="flex-1 text-left tracking-wide">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 opacity-50 text-green-400" />}
            </button>
          )
        })}
      </nav>

      <div className="p-6 border-t border-muted/30 space-y-4">
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 shadow-inner">
          <div className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-3">System Info</div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="opacity-50">Status</span>
              <div className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-2 py-0.5 rounded-md border border-green-400/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Online</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="opacity-50">Engine</span>
              <span className="text-white/70 font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded-md border border-white/10">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
