import { NextRequest, NextResponse } from 'next/server';
import { requirePublicCareersScope } from '@/lib/public-careers-auth';
import { publicCareersCorsHeaders } from '@/lib/public-careers-cors';
import { applyPublicJob } from '@/services/recruitment-services/public-careers.service';
import type { PublicApplyPayload } from '@/types/public-careers';

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
 * POST /api/public/careers/applications
 * Body: { jobSlug, candidateName, candidateEmail, candidatePhone?, ... }
 * Requires Bearer token with careers:apply.
 * Feature flag: CAREERS_PUBLIC_APPLY_ENABLED=true
 */
export async function POST(request: NextRequest) {
  const auth = await requirePublicCareersScope(request.headers, 'careers:apply');
  if (!auth.ok) {
    return withCors(
      NextResponse.json(
        { error: auth.error, error_description: auth.errorDescription },
        { status: auth.status }
      )
    );
  }

  let body: PublicApplyPayload;
  try {
    body = (await request.json()) as PublicApplyPayload;
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Could not parse JSON body'
        },
        { status: 400 }
      )
    );
  }

  const result = await applyPublicJob(body, {
    id: auth.client.actingUserId,
    name: 'Hospital Website'
  });

  if (!result.success) {
    const status =
      result.code === 'apply_disabled'
        ? 503
        : result.code === 'not_found'
          ? 404
          : result.code === 'not_accepting'
            ? 409
            : result.code === 'duplicate'
              ? 409
              : result.code === 'validation_failed'
                ? 400
                : 500;

    return withCors(
      NextResponse.json(
        {
          error: result.code,
          error_description: result.message,
          ...(result.issues ? { issues: result.issues } : {})
        },
        { status }
      )
    );
  }

  return withCors(
    NextResponse.json({ application: result.data }, { status: 201 })
  );
}
