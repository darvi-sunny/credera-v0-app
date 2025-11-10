import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    // Absolute path to your downloads directory (under project root)
    const downloadsDir = path.join(process.cwd(), 'downloads')

    // Check if folder exists
    if (!fs.existsSync(downloadsDir)) {
      return NextResponse.json(
        { message: 'Downloads folder not found.' },
        { status: 404 },
      )
    }
    console.log('Cleaning downloads folder at:', downloadsDir)

    // Read all files and subfolders inside
    const items = fs.readdirSync(downloadsDir)

    for (const item of items) {
      const itemPath = path.join(downloadsDir, item)

      // Use recursive removal for directories, unlink for files
      const stats = fs.statSync(itemPath)
      if (stats.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(itemPath)
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Downloads folder cleaned successfully.',
    })
  } catch (error) {
    console.error('Error cleaning downloads folder:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to clean downloads folder.' },
      { status: 500 },
    )
  }
}
