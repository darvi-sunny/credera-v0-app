// app/components/app-header.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { ChatSelector } from './chat-selector'
import { MobileMenu } from './mobile-menu'
import { UserNav } from '@/components/user-nav'
import { Button } from '@/components/ui/button'
import { CloudUploadIcon, Code } from 'lucide-react'
import TaskProgress, { Task } from './task-progress'
import CodeViewer from '../code-viewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AppHeaderProps {
  className?: string
}

type ApiResult<T = any> = { ok: true; data: T } | { ok: false; error: string }

const tasks: Task[] = [
  { id: 1, title: 'Download zip', description: 'downloading zip...' },
  { id: 2, title: 'Unzip artifacts', description: 'Extracting files....' },
  {
    id: 3,
    title: 'Copy files to target',
    description: 'Moving files to the target directory.',
  },
  { id: 4, title: 'Sitecore items', description: 'Creating sitecore items.' },
  {
    id: 5,
    title: 'Run post-processing',
    description: 'Applying cleanups and optimization.',
  },
  {
    id: 6,
    title: 'Finish & notify',
    description: 'Wrapping up and sending confirmation.',
  },
]

/** small JSON POST helper */
async function postJson<T = any>(
  url: string,
  body: Record<string, unknown>,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    const parsed = text ? JSON.parse(text) : undefined

    if (!res.ok) {
      const errMsg =
        (parsed && (parsed.error || parsed.message)) ||
        `Request failed with status ${res.status}`
      return { ok: false, error: String(errMsg) }
    }

    return { ok: true, data: parsed as T }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Network error' }
  }
}

/** API helpers */
async function downloadZip(chatId: string, isView = false) {
  return postJson<{ file?: string; savedTo?: string }>('/api/files/download', {
    chatId,
    isView,
  })
}
async function unzipArtifacts(filePath: string) {
  return postJson<{ extractedPath?: string }>('/api/files/unzip', { filePath })
}
async function copyFiles(extractedPath: string) {
  return postJson<{ extractedPath?: string }>('/api/files/copy', {
    extractedPath,
  })
}
async function importSitecore(extractedPath?: string) {
  return postJson<{ extractedPath?: string }>('/api/sitecore/import', {
    filePath: extractedPath,
  })
}
async function cleanUp() {
  return postJson<{ ok?: true }>('/api/files/clean', {})
}

/** tiny spinner badge shown on the button */
function SpinnerBadge() {
  return (
    <span
      className="inline-flex items-center justify-center h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin ml-2"
      aria-hidden
    />
  )
}

