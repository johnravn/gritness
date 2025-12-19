import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, X, Eye, Edit, Crown, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import type { Permission, ProjectShare, BoardShare } from '@/lib/scrumban'
import {
  inviteUserToProject,
  getProjectShares,
  removeProjectShare,
  inviteUserToBoard,
  getBoardShares,
  removeBoardShare,
  checkProjectPermission,
  checkBoardPermission,
} from '@/lib/scrumban'

interface CollaborationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'project' | 'board'
  itemId: string
  itemName: string
}

export function CollaborationDialog({ open, onOpenChange, type, itemId, itemName }: CollaborationDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState<Permission>('read')
  const [isInviting, setIsInviting] = useState(false)

  // Fetch shares
  const { data: shares = [] } = useQuery({
    queryKey: [type === 'project' ? 'projectShares' : 'boardShares', itemId],
    queryFn: () => {
      if (type === 'project') {
        return getProjectShares(itemId)
      } else {
        return getBoardShares(itemId)
      }
    },
    enabled: open && !!itemId,
  })

  // Check if current user is owner
  const { data: permissionInfo } = useQuery({
    queryKey: [type === 'project' ? 'projectPermission' : 'boardPermission', itemId, user?.$id],
    queryFn: () => {
      if (!user?.$id) return { hasAccess: false, isOwner: false }
      if (type === 'project') {
        return checkProjectPermission(itemId, user.$id)
      } else {
        return checkBoardPermission(itemId, user.$id)
      }
    },
    enabled: open && !!itemId && !!user?.$id,
  })

  const isOwner = permissionInfo?.isOwner ?? false

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (type === 'project') {
        return inviteUserToProject(
          itemId,
          inviteEmail,
          invitePermission,
          user?.$id,
          user?.name || user?.email
        )
      } else {
        return inviteUserToBoard(
          itemId,
          inviteEmail,
          invitePermission,
          user?.$id,
          user?.name || user?.email
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [type === 'project' ? 'projectShares' : 'boardShares', itemId] 
      })
      setInviteEmail('')
      setInvitePermission('read')
      setIsInviting(false)
    },
    onError: (error: any) => {
      console.error('Error inviting user:', error)
      alert(`Failed to invite user: ${error.message || 'Unknown error'}`)
      setIsInviting(false)
    },
  })

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: (shareId: string) => {
      if (type === 'project') {
        return removeProjectShare(shareId)
      } else {
        return removeBoardShare(shareId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [type === 'project' ? 'projectShares' : 'boardShares', itemId] 
      })
    },
  })

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      alert('Please enter an email address')
      return
    }
    setIsInviting(true)
    inviteMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaborate on {itemName}
          </DialogTitle>
          <DialogDescription>
            Invite users to collaborate on this {type}. They can have read or write permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Section */}
          {isOwner && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite User
              </h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInvite()
                  }}
                  className="flex-1"
                />
                <Select
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value as Permission)}
                >
                  <option value="read">Read</option>
                  <option value="write">Write</option>
                </Select>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || isInviting}
                >
                  {isInviting ? 'Inviting...' : 'Invite'}
                </Button>
              </div>
            </div>
          )}

          {/* Collaborators List */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Collaborators
            </h3>
            <div className="space-y-2">
              {/* Owner */}
              {user && (
                <Card>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Crown className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.name || user.email}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Owner
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                        Write
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shared Users */}
              {shares.map((share: ProjectShare | BoardShare) => (
                <Card key={share.$id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {share.userName || share.userEmail || 'Pending'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {share.userEmail}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        share.permission === 'write' 
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300' 
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      }`}>
                        {share.permission === 'write' ? (
                          <span className="flex items-center gap-1">
                            <Edit className="h-3 w-3" />
                            Write
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Read
                          </span>
                        )}
                      </span>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm(`Remove ${share.userEmail || 'this user'} from collaborators?`)) {
                              removeShareMutation.mutate(share.$id)
                            }
                          }}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {shares.length === 0 && !user && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No collaborators yet
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

