import { NextResponse } from 'next/server';
import { CanonicalAssetRecord } from '@/types/CanonicalProjectDocument';
import * as path from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = (formData.get('projectId') as string) || 'global';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || '.bin';
    const cleanBase = path.basename(file.name, ext).replace(/[^a-z0-9_-]/gi, '_');
    const filename = `${cleanBase}_${Date.now()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    let category: CanonicalAssetRecord['category'] = 'other' as any;
    if (file.type.startsWith('image/')) category = 'image';
    else if (file.type.startsWith('video/')) category = 'video';
    else if (file.type.startsWith('audio/')) category = 'audio';
    else if (file.name.endsWith('.svg')) category = 'svg';
    else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) category = '3d';

    const assetRecord: CanonicalAssetRecord = {
      id: `asset_${Date.now().toString(36)}`,
      name: file.name,
      url: publicUrl,
      thumbnailUrl: category === 'image' ? publicUrl : undefined,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.length,
      category,
      usedInNodes: [],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, asset: assetRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload asset' }, { status: 500 });
  }
}
