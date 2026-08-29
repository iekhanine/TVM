import type {
  AuthChangeEvent,
  RealtimeChannel,
  Session,
  User,
} from '@supabase/supabase-js';

import {
  SUPABASE_ENABLED,
  supabase,
} from '../lib/supabase';

/* ==========================================================
   TRIVIA SERVICE 001 - PUBLIC TYPES
   Shared runtime contracts used by Host, Display, and Player.
   ========================================================== */

export type TriviaPhase =
  | 'lobby'
  | 'question'
  | 'locked'
  | 'reveal'
  | 'scoreboard'
  | 'finished';

export type TriviaStatus =
  | 'draft'
  | 'lobby'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type TriviaOptionState = {
  id: string;
  label: string;
  isCorrect: boolean | null;
  teamAnswerCount: number | null;
};

export type TriviaQuestionState = {
  id: string;
  type: string;
  prompt: string;
  mediaUrl: string | null;
  points: number;
  timeLimitSeconds: number;
  explanation: string | null;
  options: TriviaOptionState[];
};

export type TriviaLeaderboardRow = {
  rank: number;
  id: string;
  name: string;
  score: number;
  members: number;
};

export type TriviaState = {
  sessionId: string;
  joinCode: string;
  status: TriviaStatus;
  phase: TriviaPhase;
  title: string;
  venue: string;
  playerCount: number;
  teamCount: number;
  answeredTeamCount: number;
  questionStartedAt: string | null;
  answerDeadlineAt: string | null;
  leaderboard: TriviaLeaderboardRow[];
  question: TriviaQuestionState | null;
};

export type WorkspaceContext = {
  organizationId: string;
  venueId: string;
  organizationName: string;
  venueName: string;
};

export type TriviaTeamSummary = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  maxMembers: number;
  score: number;
  captainPlayerId: string | null;
};

export type TriviaTeamMember = {
  id: string;
  nickname: string;
  isCaptain: boolean;
  status: string;
};

export type TriviaTeamContext = {
  id: string;
  name: string;
  inviteCode: string;
  score: number;
  maxMembers: number;
  isCaptain: boolean;
  captainPlayerId: string | null;
  members: TriviaTeamMember[];
};

export type TriviaVoteSummary = {
  optionId: string;
  votes: number;
};

export type TriviaPlayerContext = {
  playerId: string;
  nickname: string;
  sessionId: string;
  joinCode: string;
  phase: TriviaPhase;
  status: TriviaStatus;
  currentQuestionId: string | null;
  team: TriviaTeamContext | null;
  currentVoteOptionId: string | null;
  teamVoteSummary: TriviaVoteSummary[];
  teamAnswer: {
    selectedOptionId: string | null;
    lockedByPlayerId: string | null;
    pointsAwarded: number;
  } | null;
  teamRank: number | null;
};

export type TriviaJoinResult = {
  sessionId: string;
  playerId: string;
  playerToken: string;
  venueName: string;
  sessionTitle: string;
};

export type HostSessionSummary = {
  id: string;
  join_code: string | null;
  status: TriviaStatus;
  phase: TriviaPhase;
  title: string | null;
  created_at: string;
};

/* ==========================================================
   TRIVIA SERVICE 002 - CLIENT GUARD / ERROR NORMALIZATION
   ========================================================== */

