import { NextRequest, NextResponse } from 'next/server';
import { requirePublicCareersScope } from '@/lib/public-careers-auth';
import { publicCareersCorsHeaders } from '@/lib/public-careers-cors';
import { listPublicJobs } from '@/services/recruitment-services/public-careers.service';

function withCors(res: NextResponse) {
  Object.entries(publicCareersCorsHeaders()).forEach(([k, v]) =>
    res.headers.set(k, v)
  );
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * GET /api/public/careers/jobs?keyword=&page=0&limit=50
 * Requires Bearer token with careers:read.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePublicCareersScope(request.headers, 'careers:read');
  if (!auth.ok) {
    return withCors(
      NextResponse.json(
        { error: auth.error, error_description: auth.errorDescription },
        { status: auth.status }
      )
    );
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword')?.trim() || undefined;
  const pageRaw = searchParams.get('page');
  const limitRaw = searchParams.get('limit');
  const page = pageRaw != null ? Number.parseInt(pageRaw, 10) : 0;
  const limit = limitRaw != null ? Number.parseInt(limitRaw, 10) : undefined;

  const result = await listPublicJobs({
    keyword,
    page: Number.isFinite(page) ? page : 0,
    limit: limit != null && Number.isFinite(limit) ? limit : undefined
  });

  if (!result.success || !result.data) {
    return withCors(
      NextResponse.json(
        {
          error: 'server_error',
          error_description: result.error?.message ?? 'Failed to list jobs'
        },
        { status: 500 }
      )
    );
  }

  return withCors(
    NextResponse.json({
      jobs: result.data.jobs,
      total: result.data.total,
      page: result.data.page,
      limit: result.data.limit
    })
  );
}
