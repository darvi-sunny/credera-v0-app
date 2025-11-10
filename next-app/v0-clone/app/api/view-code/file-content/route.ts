// app/api/code-view/file-content/route.ts
import { NextResponse } from 'next/server'
import path from 'path'
import fsPromises from 'fs/promises'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const folderPath = body?.zipPath // still using zipPath name as you requested
    const filePath = body?.filePath

    if (!folderPath || !filePath) {
      return NextResponse.json(
        { error: 'zipPath and filePath required' },
        { status: 400 },
      )
    }

    const resolvedFolder = path.resolve(folderPath)

    const folderStat = await fsPromises.stat(resolvedFolder).catch(() => null)
    if (!folderStat || !folderStat.isDirectory()) {
      return NextResponse.json({ error: 'folder not found' }, { status: 404 })
    }

    // join and normalize requested path
    const requested = path.normalize(path.join(resolvedFolder, filePath))

    // protect against path traversal
    if (!requested.startsWith(resolvedFolder)) {
      return NextResponse.json({ error: 'invalid filePath' }, { status: 400 })
    }

    const fileStat = await fsPromises.stat(requested).catch(() => null)
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ error: 'file not found' }, { status: 404 })
    }

    const content = await fsPromises.readFile(requested, 'utf8')
    return NextResponse.json({ content })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    )
  }
}
