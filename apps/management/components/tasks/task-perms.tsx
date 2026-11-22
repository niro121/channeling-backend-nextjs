'use client';

import { createContext, useContext } from 'react';
import { NO_TASK_PERMISSIONS, type TaskPermissions } from '@/lib/tasks/constants';

/** Task Manager privileges for the signed-in user (from channeling, loaded by the dashboard layout). */
const TaskPermsContext = createContext<TaskPermissions>(NO_TASK_PERMISSIONS);

export function TaskPermsProvider({ value, children }: { value: TaskPermissions; children: React.ReactNode }) {
  return <TaskPermsContext.Provider value={value}>{children}</TaskPermsContext.Provider>;
}

export function useTaskPerms(): TaskPermissions {
  return useContext(TaskPermsContext);
}
