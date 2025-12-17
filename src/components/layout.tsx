import { type ReactNode } from 'react'
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Moon, Sun } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTheme } from '@/components/theme-provider'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

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
        <SidebarFooter>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={toggleTheme}
            title={`Current: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'} (${resolvedTheme})`}
          >
            {resolvedTheme === 'dark' ? (
              <>
                <Moon className="mr-2 h-4 w-4" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Light Mode
              </>
            )}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

