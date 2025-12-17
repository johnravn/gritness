import { createRoute, redirect } from '@tanstack/react-router'
import { ScrumbanBoard } from '@/components/scrumban-board'
import { rootRoute } from './__root'

export const todoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/todo',
  beforeLoad: async () => {
    // Check if user is authenticated
    try {
      const { account } = await import('@/lib/appwrite')
      await account.get()
    } catch {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: '/projects/todo',
        },
      })
    }
  },
  component: ScrumbanBoard,
})

