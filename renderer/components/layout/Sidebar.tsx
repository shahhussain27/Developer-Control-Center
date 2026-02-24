import { LayoutGrid, Activity, Settings, ChevronRight, Hash, Cpu, Zap, Globe } from 'lucide-react'
import { cn } from '../../lib/utils'

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
    <aside className="w-64 border-r border-muted/30 bg-card/30 backdrop-blur-xl flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Hash className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-sm uppercase opacity-70">Control Center</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "" : "group-hover:scale-110 transition-transform")} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
          )
        })}
      </nav>

      <div className="p-6 border-t border-muted/30 space-y-4">
        <div className="bg-muted/20 rounded-xl p-4 border border-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">System Info</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="opacity-50">Status</span>
              <span className="text-green-500 font-bold uppercase">Online</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="opacity-50">Electron</span>
              <span>v34.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
