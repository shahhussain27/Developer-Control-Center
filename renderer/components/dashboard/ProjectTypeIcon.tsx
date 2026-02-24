import React from 'react'
import { ProjectType } from '../../../common/types'
import {
  resolveProjectTypeIcon,
  PROJECT_TYPE_COLORS,
  PROJECT_TYPE_BG,
  PROJECT_TYPE_LABELS,
  type ProjectIcon,
} from '../../lib/projectIcons'
import { cn } from '../../lib/utils'

interface ProjectTypeIconProps {
  /** The project type to render. */
  type: ProjectType
  /** Icon size in pixels (applied to width and height). @default 16 */
  size?: number
  /** Whether to show the coloured badge background. @default false */
  badge?: boolean
  /** Additional class names forwarded to the root element. */
  className?: string
  /** Show tooltip title on hover. @default true */
  showTooltip?: boolean
}

/**
 * Renders the icon associated with a project type.
 *
 * Resolution order: PROJECT_TYPE_ICONS[type] → FALLBACK_ICON.
 * Never uses inline conditionals — delegates to the centralized map.
 */
export const ProjectTypeIcon: React.FC<ProjectTypeIconProps> = ({
  type,
  size = 16,
  badge = false,
  className,
  showTooltip = true,
}) => {
  const Icon       = resolveProjectTypeIcon(type)
  const colorClass = PROJECT_TYPE_COLORS[type] ?? 'text-white/50'
  const bgClass    = PROJECT_TYPE_BG[type]    ?? 'bg-white/5'
  const label      = PROJECT_TYPE_LABELS[type] ?? type

  const icon = (
    <Icon
      width={size}
      height={size}
      className={cn(colorClass, className)}
      aria-hidden="true"
    />
  )

  if (!badge) {
    return showTooltip ? (
      <span title={label} aria-label={label}>
        {icon}
      </span>
    ) : icon
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2',
        bgClass,
      )}
      title={showTooltip ? label : undefined}
      aria-label={label}
    >
      {icon}
    </span>
  )
}
