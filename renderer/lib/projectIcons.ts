import React from 'react'
import {
  Box,
  Atom,
  Server,
  Gamepad2,
  Brain,
  Cpu,
  Zap,
  Package,
} from 'lucide-react'
import { ProjectType } from '../../common/types'

// Custom SVG icons — processed by @svgr/webpack into React components
import NextjsIcon   from '../public/icons/nextjs.svg'
import ReactIcon    from '../public/icons/reactjs.svg'
import ElectronIcon from '../public/icons/electronjs.svg'
import NodeIcon     from '../public/icons/nodejs.svg'
import PythonIcon   from '../public/icons/python.svg'
import UnityIcon    from '../public/icons/unity.svg'
import UnrealIcon   from '../public/icons/unreal.svg'

/**
 * The shared icon type accepted by ProjectTypeIcon.
 *
 * Both Lucide icons and SVG files processed by @svgr/webpack satisfy
 * `React.ComponentType<React.SVGProps<SVGSVGElement>>`, which means they
 * accept `width`, `height`, `className`, `style`, etc. identically.
 *
 * Using this instead of LucideIcon allows mixing both sources in the same map
 * without casting.
 */
export type ProjectIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>

/**
 * Centralized, exhaustive icon map keyed by ProjectType.
 *
 * Rules:
 * - Every member of the ProjectType union MUST have an entry.
 * - TypeScript enforces exhaustiveness via Record<ProjectType, ProjectIcon>.
 * - No inline ternary / switch in components — always resolve through this map.
 * - To add a custom icon: drop the SVG in renderer/public/icons/, import it
 *   above, and replace the corresponding Lucide fallback here.
 */
export const PROJECT_TYPE_ICONS: Record<ProjectType, ProjectIcon> = {
  nextjs:   NextjsIcon,
  react:    ReactIcon,
  nextron:  Zap,
  electron: ElectronIcon,
  node:     NodeIcon,
  python:   PythonIcon,
  unity:    UnityIcon,
  unreal:   UnrealIcon,
  generic:  Package,
}

/**
 * Human-readable label for each project type.
 * Used in filter dropdowns and tooltips.
 */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  nextjs:   'Next.js',
  react:    'React',
  nextron:  'Nextron',
  electron: 'Electron',
  node:     'Node.js',
  python:   'Python',
  unity:    'Unity',
  unreal:   'Unreal Engine',
  generic:  'Generic',
}

/**
 * Accent colour class applied to the icon for each project type.
 * Restricted to Tailwind colour classes so they are tree-shaken correctly.
 */
export const PROJECT_TYPE_COLORS: Record<ProjectType, string> = {
  nextjs:   'text-white',
  react:    'text-cyan-400',
  nextron:  'text-violet-400',
  electron: 'text-sky-400',
  node:     'text-green-400',
  python:   'text-yellow-400',
  unity:    'text-orange-400',
  unreal:   'text-red-400',
  generic:  'text-white/50',
}

/**
 * Background tint applied to the icon badge per project type.
 */
export const PROJECT_TYPE_BG: Record<ProjectType, string> = {
  nextjs:   'bg-white/10',
  react:    'bg-cyan-400/10',
  nextron:  'bg-violet-400/10',
  electron: 'bg-sky-400/10',
  node:     'bg-green-400/10',
  python:   'bg-yellow-400/10',
  unity:    'bg-orange-400/10',
  unreal:   'bg-red-400/10',
  generic:  'bg-white/5',
}

/** Fallback for unknown / future types. */
export const FALLBACK_ICON: ProjectIcon = Box

/**
 * Safely resolve the icon for a given project type.
 * Falls back to FALLBACK_ICON if the type is not in the map.
 */
export const resolveProjectTypeIcon = (type: ProjectType): ProjectIcon =>
  PROJECT_TYPE_ICONS[type] ?? FALLBACK_ICON
