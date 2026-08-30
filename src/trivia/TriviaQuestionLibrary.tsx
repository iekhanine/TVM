import {
  Check,
  ChevronRight,
  Database,
  Edit3,
  FileJson,
  Folder,
  FolderOpen,
  Import,
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
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  deleteTriviaLibraryQuestion,
  importTriviaQuestions,
  listTriviaCategories,
  listTriviaQuestionLibrary,
  saveTriviaLibraryQuestion,
  setTriviaLibraryQuestionEnabled,
  type TriviaCategory,
  type TriviaImportPayload,
  type TriviaImportResult,
  type TriviaLibraryQuestion,
  type TriviaQuestionDifficulty,
} from '../services/trivia';

import './TriviaQuestionLibrary.css';

/* ==========================================================
   QUESTION LIBRARY 001 - TYPES
   Explorer-style question library:
   Category > Question List > Question Detail
   ========================================================== */

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

type ImportPreview = {
  fileName: string;
  payload: TriviaImportPayload;
  sourceName: string;
  questionCount: number;
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

/* ==========================================================
   QUESTION LIBRARY 002 - HELPERS
   ========================================================== */

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function draftFromQuestion(question: TriviaLibraryQuestion): QuestionDraft {
  const answers = question.options.map((option) => option.label);
  while (answers.length < 4) answers.push('');

  const correctIndex = Math.max(
    0,
    question.options.findIndex((option) => option.isCorrect),
  );

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

function parseImportPayload(raw: unknown): TriviaImportPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('This is not a valid TVM trivia import file.');
  }

  const payload = raw as Partial<TriviaImportPayload>;

  if (!Array.isArray(payload.questions)) {
    throw new Error('Import file does not contain a questions array.');
  }

  if (payload.format && payload.format !== 'tvm-trivia-question-library') {
    throw new Error(`Unsupported import format: ${payload.format}`);
  }

  if (payload.version && payload.version !== 1) {
    throw new Error(`Unsupported TVM trivia import version: ${payload.version}`);
  }

  for (let index = 0; index < payload.questions.length; index += 1) {
    const question = payload.questions[index];

    if (!question || typeof question !== 'object') {
      throw new Error(`Question ${index + 1} is not valid.`);
    }

    if (!question.sourceQuestionId?.trim()) {
      throw new Error(`Question ${index + 1} is missing sourceQuestionId.`);
    }

    if (!question.categorySlug?.trim()) {
      throw new Error(`Question ${index + 1} is missing categorySlug.`);
    }

    if (!question.prompt?.trim()) {
      throw new Error(`Question ${index + 1} is missing prompt.`);
    }

    if (!question.sourceName?.trim()) {
      throw new Error(`Question ${index + 1} is missing sourceName.`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`Question ${index + 1} needs at least two options.`);
    }

    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      throw new Error(`Question ${index + 1} must have exactly one correct option.`);
    }
  }

  return payload as TriviaImportPayload;
}

const QUESTION_LIBRARY_PANE_STORAGE_KEY = 'tvm-trivia-question-library-panes';

type PaneWidths = {
  categories: number;
  questions: number;
};

const defaultPaneWidths: PaneWidths = {
  categories: 210,
  questions: 360,
};

function loadPaneWidths(): PaneWidths {
  try {
    const raw = window.localStorage.getItem(QUESTION_LIBRARY_PANE_STORAGE_KEY);
    if (!raw) return defaultPaneWidths;

    const parsed = JSON.parse(raw) as Partial<PaneWidths>;

    return {
      categories: Math.min(420, Math.max(150, Number(parsed.categories) || defaultPaneWidths.categories)),
      questions: Math.min(700, Math.max(260, Number(parsed.questions) || defaultPaneWidths.questions)),
    };
  } catch {
    return defaultPaneWidths;
  }
}

/* ==========================================================
   QUESTION LIBRARY 003 - COMPONENT
   ========================================================== */

