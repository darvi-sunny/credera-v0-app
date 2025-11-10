// components/TreeView.tsx
import React, { useState, memo } from 'react'

export type FileItem = { path: string; name: string }

type TreeNode = {
  name: string
  path: string // full relative path to this node
  isFile: boolean
  children: Record<string, TreeNode>
}

type Props = {
  files: FileItem[] // list from API: path is relative inside extracted folder
  onFileClick: (filePath: string) => void
}

function buildTree(files: FileItem[]) {
  const root: Record<string, TreeNode> = {}

  for (const f of files) {
    const parts = f.path.split('/').filter(Boolean)
    let cur = root
    let curPath = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      curPath = curPath ? `${curPath}/${part}` : part
      if (!cur[part]) {
        cur[part] = {
          name: part,
          path: curPath,
          isFile: i === parts.length - 1,
          children: {},
        }
      }
      if (i === parts.length - 1) {
        cur[part].isFile = true // ensure leaf marked as file
      }
      cur = cur[part].children
    }
  }

  return root
}

const FolderIcon: React.FC<{ open?: boolean }> = ({ open }) => (
  <span style={{ marginRight: 6 }}>{open ? '📂' : '📁'}</span>
)
const FileIcon: React.FC = () => <span style={{ marginRight: 6 }}>📄</span>

const TreeNodeView: React.FC<{
  node: TreeNode
  onFileClick: (p: string) => void
  level?: number
}> = memo(({ node, onFileClick, level = 0 }) => {
  const [open, setOpen] = useState(false)
  const hasChildren = Object.keys(node.children).length > 0

  // Leaf and file:
  if (node.isFile && !hasChildren) {
    return (
      <div
        style={{
          paddingLeft: level * 12,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          onClick={() => onFileClick(node.path)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            borderRadius: 4,
          }}
        >
          <FileIcon />
          <span style={{ fontSize: 13 }}>{node.name}</span>
          <small style={{ marginLeft: 8, color: '#666' }}>{node.path}</small>
        </div>
      </div>
    )
  }

  // Folder (maybe also a file with children, but treat as folder)
  return (
    <div style={{ paddingLeft: level * 12 }}>
      <div
        onClick={() => setOpen((s) => !s)}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '6px 4px',
          userSelect: 'none',
        }}
      >
        <FolderIcon open={open} />
        <strong style={{ fontSize: 13 }}>{node.name}</strong>
      </div>

      {open && (
        <div style={{ marginTop: 4 }}>
          {Object.keys(node.children)
            .sort((a, b) => {
              // folders first then files, then alphabetically
              const A = node.children[a],
                B = node.children[b]
              if (A.isFile === B.isFile) return a.localeCompare(b)
              return (A.isFile ? 1 : -1) - (B.isFile ? 1 : -1)
            })
            .map((k) => (
              <TreeNodeView
                key={node.children[k].path}
                node={node.children[k]}
                onFileClick={onFileClick}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  )
})

export default function TreeView({ files, onFileClick }: Props) {
  const tree = buildTree(files)

  // Render top-level sorted
  const topKeys = Object.keys(tree).sort((a, b) => {
    const A = tree[a],
      B = tree[b]
    if (A.isFile === B.isFile) return a.localeCompare(b)
    return A.isFile ? 1 : -1
  })

  return (
    <div
      style={{
        fontFamily: 'system-ui, Roboto, Inter, -apple-system',
        fontSize: 13,
      }}
    >
      {topKeys.length === 0 ? (
        <div style={{ color: '#666' }}>No files</div>
      ) : (
        topKeys.map((k) => (
          <TreeNodeView
            key={tree[k].path}
            node={tree[k]}
            onFileClick={onFileClick}
          />
        ))
      )}
    </div>
  )
}
