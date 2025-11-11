/**
 * Extracts Figma File ID and Node ID from a given Figma URL.
 *
 * @param url - A full Figma URL (Design, Prototype, or File link)
 * @returns An object { fileId, nodeId } or null if invalid
 */
export function extractFigmaIds(
  url: string,
): { fileId: string; nodeId?: string } | null {
  try {
    const parsed = new URL(url)

    // Match file key from URL path
    // Works for patterns like:
    // - /file/<key>/
    // - /design/<key>/
    const pathMatch = parsed.pathname.match(
      /\/(?:file|design)\/([a-zA-Z0-9]+)\//,
    )
    const fileId = pathMatch ? pathMatch[1] : null

    // Extract node-id query parameter if present
    const nodeId = parsed.searchParams.get('node-id') || undefined

    if (!fileId) return null

    return { fileId, nodeId }
  } catch (error) {
    console.error('Invalid Figma URL:', error)
    return null
  }
}
