import { ProjectType } from '../../common/types'

export const DEFAULT_ACTIONS_BY_PROJECT_TYPE: Record<ProjectType, string[]> = {
    nextjs: ['start_project', 'stop_project', 'open_localhost', 'open_ide', 'open_folder', 'view_logs'],
    react: ['start_project', 'stop_project', 'open_localhost', 'open_ide', 'open_folder'],
    node: ['start_project', 'stop_project', 'view_logs', 'open_ide', 'open_folder'],
    python: ['start_project', 'stop_project', 'view_logs', 'open_folder'],
    unity: ['start_project', 'open_folder', 'open_ide', 'clean_project'],
    unreal: ['start_project', 'open_folder', 'clean_project'],
    electron: ['start_project', 'stop_project', 'view_logs', 'open_folder', 'open_ide'],
    nextron: ['start_project', 'stop_project', 'view_logs', 'open_folder', 'open_ide'],
    generic: ['start_project', 'stop_project', 'open_folder']
}