export default function TriviaQuestionLibrary({ organizationId }: Props) {
  const [categories, setCategories] = useState<TriviaCategory[]>([]);
  const [questions, setQuestions] = useState<TriviaLibraryQuestion[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<TriviaQuestionDifficulty | ''>('');

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<TriviaImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paneWidths, setPaneWidths] = useState<PaneWidths>(() => loadPaneWidths());
  const explorerRef = useRef<HTMLDivElement>(null);

  /* ========================================================
     QUESTION LIBRARY 004 - DATA LOADING
     Categories load first. Questions load only for the active
     category so hundreds/thousands are not fetched at once.
     ======================================================== */

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError('');

    try {
      const data = await listTriviaCategories();
      setCategories(data);

      setSelectedCategoryId((current) => {
        if (current && data.some((category) => category.id === current)) {
          return current;
        }

        return data[0]?.id ?? '';
      });

      setDraft((current) => current.categoryId || data.length === 0
        ? current
        : { ...current, categoryId: data[0].id });
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!selectedCategoryId) {
      setQuestions([]);
      setSelectedQuestionId('');
      return;
    }

    setLoadingQuestions(true);
    setError('');

    try {
      const data = await listTriviaQuestionLibrary({
        organizationId,
        categoryId: selectedCategoryId,
        search,
        difficulty,
      });

      setQuestions(data);

      setSelectedQuestionId((current) => {
        if (current && data.some((question) => question.id === current)) {
          return current;
        }

        return data[0]?.id ?? '';
      });
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoadingQuestions(false);
    }
  }, [
    organizationId,
    selectedCategoryId,
    search,
    difficulty,
  ]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuestions();
    }, search ? 180 : 0);

    return () => window.clearTimeout(timer);
  }, [loadQuestions, search]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  const categoryQuestionCount = questions.length;

  /* ========================================================
     QUESTION LIBRARY 005 - QUESTION AUTHORING
     ======================================================== */

  function openNewQuestion() {
    setDraft({
      ...emptyDraft,
      categoryId: selectedCategoryId || categories[0]?.id || '',
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
      answers: current.answers.map((answer, answerIndex) => (
        answerIndex === index ? value : answer
      )),
    }));
  }

  async function saveQuestion() {
    const trimmedAnswers = draft.answers
      .map((answer) => answer.trim())
      .filter(Boolean);

    if (!draft.categoryId) return setError('Choose a category.');
    if (!draft.prompt.trim()) return setError('Question text is required.');
    if (trimmedAnswers.length < 2) return setError('Add at least two answer choices.');
    if (!draft.answers[draft.correctIndex]?.trim()) {
      return setError('The correct answer cannot be blank.');
    }

    setSaving(true);
    setError('');

    try {
      const savedId = await saveTriviaLibraryQuestion({
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
        tags: draft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        options: draft.answers
          .map((label, index) => ({
            label: label.trim(),
            isCorrect: index === draft.correctIndex,
          }))
          .filter((option) => option.label),
      });

      setEditorOpen(false);
      setSelectedCategoryId(draft.categoryId);
      await loadQuestions();
      setSelectedQuestionId(savedId);
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

      setQuestions((current) => current.map((row) => (
        row.id === question.id
          ? { ...row, enabled: !row.enabled }
          : row
      )));
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  /* ========================================================
     QUESTION LIBRARY 006 - IMPORT
     ======================================================== */

  function openImportDialog() {
    setImportPreview(null);
    setImportResult(null);
    setError('');
    setImportOpen(true);
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;

    setImportPreview(null);
    setImportResult(null);
    setError('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const payload = parseImportPayload(parsed);

      setImportPreview({
        fileName: file.name,
        payload,
        sourceName: payload.source?.name
          ?? payload.questions[0]?.sourceName
          ?? 'Unknown source',
        questionCount: payload.questions.length,
      });
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  async function runImport() {
    if (!importPreview) return;

    setImporting(true);
    setImportResult(null);
    setError('');

    try {
      const result = await importTriviaQuestions(
        organizationId,
        importPreview.payload,
      );

      setImportResult(result);
      await loadQuestions();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setImporting(false);
    }
  }

  /* ========================================================
     QUESTION LIBRARY 007 - RESIZABLE EXPLORER PANES
     ======================================================== */

  function beginPaneResize(
    pane: keyof PaneWidths,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = paneWidths[pane];

    function handleMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX;

      setPaneWidths((current) => {
        const next = {
          ...current,
          [pane]: pane === 'categories'
            ? Math.min(420, Math.max(150, startWidth + delta))
            : Math.min(700, Math.max(260, startWidth + delta)),
        };

        window.localStorage.setItem(
          QUESTION_LIBRARY_PANE_STORAGE_KEY,
          JSON.stringify(next),
        );

        return next;
      });
    }

    function handleMouseUp() {
      document.body.classList.remove('question-library-is-resizing');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    document.body.classList.add('question-library-is-resizing');
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  const explorerStyle = {
    '--question-category-pane-width': `${paneWidths.categories}px`,
    '--question-list-pane-width': `${paneWidths.questions}px`,
  } as CSSProperties;

  /* ========================================================
     QUESTION LIBRARY 008 - RENDER
     ======================================================== */

  return (
    <section className="question-library-page">
      <div className="question-library-toolbar question-library-toolbar--actions-only">
        <div className="question-library-toolbar__actions">
          <button
            className="control-button control-button--quiet"
            type="button"
            onClick={openImportDialog}
          >
            <Import size={15} /> Import Questions
          </button>

          <button
            className="control-button control-button--primary"
            type="button"
            onClick={openNewQuestion}
          >
            <Plus size={15} /> Add Question
          </button>
        </div>
      </div>

      {error && (
        <div className="runtime-message runtime-message--error">
          {error}
        </div>
      )}

      <div
        className="question-explorer"
        ref={explorerRef}
        style={explorerStyle}
      >
        {/* ==================================================
            QUESTION LIBRARY 008 - CATEGORY PANE
            ================================================== */}
        <aside className="question-explorer__categories">
          <div className="question-explorer__pane-header">
            <span>Categories</span>
            <button
              className="icon-square icon-square--quiet"
              type="button"
              aria-label="Refresh categories"
              onClick={() => void loadCategories()}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="question-explorer__category-list">
            {loadingCategories && (
              <div className="question-explorer__loading">
                <RefreshCw className="spin" size={15} />
                Loading…
              </div>
            )}

            {!loadingCategories && categories.map((category) => {
              const active = category.id === selectedCategoryId;

              return (
                <button
                  key={category.id}
                  type="button"
                  className={`question-category-item ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedQuestionId('');
                    setSearch('');
                    setDifficulty('');
                  }}
                >
                  {active
                    ? <FolderOpen size={15} />
                    : <Folder size={15} />}
                  <span>{category.name}</span>
                  <ChevronRight size={13} />
                </button>
              );
            })}
          </div>
        </aside>

        <div
          className="question-explorer__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize category pane"
          onMouseDown={(event) => beginPaneResize('categories', event)}
        />

        {/* ==================================================
            QUESTION LIBRARY 009 - QUESTION LIST PANE
            ================================================== */}
        <section className="question-explorer__questions">
          <div className="question-explorer__pane-header">
            <div>
              <strong>{selectedCategory?.name ?? 'Questions'}</strong>
              <span>{categoryQuestionCount} loaded</span>
            </div>

            <button
              className="icon-square icon-square--quiet"
              type="button"
              aria-label="Refresh questions"
              disabled={!selectedCategoryId}
              onClick={() => void loadQuestions()}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="question-explorer__filters">
            <label>
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this category..."
                disabled={!selectedCategoryId}
              />
            </label>

            <select
              value={difficulty}
              disabled={!selectedCategoryId}
              onChange={(event) => setDifficulty(
                event.target.value as TriviaQuestionDifficulty | '',
              )}
            >
              <option value="">All difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="question-explorer__question-list">
            {!selectedCategoryId && (
              <div className="question-explorer__empty">
                <Folder size={24} />
                <strong>Choose a category.</strong>
              </div>
            )}

            {selectedCategoryId && loadingQuestions && (
              <div className="question-explorer__loading">
                <RefreshCw className="spin" size={16} />
                Loading questions…
              </div>
            )}

            {selectedCategoryId
              && !loadingQuestions
              && questions.length === 0 && (
                <div className="question-explorer__empty">
                  <Database size={22} />
                  <strong>No questions found.</strong>
                  <span>Try another filter or add a question.</span>
                </div>
              )}

            {!loadingQuestions && questions.map((question) => (
              <button
                key={question.id}
                type="button"
                className={[
                  'question-list-item',
                  question.id === selectedQuestionId ? 'is-active' : '',
                  question.enabled ? '' : 'is-disabled',
                ].join(' ')}
                onClick={() => setSelectedQuestionId(question.id)}
              >
                <div>
                  <strong>{question.prompt}</strong>
                  <span>
                    {question.difficulty}
                    {' · '}
                    {question.points} pts
                    {' · '}
                    {question.options.length} answers
                  </span>
                </div>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        </section>

        <div
          className="question-explorer__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize question list pane"
          onMouseDown={(event) => beginPaneResize('questions', event)}
        />

        {/* ==================================================
            QUESTION LIBRARY 010 - DETAIL PANE
            ================================================== */}
        <section className="question-explorer__detail">
          {!selectedQuestion && (
            <div className="question-detail-empty">
              <FileJson size={30} />
              <strong>Select a question.</strong>
              <span>The full question will appear here.</span>
            </div>
          )}

          {selectedQuestion && (
            <>
              <div className="question-detail-header">
                <div>
                  <span className="question-category-badge">
                    {selectedQuestion.categoryName}
                  </span>
                  <span className={`question-difficulty is-${selectedQuestion.difficulty}`}>
                    {selectedQuestion.difficulty}
                  </span>
                </div>

                <div className="question-detail-actions">
                  <button
                    className={`question-status-toggle ${selectedQuestion.enabled ? 'is-on' : ''}`}
                    type="button"
                    disabled={!selectedQuestion.editable}
                    onClick={() => void toggleQuestion(selectedQuestion)}
                  >
                    {selectedQuestion.enabled
                      ? <><Check size={12} /> Enabled</>
                      : 'Disabled'}
                  </button>

                  {selectedQuestion.editable && (
                    <>
                      <button
                        className="icon-square icon-square--quiet"
                        type="button"
                        aria-label="Edit question"
                        onClick={() => openEditQuestion(selectedQuestion)}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        className="icon-square icon-square--quiet"
                        type="button"
                        aria-label="Delete question"
                        onClick={() => void removeQuestion(selectedQuestion)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="question-detail-body">
                <h3>{selectedQuestion.prompt}</h3>

                <div className="question-detail-answers">
                  {selectedQuestion.options.map((option, index) => (
                    <div
                      key={option.id}
                      className={`question-detail-answer ${option.isCorrect ? 'is-correct' : ''}`}
                    >
                      <b>{String.fromCharCode(65 + index)}</b>
                      <span>{option.label}</span>
                      {option.isCorrect && <Check size={14} />}
                    </div>
                  ))}
                </div>

                {selectedQuestion.explanation && (
                  <div className="question-detail-section">
                    <span>Explanation</span>
                    <p>{selectedQuestion.explanation}</p>
                  </div>
                )}

                <div className="question-detail-meta">
                  <div>
                    <span>Points</span>
                    <strong>{selectedQuestion.points}</strong>
                  </div>
                  <div>
                    <span>Timer</span>
                    <strong>{selectedQuestion.timeLimitSeconds}s</strong>
                  </div>
                  <div>
                    <span>Source</span>
                    <strong>
                      {selectedQuestion.isGlobal
                        ? 'TVM'
                        : selectedQuestion.sourceName || 'Custom'}
                    </strong>
                  </div>
                </div>

                {selectedQuestion.tags.length > 0 && (
                  <div className="question-detail-section">
                    <span>Tags</span>
                    <div className="question-detail-tags">
                      {selectedQuestion.tags.map((tag) => (
                        <em key={tag}>{tag}</em>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedQuestion.editable && (
                  <div className="question-readonly-note">
                    TVM library question · read only
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ====================================================
          QUESTION LIBRARY 011 - QUESTION EDITOR
          ==================================================== */}
      {editorOpen && (
        <div
          className="question-editor-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setEditorOpen(false);
            }
          }}
        >
          <section
            className="question-editor"
            role="dialog"
            aria-modal="true"
            aria-label={draft.id ? 'Edit trivia question' : 'Add trivia question'}
          >
            <header>
              <div>
                <span className="panel-kicker">QUESTION AUTHORING</span>
                <h2>{draft.id ? 'Edit Question' : 'Add Question'}</h2>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)}>
                <X size={17} />
              </button>
            </header>

            <div className="question-editor-body">
              <div className="question-editor-two-col">
                <label>
                  <span>Category</span>
                  <select
                    value={draft.categoryId}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))}
                  >
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Difficulty</span>
                  <select
                    value={draft.difficulty}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      difficulty: event.target.value as TriviaQuestionDifficulty,
                    }))}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Question</span>
                <textarea
                  rows={3}
                  value={draft.prompt}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    prompt: event.target.value,
                  }))}
                  placeholder="What is... ?"
                />
              </label>

              <div className="question-answer-editor">
                <span>Answer choices</span>
                {draft.answers.map((answer, index) => (
                  <label
                    className={`question-answer-editor__row ${draft.correctIndex === index ? 'is-correct' : ''}`}
                    key={index}
                  >
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={draft.correctIndex === index}
                      onChange={() => setDraft((current) => ({
                        ...current,
                        correctIndex: index,
                      }))}
                    />
                    <b>{String.fromCharCode(65 + index)}</b>
                    <input
                      value={answer}
                      onChange={(event) => updateAnswer(index, event.target.value)}
                      placeholder={`Answer ${String.fromCharCode(65 + index)}`}
                    />
                  </label>
                ))}
              </div>

              <label>
                <span>Explanation / reveal note</span>
                <textarea
                  rows={2}
                  value={draft.explanation}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    explanation: event.target.value,
                  }))}
                  placeholder="Optional context shown after the answer is revealed."
                />
              </label>

              <div className="question-editor-three-col">
                <label>
                  <span>Points</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.points}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      points: Number(event.target.value),
                    }))}
                  />
                </label>

                <label>
                  <span>Timer</span>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={draft.timeLimitSeconds}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      timeLimitSeconds: Number(event.target.value),
                    }))}
                  />
                </label>

                <label>
                  <span>Tags</span>
                  <input
                    value={draft.tags}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      tags: event.target.value,
                    }))}
                    placeholder="retro, 90s, web"
                  />
                </label>
              </div>

              <div className="question-editor-two-col">
                <label>
                  <span>Source name</span>
                  <input
                    value={draft.sourceName}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      sourceName: event.target.value,
                    }))}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  <span>Source URL</span>
                  <input
                    value={draft.sourceUrl}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      sourceUrl: event.target.value,
                    }))}
                    placeholder="Optional"
                  />
                </label>
              </div>
            </div>

            <footer>
              <button
                className="control-button control-button--quiet"
                type="button"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </button>

              <button
                className="control-button control-button--primary"
                type="button"
                disabled={saving}
                onClick={() => void saveQuestion()}
              >
                {saving
                  ? <RefreshCw className="spin" size={14} />
                  : <Check size={14} />}
                {draft.id ? 'Save Changes' : 'Add Question'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* ====================================================
          QUESTION LIBRARY 012 - IMPORT DIALOG
          ==================================================== */}
      {importOpen && (
        <div
          className="question-editor-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !importing) {
              setImportOpen(false);
            }
          }}
        >
          <section
            className="question-import-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Import trivia questions"
          >
            <header>
              <div>
                <span className="panel-kicker">QUESTION LIBRARY</span>
                <h2>Import Questions</h2>
              </div>

              <button
                type="button"
                disabled={importing}
                onClick={() => setImportOpen(false)}
              >
                <X size={17} />
              </button>
            </header>

            <div className="question-import-body">
              {!importPreview && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(event) => {
                      void handleImportFile(event.target.files?.[0] ?? null);
                      event.currentTarget.value = '';
                    }}
                  />

                  <button
                    className="question-import-picker"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileJson size={28} />
                    <strong>Choose TVM JSON file</strong>
                    <span>TVM Trivia Question Library v1</span>
                  </button>
                </>
              )}

              {importPreview && !importResult && (
                <div className="question-import-preview">
                  <div className="question-import-file">
                    <FileJson size={22} />
                    <div>
                      <strong>{importPreview.fileName}</strong>
                      <span>{importPreview.sourceName}</span>
                    </div>
                  </div>

                  <div className="question-import-summary">
                    <div>
                      <strong>{importPreview.questionCount}</strong>
                      <span>Questions</span>
                    </div>
                    <div>
                      <strong>v{importPreview.payload.version ?? 1}</strong>
                      <span>Format</span>
                    </div>
                    <div>
                      <strong>Ready</strong>
                      <span>Validation</span>
                    </div>
                  </div>

                  <button
                    className="control-button control-button--quiet"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Different File
                  </button>
                </div>
              )}

              {importResult && (
                <div className="question-import-result">
                  <Check size={30} />
                  <strong>Import complete</strong>

                  <div className="question-import-summary">
                    <div>
                      <strong>{importResult.imported}</strong>
                      <span>Imported</span>
                    </div>
                    <div>
                      <strong>{importResult.duplicates}</strong>
                      <span>Duplicates</span>
                    </div>
                    <div>
                      <strong>{importResult.invalid}</strong>
                      <span>Invalid</span>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="question-import-errors">
                      {importResult.errors.map((item, index) => (
                        <div key={`${item.sourceQuestionId ?? 'error'}-${index}`}>
                          <strong>{item.sourceQuestionId ?? `Question ${index + 1}`}</strong>
                          <span>{item.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer>
              <button
                className="control-button control-button--quiet"
                type="button"
                disabled={importing}
                onClick={() => setImportOpen(false)}
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>

              {importPreview && !importResult && (
                <button
                  className="control-button control-button--primary"
                  type="button"
                  disabled={importing}
                  onClick={() => void runImport()}
                >
                  {importing
                    ? <RefreshCw className="spin" size={14} />
                    : <Import size={14} />}
                  Import {importPreview.questionCount}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
