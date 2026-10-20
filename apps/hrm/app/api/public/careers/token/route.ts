import { NextRequest, NextResponse } from 'next/server';
import { publicCareersCorsHeaders } from '@/lib/public-careers-cors';
import {
  applyRateLimitHeaders,
  consumePublicCareersRateLimit,
  getRequestIp
} from '@/lib/public-careers-rate-limit';
import { requestCareersPublicToken } from '@/services/public/careers-token.service';

function parseBody(request: NextRequest): Promise<{
  grant_type?: string;
  client_id?: string;
  client_secret?: string;
}> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json() as Promise<{
      grant_type?: string;
      client_id?: string;
      client_secret?: string;
    }>;
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return request.text().then((text) => {
      const params = new URLSearchParams(text);
      return {
        grant_type: params.get('grant_type') ?? undefined,
        client_id: params.get('client_id') ?? undefined,
        client_secret: params.get('client_secret') ?? undefined
      };
    });
  }
  return Promise.resolve({});
}

function withCors(res: NextResponse) {
  Object.entries(publicCareersCorsHeaders()).forEach(([k, v]) =>
    res.headers.set(k, v)
  );
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  let body: {
    grant_type?: string;
    client_id?: string;
    client_secret?: string;
  };
  try {
    body = await parseBody(request);
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

  const ip = getRequestIp(request.headers);
  const rateKey = body.client_id?.trim()
    ? `client:${body.client_id.trim()}`
    : `ip:${ip}`;
  const rate = consumePublicCareersRateLimit('token', rateKey);
  if (!rate.ok) {
    const res = withCors(
      NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          error_description: 'Too many token requests. Try again later.'
        },
        { status: 429 }
      )
    );
    applyRateLimitHeaders(res.headers, rate);
    return res;
  }

  const result = await requestCareersPublicToken(body);

  if (!result.success) {
    const status =
      result.code === 'unsupported_grant_type' ||
      result.code === 'invalid_request'
        ? 400
        : result.code === 'invalid_client'
          ? 401
          : result.errorDescription === 'Token signing is not configured'
            ? 503
            : 500;
    const res = withCors(
      NextResponse.json(
        { error: result.code, error_description: result.errorDescription },
        { status }
      )
    );
    applyRateLimitHeaders(res.headers, rate);
    return res;
  }

  const res = withCors(
    NextResponse.json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: result.expiresIn
    })
  );
  applyRateLimitHeaders(res.headers, rate);
  return res;
}
