import { createRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { rootRoute } from './__root'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { User, Key, Mail, Image, Moon, Sun, Monitor } from 'lucide-react'
import { AVATAR_ICONS, getAvatarIcon } from '@/lib/avatar-icons'

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: async () => {
    try {
      const { account } = await import('@/lib/appwrite')
      await account.get()
    } catch {
      throw redirect({ to: '/auth/login', search: { redirect: '/profile' } })
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { user, updateName, updateEmail, updatePassword, updatePrefs } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [passwordForEmail, setPasswordForEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
    }
  }, [user])
  const [loadingSection, setLoadingSection] = useState<string | null>(null)

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingSection('name')
    try {
      await updateName(name.trim())
      toast.success('Name updated successfully.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name.')
    } finally {
      setLoadingSection(null)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForEmail.trim()) {
      toast.error('Current password is required to change email.')
      return
    }
    setLoadingSection('email')
    try {
      await updateEmail(email.trim(), passwordForEmail)
      toast.success('Email updated successfully. You may need to verify your new email.')
      setPasswordForEmail('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email.')
    } finally {
      setLoadingSection(null)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    setLoadingSection('password')
    try {
      await updatePassword(newPassword, currentPassword)
      toast.success('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setLoadingSection(null)
    }
  }

  const handleAvatarSelect = async (iconId: string) => {
    setLoadingSection('avatar')
    try {
      await updatePrefs({ avatarIcon: iconId })
      toast.success('Avatar updated.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update avatar.')
    } finally {
      setLoadingSection(null)
    }
  }

  const savedAvatarIcon = (user?.prefs as Record<string, string> | undefined)?.avatarIcon ?? 'user'

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
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Appearance Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={toggleTheme}
            title={`Current: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'} (${resolvedTheme})`}
          >
            {theme === 'system' ? (
              <>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </>
            ) : resolvedTheme === 'dark' ? (
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
        </CardContent>
      </Card>

      {/* Avatar Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            <CardTitle>Avatar</CardTitle>
          </div>
          <CardDescription>Choose your avatar icon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 flex items-center justify-center w-24 h-24 rounded-full bg-muted ring-2 ring-border">
              {(() => {
                const { Icon } = getAvatarIcon(savedAvatarIcon)
                return <Icon className="h-12 w-12 text-muted-foreground" />
              })()}
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2 max-h-[15rem] overflow-y-auto">
              {AVATAR_ICONS.map(({ id, name, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleAvatarSelect(id)}
                  disabled={loadingSection === 'avatar'}
                  className={`p-3 rounded-lg border transition-colors hover:bg-accent flex flex-col items-center justify-center gap-1 ${
                    savedAvatarIcon === id ? 'ring-2 ring-primary border-primary' : 'border-border'
                  }`}
                  title={name}
                >
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs truncate text-center w-full">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Display Name</CardTitle>
          </div>
          <CardDescription>Your name as shown across the app</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loadingSection === 'name'}
              className="flex-1"
            />
            <Button type="submit" disabled={loadingSection === 'name'}>
              {loadingSection === 'name' ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email</CardTitle>
          </div>
          <CardDescription>
            Update your email address. You&apos;ll need to verify the new email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium block mb-1">
                New email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loadingSection === 'email'}
              />
            </div>
            <div>
              <label htmlFor="passwordForEmail" className="text-sm font-medium block mb-1">
                Current password (required to change email)
              </label>
              <Input
                id="passwordForEmail"
                type="password"
                value={passwordForEmail}
                onChange={(e) => setPasswordForEmail(e.target.value)}
                placeholder="••••••••"
                disabled={loadingSection === 'email'}
              />
            </div>
            <Button type="submit" disabled={loadingSection === 'email'}>
              {loadingSection === 'email' ? 'Updating...' : 'Update Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>Set a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="text-sm font-medium block mb-1">
                Current password
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loadingSection === 'password'}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="text-sm font-medium block mb-1">
                New password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loadingSection === 'password'}
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium block mb-1">
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loadingSection === 'password'}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={loadingSection === 'password'}>
              {loadingSection === 'password' ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
