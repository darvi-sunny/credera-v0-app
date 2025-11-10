// app/api/copy-files/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import fsP from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const DEST_ROOT = process.env.FILE_COPY_DESTINATION_PATH

// POST { "sitecorePath": "/absolute/path/to/extracted/sitecore" }
// or POST { "extractedPath": "/absolute/path/to/extracted/zip-root" } - will attempt to locate sitecore inside it
export async function POST(req: Request) {
  if (!DEST_ROOT) {
    return NextResponse.json(
      { success: false, error: 'Missing FILE_COPY_DESTINATION_PATH in env' },
      { status: 500 },
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }
  console.log('copy-files request body:', JSON.stringify(body))
  const { sitecorePath, extractedPath } = body ?? {}

  try {
    let srcSitecore = sitecorePath
    if (!srcSitecore && extractedPath) {
      if (!path.isAbsolute(extractedPath))
        throw new Error('extractedPath must be an absolute path')
      srcSitecore = await findSitecore(extractedPath)
      if (!srcSitecore)
        throw new Error("No 'sitecore' folder found inside extractedPath")
    }

    if (!srcSitecore) throw new Error('sitecorePath or extractedPath required')
    if (!path.isAbsolute(srcSitecore))
      throw new Error('sitecorePath must be absolute')

    const stat = await fsP.stat(srcSitecore).catch(() => null)
    if (!stat || !stat.isDirectory())
      throw new Error('sitecorePath is not a directory or does not exist')

    // Destination path
    const dest = path.join(path.resolve(DEST_ROOT), 'sitecore')

    // Remove existing destination
    await fsP.rm(dest, { recursive: true, force: true }).catch(() => {})

    // Copy entire sitecore folder with children
    if (typeof (fsP as any).cp === 'function') {
      await (fsP as any).cp(srcSitecore, dest, { recursive: true, force: true })
    } else {
      await copyManual(srcSitecore, dest)
    }

    return NextResponse.json(
      {
        success: true,
        message: `'sitecore' copied to ${dest}`,
        destination: dest,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('copy-files error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Operation failed' },
      { status: 400 },
    )
  }
}

/* ---------- helpers (local to this route) ---------- */

export async function findSitecore(root: string): Promise<string | null> {
  try {
    const checkPaths = [
      path.join(root, 'sitecore'), // Check 1: root/sitecore
      path.join(root, 'components', 'sitecore'),
      path.join(root, 'src', 'components', 'sitecore'), // Check 2: root/components/sitecore
    ]

    for (const candidate of checkPaths) {
      if (await isDir(candidate)) {
        console.log(`✅ Found sitecore folder at: ${candidate}`)
        return candidate
      }
    }

    console.warn(
      '⚠️  sitecore folder not found under root or components directory',
    )
    return null
  } catch (error) {
    console.error('Error while searching for sitecore folder:', error)
    return null
  }
}

async function isDir(p: string) {
  try {
    return (await fsP.stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** Manual recursive copy if fs.promises.cp is unavailable */
async function copyManual(src: string, dest: string) {
  const s = await fsP.stat(src)
  if (s.isDirectory()) {
    await fsP.mkdir(dest, { recursive: true })
    for (const entry of await fsP.readdir(src)) {
      await copyManual(path.join(src, entry), path.join(dest, entry))
    }
  } else {
    await fsP.mkdir(path.dirname(dest), { recursive: true })
    await fsP.copyFile(src, dest)
  }
}
