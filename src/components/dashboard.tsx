import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare, FileText, Globe, Music } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export interface Project {
  id: string
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  path: string
}

export const projects: Project[] = [
  {
    id: 'todo',
    title: 'Todo / Scrumban Board',
    description: 'Manage your tasks with a kanban-style board and todo lists',
    icon: CheckSquare,
    path: '/projects/todo',
  },
  {
    id: 'chordpro',
    title: 'ChordPro to PDF Converter',
    description: 'Convert ChordPro files to beautifully formatted PDF documents',
    icon: Music,
    path: '/projects/chordpro',
  },
  {
    id: 'reviewer',
    title: 'Website Reviewer',
    description: 'Review and analyze websites for performance, accessibility, and SEO',
    icon: Globe,
    path: '/projects/reviewer',
  },
  {
    id: 'docs',
    title: 'Documentation Hub',
    description: 'Centralized documentation for all your projects and tools',
    icon: FileText,
    path: '/projects/docs',
  },
]

export function Dashboard() {
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Project Hub</h1>
        <p className="text-muted-foreground">
          Welcome to your centralized project hub. Select a project to get started.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link key={project.id} to={project.path}>
            <Card className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <project.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to open →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

