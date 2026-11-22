'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label
} from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Briefcase,
  Copy,
  Download,
  FileText,
  Info,
  Key,
  Loader2,
  Play,
  Upload
} from 'lucide-react';

type ApiResult = { status: number; body: unknown };

function ApiResponseBlock({ result }: { result: ApiResult | null }) {
  if (!result) return null;
  return (
    <div className="space-y-2">
      <Label>Response ({result.status})</Label>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
        {JSON.stringify(result.body, null, 2)}
      </pre>
    </div>
  );
}

function CurlBlock({
  curl,
  onCopy
}: {
  curl: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="border-t pt-4">
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-xs">cURL request example</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          type="button"
          onClick={() => onCopy(curl)}
          disabled={!curl}
        >
          <Copy className="mr-1 h-3 w-3" />
          Copy
        </Button>
      </div>
      <pre className="max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
        {curl || '(Detecting origin…)'}
      </pre>
    </div>
  );
}

async function parseResponse(res: Response): Promise<ApiResult> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  return { status: res.status, body };
}

function shellEscape(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

export function CareersApiPlayground() {
  const [baseUrl, setBaseUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') setBaseUrl(window.location.origin);
  }, []);
  const origin = baseUrl || '';

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<ApiResult | null>(null);
  const [accessToken, setAccessToken] = useState('');

  const [jobsKeyword, setJobsKeyword] = useState('');
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsResult, setJobsResult] = useState<ApiResult | null>(null);

  const [jobSlug, setJobSlug] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailResult, setDetailResult] = useState<ApiResult | null>(null);

  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [qualifications, setQualifications] = useState('');
  const [skills, setSkills] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<ApiResult | null>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [multipartLoading, setMultipartLoading] = useState(false);
  const [multipartResult, setMultipartResult] = useState<ApiResult | null>(
    null
  );

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const curlToken = useMemo(() => {
    if (!origin) return '';
    return `curl -X POST '${origin}/api/public/careers/token' \\
  -H 'Content-Type: application/json' \\
  -d '{"grant_type":"client_credentials","client_id":"${shellEscape(clientId || 'YOUR_CLIENT_ID')}","client_secret":"${shellEscape(clientSecret || 'YOUR_CLIENT_SECRET')}"}'`;
  }, [origin, clientId, clientSecret]);

  const curlJobs = useMemo(() => {
    if (!origin) return '';
    const qs = jobsKeyword.trim()
      ? `?keyword=${encodeURIComponent(jobsKeyword.trim())}`
      : '';
    return `curl -X GET '${origin}/api/public/careers/jobs${qs}' \\
  -H 'Authorization: Bearer ${shellEscape(accessToken || 'YOUR_ACCESS_TOKEN')}'`;
  }, [origin, jobsKeyword, accessToken]);

  const curlDetail = useMemo(() => {
    if (!origin) return '';
    const slug = jobSlug.trim() || 'your-job-slug';
    return `curl -X GET '${origin}/api/public/careers/jobs/${encodeURIComponent(slug)}' \\
  -H 'Authorization: Bearer ${shellEscape(accessToken || 'YOUR_ACCESS_TOKEN')}'`;
  }, [origin, jobSlug, accessToken]);

  const curlApplyJson = useMemo(() => {
    if (!origin) return '';
    const body = {
      jobSlug: jobSlug.trim() || 'your-job-slug',
      candidateName: candidateName || 'A. Perera',
      candidateEmail: candidateEmail || 'a.perera@example.com',
      candidatePhone: candidatePhone || undefined,
      experienceYears: Number(experienceYears) || 0,
      qualifications: qualifications || undefined,
      skills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    };
    return `curl -X POST '${origin}/api/public/careers/applications' \\
  -H 'Authorization: Bearer ${shellEscape(accessToken || 'YOUR_ACCESS_TOKEN')}' \\
  -H 'Content-Type: application/json' \\
  -d '${shellEscape(JSON.stringify(body))}'`;
  }, [
    origin,
    accessToken,
    jobSlug,
    candidateName,
    candidateEmail,
    candidatePhone,
    experienceYears,
    qualifications,
    skills
  ]);

  const curlApplyMultipart = useMemo(() => {
    if (!origin) return '';
    return `curl -X POST '${origin}/api/public/careers/applications' \\
  -H 'Authorization: Bearer ${shellEscape(accessToken || 'YOUR_ACCESS_TOKEN')}' \\
  -F 'jobSlug=${shellEscape(jobSlug.trim() || 'your-job-slug')}' \\
  -F 'candidateName=${shellEscape(candidateName || 'A. Perera')}' \\
  -F 'candidateEmail=${shellEscape(candidateEmail || 'a.perera@example.com')}' \\
  -F 'resume=@/path/to/cv.pdf'`;
  }, [origin, accessToken, jobSlug, candidateName, candidateEmail]);

  const handleGetToken = async () => {
    setTokenLoading(true);
    setTokenResult(null);
    try {
      const res = await fetch('/api/public/careers/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId.trim(),
          client_secret: clientSecret
        })
      });
      const result = await parseResponse(res);
      setTokenResult(result);
      const token = (result.body as { access_token?: string })?.access_token;
      if (result.status === 200 && typeof token === 'string') {
        setAccessToken(token);
      }
    } catch (e) {
      setTokenResult({
        status: 0,
        body: {
          error: 'network_error',
          error_description: e instanceof Error ? e.message : 'Request failed'
        }
      });
    } finally {
      setTokenLoading(false);
    }
  };

  const handleListJobs = async () => {
    setJobsLoading(true);
    setJobsResult(null);
    try {
      const qs = jobsKeyword.trim()
        ? `?keyword=${encodeURIComponent(jobsKeyword.trim())}`
        : '';
      const res = await fetch(`/api/public/careers/jobs${qs}`, {
        headers: { Authorization: `Bearer ${accessToken.trim()}` }
      });
      setJobsResult(await parseResponse(res));
    } catch (e) {
      setJobsResult({
        status: 0,
        body: {
          error: 'network_error',
          error_description: e instanceof Error ? e.message : 'Request failed'
        }
      });
    } finally {
      setJobsLoading(false);
    }
  };

  const handleJobDetail = async () => {
    setDetailLoading(true);
    setDetailResult(null);
    try {
      const slug = encodeURIComponent(jobSlug.trim());
      const res = await fetch(`/api/public/careers/jobs/${slug}`, {
        headers: { Authorization: `Bearer ${accessToken.trim()}` }
      });
      setDetailResult(await parseResponse(res));
    } catch (e) {
      setDetailResult({
        status: 0,
        body: {
          error: 'network_error',
          error_description: e instanceof Error ? e.message : 'Request failed'
        }
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const applyPayload = () => ({
    jobSlug: jobSlug.trim(),
    candidateName: candidateName.trim(),
    candidateEmail: candidateEmail.trim(),
    candidatePhone: candidatePhone.trim() || undefined,
    experienceYears: Number(experienceYears) || 0,
    qualifications: qualifications.trim() || undefined,
    skills: skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  });

  const handleApplyJson = async () => {
    setApplyLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/public/careers/applications', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applyPayload())
      });
      setApplyResult(await parseResponse(res));
    } catch (e) {
      setApplyResult({
        status: 0,
        body: {
          error: 'network_error',
          error_description: e instanceof Error ? e.message : 'Request failed'
        }
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApplyMultipart = async () => {
    setMultipartLoading(true);
    setMultipartResult(null);
    try {
      const form = new FormData();
      const payload = applyPayload();
      form.set('jobSlug', payload.jobSlug);
      form.set('candidateName', payload.candidateName);
      form.set('candidateEmail', payload.candidateEmail);
      if (payload.candidatePhone) form.set('candidatePhone', payload.candidatePhone);
      form.set('experienceYears', String(payload.experienceYears ?? 0));
      if (payload.qualifications) form.set('qualifications', payload.qualifications);
      if (payload.skills?.length) form.set('skills', JSON.stringify(payload.skills));
      if (resumeFile) form.set('resume', resumeFile);

      const res = await fetch('/api/public/careers/applications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
        body: form
      });
      setMultipartResult(await parseResponse(res));
    } catch (e) {
      setMultipartResult({
        status: 0,
        body: {
          error: 'network_error',
          error_description: e instanceof Error ? e.message : 'Request failed'
        }
      });
    } finally {
      setMultipartLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
        <a
          href="/api/public/careers/postman-collection"
          download="hrm-public-careers-api.postman_collection.json"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Download Postman collection
        </a>
        <p className="text-muted-foreground text-xs sm:ml-1">
          Import into Postman. <code>baseUrl</code> is set to this environment.
          Fill <code>client_id</code> / <code>client_secret</code>, then run
          Create Access Token.
        </p>
      </div>

      <Accordion
        defaultValue={['playground-guide']}
        className="w-full"
      >
        <AccordionItem
          value="playground-guide"
          className="rounded-lg border border-primary/20 bg-muted/30 px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-start gap-2 text-left">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  How to use this playground
                </p>
                <p className="text-sm font-normal text-muted-foreground">
                  Live requests hit this HRM app&apos;s Public Careers API (same
                  path the hospital website BFF will use). Responses and cURL
                  examples appear under each step.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t pt-3">
            <div className="space-y-4 pb-2 text-sm">
              <div>
                <p className="font-medium">Before you start</p>
                <ol className="text-muted-foreground mt-2 list-decimal space-y-1.5 pl-5">
                  <li>
                    In the <strong>Clients</strong> tab, create (or open) an API
                    client linked to an <strong>API User</strong>.
                  </li>
                  <li>
                    Copy the <strong>client ID</strong> and the{' '}
                    <strong>client secret</strong> (secret is shown only once on
                    create or rotate).
                  </li>
                  <li>
                    Assign scopes: at least{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      careers:read
                    </code>{' '}
                    for jobs; add{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      careers:apply
                    </code>{' '}
                    to test applications.
                  </li>
                  <li>
                    For apply steps, set{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      CAREERS_PUBLIC_APPLY_ENABLED=true
                    </code>{' '}
                    in the HRM server env and restart if needed. Ensure a{' '}
                    <strong>published</strong> job post with a future closing
                    date exists (use its slug in steps 3–5).
                  </li>
                </ol>
              </div>
              <div>
                <p className="font-medium">Suggested order</p>
                <ol className="text-muted-foreground mt-2 list-decimal space-y-1.5 pl-5">
                  <li>
                    <strong>Get access token</strong> — paste credentials; the
                    Bearer token is filled automatically for later steps.
                  </li>
                  <li>
                    <strong>List jobs</strong> — confirm published openings
                    appear.
                  </li>
                  <li>
                    <strong>Job detail</strong> — paste a slug from the list
                    response.
                  </li>
                  <li>
                    <strong>Apply (JSON)</strong> — metadata only; check the new
                    row under Recruitment → Applications.
                  </li>
                  <li>
                    <strong>Apply with CV</strong> — optional PDF/image upload
                    (≤10 MB); confirms S3 resume storage when configured.
                  </li>
                </ol>
              </div>
              <p className="text-muted-foreground text-xs">
                Blocked clients and missing scopes return 401/403. Duplicate
                email on the same job returns 409. Full contract:{' '}
                <code className="rounded bg-muted px-1 py-0.5">
                  apps/hrm/docs/PUBLIC_CAREERS_API_GUIDE.md
                </code>
                .
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5" />
            1. Get access token
          </CardTitle>
          <CardDescription>
            POST /api/public/careers/token — OAuth2 client_credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pg_client_id">Client ID</Label>
            <Input
              id="pg_client_id"
              placeholder="UUID from API client create"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg_client_secret">Client secret</Label>
            <Input
              id="pg_client_secret"
              type="password"
              placeholder="Secret shown once on create/rotate"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleGetToken()}
            disabled={tokenLoading || !clientId.trim() || !clientSecret}
          >
            {tokenLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Get token
              </>
            )}
          </Button>
          <ApiResponseBlock result={tokenResult} />
          <CurlBlock curl={curlToken} onCopy={copyText} />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" />
            2. List jobs
          </CardTitle>
          <CardDescription>
            GET /api/public/careers/jobs — requires Bearer + careers:read
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pg_bearer">Bearer token</Label>
            <Input
              id="pg_bearer"
              type="password"
              placeholder="Filled automatically after step 1"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg_jobs_keyword">Keyword (optional)</Label>
            <Input
              id="pg_jobs_keyword"
              placeholder="e.g. nurse"
              value={jobsKeyword}
              onChange={(e) => setJobsKeyword(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleListJobs()}
            disabled={jobsLoading || !accessToken.trim()}
          >
            {jobsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                List jobs
              </>
            )}
          </Button>
          <ApiResponseBlock result={jobsResult} />
          <CurlBlock curl={curlJobs} onCopy={copyText} />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            3. Job detail
          </CardTitle>
          <CardDescription>
            GET /api/public/careers/jobs/[slug] — requires Bearer + careers:read
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pg_slug">Job slug</Label>
            <Input
              id="pg_slug"
              placeholder="e.g. staff-nurse-icu"
              value={jobSlug}
              onChange={(e) => setJobSlug(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleJobDetail()}
            disabled={detailLoading || !accessToken.trim() || !jobSlug.trim()}
          >
            {detailLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Get job
              </>
            )}
          </Button>
          <ApiResponseBlock result={detailResult} />
          <CurlBlock curl={curlDetail} onCopy={copyText} />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5" />
            4. Apply (JSON metadata)
          </CardTitle>
          <CardDescription>
            POST /api/public/careers/applications — careers:apply + feature flag
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pg_name">Candidate name</Label>
              <Input
                id="pg_name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg_email">Candidate email</Label>
              <Input
                id="pg_email"
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg_phone">Phone (optional)</Label>
              <Input
                id="pg_phone"
                placeholder="07xxxxxxxx"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg_exp">Experience years</Label>
              <Input
                id="pg_exp"
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pg_qual">Qualifications (optional)</Label>
              <Input
                id="pg_qual"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pg_skills">Skills (comma-separated, optional)</Label>
              <Input
                id="pg_skills"
                placeholder="ICU, ACLS"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Uses the job slug from step 3.
          </p>
          <Button
            type="button"
            onClick={() => void handleApplyJson()}
            disabled={
              applyLoading ||
              !accessToken.trim() ||
              !jobSlug.trim() ||
              !candidateName.trim() ||
              !candidateEmail.trim()
            }
          >
            {applyLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Submit application
              </>
            )}
          </Button>
          <ApiResponseBlock result={applyResult} />
          <CurlBlock curl={curlApplyJson} onCopy={copyText} />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            5. Apply with CV (multipart)
          </CardTitle>
          <CardDescription>
            Same endpoint with multipart/form-data + optional resume (PDF/image,
            ≤10 MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pg_resume">Resume file (optional)</Label>
            <Input
              id="pg_resume"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleApplyMultipart()}
            disabled={
              multipartLoading ||
              !accessToken.trim() ||
              !jobSlug.trim() ||
              !candidateName.trim() ||
              !candidateEmail.trim()
            }
          >
            {multipartLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Submit with CV
              </>
            )}
          </Button>
          <ApiResponseBlock result={multipartResult} />
          <CurlBlock curl={curlApplyMultipart} onCopy={copyText} />
        </CardContent>
      </Card>
    </div>
  );
}
