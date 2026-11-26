import { NextRequest, NextResponse } from 'next/server';
import { requirePublicCareersScope } from '@/lib/public-careers-auth';
import { publicCareersCorsHeaders } from '@/lib/public-careers-cors';
import { getPublicJobBySlug } from '@/services/recruitment-services/public-careers.service';

function withCors(res: NextResponse) {
  Object.entries(publicCareersCorsHeaders()).forEach(([k, v]) =>
    res.headers.set(k, v)
  );
  return res;
}

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * GET /api/public/careers/jobs/[slug]
 * Requires Bearer token with careers:read.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requirePublicCareersScope(request.headers, 'careers:read');
  if (!auth.ok) {
    return withCors(
      NextResponse.json(
        { error: auth.error, error_description: auth.errorDescription },
        { status: auth.status }
      )
    );
  }

  const { slug } = await context.params;
  const result = await getPublicJobBySlug(slug);

  if (result.notFound) {
    return withCors(
      NextResponse.json(
        {
          error: 'not_found',
          error_description: 'Job not found or not available'
        },
        { status: 404 }
      )
    );
  }

  if (!result.success || !result.data) {
    return withCors(
      NextResponse.json(
        {
          error: 'server_error',
          error_description: result.error?.message ?? 'Failed to load job'
        },
        { status: 500 }
      )
    );
  }

  return withCors(NextResponse.json({ job: result.data }));
}
