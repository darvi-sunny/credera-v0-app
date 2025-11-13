// app/api/sitecore-import/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

import {
  createFromJson,
  SitecoreTemplateDefinition,
} from '@/lib/sitecore-import'
import { json } from 'zod'
import { sum } from 'drizzle-orm'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // change to specific origin in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  // Respond to browser preflight requests
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: Request) {
  try {
    // Try to parse JSON body
    let body: any
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    const filePath = body?.filePath
    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing filePath in request body.' },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    // Resolve path relative to project root (process.cwd())
    const resolvedPath = path.resolve(
      process.cwd(),
      filePath,
      'sitecore-template.json',
    )
    console.log('Resolved file path:', resolvedPath)

    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `File not found at ${resolvedPath}` },
        { status: 404, headers: CORS_HEADERS },
      )
    }

    const fileContents = await fs.readFile(resolvedPath, 'utf8')

    // parse file as JSON
    let parsed
    try {
      parsed = JSON.parse(fileContents)
      const summaries = await createFromJson(
        parsed as SitecoreTemplateDefinition[],
      )      
    } catch (e) {      
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Error processing templates.' },
        { status: 500, headers: CORS_HEADERS },
      )
    }

    return NextResponse.json({ ok: true, status: 200, headers: CORS_HEADERS})
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Unexpected server error: ${message}` },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