function requireSupabase() {
  if (!SUPABASE_ENABLED || !supabase) {
    throw new Error(
      'Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return supabase;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected TVM Trivia error occurred.';
}

function unwrapRpcObject<T>(data: unknown): T {
  if (Array.isArray(data)) {
    if (data.length < 1) throw new Error('Supabase returned no data.');
    return data[0] as T;
  }

  if (data === null || data === undefined) {
    throw new Error('Supabase returned no data.');
  }

  return data as T;
}

/* ==========================================================
   TRIVIA SERVICE 003 - AUTH
   Hosts authenticate; public players do not need accounts.
   ========================================================== */

export async function getCurrentHostUser(): Promise<User | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

export function onHostAuthChanged(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function signInTriviaHost(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUpTriviaHost(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOutTriviaHost() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
}

/* ==========================================================
   TRIVIA SERVICE 004 - HOST WORKSPACE / SESSION
   ========================================================== */

export async function bootstrapTriviaWorkspace(): Promise<WorkspaceContext> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_bootstrap_my_workspace', {
    p_organization_name: 'TVM Organization',
    p_venue_name: 'Main Venue',
  });

  if (error) throw new Error(error.message);
  return unwrapRpcObject<WorkspaceContext>(data);
}

export async function getLatestTriviaSession(
  venueId: string,
): Promise<HostSessionSummary | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('tvm_trivia_sessions')
    .select('id, join_code, status, phase, title, created_at')
    .eq('venue_id', venueId)
    .in('status', ['lobby', 'active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as HostSessionSummary | null;
}

export async function createStarterTriviaSession(
  venueId: string,
  title = 'Saturday Night Trivia',
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_create_starter_trivia_session', {
    p_venue_id: venueId,
    p_title: title,
  });

  if (error) throw new Error(error.message);
  return unwrapRpcObject<{
    sessionId: string;
    joinCode: string;
    status: TriviaStatus;
    phase: TriviaPhase;
    title: string;
  }>(data);
}

async function callHostStateRpc(
  functionName:
    | 'tvm_host_start_trivia_session'
    | 'tvm_host_reveal_trivia_answer'
    | 'tvm_host_show_trivia_scoreboard'
    | 'tvm_host_next_trivia_question'
    | 'tvm_host_end_trivia_session',
  sessionId: string,
): Promise<TriviaState> {
  const client = requireSupabase();
  const { data, error } = await client.rpc(functionName, {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message);
  return unwrapRpcObject<TriviaState>(data);
}

export async function startTriviaSession(sessionId: string) {
  return callHostStateRpc('tvm_host_start_trivia_session', sessionId);
}

export async function revealTriviaAnswer(sessionId: string) {
  return callHostStateRpc('tvm_host_reveal_trivia_answer', sessionId);
}

export async function showTriviaScoreboard(sessionId: string) {
  return callHostStateRpc('tvm_host_show_trivia_scoreboard', sessionId);
}

export async function nextTriviaQuestion(sessionId: string) {
  return callHostStateRpc('tvm_host_next_trivia_question', sessionId);
}

export async function endTriviaSession(sessionId: string) {
  return callHostStateRpc('tvm_host_end_trivia_session', sessionId);
}

/* ==========================================================
   TRIVIA SERVICE 005 - PUBLIC GAME STATE
   Safe state comes only from the SECURITY DEFINER RPC.
   ========================================================== */

export async function getTriviaState(joinCode: string): Promise<TriviaState | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_get_trivia_state', {
    p_join_code: joinCode,
  });

  if (error) throw new Error(error.message);
  return data as TriviaState | null;
}

/* ==========================================================
   TRIVIA SERVICE 006 - PLAYER / TEAM JOINING
   ========================================================== */

export async function joinTriviaSession(
  joinCode: string,
  nickname: string,
): Promise<TriviaJoinResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_join_trivia_session', {
    p_join_code: joinCode,
    p_nickname: nickname,
  });

  if (error) throw new Error(error.message);
  const row = unwrapRpcObject<{
    session_id: string;
    player_id: string;
    player_token: string;
    venue_name: string;
    session_title: string;
  }>(data);

  return {
    sessionId: row.session_id,
    playerId: row.player_id,
    playerToken: row.player_token,
    venueName: row.venue_name,
    sessionTitle: row.session_title,
  };
}

export async function listTriviaTeams(joinCode: string): Promise<TriviaTeamSummary[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_list_trivia_teams', {
    p_join_code: joinCode,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as TriviaTeamSummary[];
}

export async function createTriviaTeam(
  playerToken: string,
  teamName: string,
  maxMembers = 8,
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_create_trivia_team', {
    p_player_token: playerToken,
    p_team_name: teamName,
    p_max_members: maxMembers,
  });

  if (error) throw new Error(error.message);
  return data as {
    teamId: string;
    teamName: string;
    inviteCode: string;
    isCaptain: boolean;
  };
}

export async function joinTriviaTeam(playerToken: string, teamId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_join_trivia_team', {
    p_player_token: playerToken,
    p_team_id: teamId,
  });

  if (error) throw new Error(error.message);
  return data as {
    teamId: string;
    teamName: string;
    inviteCode: string;
    isCaptain: boolean;
  };
}

