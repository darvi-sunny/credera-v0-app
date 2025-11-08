import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  console.log('Proxy image request received')
  const { searchParams } = new URL(req.url)
  const imageUrl = searchParams.get('url')
  if (!imageUrl)
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const res = await fetch(imageUrl)
    console.log('res, res.status', res, res.status)
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)

    const arrayBuffer = await res.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('Proxy fetch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
