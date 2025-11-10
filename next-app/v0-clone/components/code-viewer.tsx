import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import TreeView from './ui/tree-view'

type FileItem = { path: string; name: string }

type Props = {
  open: boolean
  onClose: () => void
  initialZipPath?: string
}

export default function CodeViewer({
  open,
  onClose,
  initialZipPath = '',
}: Props) {
  console.log('CodeViewer rendered with initialZipPath:', initialZipPath)
  const [zipPath, setZipPath] = useState(initialZipPath)
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<FileItem | null>(null)
  const [content, setContent] = useState<string | null>(null)

  async function listFiles() {
    console.log('listFiles called with zipPath:', zipPath)
    if (!zipPath) return alert('enter zipPath')
    setLoading(true)
    setFiles([])
    setSelected(null)
    setContent(null)
    try {
      const resp = await fetch('/api/view-code/list-files', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zipPath: zipPath }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'failed')
      setFiles(json.files || [])
    } catch (e: any) {
      alert('Error: ' + String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  async function loadFile(f: FileItem) {
    setSelected(f)
    setContent('// loading...')
    try {
      const resp = await fetch('/api/view-code/file-content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zipPath, filePath: f.path }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'failed')
      setContent(json.content ?? '')
    } catch (e: any) {
      setContent('// Error loading file: ' + String(e?.message || e))
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '90%',
          height: '80%',
          background: 'white',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #eee',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            value={zipPath}
            onChange={(e) => setZipPath(e.target.value)}
            style={{ flex: 1 }}
            placeholder="Enter absolute path to zip (server allowed base)"
          />
          <button onClick={listFiles} disabled={loading}>
            {loading ? 'Listing...' : 'List files'}
          </button>
          <button onClick={onClose}>Close</button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div
            style={{
              width: 360,
              borderLeft: '1px solid #eee',
              padding: 12,
              overflow: 'auto',
            }}
          >
            {/* Use TreeView here */}
            <TreeView
              files={files}
              onFileClick={(filePath: string) => {
                // same handler as before
                const f = files.find((x) => x.path === filePath)
                if (f) loadFile(f)
              }}
            />
          </div>

          <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
            <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
              {selected ? selected.path : 'Select a file to view'}
            </div>
            <div
              style={{
                height: '100%',
                border: '1px solid #eee',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <Editor
                height="100%"
                defaultLanguage={guessLang(selected?.path)}
                value={content ?? ''}
                options={{ readOnly: true, minimap: { enabled: false } }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function guessLang(p?: string | null) {
  if (!p) return 'plaintext'
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript'
  if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript'
  if (p.endsWith('.json')) return 'json'
  return 'plaintext'
}