export async function getTriviaPlayerContext(
  playerToken: string,
): Promise<TriviaPlayerContext | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_get_trivia_player_context', {
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  return data as TriviaPlayerContext | null;
}

export async function castTriviaTeamVote(
  playerToken: string,
  questionId: string,
  optionId: string,
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_cast_trivia_team_vote', {
    p_player_token: playerToken,
    p_question_id: questionId,
    p_option_id: optionId,
  });

  if (error) throw new Error(error.message);
  return data as { voted: boolean; optionId: string };
}

export async function lockTriviaTeamAnswer(
  playerToken: string,
  questionId: string,
  optionId: string,
) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_lock_trivia_team_answer', {
    p_player_token: playerToken,
    p_question_id: questionId,
    p_option_id: optionId,
  });

  if (error) throw new Error(error.message);
  return data as {
    answerId: string;
    locked: boolean;
    isCorrect: boolean;
    pointsAwarded: number;
  };
}

/* ==========================================================
   TRIVIA SERVICE 007 - REALTIME SIGNAL + RECOVERY POLLING
   Broadcast is only a "state changed" nudge. Clients then call
   the safe state RPC, so correct answers never travel in a raw
   client broadcast payload.
   ========================================================== */

function triviaChannelName(joinCode: string) {
  return `tvm-trivia-${joinCode}`;
}

export function subscribeTriviaSignals(
  joinCode: string,
  callback: () => void,
): () => void {
  const client = requireSupabase();
  const channel: RealtimeChannel = client
    .channel(triviaChannelName(joinCode))
    .on('broadcast', { event: 'state-changed' }, () => callback())
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function broadcastTriviaSignal(joinCode: string) {
  const client = requireSupabase();
  const channel = client.channel(triviaChannelName(joinCode));

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      void client.removeChannel(channel);
      reject(new Error('Realtime channel timed out.'));
    }, 4000);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        window.clearTimeout(timeout);
        try {
          await channel.send({
            type: 'broadcast',
            event: 'state-changed',
            payload: { at: Date.now() },
          });
          resolve();
        } catch (error) {
          reject(new Error(errorMessage(error)));
        } finally {
          window.setTimeout(() => {
            void client.removeChannel(channel);
          }, 150);
        }
      }
    });
  }).catch(() => {
    // Polling remains the recovery path. A failed broadcast should never block
    // a host action that already committed successfully to PostgreSQL.
  });
}

/* ==========================================================
   TRIVIA SERVICE 008 - QUESTION LIBRARY
   Authoring and reusable question-bank operations for hosts.
   ========================================================== */

export type TriviaQuestionDifficulty = 'easy' | 'medium' | 'hard';

export type TriviaCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isGlobal: boolean;
  sortOrder: number;
};

