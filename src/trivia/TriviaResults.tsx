import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getTriviaResult,
  listTriviaResults,
  type TriviaResultDetail,
  type TriviaResultLeaderboardRow,
  type TriviaResultListItem,
  type TriviaResultQuestion,
  type TriviaResultsPayload,
} from '../services/trivia';

import './TriviaResults.css';

type Props = {
  venueId: string;
};

const emptyPayload: TriviaResultsPayload = {
  summary: {
    gamesPlayed: 0,
    teamsHosted: 0,
    playersHosted: 0,
    averageAccuracy: 0,
  },
  results: [],
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 1) return `${remainder}s`;
  if (minutes < 60) return `${minutes}m ${remainder}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function accuracyClass(value: number) {
  if (value >= 70) return 'is-strong';
  if (value >= 40) return 'is-mid';
  return 'is-low';
}

export default function TriviaResults({ venueId }: Props) {
  const [payload, setPayload] = useState<TriviaResultsPayload>(emptyPayload);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TriviaResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await listTriviaResults(venueId, 100, 0);
      setPayload(next);
      setSelectedSessionId((current) => {
        if (current && next.results.some((row: TriviaResultListItem) => row.sessionId === current)) return current;
        return next.results[0]?.sessionId ?? null;
      });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (!selectedSessionId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setError('');

    void getTriviaResult(selectedSessionId)
      .then((next: TriviaResultDetail) => {
        if (!cancelled) setDetail(next);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  const hardestQuestion = useMemo(() => {
    if (!detail?.questions.length) return null;
    return [...detail.questions]
      .filter((row) => row.teamsAnswered > 0)
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent)[0] ?? null;
  }, [detail]);

  const easiestQuestion = useMemo(() => {
    if (!detail?.questions.length) return null;
    return [...detail.questions]
      .filter((row) => row.teamsAnswered > 0)
      .sort((a, b) => b.accuracyPercent - a.accuracyPercent)[0] ?? null;
  }, [detail]);

  return (
    <section className="trivia-results-page">
      <div className="trivia-results-toolbar">
        <div>
          <span className="panel-kicker">HISTORY & PERFORMANCE</span>
          <h2>Game Results</h2>
          <p>Completed sessions, final standings, and question performance for this venue.</p>
        </div>
        <button type="button" className="results-refresh-button" disabled={loading} onClick={() => void loadResults()}>
          <RefreshCw className={loading ? 'spin' : ''} size={14} /> Refresh
        </button>
      </div>

      {error && <div className="runtime-message runtime-message--error">{error}</div>}

      <div className="results-summary-grid">
        <SummaryCard icon={<BarChart3 size={17} />} label="Games Played" value={payload.summary.gamesPlayed.toLocaleString()} />
        <SummaryCard icon={<Trophy size={17} />} label="Teams Hosted" value={payload.summary.teamsHosted.toLocaleString()} />
        <SummaryCard icon={<Users size={17} />} label="Players" value={payload.summary.playersHosted.toLocaleString()} />
        <SummaryCard icon={<Target size={17} />} label="Avg. Accuracy" value={`${payload.summary.averageAccuracy.toFixed(1)}%`} />
      </div>

      {loading ? (
        <div className="results-loading"><RefreshCw className="spin" size={18} /> Loading completed games…</div>
      ) : payload.results.length === 0 ? (
        <div className="results-empty-state">
          <Trophy size={30} />
          <strong>No completed games yet.</strong>
          <span>Finish a live Trivia session and it will appear here automatically.</span>
        </div>
      ) : (
        <div className="results-workspace">
          <aside className="results-history-panel">
            <div className="results-panel-heading">
              <div><span className="panel-kicker">COMPLETED SESSIONS</span><h3>Game History</h3></div>
              <strong>{payload.results.length}</strong>
            </div>
            <div className="results-history-list">
              {payload.results.map((result: TriviaResultListItem) => (
                <ResultHistoryRow
                  key={result.sessionId}
                  result={result}
                  active={selectedSessionId === result.sessionId}
                  onSelect={() => setSelectedSessionId(result.sessionId)}
                />
              ))}
            </div>
          </aside>

          <main className="results-detail-panel">
            {detailLoading || !detail ? (
              <div className="results-detail-loading"><RefreshCw className="spin" size={18} /> Loading game details…</div>
            ) : (
              <>
                <div className="results-detail-header">
                  <div>
                    <span className="panel-kicker">COMPLETED GAME</span>
                    <h2>{detail.title}</h2>
                    <div className="results-detail-meta">
                      <span><CalendarDays size={13} /> {formatDate(detail.endedAt)}</span>
                      <span><Clock3 size={13} /> {formatDuration(detail.durationSeconds)}</span>
                      <span>Code {detail.joinCode || '—'}</span>
                    </div>
                  </div>
                  {detail.winner && (
                    <div className="results-winner-card">
                      <Trophy size={18} />
                      <div><span>WINNER</span><strong>{detail.winner.name}</strong></div>
                      <b>{detail.winner.score.toLocaleString()}</b>
                    </div>
                  )}
                </div>

                <div className="results-detail-stat-grid">
                  <MiniStat label="Teams" value={detail.teamCount} />
                  <MiniStat label="Players" value={detail.playerCount} />
                  <MiniStat label="Questions" value={detail.questionCount} />
                  <MiniStat label="Accuracy" value={`${detail.accuracyPercent.toFixed(1)}%`} />
                </div>

                <div className="results-insight-grid">
                  <InsightCard
                    label="HARDEST QUESTION"
                    value={hardestQuestion ? `${hardestQuestion.accuracyPercent.toFixed(0)}% correct` : 'No data'}
                    copy={hardestQuestion?.prompt ?? 'No answered questions in this session.'}
                  />
                  <InsightCard
                    label="EASIEST QUESTION"
                    value={easiestQuestion ? `${easiestQuestion.accuracyPercent.toFixed(0)}% correct` : 'No data'}
                    copy={easiestQuestion?.prompt ?? 'No answered questions in this session.'}
                  />
                </div>

                <section className="results-section-card">
                  <div className="results-panel-heading"><div><span className="panel-kicker">FINAL</span><h3>Leaderboard</h3></div></div>
                  <div className="results-leaderboard-table">
                    <div className="results-leaderboard-head"><span>Place</span><span>Team</span><span>Members</span><span>Accuracy</span><span>Score</span></div>
                    {detail.leaderboard.map((team: TriviaResultLeaderboardRow) => (
                      <div className="results-leaderboard-row" key={team.id}>
                        <span className={`results-place place-${team.rank}`}>#{team.rank}</span>
                        <strong>{team.name}</strong>
                        <span>{team.members}</span>
                        <span>{team.accuracyPercent.toFixed(0)}%</span>
                        <b>{team.score.toLocaleString()}</b>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="results-section-card">
                  <div className="results-panel-heading"><div><span className="panel-kicker">QUESTION ANALYSIS</span><h3>Question Performance</h3></div><strong>{detail.questions.length}</strong></div>
                  <div className="results-question-list">
                    {detail.questions.map((question: TriviaResultQuestion) => (
                      <div className="results-question-row" key={`${detail.sessionId}-${question.questionNumber}`}>
                        <div className="results-question-number">{question.questionNumber}</div>
                        <div className="results-question-copy">
                          <div className="results-question-tags"><span>{question.category}</span><span>{question.difficulty}</span></div>
                          <strong>{question.prompt}</strong>
                          <small>Correct answer: {question.correctAnswer || 'Not recorded'}</small>
                        </div>
                        <div className="results-question-performance">
                          <strong>{question.accuracyPercent.toFixed(0)}%</strong>
                          <span>{question.teamsCorrect} / {question.teamsAnswered} correct</span>
                          <div className="results-accuracy-track"><i className={accuracyClass(question.accuracyPercent)} style={{ width: `${Math.max(2, question.accuracyPercent)}%` }} /></div>
                        </div>
                      </div>
                    ))}
                    {detail.questions.length === 0 && <div className="results-mini-empty">No question history was recorded for this game.</div>}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="results-summary-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="results-mini-stat"><span>{label}</span><strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong></div>;
}

function InsightCard({ label, value, copy }: { label: string; value: string; copy: string }) {
  return <div className="results-insight-card"><span>{label}</span><strong>{value}</strong><p>{copy}</p></div>;
}

function ResultHistoryRow({
  result,
  active,
  onSelect,
}: {
  result: TriviaResultListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`results-history-row ${active ? 'is-active' : ''}`} onClick={onSelect}>
      <div className="results-history-row__top"><strong>{result.title}</strong><ArrowRight size={13} /></div>
      <span>{formatShortDate(result.endedAt)}</span>
      <div className="results-history-row__stats">
        <small>{result.teamCount} teams</small>
        <small>{result.playerCount} players</small>
        <small>{result.accuracyPercent.toFixed(0)}%</small>
      </div>
      <div className="results-history-row__winner"><Trophy size={11} /><span>{result.winnerName ?? 'No winner'}</span></div>
    </button>
  );
}
