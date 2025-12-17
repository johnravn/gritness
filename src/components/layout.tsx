import { ReactNode } from 'react'
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { LayoutDashboard } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="text-xl font-bold">Gritness Hub</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav className="space-y-2">
            <Link to="/">
              <Button variant="ghost" className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </nav>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

