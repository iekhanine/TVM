import {
  Check,
  Database,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  deleteTriviaLibraryQuestion,
  listTriviaCategories,
  listTriviaQuestionLibrary,
  saveTriviaLibraryQuestion,
  setTriviaLibraryQuestionEnabled,
  type TriviaCategory,
  type TriviaLibraryQuestion,
  type TriviaQuestionDifficulty,
} from '../services/trivia';

import './TriviaQuestionLibrary.css';

type Props = {
  organizationId: string;
};

type QuestionDraft = {
  id?: string;
  categoryId: string;
  difficulty: TriviaQuestionDifficulty;
  prompt: string;
  explanation: string;
  points: number;
  timeLimitSeconds: number;
  answers: string[];
  correctIndex: number;
  sourceName: string;
  sourceUrl: string;
  tags: string;
};

const emptyDraft: QuestionDraft = {
  categoryId: '',
  difficulty: 'medium',
  prompt: '',
  explanation: '',
  points: 1000,
  timeLimitSeconds: 30,
  answers: ['', '', '', ''],
  correctIndex: 0,
  sourceName: '',
  sourceUrl: '',
  tags: '',
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function draftFromQuestion(question: TriviaLibraryQuestion): QuestionDraft {
  const answers = question.options.map((option) => option.label);
  while (answers.length < 4) answers.push('');
  const correctIndex = Math.max(0, question.options.findIndex((option) => option.isCorrect));

  return {
    id: question.id,
    categoryId: question.categoryId ?? '',
    difficulty: question.difficulty,
    prompt: question.prompt,
    explanation: question.explanation ?? '',
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds,
    answers,
    correctIndex,
    sourceName: question.sourceName ?? '',
    sourceUrl: question.sourceUrl ?? '',
    tags: question.tags.join(', '),
  };
}

export default function TriviaQuestionLibrary({ organizationId }: Props) {
  const [categories, setCategories] = useState<TriviaCategory[]>([]);
  const [questions, setQuestions] = useState<TriviaLibraryQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState<TriviaQuestionDifficulty | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await listTriviaCategories();
      setCategories(data);
      setDraft((current) => current.categoryId || data.length === 0
        ? current
        : { ...current, categoryId: data[0].id });
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuestions(await listTriviaQuestionLibrary({
        organizationId,
        search,
        categoryId,
        difficulty,
      }));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [organizationId, search, categoryId, difficulty]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuestions();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const stats = useMemo(() => {
    const global = questions.filter((question) => question.isGlobal).length;
    const custom = questions.filter((question) => question.editable).length;
    return { total: questions.length, global, custom };
  }, [questions]);

  function openNewQuestion() {
    setDraft({
      ...emptyDraft,
      categoryId: categories[0]?.id ?? '',
      answers: [...emptyDraft.answers],
    });
    setEditorOpen(true);
  }

  function openEditQuestion(question: TriviaLibraryQuestion) {
    setDraft(draftFromQuestion(question));
    setEditorOpen(true);
  }

  function updateAnswer(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => answerIndex === index ? value : answer),
    }));
  }

  async function saveQuestion() {
    const trimmedAnswers = draft.answers.map((answer) => answer.trim()).filter(Boolean);
    if (!draft.categoryId) return setError('Choose a category.');
    if (!draft.prompt.trim()) return setError('Question text is required.');
    if (trimmedAnswers.length < 2) return setError('Add at least two answer choices.');
    if (!draft.answers[draft.correctIndex]?.trim()) return setError('The correct answer cannot be blank.');

    setSaving(true);
    setError('');
    try {
      await saveTriviaLibraryQuestion({
        id: draft.id,
        organizationId,
        categoryId: draft.categoryId,
        difficulty: draft.difficulty,
        prompt: draft.prompt.trim(),
        explanation: draft.explanation.trim(),
        points: draft.points,
        timeLimitSeconds: draft.timeLimitSeconds,
        sourceName: draft.sourceName.trim(),
        sourceUrl: draft.sourceUrl.trim(),
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        options: draft.answers
          .map((label, index) => ({ label: label.trim(), isCorrect: index === draft.correctIndex }))
          .filter((option) => option.label),
      });
      setEditorOpen(false);
      await loadQuestions();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(question: TriviaLibraryQuestion) {
    if (!question.editable) return;
    if (!window.confirm(`Delete “${question.prompt}”?`)) return;
    try {
      await deleteTriviaLibraryQuestion(question.id);
      await loadQuestions();
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  async function toggleQuestion(question: TriviaLibraryQuestion) {
    if (!question.editable) return;
    try {
      await setTriviaLibraryQuestionEnabled(question.id, !question.enabled);
      setQuestions((current) => current.map((row) => row.id === question.id
        ? { ...row, enabled: !row.enabled }
        : row));
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  return (
    <section className="question-library-page">
      <div className="question-library-toolbar">
        <div>
          <span className="panel-kicker">AUTHORING</span>
          <h2>Question Library</h2>
          <p>Search TVM questions, filter by category, and create venue-owned questions.</p>
        </div>
        <button className="control-button control-button--primary" type="button" onClick={openNewQuestion}>
          <Plus size={15} /> Add Question
        </button>
      </div>

      {error && <div className="runtime-message runtime-message--error">{error}</div>}

      <div className="question-library-stats">
        <div><Database size={16} /><strong>{stats.total}</strong><span>Visible questions</span></div>
        <div><strong>{stats.global}</strong><span>TVM library</span></div>
        <div><strong>{stats.custom}</strong><span>Your questions</span></div>
      </div>

      <div className="question-library-filters">
        <label className="question-search-field">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question text..." />
        </label>
        <label><Filter size={14} /><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TriviaQuestionDifficulty | '')}><option value="">All difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <button className="icon-square icon-square--quiet" type="button" aria-label="Refresh question library" onClick={() => void loadQuestions()}><RefreshCw size={15} /></button>
      </div>

      <div className="question-library-table">
        <div className="question-library-table__head"><span>Question</span><span>Category</span><span>Difficulty</span><span>Source</span><span>Status</span><span /></div>
        {loading && <div className="question-library-loading"><RefreshCw className="spin" size={18} /> Loading questions…</div>}
        {!loading && questions.length === 0 && <div className="question-library-empty"><Database size={24} /><strong>No questions match these filters.</strong><span>Add one or clear a filter.</span></div>}
        {!loading && questions.map((question) => (
          <article className={`question-library-row ${question.enabled ? '' : 'is-disabled'}`} key={question.id}>
            <div className="question-library-row__question">
              <strong>{question.prompt}</strong>
              <span>{question.options.length} answers · {question.points} pts · {question.timeLimitSeconds}s</span>
            </div>
            <span className="question-category-badge">{question.categoryName}</span>
            <span className={`question-difficulty is-${question.difficulty}`}>{question.difficulty}</span>
            <span className="question-source">{question.isGlobal ? 'TVM' : question.sourceName || 'Custom'}</span>
            <button className={`question-status-toggle ${question.enabled ? 'is-on' : ''}`} type="button" disabled={!question.editable} onClick={() => void toggleQuestion(question)}>{question.enabled ? <><Check size={12} /> Enabled</> : 'Disabled'}</button>
            <div className="question-row-actions">
              {question.editable ? <><button type="button" aria-label="Edit question" onClick={() => openEditQuestion(question)}><Edit3 size={14} /></button><button type="button" aria-label="Delete question" onClick={() => void removeQuestion(question)}><Trash2 size={14} /></button></> : <span className="question-readonly">TVM</span>}
            </div>
          </article>
        ))}
      </div>

      {editorOpen && (
        <div className="question-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditorOpen(false); }}>
          <section className="question-editor" role="dialog" aria-modal="true" aria-label={draft.id ? 'Edit trivia question' : 'Add trivia question'}>
            <header><div><span className="panel-kicker">QUESTION AUTHORING</span><h2>{draft.id ? 'Edit Question' : 'Add Question'}</h2></div><button type="button" onClick={() => setEditorOpen(false)}><X size={17} /></button></header>
            <div className="question-editor-body">
              <div className="question-editor-two-col">
                <label><span>Category</span><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                <label><span>Difficulty</span><select value={draft.difficulty} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value as TriviaQuestionDifficulty }))}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
              </div>
              <label><span>Question</span><textarea rows={3} value={draft.prompt} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} placeholder="What is... ?" /></label>
              <div className="question-answer-editor"><span>Answer choices</span>{draft.answers.map((answer, index) => <label className={`question-answer-editor__row ${draft.correctIndex === index ? 'is-correct' : ''}`} key={index}><input type="radio" name="correct-answer" checked={draft.correctIndex === index} onChange={() => setDraft((current) => ({ ...current, correctIndex: index }))} /><b>{String.fromCharCode(65 + index)}</b><input value={answer} onChange={(event) => updateAnswer(index, event.target.value)} placeholder={`Answer ${String.fromCharCode(65 + index)}`} /></label>)}</div>
              <label><span>Explanation / reveal note</span><textarea rows={2} value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Optional context shown after the answer is revealed." /></label>
              <div className="question-editor-three-col"><label><span>Points</span><input type="number" min={0} value={draft.points} onChange={(event) => setDraft((current) => ({ ...current, points: Number(event.target.value) }))} /></label><label><span>Timer</span><input type="number" min={5} max={600} value={draft.timeLimitSeconds} onChange={(event) => setDraft((current) => ({ ...current, timeLimitSeconds: Number(event.target.value) }))} /></label><label><span>Tags</span><input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="retro, 90s, web" /></label></div>
              <div className="question-editor-two-col"><label><span>Source name</span><input value={draft.sourceName} onChange={(event) => setDraft((current) => ({ ...current, sourceName: event.target.value }))} placeholder="Optional" /></label><label><span>Source URL</span><input value={draft.sourceUrl} onChange={(event) => setDraft((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="Optional" /></label></div>
            </div>
            <footer><button className="control-button control-button--quiet" type="button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="control-button control-button--primary" type="button" disabled={saving} onClick={() => void saveQuestion()}>{saving ? <RefreshCw className="spin" size={14} /> : <Check size={14} />} {draft.id ? 'Save Changes' : 'Add Question'}</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}
