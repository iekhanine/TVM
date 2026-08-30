import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Crown,
  Gamepad2,
  Gauge,
  Library,
  LogOut,
  Monitor,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  Smartphone,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Wifi,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import QRCode from 'react-qr-code';

import {
  bootstrapTriviaWorkspace,
  broadcastTriviaSignal,
  castTriviaTeamVote,
  createStarterTriviaSession,
  createTriviaTeam,
  endTriviaSession,
  getCurrentHostUser,
  getLatestTriviaSession,
  getTriviaDisplayControl,
  getTriviaDisplayState,
  getTriviaHostRoster,
  getTriviaPlayerContext,
  getTriviaState,
  joinTriviaSession,
  joinTriviaTeam,
  listTriviaTeams,
  lockTriviaTeamAnswer,
  nextTriviaQuestion,
  onHostAuthChanged,
  revealTriviaAnswer,
  resolveTriviaDisplayVenue,
  setTriviaDisplayMode,
  showTriviaScoreboard,
  signInTriviaHost,
  signOutTriviaHost,
  signUpTriviaHost,
  startTriviaSession,
  subscribeTriviaSignals,
  type HostSessionSummary,
  type TriviaDisplayControl,
  type TriviaDisplayState,
  type TriviaHostRoster,
  type TriviaLeaderboardRow,
  type TriviaPlayerContext,
  type TriviaState,
  type TriviaTeamSummary,
  type WorkspaceContext,
} from '../services/trivia';
import {
  SUPABASE_ENABLED,
} from '../lib/supabase';

import TriviaQuestionLibrary from './TriviaQuestionLibrary';
import TriviaResults from './TriviaResults';

import './TriviaPrototype.css';

/* ==========================================================
   TRIVIA 001 - VIEW TYPES / LOCAL STORAGE
   Supabase is now authoritative for live game state.
   ========================================================== */

type TriviaView = 'host' | 'display' | 'player';

type TriviaPrototypeProps = {
  view: TriviaView;
};

type HostSection = 'live' | 'library' | 'games' | 'results';

type StoredPlayerSession = {
  joinCode: string;
  playerToken: string;
  nickname: string;
};

const LAST_GAME_CODE_KEY = 'tvm_trivia_last_code';
const PLAYER_SESSION_KEY = 'tvm_trivia_player_session';
const PLAYER_NICKNAME_KEY = 'tvm_trivia_player_nickname';

function readStoredPlayerSession(): StoredPlayerSession | null {
  try {
    const raw = window.localStorage.getItem(PLAYER_SESSION_KEY);
    return raw ? JSON.parse(raw) as StoredPlayerSession : null;
  } catch {
    return null;
  }
}

function storePlayerSession(value: StoredPlayerSession) {
  window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(value));
  window.localStorage.setItem(LAST_GAME_CODE_KEY, value.joinCode);
  window.localStorage.setItem(PLAYER_NICKNAME_KEY, value.nickname);
}

function readStoredPlayerNickname() {
  return window.localStorage.getItem(PLAYER_NICKNAME_KEY)?.trim() ?? '';
}

function storePlayerNickname(value: string) {
  const nickname = value.trim();
  if (nickname) window.localStorage.setItem(PLAYER_NICKNAME_KEY, nickname);
}

function clearStoredPlayerSession() {
  window.localStorage.removeItem(PLAYER_SESSION_KEY);
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 4);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/* ==========================================================
   TRIVIA 002 - SHARED BRAND / VIEW SWITCHER
   ========================================================== */

function TriviaBrand() {
  return (
    <div className="trivia-brand">
      <span className="trivia-brand__mark">TVM</span>
      <span className="trivia-brand__name">
        <strong>Trivia</strong>
        <small>Television Venue Media</small>
      </span>
    </div>
  );
}

function PrototypeSwitcher({
  current,
  joinCode,
}: {
  current: TriviaView;
  joinCode?: string;
}) {
  const query = joinCode ? `?code=${joinCode}` : '';

  return (
    <div className="prototype-switcher">
      <Link className={current === 'host' ? 'is-active' : ''} to="/trivia">
        <Gauge size={13} /> Host
      </Link>
      <Link className={current === 'display' ? 'is-active' : ''} to={`/trivia/display${query}`}>
        <Monitor size={13} /> TV
      </Link>
      <Link className={current === 'player' ? 'is-active' : ''} to={`/trivia/play${query}`}>
        <Smartphone size={13} /> Player
      </Link>
    </div>
  );
}

function useCodeFromLocation() {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const queryCode = normalizeCode(params.get('code') ?? '');
    if (queryCode.length === 4) return queryCode;

    return normalizeCode(window.localStorage.getItem(LAST_GAME_CODE_KEY) ?? '');
  }, [location.search]);
}

/* ==========================================================
   TRIVIA 003 - LIVE STATE HOOK
   Realtime gives an immediate nudge. Polling is the recovery
   mechanism for sleeping phones, Wi-Fi drops, and missed events.
   ========================================================== */

function useTriviaState(joinCode: string) {
  const [state, setState] = useState<TriviaState | null>(null);
  const [loading, setLoading] = useState(Boolean(joinCode));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (joinCode.length !== 4) {
      setState(null);
      setLoading(false);
      return;
    }

    try {
      const next = await getTriviaState(joinCode);
      setState(next);
      setError(next ? '' : 'No live game was found for that code.');
      if (next) window.localStorage.setItem(LAST_GAME_CODE_KEY, joinCode);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [joinCode]);

  useEffect(() => {
    void refresh();
    if (joinCode.length !== 4) return undefined;

    const unsubscribe = subscribeTriviaSignals(joinCode, () => {
      void refresh();
    });

    const interval = window.setInterval(() => {
      void refresh();
    }, 2500);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [joinCode, refresh]);

  return { state, loading, error, refresh, setState };
}

function useCountdown(deadline: string | null | undefined) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    function tick() {
      if (!deadline) {
        setSeconds(0);
        return;
      }

      const remaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
    }

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  return seconds;
}

/* ==========================================================
   TRIVIA 004 - HOST AUTH
   ========================================================== */

