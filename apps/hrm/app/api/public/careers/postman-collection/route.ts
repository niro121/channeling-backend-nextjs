import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { publicCareersCorsHeaders } from '@/lib/public-careers-cors';

/**
 * GET /api/public/careers/postman-collection
 * Returns the Careers Postman collection with baseUrl set to this request origin.
 */
export async function GET(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin;
    const path = join(
      process.cwd(),
      'public',
      'assets',
      'public-careers-api.postman_collection.json'
    );
    const raw = readFileSync(path, 'utf-8');
    const collection = JSON.parse(raw) as {
      variable?: Array<{ key: string; value: string }>;
      [key: string]: unknown;
    };
    if (Array.isArray(collection.variable)) {
      const baseUrlVar = collection.variable.find((v) => v.key === 'baseUrl');
      if (baseUrlVar) baseUrlVar.value = origin;
    }
    const body = JSON.stringify(collection);
    const res = new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition':
          'attachment; filename="hrm-public-careers-api.postman_collection.json"'
      }
    });
    Object.entries(publicCareersCorsHeaders()).forEach(([k, v]) =>
      res.headers.set(k, v)
    );
    return res;
  } catch (e) {
    console.error('[careers/postman-collection]', e);
    return NextResponse.json(
      { error: 'Failed to generate Postman collection' },
      { status: 500 }
    );
  }
}
