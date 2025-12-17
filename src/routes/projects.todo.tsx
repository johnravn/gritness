import { createRoute } from '@tanstack/react-router'
import { ScrumbanBoard } from '@/components/scrumban-board'
import { rootRoute } from './__root'

export const todoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/todo',
  component: ScrumbanBoard,
})