function HostAuthCard({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setBusy(true);
    setMessage('');

    try {
      if (mode === 'signin') {
        await signInTriviaHost(email, password);
        onSignedIn();
      } else {
        const result = await signUpTriviaHost(email, password);
        if (result.session) {
          onSignedIn();
        } else {
          setMessage('Account created. Check your email if Supabase email confirmation is enabled.');
        }
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="trivia-auth-page">
      <div className="trivia-auth-card">
        <TriviaBrand />
        <span className="panel-kicker">HOST ACCESS</span>
        <h1>{mode === 'signin' ? 'Sign in to TVM Trivia.' : 'Create your host account.'}</h1>
        <p>Players never need accounts. Authentication is only for venue hosts and administrators.</p>

        <label>
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
        </label>

        {message && <div className="runtime-message">{message}</div>}

        <button className="player-primary-button" type="button" disabled={busy || !email || password.length < 6} onClick={() => void submit()}>
          {busy ? <RefreshCw className="spin" size={15} /> : <ArrowRight size={15} />}
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <button className="runtime-text-button" type="button" onClick={() => setMode((current) => current === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need a host account? Create one.' : 'Already have an account? Sign in.'}
        </button>

        <Link className="runtime-back-link" to="/"><ArrowLeft size={13} /> Back to TVM modules</Link>
      </div>
    </div>
  );
}

/* ==========================================================
   TRIVIA 005 - HOST RUNTIME
   ========================================================== */

function TriviaHostRuntime() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [hostSession, setHostSession] = useState<HostSessionSummary | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [hostError, setHostError] = useState('');
  const [hostSection, setHostSection] = useState<HostSection>('live');
  const [hostRoster, setHostRoster] = useState<TriviaHostRoster | null>(null);
  const [hostRosterError, setHostRosterError] = useState('');
  const [displayControl, setDisplayControl] = useState<TriviaDisplayControl | null>(null);

  const live = useTriviaState(joinCode);
  const seconds = useCountdown(live.state?.answerDeadlineAt);
  const activeHostSessionId = live.state?.sessionId ?? hostSession?.id ?? '';

  const refreshHostRoster = useCallback(async () => {
    if (!activeHostSessionId) {
      setHostRoster(null);
      setHostRosterError('');
      return;
    }

    try {
      const nextRoster = await getTriviaHostRoster(activeHostSessionId);
      setHostRoster(nextRoster);
      setHostRosterError('');
    } catch (error) {
      setHostRosterError(getErrorMessage(error));
    }
  }, [activeHostSessionId]);

  const loadHost = useCallback(async () => {
    try {
      setHostError('');
      const nextUser = await getCurrentHostUser();
      setUser(nextUser);

      if (!nextUser) {
        setWorkspace(null);
        setHostSession(null);
        setDisplayControl(null);
        setJoinCode('');
        return;
      }

      const nextWorkspace = await bootstrapTriviaWorkspace();
      setWorkspace(nextWorkspace);

      const [nextSession, nextDisplayControl] = await Promise.all([
        getLatestTriviaSession(nextWorkspace.venueId),
        getTriviaDisplayControl(nextWorkspace.venueId),
      ]);
      setHostSession(nextSession);
      setDisplayControl(nextDisplayControl);

      const nextCode = normalizeCode(nextSession?.join_code ?? '');
      setJoinCode(nextCode);
      if (nextCode) window.localStorage.setItem(LAST_GAME_CODE_KEY, nextCode);
    } catch (error) {
      setHostError(getErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHost();
    if (!SUPABASE_ENABLED) return undefined;

    return onHostAuthChanged(() => {
      void loadHost();
    });
  }, [loadHost]);

  useEffect(() => {
    if (!user || !activeHostSessionId || hostSection !== 'live') {
      if (!activeHostSessionId) setHostRoster(null);
      return undefined;
    }

    void refreshHostRoster();

    const interval = window.setInterval(() => {
      void refreshHostRoster();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [
    activeHostSessionId,
    hostSection,
    refreshHostRoster,
    user,
  ]);

  useEffect(() => {
    if (!user || !activeHostSessionId || hostSection !== 'live' || !live.state) return;
    void refreshHostRoster();
  }, [
    activeHostSessionId,
    hostSection,
    live.state,
    refreshHostRoster,
    user,
  ]);

  async function createGame() {
    if (!workspace) return;
    setBusy(true);
    setHostError('');
    try {
      const created = await createStarterTriviaSession(workspace.venueId, 'Saturday Night Trivia');
      setJoinCode(created.joinCode);
      setHostSession({
        id: created.sessionId,
        join_code: created.joinCode,
        status: created.status,
        phase: created.phase,
        title: created.title,
        created_at: new Date().toISOString(),
      });
      window.localStorage.setItem(LAST_GAME_CODE_KEY, created.joinCode);
      const createdState = await getTriviaState(created.joinCode);
      live.setState(createdState);
      const nextDisplayControl = await setTriviaDisplayMode(
        workspace.venueId,
        'session',
        created.sessionId,
      );
      setDisplayControl(nextDisplayControl);
      await broadcastTriviaSignal(created.joinCode);
    } catch (error) {
      setHostError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function clearEndedHostSession(endedCode: string) {
    setHostSession(null);
    setJoinCode('');
    setHostRoster(null);
    setHostRosterError('');
    live.setState(null);
    window.localStorage.removeItem(LAST_GAME_CODE_KEY);
    await broadcastTriviaSignal(endedCode);
  }

  async function hostAction(action: 'start' | 'reveal' | 'scoreboard' | 'next' | 'end') {
    const sessionId = live.state?.sessionId ?? hostSession?.id;
    if (!sessionId || !joinCode) return;

    setBusy(true);
    setHostError('');
    try {
      const nextState = action === 'start'
        ? await startTriviaSession(sessionId)
        : action === 'reveal'
          ? await revealTriviaAnswer(sessionId)
          : action === 'scoreboard'
            ? await showTriviaScoreboard(sessionId)
            : action === 'next'
              ? await nextTriviaQuestion(sessionId)
              : await endTriviaSession(sessionId);

      if (action === 'end' || nextState.phase === 'finished') {
        if (workspace) {
          const nextDisplayControl = await setTriviaDisplayMode(
            workspace.venueId,
            'waiting',
            sessionId,
          );
          setDisplayControl(nextDisplayControl);
        }

        await clearEndedHostSession(joinCode);
        return;
      }

      live.setState(nextState);
      await broadcastTriviaSignal(joinCode);
    } catch (error) {
      setHostError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function showPreviousFinalOnTv() {
    if (!workspace || !displayControl?.previousSessionId) return;

    setBusy(true);
    setHostError('');
    try {
      const nextControl = await setTriviaDisplayMode(
        workspace.venueId,
        'final',
        displayControl.previousSessionId,
      );
      setDisplayControl(nextControl);
    } catch (error) {
      setHostError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function showCurrentGameOnTv() {
    const sessionId = live.state?.sessionId ?? hostSession?.id;
    if (!workspace || !sessionId) return;

    setBusy(true);
    setHostError('');
    try {
      const nextControl = await setTriviaDisplayMode(workspace.venueId, 'session', sessionId);
      setDisplayControl(nextControl);
    } catch (error) {
      setHostError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function showWaitingOnTv() {
    if (!workspace) return;

    setBusy(true);
    setHostError('');
    try {
      const nextControl = await setTriviaDisplayMode(workspace.venueId, 'waiting');
      setDisplayControl(nextControl);
    } catch (error) {
      setHostError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!SUPABASE_ENABLED) {
    return <RuntimeFatal message="Supabase is not configured for TVM." />;
  }

  if (authLoading) {
    return <RuntimeLoading message="Connecting TVM Trivia to Supabase…" />;
  }

  if (!user) {
    return <HostAuthCard onSignedIn={() => void loadHost()} />;
  }

  const state = live.state;
  const phaseLabel = state?.phase === 'reveal'
    ? 'Answer revealed'
    : state?.phase === 'scoreboard'
      ? 'Leaderboard'
      : state?.phase === 'finished'
        ? 'Game finished'
        : state?.phase === 'lobby'
          ? 'Waiting in lobby'
          : 'Accepting answers';

  const question = state?.question;
  const answered = state?.answeredTeamCount ?? 0;
  const teamCount = state?.teamCount ?? 0;
  const timerPercent = question?.timeLimitSeconds
    ? Math.max(0, Math.min(100, (seconds / question.timeLimitSeconds) * 100))
    : 0;

  return (
    <div className="trivia-host-shell">
      <aside className="trivia-sidebar">
        <div className="trivia-sidebar__brand-wrap"><TriviaBrand /></div>

        <nav className="trivia-nav" aria-label="Trivia navigation">
          <button className={`trivia-nav__item ${hostSection === 'live' ? 'is-active' : ''}`} type="button" onClick={() => setHostSection('live')}><Gauge size={16} /><span>Live Game</span></button>
          <button className={`trivia-nav__item ${hostSection === 'library' ? 'is-active' : ''}`} type="button" onClick={() => setHostSection('library')}><Library size={16} /><span>Question Library</span></button>
          <button className={`trivia-nav__item ${hostSection === 'games' ? 'is-active' : ''}`} type="button" onClick={() => setHostSection('games')}><Gamepad2 size={16} /><span>Games</span></button>
          <button className={`trivia-nav__item ${hostSection === 'results' ? 'is-active' : ''}`} type="button" onClick={() => setHostSection('results')}><BarChart3 size={16} /><span>Results</span></button>
        </nav>

        <div className="trivia-sidebar__bottom">
          <div className="venue-chip">
            <span className="venue-chip__avatar">{(workspace?.venueName ?? 'TV').slice(0, 2).toUpperCase()}</span>
            <div><strong>{workspace?.venueName ?? 'TVM Venue'}</strong><span>{workspace?.organizationName ?? 'OneTime Labs'}</span></div>
            <ChevronDown size={14} />
          </div>
          <Link className="trivia-nav__item" to="/"><ArrowLeft size={16} /><span>All TVM Modules</span></Link>
          <button className="trivia-nav__item" type="button" onClick={() => void signOutTriviaHost()}><LogOut size={16} /><span>Sign Out</span></button>
        </div>
      </aside>

      <main className="trivia-host-main">
        <header className="trivia-host-header">
          <div>
            <span className="eyebrow"><Radio size={12} /> {hostSection === 'live' ? (state ? 'Live Supabase Session' : 'Trivia Host') : 'Trivia Host'}</span>
            <h1>{hostSection === 'library' ? 'Question Library' : hostSection === 'games' ? 'Games' : hostSection === 'results' ? 'Results' : (state?.title ?? 'TVM Trivia')}</h1>
          </div>
          <div className="trivia-host-header__actions">
            <span className="prototype-pill runtime-live-pill"><Wifi size={12} /> Supabase Live</span>
            <PrototypeSwitcher current="host" joinCode={joinCode} />
            <button className="icon-square" type="button" aria-label="Trivia settings"><Settings size={16} /></button>
          </div>
        </header>

        {hostError && <div className="runtime-message runtime-message--error">{hostError}</div>}

        {hostSection === 'library' && workspace ? (
          <TriviaQuestionLibrary organizationId={workspace.organizationId} />
        ) : hostSection === 'games' ? (
          <HostSectionPlaceholder icon={<Gamepad2 size={28} />} kicker="GAMES" title="Game Builder" copy="This section is reserved for building reusable Trivia games and packs. We will wire it after the Question Library." />
        ) : hostSection === 'results' && workspace ? (
          <TriviaResults venueId={workspace.venueId} />
        ) : !state ? (
          <section className="host-panel runtime-empty-state">
            <Sparkles size={30} />
            <span className="panel-kicker">DATABASE CONNECTED</span>
            <h2>No live Trivia session.</h2>
            <p>Create a starter session using the TVM Starter Trivia pack. It will generate a real four-digit join code in Supabase.</p>
            <div className="runtime-empty-actions">
              <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => void createGame()}>
                {busy ? <RefreshCw className="spin" size={15} /> : <Plus size={15} />} Create Starter Game
              </button>
              {displayControl?.previousSessionId && (
                <button className="control-button control-button--quiet" type="button" disabled={busy} onClick={() => void showPreviousFinalOnTv()}>
                  <Trophy size={15} /> Show Previous Final Score on TV
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            <div className="host-workspace-grid">
              <section className="host-panel question-control-panel">
                <div className="host-panel__heading">
                  <div><span className="panel-kicker">{state.status.toUpperCase()}</span><h2>{question ? 'Current Question' : 'Game Lobby'}</h2></div>
                  <button className="icon-square icon-square--quiet" type="button" aria-label="Question menu"><MoreHorizontal size={17} /></button>
                </div>

                {question ? (
                  <>
                    <div className="host-question-card">
                      <div className="host-question-card__meta"><span>{question.type.replace('_', ' ')}</span><span>{question.points} points</span></div>
                      <h3>{question.prompt}</h3>
                      <div className="host-answer-grid">
                        {question.options.map((answer, index) => {
                          const revealed = state.phase === 'reveal' || state.phase === 'scoreboard' || state.phase === 'finished';
                          return (
                            <div className={`host-answer ${revealed && answer.isCorrect ? 'is-correct' : ''}`} key={answer.id}>
                              <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                              <strong>{answer.label}</strong>
                              {revealed && <span className="answer-percent">{answer.teamAnswerCount ?? 0} teams</span>}
                              {revealed && answer.isCorrect && <Check size={16} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="question-timer-bar">
                      <div className="question-timer-bar__track"><span style={{ width: `${timerPercent}%` }} /></div>
                      <div className="question-timer-bar__labels"><span>{answered} of {teamCount} teams have locked an answer</span><strong>{state.phase === 'question' ? `${seconds}s` : phaseLabel}</strong></div>
                    </div>
                  </>
                ) : (
                  <div className="runtime-lobby-copy">
                    <CircleHelp size={34} />
                    <h3>Players can join now.</h3>
                    <p>Open the TV view and have everyone join game <strong>{state.joinCode}</strong> from their phones. Teams can be created before you start.</p>
                  </div>
                )}

                <div className="host-control-bar">
                  {state.phase === 'lobby' && <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => void hostAction('start')}>Start Game <ArrowRight size={15} /></button>}
                  {state.phase === 'question' && <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => void hostAction('reveal')}>Reveal Answer <ArrowRight size={15} /></button>}
                  {state.phase === 'reveal' && (
                    <>
                      <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => void hostAction('next')}>Next Question <ArrowRight size={15} /></button>
                      <button className="control-button control-button--quiet" type="button" disabled={busy} onClick={() => void hostAction('scoreboard')}>Show Standings <Trophy size={15} /></button>
                    </>
                  )}
                  {state.phase === 'scoreboard' && <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => void hostAction('next')}>Next Question <ArrowRight size={15} /></button>}
                  {state.phase === 'finished' && <button className="control-button control-button--primary" type="button" disabled={busy} onClick={() => void createGame()}><Plus size={15} /> New Game</button>}
                  {state.phase !== 'finished' && <button className="control-button control-button--quiet" type="button" disabled={busy} onClick={() => void hostAction('end')}>End Game</button>}
                </div>
              </section>

              <LeaderboardPanel leaderboard={state.leaderboard} playerCount={state.playerCount} />
            </div>

            <LiveResponsePanel
              roster={hostRoster}
              phase={state.phase}
              error={hostRosterError}
            />

            {workspace && (
              <SessionAccessPanel
                joinCode={state.joinCode}
                venueId={workspace.venueId}
                displayControl={displayControl}
                busy={busy}
                onShowCurrent={() => void showCurrentGameOnTv()}
                onShowPrevious={() => void showPreviousFinalOnTv()}
                onShowWaiting={() => void showWaitingOnTv()}
              />
            )}

          </>
        )}
      </main>
    </div>
  );
}


function LiveResponsePanel({
  roster,
  phase,
  error,
}: {
  roster: TriviaHostRoster | null;
  phase: TriviaState['phase'];
  error: string;
}) {
  const hasQuestion = Boolean(roster?.currentQuestionId);
  const allLocked = Boolean(
    hasQuestion
    && roster
    && roster.totalTeams > 0
    && roster.lockedTeams === roster.totalTeams,
  );

  return (
    <section className="host-panel live-response-panel">
      <div className="host-panel__heading live-response-heading">
        <div>
          <span className="panel-kicker">LIVE PARTICIPATION</span>
          <h2>Teams & Players</h2>
        </div>

        <div className={`live-lock-summary ${allLocked ? 'is-complete' : ''}`}>
          {allLocked ? <Check size={15} /> : <Clock3 size={15} />}
          <div>
            <strong>
              {hasQuestion
                ? `${roster?.lockedTeams ?? 0} / ${roster?.totalTeams ?? 0} teams locked`
                : `${roster?.totalTeams ?? 0} teams ready`}
            </strong>
            <span>
              {allLocked
                ? 'Everyone is locked in'
                : phase === 'lobby'
                  ? 'Waiting for the game to start'
                  : 'Updates live as teams answer'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="runtime-message runtime-message--error live-response-error">
          {error}
        </div>
      )}

      {!roster ? (
        <div className="runtime-mini-empty">Loading team and player status…</div>
      ) : (
        <>
          <div className="live-response-stats">
            <div>
              <strong>{roster.totalTeams}</strong>
              <span>Teams</span>
            </div>
            <div>
              <strong>{roster.totalPlayers}</strong>
              <span>Players</span>
            </div>
            <div>
              <strong>{hasQuestion ? `${roster.votedPlayers}/${roster.totalPlayers}` : '—'}</strong>
              <span>Players voted</span>
            </div>
            <div className={allLocked ? 'is-complete' : ''}>
              <strong>{hasQuestion ? `${roster.lockedTeams}/${roster.totalTeams}` : '—'}</strong>
              <span>Teams locked</span>
            </div>
          </div>

          <div className="host-team-status-list">
            {roster.teams.length === 0 && (
              <div className="runtime-mini-empty">No teams have been created yet.</div>
            )}

            {roster.teams.map((team) => (
              <article
                className={`host-team-status-card ${team.locked ? 'is-locked' : ''}`}
                key={team.id}
              >
                <div className="host-team-status-main">
                  <span className={`leaderboard-rank rank-${team.rank}`}>{team.rank}</span>

                  <div className="host-team-status-name">
                    <strong>{team.name}</strong>
                    <span>
                      {team.memberCount} member{team.memberCount === 1 ? '' : 's'} · {team.score.toLocaleString()} pts
                    </span>
                  </div>

                  <div className="host-team-vote-status">
                    <strong>{hasQuestion ? `${team.votedCount}/${team.memberCount}` : '—'}</strong>
                    <span>{hasQuestion ? 'voted' : 'ready'}</span>
                  </div>

                  <span className={`host-team-lock-badge ${team.locked ? 'is-locked' : ''}`}>
                    {team.locked ? <Check size={13} /> : <Clock3 size={13} />}
                    {team.locked ? 'LOCKED' : hasQuestion ? 'WAITING' : 'READY'}
                  </span>
                </div>

                <div className="host-team-members">
                  {team.members.map((member) => (
                    <div
                      className={`host-player-chip ${member.hasVoted ? 'has-voted' : ''} ${member.isOnline ? 'is-online' : 'is-offline'}`}
                      key={member.id}
                    >
                      <span className="host-player-presence" />
                      <strong>{member.nickname}</strong>
                      {member.isCaptain && (
                        <span className="host-player-captain">
                          <Crown size={10} /> Captain
                        </span>
                      )}
                      {hasQuestion && (
                        <span className={`host-player-vote ${member.hasVoted ? 'has-voted' : ''}`}>
                          {member.hasVoted ? <Check size={10} /> : <Clock3 size={10} />}
                          {member.hasVoted ? 'Voted' : 'Waiting'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {team.locked && (
                  <div className="host-team-locked-meta">
                    <Check size={12} />
                    <span>
                      Final answer locked
                      {team.lockedByNickname ? ` by ${team.lockedByNickname}` : ''}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>

          {roster.unassignedPlayers.length > 0 && (
            <div className="host-unassigned-players">
              <div className="host-unassigned-heading">
                <div>
                  <CircleHelp size={14} />
                  <strong>Not on a team yet</strong>
                </div>
                <span>{roster.unassignedPlayers.length}</span>
              </div>

              <div className="host-team-members">
                {roster.unassignedPlayers.map((player) => (
                  <div
                    className={`host-player-chip ${player.isOnline ? 'is-online' : 'is-offline'}`}
                    key={player.id}
                  >
                    <span className="host-player-presence" />
                    <strong>{player.nickname}</strong>
                    <span className="host-player-vote">Waiting for team</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SessionAccessPanel({
  joinCode,
  venueId,
  displayControl,
  busy,
  onShowCurrent,
  onShowPrevious,
  onShowWaiting,
}: {
  joinCode: string;
  venueId: string;
  displayControl: TriviaDisplayControl | null;
  busy: boolean;
  onShowCurrent: () => void;
  onShowPrevious: () => void;
  onShowWaiting: () => void;
}) {
  const displayUrl = `${window.location.origin}/trivia/display?venue=${venueId}`;
  const playerUrl = `${window.location.origin}/trivia/play?code=${joinCode}`;

  function copy(value: string) {
    void navigator.clipboard?.writeText(value);
  }

  return (
    <details className="host-panel session-access-panel session-access-drawer">
      <summary className="session-access-drawer__summary">
        <div className="session-access-drawer__title">
          <span className="panel-kicker">SESSION ACCESS</span>
          <strong>TV display, player link & QR code</strong>
          <small>The TV URL is permanent for this venue. New games appear there automatically.</small>
        </div>

        <div className="session-access-drawer__meta">
          <div className="session-access-code">
            <span>GAME CODE</span>
            <strong>{joinCode}</strong>
          </div>
          <ChevronDown className="session-access-drawer__chevron" size={18} />
        </div>
      </summary>

      <div className="session-access-drawer__body">
        <div className="session-display-control">
          <div>
            <span className="panel-kicker">TV DISPLAY CONTROL</span>
            <strong>Choose what the venue television is showing.</strong>
          </div>
          <div className="session-display-control__actions">
            <button
              className={displayControl?.mode === 'session' ? 'is-active' : ''}
              type="button"
              disabled={busy}
              onClick={onShowCurrent}
            >
              <Monitor size={14} /> Current Game
            </button>
            <button
              className={displayControl?.mode === 'final' ? 'is-active' : ''}
              type="button"
              disabled={busy || !displayControl?.previousSessionId}
              onClick={onShowPrevious}
            >
              <Trophy size={14} /> Previous Final Score
            </button>
            <button
              className={displayControl?.mode === 'waiting' ? 'is-active' : ''}
              type="button"
              disabled={busy}
              onClick={onShowWaiting}
            >
              <Clock3 size={14} /> Waiting Screen
            </button>
          </div>
        </div>

        <div className="session-access-grid">
          <article className="session-access-card">
            <div className="session-access-card__icon"><Monitor size={19} /></div>
            <div className="session-access-card__copy">
              <span>TV DISPLAY URL</span>
              <strong>Permanent Venue Display</strong>
              <code>{displayUrl}</code>
              <small>Open this once on the venue TV. It follows new games automatically.</small>
            </div>
            <div className="session-access-actions">
              <a href={displayUrl} target="_blank" rel="noreferrer">Open TV Display <ArrowRight size={14} /></a>
              <button type="button" onClick={() => copy(displayUrl)}><Copy size={14} /> Copy URL</button>
            </div>
          </article>

          <article className="session-access-card">
            <div className="session-access-card__icon"><Smartphone size={19} /></div>
            <div className="session-access-card__copy">
              <span>PLAYER URL</span>
              <strong>Mobile Player</strong>
              <code>{playerUrl}</code>
              <small>Player links remain specific to the current four-digit game code.</small>
            </div>
            <div className="session-access-actions">
              <a href={playerUrl} target="_blank" rel="noreferrer">Open Player <ArrowRight size={14} /></a>
              <button type="button" onClick={() => copy(playerUrl)}><Copy size={14} /> Copy URL</button>
            </div>
          </article>

          <article className="session-qr-card">
            <div className="session-qr-code">
              <QRCode value={playerUrl} size={148} level="M" />
            </div>
            <div>
              <span>SCAN TO PLAY</span>
              <strong>{joinCode}</strong>
              <small>Players scan this with their phone camera. No app and no TVM account required.</small>
            </div>
          </article>
        </div>
      </div>
    </details>
  );
}

function HostSectionPlaceholder({
  icon,
  kicker,
  title,
  copy,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  copy: string;
}) {
  return (
    <section className="host-panel runtime-empty-state">
      {icon}
      <span className="panel-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </section>
  );
}

function LeaderboardPanel({ leaderboard, playerCount }: { leaderboard: TriviaLeaderboardRow[]; playerCount: number }) {
  return (
    <aside className="host-panel leaderboard-panel">
      <div className="host-panel__heading"><div><span className="panel-kicker">LIVE</span><h2>Leaderboard</h2></div><Trophy size={18} /></div>
      <div className="leaderboard-list">
        {leaderboard.length === 0 && <div className="runtime-mini-empty">No teams yet.</div>}
        {leaderboard.slice(0, 8).map((team) => (
          <div className="leaderboard-row" key={team.id}>
            <span className={`leaderboard-rank rank-${team.rank}`}>{team.rank}</span>
            <div className="leaderboard-team"><strong>{team.name}</strong><span>{team.members} member{team.members === 1 ? '' : 's'}</span></div>
            <strong className="leaderboard-score">{team.score.toLocaleString()}</strong>
          </div>
        ))}
      </div>
      <div className="leaderboard-footer"><span>{leaderboard.length} teams · {playerCount} players connected</span></div>
    </aside>
  );
}

/* ==========================================================
   TRIVIA 006 - DISPLAY RUNTIME
   ========================================================== */

function TriviaDisplayRuntime() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedVenue = params.get('venue')?.trim() ?? '';
  const requestedCode = normalizeCode(params.get('code') ?? '');

  const [venueId, setVenueId] = useState(requestedVenue);
  const [entry, setEntry] = useState(requestedCode);
  const [displayState, setDisplayState] = useState<TriviaDisplayState | null>(null);
  const [loading, setLoading] = useState(Boolean(requestedVenue || requestedCode));
  const [error, setError] = useState('');
  const seconds = useCountdown(displayState?.state?.answerDeadlineAt);

  const refreshDisplay = useCallback(async (nextVenueId = venueId) => {
    if (!nextVenueId) return;

    try {
      const next = await getTriviaDisplayState(nextVenueId);
      setDisplayState(next);
      setError(next ? '' : 'This venue display could not be found.');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (requestedVenue) {
      setVenueId(requestedVenue);
      return;
    }

    if (requestedCode.length !== 4 || venueId) return;

    let cancelled = false;
    setLoading(true);
    void resolveTriviaDisplayVenue(requestedCode)
      .then((resolvedVenue) => {
        if (cancelled) return;
        if (!resolvedVenue) {
          setError('No Trivia venue was found for that game code.');
          setLoading(false);
          return;
        }

        setVenueId(resolvedVenue);
        window.history.replaceState({}, '', `/trivia/display?venue=${resolvedVenue}`);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(getErrorMessage(nextError));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestedCode, requestedVenue, venueId]);

  useEffect(() => {
    if (!venueId) return undefined;

    void refreshDisplay(venueId);
    const interval = window.setInterval(() => {
      void refreshDisplay(venueId);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [refreshDisplay, venueId]);

  async function connectDisplay() {
    if (entry.length !== 4) return;

    setLoading(true);
    setError('');
    try {
      const resolvedVenue = await resolveTriviaDisplayVenue(entry);
      if (!resolvedVenue) {
        setError('No Trivia venue was found for that game code.');
        setLoading(false);
        return;
      }

      setVenueId(resolvedVenue);
      window.history.replaceState({}, '', `/trivia/display?venue=${resolvedVenue}`);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      setLoading(false);
    }
  }

  if (!venueId) {
    return (
      <div className="trivia-display-shell">
        <main className="runtime-display-code-entry">
          <span>CONNECT DISPLAY</span>
          <h1>Enter the Trivia game code.</h1>
          <input inputMode="numeric" maxLength={4} value={entry} onChange={(event) => setEntry(normalizeCode(event.target.value))} />
          {error && <div className="runtime-message runtime-message--error">{error}</div>}
          <button type="button" disabled={entry.length !== 4 || loading} onClick={() => void connectDisplay()}>
            {loading ? 'Connecting…' : 'Connect Display'}
          </button>
        </main>
      </div>
    );
  }

  if (loading && !displayState) {
    return <RuntimeLoading message="Connecting venue display…" />;
  }

  if (!displayState) {
    return (
      <div className="trivia-display-shell">
        <main className="trivia-display-stage">
          <section className="display-waiting-screen">
            <span className="display-round-kicker">DISPLAY UNAVAILABLE</span>
            <h1>Unable to load this display.</h1>
            <p>{error || 'Check the venue display link and try again.'}</p>
          </section>
        </main>
      </div>
    );
  }

  if (displayState.mode === 'waiting' || !displayState.state && displayState.mode !== 'final') {
    return (
      <div className="trivia-display-shell">
        <main className="trivia-display-stage">
          <section className="display-waiting-screen">
            <span className="display-round-kicker">TRIVIA DISPLAY READY</span>
            <h1>Waiting for the next game.</h1>
            <p>{displayState.venue}</p>
            <div className="display-waiting-pulse"><Wifi size={26} /></div>
            <small>The next game code will appear here automatically when the host creates a new session.</small>
          </section>
        </main>
      </div>
    );
  }

  if (displayState.mode === 'final' && displayState.finalResult) {
    const result = displayState.finalResult;
    return (
      <div className="trivia-display-shell">
        <main className="trivia-display-stage">
          <section className="display-scoreboard-screen display-scoreboard-screen--final">
            <span className="display-round-kicker">FINAL STANDINGS</span>
            <h1>{result.title || 'Final Scores'}</h1>
            {result.winner && (
              <div className="display-final-winner">
                <Trophy size={28} />
                <div><span>WINNER</span><strong>{result.winner.name}</strong></div>
                <b>{result.winner.score.toLocaleString()}</b>
              </div>
            )}
            <div className="display-scoreboard-list">
              {result.leaderboard.slice(0, 8).map((team) => (
                <div key={team.id}><span>{team.rank}</span><strong>{team.name}</strong><small>{team.members} members</small><b>{team.score.toLocaleString()}</b></div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  const state = displayState.state;
  if (!state) {
    return (
      <div className="trivia-display-shell">
        <main className="trivia-display-stage">
          <section className="display-waiting-screen">
            <span className="display-round-kicker">TRIVIA DISPLAY READY</span>
            <h1>Waiting for the next game.</h1>
          </section>
        </main>
      </div>
    );
  }

  const question = state.question;
  const reveal = state.phase === 'reveal';
  const scoreboard = state.phase === 'scoreboard';

  return (
    <div className="trivia-display-shell">
      <main className="trivia-display-stage">
        <header className="display-header display-header--public">
          <div className="display-join-mini"><span>JOIN GAME</span><strong>{state.joinCode}</strong></div>
        </header>

        {state.phase === 'lobby' && (
          <section className="display-lobby">
            <span className="display-round-kicker">LIVE TRIVIA</span>
            <h1>{state.title}</h1>
            <p>Join from your phone, create your team, and get ready.</p>
            <div className="display-lobby-access">
              <div className="display-join-callout"><div><span>GAME CODE</span><strong>{state.joinCode}</strong></div></div>
              <div className="display-player-qr">
                <div><QRCode value={`${window.location.origin}/trivia/play?code=${state.joinCode}`} size={176} level="M" /></div>
                <span>SCAN TO JOIN</span>
                <small>{window.location.host}/trivia/play?code={state.joinCode}</small>
              </div>
            </div>
            <div className="display-lobby-stats"><span><Users size={18} /> {state.playerCount} players</span><span><Trophy size={18} /> {state.teamCount} teams</span></div>
          </section>
        )}

        {question && !scoreboard && (
          <section className="display-question-area">
            <div className="display-question-meta">
              <div><span className="display-round-kicker">LIVE QUESTION</span><strong>{question.points} points</strong></div>
              <div className="display-timer"><strong>{state.phase === 'question' ? seconds : '✓'}</strong><span>{state.phase === 'question' ? 'seconds' : 'answer'}</span></div>
            </div>

            <h1>{question.prompt}</h1>

            <div className="display-answer-grid">
              {question.options.map((option, index) => (
                <div className={`display-answer ${reveal && option.isCorrect ? 'is-correct' : ''}`} key={option.id}>
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option.label}</strong>
                  {reveal && <small>{option.teamAnswerCount ?? 0} teams</small>}
                  {reveal && option.isCorrect && <Check size={24} />}
                </div>
              ))}
            </div>

            <div className="display-footer-status">
              <span><Users size={16} /> {state.playerCount} players · {state.teamCount} teams</span>
              <strong>{state.phase === 'question' ? `${state.answeredTeamCount} teams locked` : question.explanation}</strong>
            </div>
          </section>
        )}

        {scoreboard && (
          <section className="display-scoreboard-screen">
            <span className="display-round-kicker">STANDINGS</span>
            <h1>Leaderboard</h1>
            <div className="display-scoreboard-list">
              {state.leaderboard.slice(0, 5).map((team) => (
                <div key={team.id}><span>{team.rank}</span><strong>{team.name}</strong><small>{team.members} members</small><b>{team.score.toLocaleString()}</b></div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ==========================================================
   TRIVIA 007 - PLAYER RUNTIME
   ========================================================== */

function TriviaPlayerRuntime() {
  const location = useLocation();
  const navigate = useNavigate();
  const playerScrollRef = useRef<HTMLDivElement>(null);

  // An explicit ?code=#### in the URL always wins over any previously
  // stored player session. This prevents a browser that played an older
  // game from silently reopening that old game when a new QR/link is used.
  const explicitCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const queryCode = normalizeCode(params.get('code') ?? '');
    return queryCode.length === 4 ? queryCode : '';
  }, [location.search]);

  const fallbackCode = useCodeFromLocation();
  const stored = useMemo(() => readStoredPlayerSession(), []);
  const storedMatchesRequestedGame = !explicitCode || stored?.joinCode === explicitCode;
  const initialCode = explicitCode || stored?.joinCode || fallbackCode;

  const [code, setCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState(stored?.nickname ?? readStoredPlayerNickname());
  const [playerToken, setPlayerToken] = useState(storedMatchesRequestedGame ? stored?.playerToken ?? '' : '');
  const [playerContext, setPlayerContext] = useState<TriviaPlayerContext | null>(null);
  const [teams, setTeams] = useState<TriviaTeamSummary[]>([]);
  const [teamName, setTeamName] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nextGameCode, setNextGameCode] = useState('');

  useEffect(() => {
    if (explicitCode.length !== 4) return;

    setCode(explicitCode);
    window.localStorage.setItem(LAST_GAME_CODE_KEY, explicitCode);

    const currentStored = readStoredPlayerSession();
    if (!currentStored || currentStored.joinCode === explicitCode) return;

    // Preserve the person's nickname for convenience, but never carry a
    // player token/team identity from one Trivia session into another.
    setPlayerName((current) => current || currentStored.nickname || '');
    storePlayerNickname(currentStored.nickname);
    clearStoredPlayerSession();
    setPlayerToken('');
    setPlayerContext(null);
    setTeams([]);
    setSelectedAnswer(null);
    setError('');
  }, [explicitCode]);

  const live = useTriviaState(playerToken ? code : '');
  const seconds = useCountdown(live.state?.answerDeadlineAt);

  // Every major game-state transition should begin at the top of the
  // player surface. This prevents the leaderboard/new question from
  // inheriting the scroll position of the previous screen.
  useEffect(() => {
    const phase = live.state?.phase ?? '';
    const questionId = live.state?.question?.id ?? '';
    if (!phase && !questionId) return;

    const frame = window.requestAnimationFrame(() => {
      playerScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [live.state?.phase, live.state?.question?.id]);

  // When a game finishes, keep the current session visible so players can
  // see the final standings. Preserve the nickname for the next session, but
  // do not automatically carry the old team/player identity into another game.
  useEffect(() => {
    if (live.state?.phase !== 'finished') return;

    const rememberedNickname = (playerContext?.nickname || playerName).trim();
    if (rememberedNickname) {
      storePlayerNickname(rememberedNickname);
      setPlayerName(rememberedNickname);
    }

    setNextGameCode('');
    playerScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [live.state?.phase, playerContext?.nickname, playerName]);


  const refreshPlayer = useCallback(async () => {
    if (!playerToken) return;
    try {
      const next = await getTriviaPlayerContext(playerToken);
      if (!next) {
        clearStoredPlayerSession();
        setPlayerToken('');
        setPlayerContext(null);
        return;
      }
      setPlayerContext(next);
      setSelectedAnswer(next.currentVoteOptionId);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }, [playerToken]);

  const refreshTeams = useCallback(async () => {
    if (code.length !== 4) return;
    try {
      setTeams(await listTriviaTeams(code));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }, [code]);

  useEffect(() => {
    if (!playerToken) return;
    void refreshPlayer();
    void refreshTeams();
    const interval = window.setInterval(() => {
      void refreshPlayer();
      void refreshTeams();
    }, 2500);
    return () => window.clearInterval(interval);
  }, [playerToken, refreshPlayer, refreshTeams]);

  useEffect(() => {
    if (!playerToken || !code) return undefined;
    return subscribeTriviaSignals(code, () => {
      void live.refresh();
      void refreshPlayer();
      void refreshTeams();
    });
  }, [code, live.refresh, playerToken, refreshPlayer, refreshTeams]);

  useEffect(() => {
    const questionId = live.state?.question?.id ?? null;
    if (questionId && playerContext?.currentQuestionId === questionId) {
      setSelectedAnswer(playerContext.currentVoteOptionId);
    }
  }, [live.state?.question?.id, playerContext?.currentQuestionId, playerContext?.currentVoteOptionId]);

  async function enterGame() {
    if (code.length !== 4 || playerName.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const joined = await joinTriviaSession(code, playerName.trim());
      storePlayerSession({ joinCode: code, playerToken: joined.playerToken, nickname: playerName.trim() });
      setPlayerToken(joined.playerToken);
      const nextContext = await getTriviaPlayerContext(joined.playerToken);
      setPlayerContext(nextContext);
      await refreshTeams();
      await live.refresh();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function createTeam(name: string) {
    if (!playerToken || name.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      await createTriviaTeam(playerToken, name.trim());
      await refreshPlayer();
      await refreshTeams();
      await broadcastTriviaSignal(code);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function joinTeam(teamId: string) {
    if (!playerToken) return;
    setBusy(true);
    setError('');
    try {
      await joinTriviaTeam(playerToken, teamId);
      await refreshPlayer();
      await refreshTeams();
      await broadcastTriviaSignal(code);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function vote(optionId: string) {
    const questionId = live.state?.question?.id;
    if (!playerToken || !questionId || playerContext?.teamAnswer) return;
    setSelectedAnswer(optionId);
    setError('');
    try {
      await castTriviaTeamVote(playerToken, questionId, optionId);
      await refreshPlayer();
      await broadcastTriviaSignal(code);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  async function lockAnswer() {
    const questionId = live.state?.question?.id;
    if (!playerToken || !questionId || !selectedAnswer || !playerContext?.team?.isCaptain) return;
    setBusy(true);
    setError('');
    try {
      await lockTriviaTeamAnswer(playerToken, questionId, selectedAnswer);
      await refreshPlayer();
      await live.refresh();
      await broadcastTriviaSignal(code);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function prepareNextGame() {
    const newCode = normalizeCode(nextGameCode);
    if (newCode.length !== 4) return;

    const rememberedNickname = (playerContext?.nickname || playerName).trim();
    if (rememberedNickname) {
      storePlayerNickname(rememberedNickname);
      setPlayerName(rememberedNickname);
    }

    clearStoredPlayerSession();
    window.localStorage.setItem(LAST_GAME_CODE_KEY, newCode);

    setCode(newCode);
    setPlayerToken('');
    setPlayerContext(null);
    setTeams([]);
    setTeamName('');
    setSelectedAnswer(null);
    setNextGameCode('');
    setBusy(false);
    setError('');

    playerScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    navigate(`/trivia/play?code=${newCode}`, { replace: true });
  }

  function leaveLocalSession() {
    clearStoredPlayerSession();
    setPlayerToken('');
    setPlayerContext(null);
    setTeams([]);
    setSelectedAnswer(null);
  }

  const joined = Boolean(playerToken);
  const team = playerContext?.team ?? null;
  const state = live.state;
  const question = state?.question ?? null;
  const teamLocked = Boolean(playerContext?.teamAnswer);
  const reveal = state?.phase === 'reveal' || state?.phase === 'scoreboard' || state?.phase === 'finished';

  const voteMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of playerContext?.teamVoteSummary ?? []) map.set(item.optionId, item.votes);
    return map;
  }, [playerContext?.teamVoteSummary]);

  return (
    <div className="trivia-player-shell">
      <main className="player-phone-wrap">
        <div className="player-phone" ref={playerScrollRef}>
          <header className="player-phone__header">
            <TriviaBrand />
            {joined && <button className="player-connected runtime-connected-button" type="button" onClick={leaveLocalSession}><Wifi size={12} /> Game {code}</button>}
          </header>

          {error && <div className="runtime-message runtime-message--error runtime-player-message">{error}</div>}

          {!joined && (
            <section className="player-join-screen">
              <div className="player-join-icon"><CircleHelp size={30} /></div>
              <span className="player-kicker">TVM TRIVIA</span>
              <h1>Join the game.</h1>
              <p>Every person joins on their own phone. Then create a team or join your friends.</p>
              <label><span>Game code</span><input inputMode="numeric" maxLength={4} value={code} onChange={(event) => setCode(normalizeCode(event.target.value))} /></label>
              <label><span>Your name</span><input value={playerName} maxLength={30} onChange={(event) => setPlayerName(event.target.value)} /></label>
              <button className="player-primary-button" type="button" disabled={busy || code.length !== 4 || playerName.trim().length < 2} onClick={() => void enterGame()}>{busy ? <RefreshCw className="spin" size={16} /> : <ArrowRight size={16} />} Continue</button>
              <small>No account. No app. Just play.</small>
            </section>
          )}

          {joined && !team && (
            <section className="player-team-screen">
              <span className="player-kicker">YOU'RE IN, {playerContext?.nickname?.toUpperCase() ?? playerName.toUpperCase()}</span>
              <h1>Pick your team.</h1>
              <p>Play solo, create a team, or join friends already in this game.</p>

              <div className="team-action-grid">
                <button className="team-action-card is-primary" type="button" disabled={busy || teamName.trim().length < 2} onClick={() => void createTeam(teamName)}><Plus size={21} /><div><strong>Create a team</strong><span>Start a new team and become captain.</span></div></button>
                <button className="team-action-card" type="button" disabled={busy} onClick={() => void createTeam(playerContext?.nickname ?? playerName)}><UserPlus size={21} /><div><strong>Play solo</strong><span>Create your own one-person team.</span></div></button>
              </div>

              <label className="team-name-field"><span>New team name</span><input value={teamName} maxLength={40} placeholder="Quiz Khalifa" onChange={(event) => setTeamName(event.target.value)} /></label>

              <div className="available-teams">
                <div className="available-teams__heading"><span>TEAMS IN THIS GAME</span><strong>{teams.length}</strong></div>
                {teams.map((available) => (
                  <button type="button" key={available.id} disabled={busy || available.memberCount >= available.maxMembers} onClick={() => void joinTeam(available.id)}>
                    <div><strong>{available.name}</strong><span>{available.memberCount} / {available.maxMembers} members</span></div><ArrowRight size={15} />
                  </button>
                ))}
                {teams.length === 0 && <div className="runtime-mini-empty">No teams yet. Be the first.</div>}
              </div>
            </section>
          )}

          {joined && team && state?.phase === 'lobby' && (
            <section className="player-team-lobby">
              <div className="team-lobby-hero"><div className="team-lobby-icon"><Users size={25} /></div><span className="player-kicker">YOUR TEAM</span><h1>{team.name}</h1><p>Every member votes from their own phone. The captain locks one final team answer.</p></div>
              <div className="team-code-card"><div><span>TEAM INVITE CODE</span><strong>{team.inviteCode}</strong></div><button type="button" aria-label="Copy team invite code" onClick={() => void navigator.clipboard?.writeText(team.inviteCode)}><Copy size={15} /></button></div>
              <div className="team-roster"><div className="team-roster__heading"><span>MEMBERS</span><strong>{team.members.length} / {team.maxMembers}</strong></div>{team.members.map((member) => <div className="team-member" key={member.id}><span className="team-member__avatar">{member.nickname.slice(0, 1).toUpperCase()}</span><strong>{member.nickname}</strong>{member.isCaptain ? <span className="captain-badge"><Crown size={11} /> Captain</span> : <span>Connected</span>}</div>)}</div>
              <div className="team-rule-card"><Crown size={17} /><div><strong>Team answer mode</strong><span>Everyone votes. Only {team.isCaptain ? 'you, the captain,' : 'the captain'} can lock the final answer.</span></div></div>
              <div className="runtime-waiting"><Wifi size={15} /><span>Waiting for the host to start…</span></div>
            </section>
          )}

          {joined && team && question && state && (state.phase === 'question' || state.phase === 'reveal') && (
            <section className="player-question-screen">
              <div className="player-team-banner"><div><span>TEAM</span><strong>{team.name}</strong><small><Users size={11} /> {team.members.length} members</small></div>{team.isCaptain && <span className="captain-badge"><Crown size={11} /> Captain</span>}</div>
              <div className="player-game-meta"><div><span>{state.phase.toUpperCase()}</span><strong>{question.points} points</strong></div><div className="player-timer"><strong>{state.phase === 'question' ? seconds : '✓'}</strong><span>{state.phase === 'question' ? 'sec' : 'done'}</span></div></div>
              <div className="player-question-copy"><span>{question.type.replace('_', ' ')}</span><h1>{question.prompt}</h1></div>

              <div className="player-answer-list">
                {question.options.map((answer, index) => {
                  const chosen = selectedAnswer === answer.id;
                  const correct = reveal && answer.isCorrect;
                  const lockedChoice = teamLocked && playerContext?.teamAnswer?.selectedOptionId === answer.id;
                  return (
                    <button className={`player-answer-button ${chosen ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${lockedChoice ? 'is-team-locked' : ''}`} type="button" key={answer.id} disabled={state.phase !== 'question' || teamLocked} onClick={() => void vote(answer.id)}>
                      <span>{String.fromCharCode(65 + index)}</span><strong>{answer.label}</strong>{chosen && <Check size={17} />}
                    </button>
                  );
                })}
              </div>

              {!teamLocked && state.phase === 'question' ? (
                <div className="team-vote-card">
                  <div className="team-vote-card__top"><span>TEAM VOTE</span><strong>{playerContext?.teamVoteSummary.reduce((sum, row) => sum + row.votes, 0) ?? 0} / {team.members.length} voted</strong></div>
                  <div className="team-vote-bars">{question.options.map((answer) => <span className={(voteMap.get(answer.id) ?? 0) === Math.max(0, ...Array.from(voteMap.values())) && voteMap.size > 0 ? 'is-leading' : ''} key={answer.id} style={{ width: `${Math.max(4, ((voteMap.get(answer.id) ?? 0) / Math.max(1, team.members.length)) * 100)}%` }} />)}</div>
                  <small>{team.isCaptain ? 'See how your team is leaning, then lock the final answer.' : 'Your vote is shared with the captain. The captain locks the final answer.'}</small>
                </div>
              ) : teamLocked ? (
                <div className="player-locked-card"><Check size={18} /><div><strong>Team answer locked.</strong><span>{team.name} has submitted its final answer.</span></div></div>
              ) : (
                <div className="player-locked-card"><Clock3 size={18} /><div><strong>Voting is closed.</strong><span>Watch the TV for the answer and standings.</span></div></div>
              )}

              {team.isCaptain && state.phase === 'question' && (
                <button className="player-primary-button team-lock-button" type="button" disabled={busy || !selectedAnswer || teamLocked} onClick={() => void lockAnswer()}><Crown size={15} /> {teamLocked ? 'Answer Locked' : 'Lock Team Answer'}</button>
              )}

              {reveal && question.explanation && <div className="runtime-reveal-note"><strong>Answer</strong><span>{question.explanation}</span></div>}

              <div className="player-score-strip"><div><span>TEAM</span><strong>{team.name}</strong></div><div><span>PLACE</span><strong>#{playerContext?.teamRank ?? '—'}</strong></div><div><span>SCORE</span><strong>{team.score.toLocaleString()}</strong></div></div>
            </section>
          )}

          {joined && team && state && state.phase === 'scoreboard' && (
            <section className="player-team-lobby">
              <div className="team-lobby-hero"><div className="team-lobby-icon"><Trophy size={25} /></div><span className="player-kicker">STANDINGS</span><h1>Leaderboard</h1><p>Current standings for this game.</p></div>
              <LeaderboardMini leaderboard={state.leaderboard} />
              <div className="runtime-waiting"><Wifi size={15} /><span>Waiting for the next question…</span></div>
            </section>
          )}

          {joined && team && state && state.phase === 'finished' && (
            <section className="player-team-lobby player-final-screen">
              <div className="team-lobby-hero">
                <div className="team-lobby-icon"><Trophy size={25} /></div>
                <span className="player-kicker">FINAL</span>
                <h1>Final Standings</h1>
                <p>Game complete. Your final result is below.</p>
              </div>

              <LeaderboardMini leaderboard={state.leaderboard} />

              <div className="player-next-game-card">
                <span className="player-kicker">PLAY AGAIN</span>
                <h2>Join another game.</h2>
                <p>Your name is remembered. Enter the new game code when the host starts the next session.</p>

                <label>
                  <span>New game code</span>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={nextGameCode}
                    onChange={(event) => setNextGameCode(normalizeCode(event.target.value))}
                  />
                </label>

                <label>
                  <span>Your name</span>
                  <input
                    value={playerName}
                    maxLength={30}
                    onChange={(event) => setPlayerName(event.target.value)}
                  />
                </label>

                <button
                  className="player-primary-button"
                  type="button"
                  disabled={nextGameCode.length !== 4 || playerName.trim().length < 2}
                  onClick={prepareNextGame}
                >
                  Join New Game <ArrowRight size={16} />
                </button>

                <small>You will choose Solo or a new team after joining the new session.</small>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function LeaderboardMini({ leaderboard }: { leaderboard: TriviaLeaderboardRow[] }) {
  return <div className="runtime-mobile-leaderboard">{leaderboard.slice(0, 5).map((row) => <div key={row.id}><span>#{row.rank}</span><strong>{row.name}</strong><b>{row.score.toLocaleString()}</b></div>)}</div>;
}

/* ==========================================================
   TRIVIA 008 - FALLBACK SCREENS
   ========================================================== */

function RuntimeLoading({ message }: { message: string }) {
  return <div className="runtime-fullscreen"><RefreshCw className="spin" size={26} /><strong>{message}</strong></div>;
}

function RuntimeFatal({ message }: { message: string }) {
  return <div className="runtime-fullscreen"><CircleHelp size={28} /><strong>TVM Trivia cannot connect.</strong><span>{message}</span><Link to="/">Back to TVM</Link></div>;
}

/* ==========================================================
   TRIVIA 009 - VIEW ROUTER
   ========================================================== */

export default function TriviaPrototype({ view }: TriviaPrototypeProps) {
  if (view === 'display') return <TriviaDisplayRuntime />;
  if (view === 'player') return <TriviaPlayerRuntime />;
  return <TriviaHostRuntime />;
}
