import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CommentaryPayload = {
  questionId: string;
  forceRefresh?: boolean;
};

type Commentary = {
  questionId: string;
  generatedAt: string;
  cached: boolean;
  beforeReveal: {
    talkingPoints: string[];
    roomPrompts: string[];
  };
  afterReveal: {
    talkingPoints: string[];
    revealLine: string | null;
  };
  avoidSaying: string[];
  sourceSummary: string | null;
};

const memoryCache = new Map<string, Commentary>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function extractOutputText(response: Record<string, unknown>): string {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];

    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const row = part as Record<string, unknown>;

      if (typeof row.text === 'string') {
        chunks.push(row.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase Edge Function secrets are incomplete.' }, 500);
    }

    if (!openAiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured for this Edge Function.' }, 500);
    }

    const authorization = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Host authentication is required.' }, 401);
    }

    const body = await request.json() as CommentaryPayload;
    const questionId = String(body.questionId ?? '').trim();

    if (!questionId) {
      return jsonResponse({ error: 'questionId is required.' }, 400);
    }

    if (!body.forceRefresh) {
      const cached = memoryCache.get(questionId);
      if (cached) {
        return jsonResponse({
          ...cached,
          cached: true,
        });
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: question, error: questionError } = await admin
      .from('tvm_trivia_questions')
      .select(`
        id,
        prompt,
        explanation,
        difficulty,
        source_name,
        source_url,
        tvm_trivia_categories (
          name,
          slug
        ),
        tvm_trivia_options (
          id,
          label,
          is_correct,
          sort_order
        )
      `)
      .eq('id', questionId)
      .maybeSingle();

    if (questionError) {
      return jsonResponse({ error: questionError.message }, 500);
    }

    if (!question) {
      return jsonResponse({ error: 'Trivia question was not found.' }, 404);
    }

    const options = [...(question.tvm_trivia_options ?? [])]
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    const correct = options.find((option) => Boolean(option.is_correct));

    if (!correct) {
      return jsonResponse({ error: 'The question has no configured correct answer.' }, 422);
    }

    const categoryValue = question.tvm_trivia_categories;
    const category = Array.isArray(categoryValue)
      ? categoryValue[0]?.name ?? 'Trivia'
      : categoryValue?.name ?? 'Trivia';

    const prompt = String(question.prompt ?? '');
    const correctAnswer = String(correct.label ?? '');
    const answerChoices = options.map((option, index) => (
      `${String.fromCharCode(65 + index)}. ${String(option.label ?? '')}`
    )).join('\n');

    const instructions = `
You create private commentary notes for a human bar-trivia host.

Your notes MUST be about the exact trivia question supplied.
Use web search to ground factual context when useful.

Critical rules:
1. BEFORE REVEAL notes must never state, identify, strongly imply, or uniquely clue the correct answer.
2. BEFORE REVEAL may discuss the broader subject, era, category, or adjacent facts only when they do not reveal the answer.
3. AFTER REVEAL may discuss the correct answer directly and should provide genuinely interesting context.
4. AVOID SAYING must identify specific clues/topics the host should not mention before reveal because they could expose the answer.
5. Do not write generic hosting advice such as "give teams time" unless it is specifically tied to this question.
6. Do not fabricate facts. If a detail cannot be grounded confidently, leave it out.
7. Keep each bullet short enough for a host to glance at during a live show.
8. Room prompts may be funny or conversational, but must not leak the answer.
9. Do not mention that you are an AI.
10. Return only JSON matching the requested schema.
`.trim();

    const input = `
CATEGORY:
${category}

QUESTION:
${prompt}

ANSWER CHOICES:
${answerChoices}

CORRECT ANSWER (PRIVATE, NEVER LEAK BEFORE REVEAL):
${correctAnswer}

EXISTING EXPLANATION:
${question.explanation ?? 'None'}

SOURCE:
${question.source_name ?? 'Unknown'}${question.source_url ? ` - ${question.source_url}` : ''}

Generate host commentary specifically for this question.
`.trim();

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        tools: [
          {
            type: 'web_search',
          },
        ],
        instructions,
        input,
        text: {
          format: {
            type: 'json_schema',
            name: 'trivia_host_commentary',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                beforeReveal: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    talkingPoints: {
                      type: 'array',
                      minItems: 2,
                      maxItems: 4,
                      items: { type: 'string' },
                    },
                    roomPrompts: {
                      type: 'array',
                      minItems: 1,
                      maxItems: 3,
                      items: { type: 'string' },
                    },
                  },
                  required: ['talkingPoints', 'roomPrompts'],
                },
                afterReveal: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    talkingPoints: {
                      type: 'array',
                      minItems: 2,
                      maxItems: 4,
                      items: { type: 'string' },
                    },
                    revealLine: {
                      type: ['string', 'null'],
                    },
                  },
                  required: ['talkingPoints', 'revealLine'],
                },
                avoidSaying: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 4,
                  items: { type: 'string' },
                },
                sourceSummary: {
                  type: ['string', 'null'],
                },
              },
              required: [
                'beforeReveal',
                'afterReveal',
                'avoidSaying',
                'sourceSummary',
              ],
            },
          },
        },
      }),
    });

    const openAiBody = await openAiResponse.json() as Record<string, unknown>;

    if (!openAiResponse.ok) {
      const errorValue = openAiBody.error;
      const message = errorValue && typeof errorValue === 'object'
        ? String((errorValue as Record<string, unknown>).message ?? 'OpenAI request failed.')
        : 'OpenAI request failed.';

      return jsonResponse({ error: message }, 502);
    }

    const outputText = extractOutputText(openAiBody);

    if (!outputText) {
      return jsonResponse({ error: 'AI commentary response contained no text.' }, 502);
    }

    let generated: {
      beforeReveal: Commentary['beforeReveal'];
      afterReveal: Commentary['afterReveal'];
      avoidSaying: string[];
      sourceSummary: string | null;
    };

    try {
      generated = JSON.parse(outputText);
    } catch {
      return jsonResponse({ error: 'AI commentary response was not valid JSON.' }, 502);
    }

    const result: Commentary = {
      questionId,
      generatedAt: new Date().toISOString(),
      cached: false,
      beforeReveal: generated.beforeReveal,
      afterReveal: generated.afterReveal,
      avoidSaying: generated.avoidSaying,
      sourceSummary: generated.sourceSummary,
    };

    memoryCache.set(questionId, result);

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unexpected commentary service error.',
    }, 500);
  }
});
