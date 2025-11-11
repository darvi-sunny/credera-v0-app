import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const FIGMA_TOKEN = process.env.FIGMA_TOKEN!
  const FIGMA_URL = process.env.FIGMA_URL!

  const { searchParams } = new URL(req.url)
  const figmaFileId = searchParams.get('fileId')
  const figmaNodeId = searchParams.get('nodeId')

  if (!figmaFileId) {
    return NextResponse.json(
      { error: 'Missing fileId query parameter' },
      { status: 400 },
    )
  }

  if (!figmaNodeId) {
    return NextResponse.json(
      { error: 'Missing nodeId query parameter' },
      { status: 400 },
    )
  }

  // 1️⃣ Get all pages (canvases)
  const fileRes = await fetch(`${FIGMA_URL}/files/${figmaFileId}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  })

  if (!fileRes.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch file info' },
      { status: 500 },
    )
  }

  const fileData = await fileRes.json()
  const pages = fileData.document.children.map((page: any) => ({
    id: page.id,
    name: page.name,
  }))

  // 2️⃣ Get image URLs for each page
  const imageRes = await fetch(
    `${FIGMA_URL}/images/${figmaFileId}?ids=${figmaNodeId}&format=png&scale=0.40`,
    { headers: { 'X-Figma-Token': FIGMA_TOKEN } },
  )

  const imageData = await imageRes.json()

  const images = Object.entries(imageData.images).map(([id, url]) => {
    const page = pages.find((p: any) => p.id === id)
    return { id, title: page?.name, image: url }
  })

  return NextResponse.json({ pages: images })
}
