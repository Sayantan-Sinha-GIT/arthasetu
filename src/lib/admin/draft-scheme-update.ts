// ─── AI change detection for an existing scheme (server-side only) ───
// Reads an official notice — pasted text, a web page or a PDF — and asks the
// model which fields of one scheme it changes. The model's report is then
// checked field by field (see scheme-update.ts) before an administrator sees it.

import { generateContent, generateContentFromDocument, GEMINI_MODELS } from '@/lib/gemini';
import { buildSchemeChangePrompt } from '@/lib/prompts/admin';
import {
  SCHEME_UPDATE_FIELDS,
  buildSchemeChanges,
  getPathValue,
  type ProposedSchemeChange,
  type SchemeChanges,
} from '@/lib/admin/scheme-update';
import type { Scheme } from '@/types';

export type NoticeSource = 'text' | 'page' | 'pdf';

export interface SchemeUpdateDraft {
  summary: string;
  changes: SchemeChanges;
  source: NoticeSource;
  sourceUrl: string;
  /** Changes the AI reported that were dropped: unknown fields, unusable or unchanged values. */
  ignored: number;
}

/** Gemini accepts inline documents up to about 20 MB; notices are far smaller. */
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
/** Enough for a long circular, and a bound on one request's prompt. */
const MAX_NOTICE_CHARS = 60_000;
const FETCH_TIMEOUT_MS = 15_000;

export class NoticeError extends Error {}

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
};

/** Readable text from a web page: no scripts, styles or tags, one block per line. */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|section|article|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** Only public web addresses: the server fetches this on the admin's behalf. */
function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new NoticeError('That link is not a valid web address.');
  }
  const host = url.hostname.toLowerCase();
  const privateHost =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.startsWith('[');
  if (!['http:', 'https:'].includes(url.protocol) || privateHost) {
    throw new NoticeError('Use a public http or https link to the notice.');
  }
  return url;
}

export async function readNoticeFromUrl(
  raw: string
): Promise<{ kind: 'page'; text: string } | { kind: 'pdf'; data: string }> {
  const url = assertPublicUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Several government portals refuse requests without a browser-like agent.
        'User-Agent': 'Mozilla/5.0 (compatible; ArthaSetuSchemeUpdater/1.0)',
        Accept: 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.5',
      },
    });
  } catch {
    throw new NoticeError('Could not open that link (it did not respond in time). Paste the notice text instead.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new NoticeError(`That link returned an error (HTTP ${res.status}). Paste the notice text instead.`);
  }
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_SOURCE_BYTES) {
    throw new NoticeError('That document is too large to read (over 8 MB). Paste the relevant part instead.');
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_SOURCE_BYTES) {
    throw new NoticeError('That document is too large to read (over 8 MB). Paste the relevant part instead.');
  }

  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (type.includes('pdf') || bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
    return { kind: 'pdf', data: bytes.toString('base64') };
  }

  const body = bytes.toString('utf8');
  const text = (type.includes('text/plain') ? body : htmlToText(body)).slice(0, MAX_NOTICE_CHARS);
  if (text.length < 200) {
    throw new NoticeError(
      'That page has almost no readable text (it may need JavaScript or a login). Paste the notice text instead.'
    );
  }
  return { kind: 'page', text };
}

/** The model's JSON, tolerating a code fence or the older map-shaped answer. */
export function parseChangeReport(raw: string): { summary: string; proposed: ProposedSchemeChange[] } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI did not return a readable change report.');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    summaryOfChanges?: unknown;
    changes?: unknown;
    proposedChanges?: unknown;
  };

  let proposed: ProposedSchemeChange[] = [];
  if (Array.isArray(parsed.changes)) {
    proposed = parsed.changes as ProposedSchemeChange[];
  } else if (parsed.proposedChanges && typeof parsed.proposedChanges === 'object') {
    proposed = Object.entries(parsed.proposedChanges as Record<string, { new?: unknown }>).map(([field, change]) => ({
      field,
      newValue: change?.new,
    }));
  }
  return {
    summary: typeof parsed.summaryOfChanges === 'string' ? parsed.summaryOfChanges.trim() : '',
    proposed,
  };
}

export async function draftSchemeUpdate({
  currentScheme,
  circularText,
  sourceUrl,
}: {
  currentScheme: Scheme;
  circularText?: string;
  sourceUrl?: string;
}): Promise<SchemeUpdateDraft> {
  const pasted = (circularText || '').trim();
  const link = (sourceUrl || '').trim();

  // Pasted text wins; a link given alongside it is kept only as the source reference.
  let notice: { kind: 'text' | 'page'; text: string } | { kind: 'pdf'; data: string };
  if (pasted.length >= 20) {
    notice = { kind: 'text', text: pasted.slice(0, MAX_NOTICE_CHARS) };
  } else if (link) {
    notice = await readNoticeFromUrl(link);
  } else {
    throw new NoticeError('Paste the notice text (at least 20 characters) or give a link to it.');
  }

  const currentValues = Object.fromEntries(
    SCHEME_UPDATE_FIELDS.map((field) => [field.path, getPathValue(currentScheme, field.path) ?? null])
  );
  const systemPrompt = buildSchemeChangePrompt(currentScheme.name, currentValues, SCHEME_UPDATE_FIELDS);
  const options = { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json' };

  const raw =
    notice.kind === 'pdf'
      ? await generateContentFromDocument(
          GEMINI_MODELS.FLASH_LITE,
          systemPrompt,
          { mimeType: 'application/pdf', data: notice.data },
          'The attached PDF is the official notice. Report what it changes in this scheme as the JSON described.',
          options
        )
      : await generateContent(GEMINI_MODELS.FLASH_LITE, systemPrompt, `OFFICIAL NOTICE:\n${notice.text}`, options);

  const report = parseChangeReport(raw);
  const changes = buildSchemeChanges(currentScheme, report.proposed);
  return {
    summary: report.summary,
    changes,
    source: notice.kind,
    sourceUrl: link,
    ignored: Math.max(0, report.proposed.length - Object.keys(changes).length),
  };
}