export function AppHeader({ className = '' }: AppHeaderProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isHomepage = pathname === '/'
  const isChatsPage = pathname?.includes('/chats') ?? false

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  const [chatId, setChatId] = useState<string | undefined>(undefined)

  // code viewer modal
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false)
  const [extractedPath, setExtractedPath] = useState<string | undefined>(
    undefined,
  )

  // small spinner when "View Code" is running
  const [isViewing, setIsViewing] = useState(false)

  // derive chatId from pathname when pathname changes
  useEffect(() => {
    if (!pathname) return setChatId(undefined)
    const id = pathname.startsWith('/chats/')
      ? pathname.split('/chats/')[1]?.split('/')[0]
      : undefined
    setChatId(id)
  }, [pathname])

  const handleLogoClick = useCallback(
    (e: React.MouseEvent) => {
      if (isHomepage) {
        e.preventDefault()
        window.location.href = '/?reset=true'
      }
    },
    [isHomepage],
  )

  /** Push whole flow to Sitecore — shows TaskProgress modal */
  const pushToSitecore = useCallback(
    async (isView = false) => {
      if (!chatId) {
        console.warn('Chat ID missing')
        return
      }

      try {
        setTaskModalOpen(true)
        setCurrentStep(0)

        // 1. download
        setCurrentStep(1)
        const dl = await downloadZip(chatId, isView)
        if (!dl.ok) throw new Error(dl.error)
        const { savedTo, file } = dl.data || {}
        const zipRef = savedTo || file
        if (!zipRef) throw new Error('Download API did not return a file path')

        // 2. unzip
        setCurrentStep(2)
        const unzip = await unzipArtifacts(zipRef)
        if (!unzip.ok) throw new Error(unzip.error)
        const extracted = unzip.data?.extractedPath

        // 3. copy
        setCurrentStep(3)
        const copy = await copyFiles(extracted || '')
        if (!copy.ok) throw new Error(copy.error)

        // 4. import
        setCurrentStep(4)
        const imp = await importSitecore(extracted)
        if (!imp.ok) throw new Error(imp.error)

        // 5. cleanup
        setCurrentStep(5)
        const clean = await cleanUp()
        if (!clean.ok) throw new Error(clean.error)

        setCurrentStep(6)
      } catch (err: any) {
        console.error('pushToSitecore failed:', err?.message ?? err)
      } finally {
        // keep modal open to show results; caller may close
      }
    },
    [chatId],
  )

  /** View code flow: download+unzip then open code viewer. shows small spinner on the button */
  const viewCode = useCallback(async () => {
    if (!chatId) {
      console.warn('Chat ID missing')
      return
    }

    try {
      setIsViewing(true)

      const dl = await downloadZip(chatId, true)
      if (!dl.ok) throw new Error(dl.error)
      const { savedTo, file } = dl.data || {}
      const zipRef = savedTo || file
      if (!zipRef) throw new Error('Download API did not return a file path')

      const unzip = await unzipArtifacts(zipRef)
      if (!unzip.ok) throw new Error(unzip.error)
      const extracted = unzip.data?.extractedPath

      setExtractedPath(extracted)
      setIsCodeViewOpen(true)
    } catch (err: any) {
      console.error('viewCode failed:', err?.message ?? err)
    } finally {
      setIsViewing(false)
    }
  }, [chatId])

  /** client download (browser blob) — kept for reference */
  const handleDownloadZip = useCallback(async () => {
    if (!chatId) return console.warn('Chat ID missing')
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const parsed = text ? JSON.parse(text) : undefined
        throw new Error(
          parsed?.error || parsed?.message || `Failed (${res.status})`,
        )
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `chat-${chatId}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(link.href), 5000)
    } catch (err: any) {
      console.error('handleDownloadZip error:', err?.message ?? err)
    }
  }, [chatId])

  const viewButtonDisabled = !isChatsPage || !chatId || isViewing

  return (
    <header className={`${className} border-b border-border dark:border-input`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              onClick={handleLogoClick}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
            >
              <img src="/logo.svg" alt="Logo" className="h-8" />
            </Link>

            <div className="hidden lg:block">
              <ChatSelector />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Button
              className="bg-transparent text-gray-600 dark:bg-zinc-100 hover:bg-orange-600 hover:text-white dark:hover:bg-zinc-200 dark:text-zinc-900 py-1.5 px-2 h-fit text-sm"
              onClick={() => void pushToSitecore(false)}
              aria-disabled={!chatId}
              disabled={!chatId}
            >
              <CloudUploadIcon size={16} className="mr-1" />
              Push to Sitecore
            </Button>

            <Button
              className={`bg-transparent text-gray-600 dark:bg-zinc-100 hover:bg-orange-600 hover:text-white dark:hover:bg-zinc-200 dark:text-zinc-900 py-1.5 px-2 h-fit text-sm relative`}
              onClick={() => void viewCode()}
              aria-disabled={viewButtonDisabled}
              disabled={viewButtonDisabled}
            >
              <div className="flex items-center">
                <Code size={16} className="mr-1" />
                View Code
                {isViewing && <SpinnerBadge />}
              </div>
            </Button>

            <UserNav session={session} />
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <UserNav session={session} />
            <MobileMenu onInfoDialogOpen={() => setIsInfoDialogOpen(true)} />
          </div>
        </div>
      </div>

      <TaskProgress
        tasks={tasks}
        currentStep={currentStep}
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
      />

      {isCodeViewOpen && extractedPath && (
        <CodeViewer
          open={isCodeViewOpen}
          onClose={() => setIsCodeViewOpen(false)}
          initialZipPath={extractedPath}
        />
      )}

      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4">
              v0 Clone Platform
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <p>
              This is a <strong>demo</strong> of a small platform where users
              generate React components and apps using AI.
            </p>

            <p>
              It's built with{' '}
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 dark:text-blue-400"
              >
                Next.js
              </a>
              .
            </p>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setIsInfoDialogOpen(false)}
              className="bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}

export default AppHeader
