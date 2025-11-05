import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'v0-sdk'

// Create v0 client with custom baseUrl if V0_API_URL is set
const apiKey = process.env.V0_API_KEY
const v0 = createClient(
  process.env.V0_API_URL ? { baseUrl: process.env.V0_API_URL } : {},
)

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json()
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 },
      )
    }

    // Step 1: Fetch chat versions
    const versions = await v0.chats.findVersions({ chatId })
    const versionId = versions?.data?.[0]?.id
    console.log('Chat versions:', versionId)

    // Step 2: Download version file
    const downloadResult = await v0.chats.downloadVersion({
      chatId,
      versionId,
    })

    const buffer = Buffer.from(downloadResult)

    // Step 4: Return file as a download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="chat-${chatId}.zip"`,
      },
    })
  } catch (error: any) {
    console.error('Error handling download:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download files' },
      { status: 500 },
    )
  }
}
