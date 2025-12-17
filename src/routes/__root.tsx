import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Layout } from '@/components/layout'
import { useAuth } from '@/lib/auth'

export const rootRoute = createRootRoute({
  component: () => {
    const { loading } = useAuth()
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )
    }
    
    return (
      <Layout>
        <Outlet />
      </Layout>
    )
  },
})