export type TriviaLibraryOption = {
  id: string;
  label: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type TriviaLibraryQuestion = {
  id: string;
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  questionType: string;
  prompt: string;
  explanation: string | null;
  difficulty: TriviaQuestionDifficulty;
  points: number;
  timeLimitSeconds: number;
  enabled: boolean;
  tags: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  options: TriviaLibraryOption[];
  packId: string | null;
  packTitle: string;
  packType: string;
  isGlobal: boolean;
  organizationId: string | null;
  editable: boolean;
};

export type TriviaQuestionLibraryFilters = {
  organizationId: string;
  search?: string;
  categoryId?: string;
  difficulty?: TriviaQuestionDifficulty | '';
};

export type SaveTriviaQuestionInput = {
  id?: string;
  organizationId: string;
  categoryId: string;
  prompt: string;
  explanation?: string;
  difficulty: TriviaQuestionDifficulty;
  points: number;
  timeLimitSeconds: number;
  tags?: string[];
  sourceName?: string;
  sourceUrl?: string;
  options: Array<{
    label: string;
    isCorrect: boolean;
  }>;
};

type RawQuestionRow = {
  id: string;
  round_id: string;
  category_id: string | null;
  question_type: string;
  prompt: string;
  explanation: string | null;
  difficulty: TriviaQuestionDifficulty;
  points: number;
  time_limit_seconds: number;
  enabled: boolean;
  tags: string[] | null;
  source_name: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  tvm_trivia_options?: Array<{
    id: string;
    label: string;
    is_correct: boolean;
    sort_order: number;
  }>;
};

type RawRoundRow = {
  id: string;
  pack_id: string;
  title: string;
};

type RawPackRow = {
  id: string;
  title: string;
  organization_id: string | null;
  is_global: boolean;
  pack_type: string;
};

export async function listTriviaCategories(): Promise<TriviaCategory[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('tvm_trivia_categories')
    .select('id, name, slug, description, is_global, sort_order')
    .eq('enabled', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    isGlobal: Boolean(row.is_global),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function listTriviaQuestionLibrary(
  filters: TriviaQuestionLibraryFilters,
): Promise<TriviaLibraryQuestion[]> {
  const client = requireSupabase();

  let query = client
    .from('tvm_trivia_questions')
    .select(`
      id,
      round_id,
      category_id,
      question_type,
      prompt,
      explanation,
      difficulty,
      points,
      time_limit_seconds,
      enabled,
      tags,
      source_name,
      source_url,
      created_at,
      updated_at,
      tvm_trivia_options (
        id,
        label,
        is_correct,
        sort_order
      )
    `)
    .order('created_at', { ascending: false });

  const search = filters.search?.trim();
  if (search) query = query.ilike('prompt', `%${search}%`);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

  const { data: questionData, error: questionError } = await query;
  if (questionError) throw new Error(questionError.message);

  const questions = (questionData ?? []) as unknown as RawQuestionRow[];
  if (questions.length === 0) return [];

  const roundIds = Array.from(new Set(questions.map((question) => question.round_id)));
  const categoryIds = Array.from(
    new Set(
      questions
        .map((question) => question.category_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [{ data: roundData, error: roundError }, { data: categoryData, error: categoryError }] = await Promise.all([
    client
      .from('tvm_trivia_rounds')
      .select('id, pack_id, title')
      .in('id', roundIds),
    categoryIds.length > 0
      ? client
        .from('tvm_trivia_categories')
        .select('id, name, slug')
        .in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (roundError) throw new Error(roundError.message);
  if (categoryError) throw new Error(categoryError.message);

  const rounds = (roundData ?? []) as unknown as RawRoundRow[];
  const roundMap = new Map(rounds.map((round) => [round.id, round]));
  const packIds = Array.from(new Set(rounds.map((round) => round.pack_id)));

  const { data: packData, error: packError } = await client
    .from('tvm_trivia_packs')
    .select('id, title, organization_id, is_global, pack_type')
    .in('id', packIds);

  if (packError) throw new Error(packError.message);

  const packs = (packData ?? []) as unknown as RawPackRow[];
  const packMap = new Map(packs.map((pack) => [pack.id, pack]));
  const categoryRows = (categoryData ?? []) as unknown as Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  const categoryMap = new Map<string, { name: string; slug: string }>(
    categoryRows.map((category) => [
      category.id,
      { name: category.name, slug: category.slug },
    ]),
  );

  return questions.map((question) => {
    const round = roundMap.get(question.round_id);
    const pack = round ? packMap.get(round.pack_id) : undefined;
    const category = question.category_id ? categoryMap.get(question.category_id) : undefined;
    const organizationId = pack?.organization_id ?? null;
    const isGlobal = Boolean(pack?.is_global);

    return {
      id: question.id,
      categoryId: question.category_id,
      categoryName: category?.name ?? 'Uncategorized',
      categorySlug: category?.slug ?? 'uncategorized',
      questionType: question.question_type,
      prompt: question.prompt,
      explanation: question.explanation,
      difficulty: question.difficulty ?? 'medium',
      points: question.points,
      timeLimitSeconds: question.time_limit_seconds,
      enabled: Boolean(question.enabled),
      tags: question.tags ?? [],
      sourceName: question.source_name,
      sourceUrl: question.source_url,
      createdAt: question.created_at,
      updatedAt: question.updated_at,
      options: [...(question.tvm_trivia_options ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((option) => ({
          id: option.id,
          label: option.label,
          isCorrect: Boolean(option.is_correct),
          sortOrder: option.sort_order,
        })),
      packId: pack?.id ?? null,
      packTitle: pack?.title ?? 'Unknown Pack',
      packType: pack?.pack_type ?? 'game_pack',
      isGlobal,
      organizationId,
      editable: !isGlobal && organizationId === filters.organizationId,
    } satisfies TriviaLibraryQuestion;
  });
}

export async function saveTriviaLibraryQuestion(
  input: SaveTriviaQuestionInput,
): Promise<string> {
  const client = requireSupabase();
  const params = {
    p_category_id: input.categoryId,
    p_prompt: input.prompt,
    p_difficulty: input.difficulty,
    p_explanation: input.explanation ?? '',
    p_points: input.points,
    p_time_limit_seconds: input.timeLimitSeconds,
    p_options: input.options,
    p_tags: input.tags ?? [],
    p_source_name: input.sourceName ?? '',
    p_source_url: input.sourceUrl ?? '',
  };

  if (input.id) {
    const { data, error } = await client.rpc('tvm_update_library_question', {
      p_question_id: input.id,
      ...params,
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  const { data, error } = await client.rpc('tvm_create_library_question', {
    p_organization_id: input.organizationId,
    ...params,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setTriviaLibraryQuestionEnabled(
  questionId: string,
  enabled: boolean,
) {
  const client = requireSupabase();
  const { error } = await client
    .from('tvm_trivia_questions')
    .update({ enabled })
    .eq('id', questionId);

  if (error) throw new Error(error.message);
}

export async function deleteTriviaLibraryQuestion(questionId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_delete_library_question', {
    p_question_id: questionId,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

/* ==========================================================
   TRIVIA SERVICE 010 - RESULTS / HISTORICAL REPORTING
   Backed by migration 004 RPCs:
   - tvm_list_trivia_results
   - tvm_get_trivia_result
   ========================================================== */

export type TriviaResultsSummary = {
  gamesPlayed: number;
  teamsHosted: number;
  playersHosted: number;
  averageAccuracy: number;
};

export type TriviaResultListItem = {
  sessionId: string;
  title: string;
  joinCode: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  teamCount: number;
  playerCount: number;
  questionCount: number;
  accuracyPercent: number;
  winnerName: string | null;
  winnerScore: number | null;
};

export type TriviaResultsPayload = {
  summary: TriviaResultsSummary;
  results: TriviaResultListItem[];
};

export type TriviaResultLeaderboardRow = {
  rank: number;
  id: string;
  name: string;
  score: number;
  members: number;
  correctAnswers: number;
  answers: number;
  accuracyPercent: number;
};

export type TriviaResultQuestion = {
  questionNumber: number;
  questionId: string | null;
  prompt: string;
  category: string;
  difficulty: string;
  points: number;
  correctAnswer: string | null;
  explanation: string | null;
  shownAt: string | null;
  teamsAnswered: number;
  teamsCorrect: number;
  accuracyPercent: number;
  averagePoints: number;
};

export type TriviaResultDetail = {
  sessionId: string;
  venueId: string;
  title: string;
  joinCode: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  teamCount: number;
  playerCount: number;
  questionCount: number;
  answerCount: number;
  correctAnswerCount: number;
  accuracyPercent: number;
  winner: {
    teamId: string;
    name: string;
    score: number;
  } | null;
  leaderboard: TriviaResultLeaderboardRow[];
  questions: TriviaResultQuestion[];
};

function normalizeTriviaResultsPayload(data: unknown): TriviaResultsPayload {
  const raw = unwrapRpcObject<Record<string, unknown>>(data);
  const summary = (raw.summary ?? {}) as Record<string, unknown>;
  const results = Array.isArray(raw.results) ? raw.results : [];

  return {
    summary: {
      gamesPlayed: Number(summary.gamesPlayed ?? 0),
      teamsHosted: Number(summary.teamsHosted ?? 0),
      playersHosted: Number(summary.playersHosted ?? 0),
      averageAccuracy: Number(summary.averageAccuracy ?? 0),
    },
    results: results.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        sessionId: String(item.sessionId ?? ''),
        title: String(item.title ?? 'TVM Trivia'),
        joinCode: String(item.joinCode ?? ''),
        startedAt: item.startedAt ? String(item.startedAt) : null,
        endedAt: item.endedAt ? String(item.endedAt) : null,
        durationSeconds: item.durationSeconds === null || item.durationSeconds === undefined
          ? null
          : Number(item.durationSeconds),
        teamCount: Number(item.teamCount ?? 0),
        playerCount: Number(item.playerCount ?? 0),
        questionCount: Number(item.questionCount ?? 0),
        accuracyPercent: Number(item.accuracyPercent ?? 0),
        winnerName: item.winnerName ? String(item.winnerName) : null,
        winnerScore: item.winnerScore === null || item.winnerScore === undefined
          ? null
          : Number(item.winnerScore),
      } satisfies TriviaResultListItem;
    }),
  };
}

function normalizeTriviaResultDetail(data: unknown): TriviaResultDetail {
  const raw = unwrapRpcObject<Record<string, unknown>>(data);
  const winnerRaw = raw.winner && typeof raw.winner === 'object'
    ? raw.winner as Record<string, unknown>
    : null;
  const leaderboardRaw = Array.isArray(raw.leaderboard) ? raw.leaderboard : [];
  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];

  return {
    sessionId: String(raw.sessionId ?? ''),
    venueId: String(raw.venueId ?? ''),
    title: String(raw.title ?? 'TVM Trivia'),
    joinCode: String(raw.joinCode ?? ''),
    status: String(raw.status ?? 'completed'),
    startedAt: raw.startedAt ? String(raw.startedAt) : null,
    endedAt: raw.endedAt ? String(raw.endedAt) : null,
    durationSeconds: raw.durationSeconds === null || raw.durationSeconds === undefined
      ? null
      : Number(raw.durationSeconds),
    teamCount: Number(raw.teamCount ?? 0),
    playerCount: Number(raw.playerCount ?? 0),
    questionCount: Number(raw.questionCount ?? 0),
    answerCount: Number(raw.answerCount ?? 0),
    correctAnswerCount: Number(raw.correctAnswerCount ?? 0),
    accuracyPercent: Number(raw.accuracyPercent ?? 0),
    winner: winnerRaw
      ? {
          teamId: String(winnerRaw.teamId ?? ''),
          name: String(winnerRaw.name ?? ''),
          score: Number(winnerRaw.score ?? 0),
        }
      : null,
    leaderboard: leaderboardRaw.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        rank: Number(item.rank ?? 0),
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        score: Number(item.score ?? 0),
        members: Number(item.members ?? 0),
        correctAnswers: Number(item.correctAnswers ?? 0),
        answers: Number(item.answers ?? 0),
        accuracyPercent: Number(item.accuracyPercent ?? 0),
      } satisfies TriviaResultLeaderboardRow;
    }),
    questions: questionsRaw.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        questionNumber: Number(item.questionNumber ?? 0),
        questionId: item.questionId ? String(item.questionId) : null,
        prompt: String(item.prompt ?? ''),
        category: String(item.category ?? 'Uncategorized'),
        difficulty: String(item.difficulty ?? 'medium'),
        points: Number(item.points ?? 0),
        correctAnswer: item.correctAnswer ? String(item.correctAnswer) : null,
        explanation: item.explanation ? String(item.explanation) : null,
        shownAt: item.shownAt ? String(item.shownAt) : null,
        teamsAnswered: Number(item.teamsAnswered ?? 0),
        teamsCorrect: Number(item.teamsCorrect ?? 0),
        accuracyPercent: Number(item.accuracyPercent ?? 0),
        averagePoints: Number(item.averagePoints ?? 0),
      } satisfies TriviaResultQuestion;
    }),
  };
}

export async function listTriviaResults(
  venueId: string,
  limit = 50,
  offset = 0,
): Promise<TriviaResultsPayload> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_list_trivia_results', {
    p_venue_id: venueId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);
  return normalizeTriviaResultsPayload(data);
}

export async function getTriviaResult(
  sessionId: string,
): Promise<TriviaResultDetail> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('tvm_get_trivia_result', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(error.message);
  return normalizeTriviaResultDetail(data);
}
