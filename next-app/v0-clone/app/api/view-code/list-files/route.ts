// app/api/code-view/list-files/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fsPromises from "fs/promises";

async function walk(dir: string, root: string): Promise<{ path: string; name: string }[]> {
  const out: { path: string; name: string }[] = [];
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, root)));
    } else {
      if (/\.(ts|tsx|json)$/.test(e.name)) {
        out.push({ path: path.relative(root, full).replace(/\\/g, "/"), name: e.name });
      }
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const zipPath = body?.zipPath;
    if (!zipPath) return NextResponse.json({ error: "zipPath required" }, { status: 400 });

    const resolved = path.resolve(zipPath);
    const stat = await fsPromises.stat(resolved).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return NextResponse.json({ error: "directory not found" }, { status: 404 });
    }

    const files = await walk(resolved, resolved);
    return NextResponse.json({ files });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
