import { NextRequest, NextResponse } from 'next/server';
import { requirePublicCareersScope } from '@/lib/public-careers-auth';
import { publicCareersCorsHeaders } from '@/lib/public-careers-cors';
import { applyPublicJob } from '@/services/recruitment-services/public-careers.service';
import type {
  PublicApplyPayload,
  PublicApplyResumeFile
} from '@/types/public-careers';

function withCors(res: NextResponse) {
  Object.entries(publicCareersCorsHeaders()).forEach(([k, v]) =>
    res.headers.set(k, v)
  );
  return res;
}

function parseSkills(raw: unknown): string[] | undefined {
  if (raw == null || raw === '') return undefined;
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  const text = String(raw).trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // comma-separated fallback
  }
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function parseApplyRequest(request: NextRequest): Promise<{
  payload: PublicApplyPayload;
  resume: PublicApplyResumeFile | null;
}> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const skillsRaw = form.get('skills');
    const experienceRaw = form.get('experienceYears');
    const payload: PublicApplyPayload = {
      jobSlug: String(form.get('jobSlug') ?? ''),
      candidateName: String(form.get('candidateName') ?? ''),
      candidateEmail: String(form.get('candidateEmail') ?? ''),
      candidatePhone: String(form.get('candidatePhone') ?? '') || undefined,
      experienceYears:
        experienceRaw != null && String(experienceRaw).trim() !== ''
          ? Number(experienceRaw)
          : undefined,
      qualifications: String(form.get('qualifications') ?? '') || undefined,
      skills: parseSkills(skillsRaw)
    };

    const file = form.get('resume');
    let resume: PublicApplyResumeFile | null = null;
    if (file && typeof file !== 'string' && file.size > 0) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      resume = {
        bytes,
        fileName: file.name || 'resume',
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size
      };
    }

    return { payload, resume };
  }

  const json = (await request.json()) as PublicApplyPayload & {
    skills?: unknown;
  };
  return {
    payload: {
      ...json,
      skills: parseSkills(json.skills)
    },
    resume: null
  };
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * POST /api/public/careers/applications
 * - application/json — metadata only
 * - multipart/form-data — same fields + optional `resume` file (PDF/image, ≤10 MB)
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

  let parsed: {
    payload: PublicApplyPayload;
    resume: PublicApplyResumeFile | null;
  };
  try {
    parsed = await parseApplyRequest(request);
  } catch {
    return withCors(
      NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Could not parse request body'
        },
        { status: 400 }
      )
    );
  }

  const result = await applyPublicJob(
    parsed.payload,
    {
      id: auth.client.actingUserId,
      name: 'Hospital Website'
    },
    parsed.resume
  );

  if (!result.success) {
    const status =
      result.code === 'apply_disabled'
        ? 503
        : result.code === 'not_found'
          ? 404
          : result.code === 'not_accepting' || result.code === 'duplicate'
            ? 409
            : result.code === 'validation_failed' ||
                result.code === 'invalid_resume'
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
