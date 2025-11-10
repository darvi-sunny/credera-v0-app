// app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'v0-sdk'
import fs from 'fs/promises'
import path from 'path'

const v0 = createClient(
  process.env.V0_API_URL ? { baseUrl: process.env.V0_API_URL } : {},
)

function toBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength)
  }
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (typeof data === 'string') return Buffer.from(data, 'utf-8')
  throw new Error('Unsupported data type returned from v0.chats.downloadVersion()')
}

/**
 * Generates a unique file path by appending a number if the file already exists.
 * Example: chat-abc.zip -> chat-abc-2.zip, chat-abc-3.zip, etc.
 */
async function generateUniqueFilePath(outDir: string, baseFilename: string): Promise<string> {
  const ext = path.extname(baseFilename) // .zip
  const baseName = path.basename(baseFilename, ext) // chat-hJemKxMzbgc-vb_esMMSmrX0pV-v123
  const files = await fs.readdir(outDir)

  // Count all files that start with the same base name
  const similarFiles = files.filter(file => file.startsWith(baseName))
  const count = similarFiles.length

  // If no existing file, just return the base file path
  if (count === 0) {
    return path.join(outDir, baseFilename)
  }

  // Else append (count + 1)
  const newFilename = `${baseName}-${count + 1}${ext}`
  return path.join(outDir, newFilename)
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, isView } = await request.json()
    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    // 1 - Fetch chat meta
    const meta = await v0.chats.getById({ chatId })
    const versionId = meta.latestVersion?.id
    if (!versionId) {
      return NextResponse.json({ error: 'No version found for chat' }, { status: 404 })
    }

    // 2️ - Download raw data
    const raw = (await v0.chats.downloadVersion({ chatId, versionId })) as unknown
    const items: unknown[] = Array.isArray(raw) ? raw : [raw]
    const buffers = items.map(toBuffer)
    const zipBuffer = Buffer.concat(buffers)

    // 3️ - Prepare output folder
    const outDir = process.env.VERCEL || isView ? path.join(process.cwd(), 'downloads', 'tmp') : path.join(process.cwd(), 'downloads')
    await fs.mkdir(outDir, { recursive: true })

    // 4️ - Generate unique filename if exists
    const baseFilename = `chat-${chatId}-v${versionId}.zip`
    const filePath = await generateUniqueFilePath(outDir, baseFilename)

    // 5️ - Write the file
    await fs.writeFile(filePath, zipBuffer)
    console.log('Saved ZIP:', filePath, 'bytes:', zipBuffer.byteLength)

    return NextResponse.json({
      ok: true,
      file: path.basename(filePath),
      savedTo: filePath,
    })
  } catch (err) {
    console.error('downloadVersion -> save failed:', err)
    return NextResponse.json(
      { error: 'Download failed', details: String(err) },
      { status: 500 },
    )
  }
}
