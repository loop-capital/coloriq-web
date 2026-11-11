/**
 * POST /api/consultation/dictate — voice-to-field dictation mapping.
 *
 * Body: { transcript: string, currentFields?: object }
 * Maps a spoken (browser-STT-produced) consultation transcript onto
 * consultation field updates via gpt-4o-mini structured output, validates
 * every key/value against the FIELD_SCHEMA in lib/consultation/field-mapping,
 * and returns:
 *   { updates: object, unmatched: string[], billing: {...} }
 *
 * Every mapped key is a dotted path in the consultation wizard `fd` state
 * (e.g. 'condition.grayPercent'). `unmatched` lists transcript fragments that
 * could not be confidently mapped to any field, so the stylist can fill them
 * in by hand.
 *
 * Usage is metered into voice_assistant_usage (same table as the bowl-side
 * voice assistant) so it lands on the salon's monthly formula-usage invoice —
 * see lib/billing.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';
import { resolveStylist } from '@/lib/transformation-auth';
import {
  DICTATION_SYSTEM_PROMPT,
  DICTATION_JSON_SCHEMA,
  validateAndNormalizeUpdates,
  type DictationResponse,
} from '@/lib/consultation/field-mapping';

const DICTATION_MODEL = process.env.DICTATION_MODEL ?? 'gpt-4o-mini';
const DICTATION_TIMEOUT_MS = Number(process.env.DICTATION_TIMEOUT_MS ?? 25000);

// gpt-4o-mini list pricing: $0.15 / $0.60 per 1M input/output tokens.
const INPUT_COST_PER_TOKEN = 0.15 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.6 / 1_000_000;

// Display estimate only (same convention as the voice assistant): the audio
// itself never touches this backend — STT runs in the browser.
const WORDS_PER_MINUTE = 140;

const dictateSchema = z.object({
  transcript: z.string().min(1).max(2000),
  currentFields: z.record(z.string(), z.unknown()).optional(),
});

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function POST(request: NextRequest) {
  // Auth: session/JWT (existing browser flow) OR per-stylist API token
  // (Muse connector — Authorization: Bearer <token>, no browser session).
  // Token auth resolves through the shared transformation-auth helper so the
  // connector's credential works here identically to the v1 API surface.
  let meteredStylistId: string;
  let salonId: string | null;

  const authUser = await getUserFromRequest(request);
  if (authUser) {
    meteredStylistId = authUser.userId;
    salonId = await getSalonIdForUser(authUser.userId);
  } else {
    const tokenStylist = await resolveStylist(request);
    if (!tokenStylist) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const full = await prisma.stylists.findUnique({
      where: { id: tokenStylist.id },
      select: { user_id: true, salon_id: true },
    });
    meteredStylistId = full?.user_id ?? tokenStylist.id;
    // Salon resolution mirrors the session path (users.salon_id); falls back
    // to the stylist record's own salon_id when no user is linked.
    salonId = full?.user_id
      ? await getSalonIdForUser(full.user_id)
      : (full?.salon_id ?? null);
  }

  if (!salonId) {
    return NextResponse.json({ error: 'Your account isn’t linked to a salon yet.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = dictateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_ASSISTANT_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json(
      {
        error: 'Voice dictation mapping is unavailable right now (AI key not configured). Fill in the fields by hand.',
        code: 'DICTATION_UNAVAILABLE',
      },
      { status: 503 }
    );
  }

  const { transcript, currentFields } = parsed.data;

  const contextLines: string[] = [];
  if (currentFields && Object.keys(currentFields).length > 0) {
    contextLines.push('Current consultation field values (for reference — only include fields the transcript explicitly mentions):');
    contextLines.push(JSON.stringify(currentFields));
  }
  const userContent =
    (contextLines.length > 0 ? contextLines.join('\n') + '\n\n' : '') +
    `Stylist dictation transcript:\n"${transcript}"`;

  let data: OpenAIChatResponse;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DICTATION_TIMEOUT_MS);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: DICTATION_MODEL,
          messages: [
            { role: 'system', content: DICTATION_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_schema', json_schema: DICTATION_JSON_SCHEMA },
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 429) {
          return NextResponse.json(
            {
              error: 'Voice dictation mapping is unavailable right now (AI service issue). Fill in the fields by hand.',
              code: 'DICTATION_UNAVAILABLE',
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: 'Dictation mapping failed. Fill in the fields by hand.', code: 'DICTATION_FAILED' },
          { status: 502 }
        );
      }

      data = (await response.json()) as OpenAIChatResponse;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return NextResponse.json(
      { error: 'Dictation mapping timed out. Fill in the fields by hand.', code: 'DICTATION_FAILED' },
      { status: 502 }
    );
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json(
      { error: 'Dictation mapping returned nothing. Fill in the fields by hand.', code: 'DICTATION_FAILED' },
      { status: 502 }
    );
  }

  let mapped: { updates?: Record<string, unknown>; unmatched?: unknown };
  try {
    mapped = JSON.parse(content);
  } catch {
    return NextResponse.json(
      { error: 'Dictation mapping returned invalid data. Fill in the fields by hand.', code: 'DICTATION_FAILED' },
      { status: 502 }
    );
  }

  const rawUpdates = mapped.updates && typeof mapped.updates === 'object' ? (mapped.updates as Record<string, unknown>) : {};
  const rawUnmatched = Array.isArray(mapped.unmatched) ? mapped.unmatched.filter((u): u is string => typeof u === 'string') : [];

  // Server-side guard: the LLM must not invent fields or emit unusable values.
  const { normalized, rejected } = validateAndNormalizeUpdates(rawUpdates);
  const unmatched = [
    ...rawUnmatched,
    ...rejected.map((r) => `Could not apply "${r.key}": ${r.reason}`),
  ];

  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const costCents = (promptTokens * INPUT_COST_PER_TOKEN + completionTokens * OUTPUT_COST_PER_TOKEN) * 100;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length + content.split(/\s+/).filter(Boolean).length;
  const estMinutes = wordCount / WORDS_PER_MINUTE;

  // Meter into the same usage table as the voice assistant so dictation
  // lands on the salon's monthly invoice (see lib/billing.ts). Metering
  // failures must not fail the mapping itself.
  try {
    await prisma.voice_assistant_usage.create({
      data: {
        salon_id: salonId,
        stylist_id: meteredStylistId,
        question: transcript.slice(0, 1000),
        cost_cents: costCents,
        est_minutes: estMinutes,
      },
    });
  } catch (err) {
    console.error('[dictate] usage metering failed', err);
  }

  const response: DictationResponse = {
    updates: normalized,
    unmatched,
    billing: { billedCents: costCents, billedMinutes: estMinutes },
  };
  return NextResponse.json(response);
}
