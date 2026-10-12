/**
 * Bowl-side voice assistant — text answering via OpenAI chat completions.
 * Uses OPENAI_ASSISTANT_KEY (falls back to OPENAI_API_KEY) — kept separate
 * from the vision key so assistant/dictation spend and rate limits are
 * isolated from photo analysis.
 */

const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL ?? 'gpt-4o-mini';
const ASSISTANT_TIMEOUT_MS = Number(process.env.ASSISTANT_TIMEOUT_MS ?? 20000);

// gpt-4o-mini: $0.15 / $0.60 per 1M input/output tokens.
const INPUT_COST_PER_TOKEN = 0.15 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.6 / 1_000_000;

// No real audio duration is tracked (speech-to-text and text-to-speech both
// run client-side in the browser, never touching this backend) — this is a
// display estimate only, from a typical speaking pace, not a billed metric.
const WORDS_PER_MINUTE = 140;

export interface AssistantContext {
  clientName?: string;
  currentFormula?: Record<string, unknown>;
  brands?: Record<string, string[]>;
}

export interface AssistantAnswer {
  answer: string;
  costCents: number;
  estMinutes: number;
}

const SYSTEM_PROMPT = `You are the ColorIq bowl-side voice assistant — a professional colorist's quick-reference assistant, used hands-on while mixing formulas at the color bar. Answer in 1-3 short sentences, spoken-style (this gets read aloud via text-to-speech). Be direct and practical: developer volumes, mix ratios, processing times, safety notes, and fixes for common mistakes. If a question is unsafe (e.g. ignoring an allergy warning) or outside hair color, say so briefly and redirect.`;

export async function askAssistant(question: string, context?: AssistantContext): Promise<AssistantAnswer | null> {
  const apiKey = process.env.OPENAI_ASSISTANT_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return null;

  const contextLines: string[] = [];
  if (context?.clientName) contextLines.push(`Client: ${context.clientName}`);
  if (context?.currentFormula) contextLines.push(`Current formula: ${JSON.stringify(context.currentFormula)}`);
  const userContent = contextLines.length > 0 ? `${contextLines.join('\n')}\n\nQuestion: ${question}` : question;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: ASSISTANT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 200,
        temperature: 0.4,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return null;

    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    const costCents = (promptTokens * INPUT_COST_PER_TOKEN + completionTokens * OUTPUT_COST_PER_TOKEN) * 100;

    const wordCount = (question.split(/\s+/).length + answer.split(/\s+/).length);
    const estMinutes = wordCount / WORDS_PER_MINUTE;

    return { answer, costCents, estMinutes };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
