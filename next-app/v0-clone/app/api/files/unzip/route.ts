// app/api/unzip/route.ts
import { NextResponse } from 'next/server'
import fsP from 'fs/promises'
import path from 'path'
import StreamZip from 'node-stream-zip'
import { ok } from 'assert'

export const runtime = 'nodejs' // ensure Node runtime so fs & node-stream-zip work

// POST { "filePath": "/absolute/path/to/archive.zip" }
export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { filePath } = body ?? {}

  try {
    if (!filePath || !path.isAbsolute(filePath))
      throw new Error('filePath must be an absolute path to a .zip file')
    if (path.extname(filePath).toLowerCase() !== '.zip')
      throw new Error('Provided file must have .zip extension')

    const stat = await fsP.stat(filePath).catch(() => null)
    if (!stat || !stat.isFile()) throw new Error('File not found')

    // Prepare extraction folder
    const dir = path.dirname(filePath)
    const base = path.basename(filePath, '.zip')
    const extractDir = path.join(dir, base)

    await fsP.rm(extractDir, { recursive: true, force: true }).catch(() => {})
    await fsP.mkdir(extractDir, { recursive: true })

    // Extract
    await extractZip(filePath, extractDir)

    return NextResponse.json(
      {
        ok: true,
        extractedPath: extractDir,
        message: `Extracted to ${extractDir}`,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('unzip error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Operation failed' },
      { status: 400 },
    )
  }
}

/* ---------- helpers (local to this route) ---------- */

async function extractZip(zipFile: string, dest: string) {
  console.log(`Extracting ZIP ${zipFile} to ${dest}`)
  const zip = new (StreamZip as any).async({ file: zipFile })
  try {
    await zip.extract(null, dest) // extract all contents
  } finally {
    await zip.close()
  }
  console.log('Extraction complete')
}
