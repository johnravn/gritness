import { type ReactNode, useState, useEffect } from 'react'
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Moon, Sun, LogOut, LogIn, User, Menu, X } from 'lucide-react'
import { Link, useNavigate, useLocation } from '@tanstack/react-router'
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/lib/auth'
import { projects } from '@/components/dashboard'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/auth/login' })
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const handleLogin = () => {
    navigate({ to: '/auth/login' })
  }

  return (
    <div className="flex h-screen w-full relative">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-4 right-4 z-50 md:hidden",
          sidebarOpen && "text-foreground"
        )}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarHeader>
          <div className="flex items-center justify-between w-full">
            <Link 
              to="/" 
              className={cn(
                "flex items-center gap-2 hover:opacity-80 transition-opacity",
                isActive('/') && "opacity-100"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutDashboard className="h-6 w-6" />
              <h1 className="text-xl font-bold">Gritness Hub</h1>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav className="space-y-2">
            <div className="pt-4">
              <h2 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Projects
              </h2>
              {projects.map((project) => {
                const Icon = project.icon
                const active = isActive(project.path)
                return (
                  <Link key={project.id} to={project.path} onClick={() => setSidebarOpen(false)}>
                    <Button 
                      variant={active ? "secondary" : "ghost"} 
                      className={cn(
                        "w-full justify-start",
                        active && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {project.title}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="space-y-2">
            {isAuthenticated && user && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="truncate">{user.name || user.email}</span>
              </div>
            )}
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
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

