import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors, { AppPalette } from '@/constants/colors';
import wordsSource from '@/assets/data/words.json';
import previousSourceData from '@/assets/data/previous-years-source.json';

type Word = {
  sourceRow: number;
  part: string;
  headword: string;
  preposition: string;
  meaning: string;
  sentence: string;
  extra: string[];
};

type ViewName =
  | 'home'
  | 'dictionary'
  | 'flashcards'
  | 'progress'
  | 'previous'
  | 'settings'
  | 'quiz'
  | 'exam';

type QuizQuestion = Word & {
  options: string[];
  correct: string;
  explanation?: string;
  source?: string;
};

type ThemeName = keyof typeof colors.themes;
type ColorMode = 'system' | 'light' | 'dark';

type SavedState = {
  memorized: string[];
  bookmarked: string[];
  mistakes: Record<string, number>;
  answered: number;
  correct: number;
  sessions: number;
  streak: number;
  bestStreak: number;
  lastPractice: string;
  name: string;
  dailyGoal: number;
  sound: boolean;
  notifications: boolean;
  themeColor: ThemeName;
  colorMode: ColorMode;
};

const initialState: SavedState = {
  memorized: [],
  bookmarked: [],
  mistakes: {},
  answered: 0,
  correct: 0,
  sessions: 0,
  streak: 0,
  bestStreak: 0,
  lastPractice: '',
  name: '',
  dailyGoal: 10,
  sound: true,
  notifications: false,
  themeColor: 'sky',
  colorMode: 'system',
};

const words = (wordsSource as { entries: Word[] }).entries;
const previousSource = (previousSourceData as { text: string }).text;
const parts = Array.from({ length: 14 }, (_, index) => `Part ${index + 1}`);
let palette: AppPalette = colors.light;
let styles = createStyles(palette);

const prepositionWords = [
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'at', 'before', 'behind',
  'below', 'beneath', 'beside', 'between', 'beyond', 'by', 'despite', 'down', 'during', 'for', 'from',
  'in', 'inside', 'into', 'of', 'off', 'on', 'onto', 'over', 'through', 'to', 'toward', 'under',
  'until', 'up', 'upon', 'with', 'within', 'without', 'via',
];

function barePrepositions(value: string): string[] {
  const normalized = value.toLocaleLowerCase().replace(/[-–—]/g, ' ');
  const found = normalized.match(/\b[a-z]+\b/g) ?? [];
  return Array.from(new Set(found.filter((item) => prepositionWords.includes(item))));
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function makeQuestion(word: Word): QuizQuestion {
  const valid = barePrepositions(word.preposition);
  const correct = valid[0] ?? '';
  const distractors = shuffle(prepositionWords.filter((item) => !valid.includes(item))).slice(0, 3);
  return {
    ...word,
    correct,
    options: shuffle([correct, ...distractors]),
    explanation: `${word.headword} is used with “${word.preposition}”. ${word.meaning}`,
  };
}

function makeQuestions(source: Word[], count?: number): QuizQuestion[] {
  const pool = shuffle(source).filter((word) => barePrepositions(word.preposition).length > 0).map(makeQuestion);
  return count ? pool.slice(0, Math.min(count, pool.length)) : pool;
}

function parsePreviousQuestions(text: string): QuizQuestion[] {
  const result: QuizQuestion[] = [];
  let part = 'Previous years';
  let current: { number: string; lines: string[]; options: string[] } | null = null;

  const finish = (answerLabel: string) => {
    if (!current || current.options.length !== 4) return;
    const correctIndex = ['A', 'B', 'C', 'D'].indexOf(answerLabel);
    if (correctIndex < 0) return;
    const normalizedOptions = current.options.map((option) => option.toLocaleLowerCase().trim());
    if (!normalizedOptions.every((option) => prepositionWords.includes(option))) return;
    const sentenceWithSource = current.lines.join(' ').trim();
    const source = (sentenceWithSource.match(/\[[^\]]+\]/g) ?? []).join(' ');
    const sentence = sentenceWithSource.replace(/\s*\[[^\]]+\]/g, '').trim();
    result.push({
      sourceRow: result.length + 1,
      part,
      headword: 'Previous-year question',
      preposition: current.options[correctIndex],
      meaning: 'Board and admission question',
      sentence,
      extra: [],
      options: normalizedOptions,
      correct: normalizedOptions[correctIndex],
      source,
      explanation: `Correct answer: “${normalizedOptions[correctIndex]}”. ${source ? `Source: ${source}` : 'Review the sentence pattern and usage.'}`,
    });
    current = null;
  };

  text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const heading = line.match(/Previous Years[’'] Questions Related to Part-(\d+)/i);
    if (heading) {
      part = `Part ${heading[1]}`;
      return;
    }
    const question = line.match(/^(\d{2})\.\s+(.*)$/);
    if (question) {
      current = { number: question[1], lines: [question[2]], options: [] };
      return;
    }
    if (!current) return;
    const inlineOptions = Array.from(line.matchAll(/(?:^|\s)([A-D])\.\s*([A-Za-z]+)/gi));
    if (inlineOptions.length > 0 && current.options.length < 4) {
      inlineOptions.slice(0, 4 - current.options.length).forEach((match) => current?.options.push(match[2].trim()));
      return;
    }
    const answer = line.match(new RegExp(`^${current.number}\\.[A-D]$`));
    if (answer) finish(answer[0].slice(-1));
    else if (current.options.length < 4) current.lines.push(line);
  });

  return result;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function usePersistedState() {
  const [state, setState] = useState<SavedState>(initialState);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('adroit-prepify-state')
      .then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as Partial<SavedState>;
        const themeColor = parsed.themeColor && parsed.themeColor in colors.themes ? parsed.themeColor : initialState.themeColor;
        const colorMode = parsed.colorMode && ['system', 'light', 'dark'].includes(parsed.colorMode) ? parsed.colorMode : initialState.colorMode;
        setState({ ...initialState, ...parsed, themeColor, colorMode });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem('adroit-prepify-state', JSON.stringify(state)).catch(() => undefined);
  }, [state, loaded]);
  return [state, setState] as const;
}

function IconButton({
  icon,
  onPress,
  color,
  accessibilityLabel,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  color: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      testID={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  secondary = false,
  compact = false,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  secondary?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionButton,
        secondary ? styles.secondaryButton : styles.primaryButton,
        compact && styles.compactButton,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {icon && <Feather name={icon} size={16} color={secondary ? palette.primary : palette.primaryForeground} />}
      <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <View style={styles.sectionTitle}>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>}
      <Text style={styles.sectionHeading}>{title}</Text>
    </View>
  );
}

function WordCard({
  word,
  memorized,
  bookmarked,
  onMemorize,
  onBookmark,
  compact = false,
}: {
  word: Word;
  memorized: boolean;
  bookmarked: boolean;
  onMemorize: () => void;
  onBookmark: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.wordCard, compact && styles.compactWordCard]}>
      <View style={styles.wordCardTop}>
        <View style={styles.partPill}>
          <Text style={styles.partPillText}>{word.part.replace('Part ', 'P')}</Text>
        </View>
        <View style={styles.wordActions}>
          <IconButton
            icon={memorized ? 'check-circle' : 'circle'}
            color={memorized ? palette.accentForeground : palette.mutedForeground}
            onPress={onMemorize}
            accessibilityLabel={memorized ? `Unmark ${word.headword}` : `Mark ${word.headword} memorized`}
          />
          <IconButton
            icon={bookmarked ? 'star' : 'star'}
            color={bookmarked ? '#D79A35' : palette.mutedForeground}
            onPress={onBookmark}
            accessibilityLabel={bookmarked ? `Remove ${word.headword} bookmark` : `Bookmark ${word.headword}`}
          />
        </View>
      </View>
      <Text style={styles.headword}>{word.headword}</Text>
      <Text style={styles.preposition}>{word.preposition}</Text>
      <Text style={styles.meaning}>{word.meaning}</Text>
      {!compact && <Text style={styles.sentence}>{word.sentence}</Text>}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  const [state, setState] = usePersistedState();
  const [view, setView] = useState<ViewName>('home');
  const [activePart, setActivePart] = useState('Part 1');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'part' | 'mode' | null>(null);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [flashDeck, setFlashDeck] = useState('All parts');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('');
  const [sessionDate, setSessionDate] = useState(todayKey());
  const [sourceStatus, setSourceStatus] = useState<'ok' | 'mismatch'>('mismatch');
  const [previousPart, setPreviousPart] = useState('All parts');
  const flashPan = useRef(new Animated.Value(0)).current;
  const dark = state.colorMode === 'dark' || (state.colorMode === 'system' && systemScheme === 'dark');
  const theme = colors.themes[state.themeColor][dark ? 'dark' : 'light'];
  palette = theme;
  styles = createStyles(theme);
  const wordOfSession = useMemo(() => words[(new Date().getDate() * 7) % words.length], []);
  const accuracy = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
  const currentQuestion = questions[questionIndex];
  const previousQuestions = useMemo(() => parsePreviousQuestions(previousSource), []);
  const previousParts = useMemo(
    () => ['All parts', ...Array.from(new Set(previousQuestions.map((question) => question.part)))],
    [previousQuestions],
  );

  useEffect(() => {
    const expected = (wordsSource as { expectedCount: number }).expectedCount;
    setSourceStatus(words.length === expected ? 'ok' : 'mismatch');
    if (words.length !== expected) {
      console.warn(`[Adroit Prepify] Dataset integrity mismatch: expected ${expected}, found ${words.length}.`);
    }
  }, []);

  const saveState = (patch: Partial<SavedState>) => setState((current) => ({ ...current, ...patch }));
  const toggleIn = (key: 'memorized' | 'bookmarked', headword: string) => {
    setState((current) => {
      const next = current[key].includes(headword)
        ? current[key].filter((item) => item !== headword)
        : [...current[key], headword];
      return { ...current, [key]: next };
    });
  };

  const startSession = (mode: 'quiz' | 'exam', part = activePart, full = false) => {
    const source = full ? words : words.filter((word) => word.part === part);
    const generated = makeQuestions(source, mode === 'exam' ? 30 : undefined);
    setQuestions(generated);
    setQuestionIndex(0);
    setAnswers({});
    setReviewing(false);
    setSessionLabel(full ? 'Full mock exam' : `${part} ${mode === 'quiz' ? 'quiz' : 'mock exam'}`);
    setSessionDate(todayKey());
    setView(mode);
  };

  const startPreviousSession = (part = previousPart) => {
    const source = parsePreviousQuestions(previousSource).filter((question) => part === 'All parts' || question.part === part);
    setQuestions(shuffle(source).slice(0, 25));
    setQuestionIndex(0);
    setAnswers({});
    setReviewing(false);
    setSessionLabel(part === 'All parts' ? 'Previous year quiz' : `${part} previous year quiz`);
    setSessionDate(todayKey());
    setView('quiz');
  };

  const finishSession = () => {
    const correctCount = questions.reduce(
      (sum, question, index) => sum + (answers[index] === question.correct ? 1 : 0),
      0
    );
    const nextMistakes = { ...state.mistakes };
    questions.forEach((question, index) => {
      if (answers[index] && answers[index] !== question.correct) {
        nextMistakes[question.headword] = (nextMistakes[question.headword] ?? 0) + 1;
      }
    });
    const today = todayKey();
    const practicedToday = state.lastPractice === today;
    const nextStreak = practicedToday ? state.streak : state.lastPractice ? state.streak + 1 : 1;
    saveState({
      answered: state.answered + questions.length,
      correct: state.correct + correctCount,
      sessions: state.sessions + 1,
      mistakes: nextMistakes,
      lastPractice: today,
      streak: nextStreak,
      bestStreak: Math.max(state.bestStreak, nextStreak),
    });
    setReviewing(true);
  };

  const handleAnswer = (option: string) => {
    if (answers[questionIndex]) return;
    setAnswers((current) => ({ ...current, [questionIndex]: option }));
    if (sessionLabel.includes('quiz') && option !== currentQuestion.correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } else {
      Haptics.selectionAsync().catch(() => undefined);
    }
  };

  const filteredWords = useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase();
    if (!lowered) return words;
    return words.filter((word) =>
      [word.headword, word.preposition, word.meaning, word.sentence]
        .join(' ')
        .toLocaleLowerCase()
        .includes(lowered)
    );
  }, [query]);

  const flashWords = useMemo(() => {
    if (flashDeck === 'Bookmarked deck') return words.filter((word) => state.bookmarked.includes(word.headword));
    if (flashDeck === 'Mistake Bank') return words.filter((word) => state.mistakes[word.headword]);
    if (flashDeck === 'Memorized words') return words.filter((word) => state.memorized.includes(word.headword));
    if (flashDeck !== 'All parts') return words.filter((word) => word.part === flashDeck);
    return words;
  }, [flashDeck, state.bookmarked, state.memorized, state.mistakes]);
  const flashWord = flashWords[flashIndex % Math.max(flashWords.length, 1)];
  const flashResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => flashPan.setValue(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < 70) {
            Animated.spring(flashPan, { toValue: 0, useNativeDriver: true }).start();
            return;
          }
          // Bengali navigation convention: right swipe = previous, left swipe = next.
          const direction = gesture.dx > 0 ? -1 : 1;
          Animated.timing(flashPan, {
            toValue: gesture.dx > 0 ? 500 : -500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setFlashIndex((current) =>
              flashWords.length ? (current + direction + flashWords.length) % flashWords.length : 0,
            );
            setFlashFlipped(false);
            flashPan.setValue(0);
          });
        },
      }),
    [flashPan, flashWords.length],
  );

  const renderHeader = (title: string, back = true) => (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {back ? (
        <IconButton icon="arrow-left" color={theme.foreground} onPress={() => setView('home')} accessibilityLabel="Back to home" />
      ) : (
        <View style={styles.logoMark}><Feather name="book-open" size={18} color={theme.primaryForeground} /></View>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <IconButton icon="search" color={theme.foreground} onPress={() => setView('dictionary')} accessibilityLabel="Open dictionary search" />
    </View>
  );

  const renderHome = () => (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>{state.name ? `Good to see you, ${state.name}` : 'Your next breakthrough'}</Text>
          <Text style={styles.title}>Adroit <Text style={styles.titleAccent}>Prepify</Text></Text>
        </View>
        <IconButton icon="settings" color={theme.foreground} onPress={() => setView('settings')} accessibilityLabel="Open settings" />
      </View>
      <Text style={styles.subtitle}>Master every preposition through focused practice.</Text>
      <LinearGradient colors={[theme.heroStart, theme.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sessionCard}>
        <View style={styles.sessionGlow} />
        <View style={styles.sessionCardHeader}>
          <View style={styles.sessionBadge}><Feather name="zap" size={13} color="#F7C96B" /><Text style={styles.sessionBadgeText}>WORD OF THE SESSION</Text></View>
          <IconButton icon="refresh-cw" color="#D5F4EF" onPress={() => Alert.alert('Fresh word', 'Your next session will begin with a new word.')} accessibilityLabel="Refresh word of the session" />
        </View>
        <Text style={styles.sessionWord}>{wordOfSession.headword}</Text>
        <Text style={styles.sessionPrep}>{wordOfSession.preposition}</Text>
        <Text style={styles.sessionMeaning}>{wordOfSession.meaning}</Text>
        <Text style={styles.sessionSentence}>{wordOfSession.sentence}</Text>
        <View style={styles.sessionActions}>
          <Pressable onPress={() => toggleIn('memorized', wordOfSession.headword)} style={[styles.lightPill, { backgroundColor: theme.accent }]}><Feather name={state.memorized.includes(wordOfSession.headword) ? 'check' : 'plus'} size={15} color={theme.accentForeground} /><Text style={[styles.lightPillText, { color: theme.accentForeground }]}>{state.memorized.includes(wordOfSession.headword) ? 'Memorized' : 'Memorize'}</Text></Pressable>
          <Pressable onPress={() => toggleIn('bookmarked', wordOfSession.headword)} style={styles.ghostPill}><Feather name="star" size={15} color={theme.heroMuted} /><Text style={[styles.ghostPillText, { color: theme.heroMuted }]}>{state.bookmarked.includes(wordOfSession.headword) ? 'Saved' : 'Save'}</Text></Pressable>
        </View>
      </LinearGradient>
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statValue}>{state.memorized.length}</Text><Text style={styles.statLabel}>Memorized</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{accuracy}%</Text><Text style={styles.statLabel}>Accuracy</Text></View>
        <View style={styles.statBox}><Text style={styles.statValue}>{state.streak}</Text><Text style={styles.statLabel}>Day streak</Text></View>
      </View>
      <SectionTitle title="Practice by part" eyebrow="Build your foundation" />
      <View style={styles.partsGrid}>
        {parts.map((part, index) => {
          const count = words.filter((word) => word.part === part).length;
          return (
            <View key={part} style={styles.partCard}>
              <View style={styles.partNumber}><Text style={styles.partNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
              <View style={styles.partInfo}><Text style={styles.partName}>{part}</Text><Text style={styles.partCount}>{count} words</Text></View>
              <View style={styles.partButtons}>
                <Pressable onPress={() => { setActivePart(part); startSession('quiz', part); }} style={styles.partAction}><Feather name="play" size={13} color={theme.primary} /><Text style={styles.partActionText}>Quiz</Text></Pressable>
                <Pressable onPress={() => { setActivePart(part); startSession('exam', part); }} style={[styles.partAction, styles.partMockAction]}><Feather name="clock" size={13} color={theme.accentForeground} /><Text style={[styles.partActionText, { color: theme.accentForeground }]}>Mock</Text></Pressable>
              </View>
            </View>
          );
        })}
      </View>
      <SectionTitle title="Study tools" eyebrow="Go beyond quizzes" />
      <View style={styles.toolGrid}>
        {[
          { title: 'Dictionary', text: 'Search all source entries', icon: 'book', action: () => setView('dictionary') },
          { title: 'Flashcards', text: 'Active recall with flip cards', icon: 'layers', action: () => setView('flashcards') },
          { title: 'Full mock exam', text: '30 words, fresh every time', icon: 'award', action: () => startSession('exam', 'All', true) },
          { title: 'Previous years', text: 'Browse the supplied PDF', icon: 'file-text', action: () => setView('previous') },
          { title: 'Progress', text: 'Your accuracy and streaks', icon: 'bar-chart-2', action: () => setView('progress') },
          { title: 'Mistake bank', text: `${Object.keys(state.mistakes).length} words to revisit`, icon: 'rotate-ccw', action: () => { setFlashDeck('Mistake Bank'); setView('flashcards'); } },
        ].map((tool) => (
          <Pressable key={tool.title} onPress={tool.action} style={({ pressed }) => [styles.toolCard, { opacity: pressed ? 0.8 : 1 }]}>
            <View style={styles.toolIcon}><Feather name={tool.icon as keyof typeof Feather.glyphMap} size={19} color={theme.primary} /></View>
            <Text style={styles.toolTitle}>{tool.title}</Text><Text style={styles.toolText}>{tool.text}</Text>
            <Feather name="arrow-up-right" size={15} color={theme.mutedForeground} style={styles.toolArrow} />
          </Pressable>
        ))}
      </View>
      <View style={styles.integrityBanner}>
        <Feather name={sourceStatus === 'ok' ? 'check-circle' : 'info'} size={17} color={sourceStatus === 'ok' ? theme.accentForeground : theme.primary} />
        <Text style={styles.integrityText}>{sourceStatus === 'ok' ? 'All source entries verified.' : 'Source workbook contains 525 entries; integrity check expected 526.'}</Text>
      </View>
    </ScrollView>
  );

  const renderDictionary = () => (
    <View style={styles.screen}>
      {renderHeader('Dictionary')}
      <View style={styles.searchWrap}><Feather name="search" size={18} color={theme.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Search headword, meaning, sentence..." placeholderTextColor={theme.mutedForeground} style={styles.searchInput} /></View>
      <View style={styles.filterRow}><Text style={styles.resultText}>{filteredWords.length} entries</Text><Pressable onPress={() => setQuery('')}><Text style={styles.clearText}>Clear</Text></Pressable></View>
      <FlatList data={filteredWords} keyExtractor={(item) => String(item.sourceRow)} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }} renderItem={({ item }) => <WordCard word={item} memorized={state.memorized.includes(item.headword)} bookmarked={state.bookmarked.includes(item.headword)} onMemorize={() => toggleIn('memorized', item.headword)} onBookmark={() => toggleIn('bookmarked', item.headword)} />} />
    </View>
  );

  const renderFlashcards = () => (
    <View style={styles.screen}>
      {renderHeader('Flashcards')}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckRow}>
          {['All parts', ...parts, 'Bookmarked deck', 'Mistake Bank', 'Memorized words'].map((deck) => <Pressable key={deck} onPress={() => { setFlashDeck(deck); setFlashIndex(0); setFlashFlipped(false); }} style={[styles.deckChip, flashDeck === deck && styles.deckChipActive]}><Text style={[styles.deckChipText, flashDeck === deck && styles.deckChipTextActive]}>{deck}</Text></Pressable>)}
        </ScrollView>
        {flashWord ? (
          <>
            <Text style={styles.flashCounter}>{(flashIndex % flashWords.length) + 1} / {flashWords.length}</Text>
            <Animated.View
              {...flashResponder.panHandlers}
              style={[
                styles.flashCard,
                {
                  opacity: flashPan.interpolate({
                    inputRange: [-500, -160, 0, 160, 500],
                    outputRange: [0.15, 0.92, 1, 0.92, 0.15],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    { translateX: flashPan },
                    {
                      rotate: flashPan.interpolate({
                        inputRange: [-500, 0, 500],
                        outputRange: ['-10deg', '0deg', '10deg'],
                        extrapolate: 'clamp',
                      }),
                    },
                    {
                      scale: flashPan.interpolate({
                        inputRange: [-500, 0, 500],
                        outputRange: [0.94, 1, 0.94],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable onPress={() => setFlashFlipped((current) => !current)} style={styles.flashCardPressable}>
              <LinearGradient colors={[theme.heroStart, theme.heroEnd]} style={styles.flashCardGradient}>
                <Text style={styles.flashHint}>{flashFlipped ? 'ANSWER' : 'TAP TO FLIP'}</Text>
                <Text style={styles.flashHeadword}>{flashFlipped ? flashWord.preposition : flashWord.headword}</Text>
                {flashFlipped && <><Text style={styles.flashMeaning}>{flashWord.meaning}</Text><Text style={styles.flashSentence}>{flashWord.sentence}</Text></>}
                {!flashFlipped && <Feather name="rotate-cw" size={34} color="#B8DDE7" />}
              </LinearGradient>
              </Pressable>
            </Animated.View>
            <Text style={styles.swipeHint}>ডানে swipe → পূর্ববর্তী word · বামে swipe → পরবর্তী word</Text>
            {flashFlipped && <View style={styles.flashDetails}><Text style={styles.detailLabel}>{flashWord.headword}</Text><Text style={styles.detailText}>{flashWord.meaning}</Text></View>}
            <View style={styles.flashControls}><ActionButton label="Previous" icon="chevron-left" secondary compact onPress={() => { setFlashIndex((current) => (current - 1 + flashWords.length) % flashWords.length); setFlashFlipped(false); }} /><ActionButton label="Next" icon="chevron-right" compact onPress={() => { setFlashIndex((current) => (current + 1) % flashWords.length); setFlashFlipped(false); }} /></View>
            <View style={styles.flashControls}><ActionButton label={state.memorized.includes(flashWord.headword) ? 'Memorized' : 'Mark memorized'} icon="check" secondary compact onPress={() => toggleIn('memorized', flashWord.headword)} /><ActionButton label={state.bookmarked.includes(flashWord.headword) ? 'Bookmarked' : 'Bookmark'} icon="star" secondary compact onPress={() => toggleIn('bookmarked', flashWord.headword)} /></View>
          </>
        ) : <View style={styles.emptyState}><Feather name="layers" size={30} color={theme.mutedForeground} /><Text style={styles.emptyTitle}>This deck is empty</Text><Text style={styles.emptyText}>Bookmark or miss a few words to build a custom deck.</Text></View>}
      </ScrollView>
    </View>
  );

  const renderProgress = () => {
    const partStats = parts.map((part) => {
      const partWords = words.filter((word) => word.part === part);
      const done = partWords.filter((word) => state.memorized.includes(word.headword)).length;
      return { part, done, total: partWords.length, percent: Math.round((done / partWords.length) * 100) };
    });
    return <View style={styles.screen}>{renderHeader('Your progress')}<ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}><LinearGradient colors={[theme.heroStart, theme.heroEnd]} style={styles.progressHero}><Text style={styles.progressHeroLabel}>OVERALL MASTERY</Text><Text style={styles.progressHeroValue}>{Math.round((state.memorized.length / words.length) * 100)}%</Text><Text style={styles.progressHeroText}>{state.memorized.length} of {words.length} words memorized</Text></LinearGradient><View style={styles.progressMetrics}><View><Text style={styles.metricValue}>{state.sessions}</Text><Text style={styles.metricLabel}>Sessions</Text></View><View><Text style={styles.metricValue}>{state.correct}</Text><Text style={styles.metricLabel}>Correct</Text></View><View><Text style={styles.metricValue}>{state.bestStreak}</Text><Text style={styles.metricLabel}>Best streak</Text></View></View><SectionTitle title="Part mastery" eyebrow="Keep your momentum" />{partStats.map((item) => <View key={item.part} style={styles.progressRow}><View style={styles.progressRowTop}><Text style={styles.progressPart}>{item.part}</Text><Text style={styles.progressPercent}>{item.percent}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${item.percent}%` }]} /></View><Text style={styles.progressCaption}>{item.done} memorized of {item.total}</Text></View>)}<SectionTitle title="Weakness heatmap" eyebrow="Targeted revision" /><View style={styles.heatmap}>{partStats.map((item) => <Pressable key={item.part} onPress={() => startSession('quiz', item.part)} style={[styles.heatCell, { backgroundColor: item.percent > 70 ? '#65B8A6' : item.percent > 35 ? '#E5B65B' : '#D97880' }]}><Text style={styles.heatCellText}>{item.part.replace('Part ', '')}</Text></Pressable>)}</View></ScrollView></View>;
  };

  const renderPrevious = () => {
    const chunks: string[] = previousSource.split(/(?=Previous Years[’'] Questions Related to Part-\d+)/g).filter(Boolean);
    return (
      <View style={styles.screen}>
        {renderHeader('Previous year quiz')}
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.previousIntro}>
            <View style={styles.previousIcon}><Feather name="file-text" size={23} color={theme.primaryForeground} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previousTitle}>Board & admission questions</Text>
              <Text style={styles.previousText}>{previousQuestions.length} parsed questions with preposition-only options and answers revealed after each response.</Text>
            </View>
          </View>
          <Text style={styles.detailLabel}>Choose a part</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckRow}>
            {previousParts.map((part) => (
              <Pressable key={part} onPress={() => setPreviousPart(part)} style={[styles.deckChip, previousPart === part && styles.deckChipActive]}>
                <Text style={[styles.deckChipText, previousPart === part && styles.deckChipTextActive]}>{part}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ActionButton label={`Start ${previousPart} quiz · 25 random questions`} icon="play" onPress={() => startPreviousSession()} />
          <SectionTitle title="Source preview" eyebrow="Previous year questions" />
          <Text style={styles.rawSource}>{(chunks.find((chunk) => chunk.includes(`Part-${previousPart.replace('Part ', '')}`)) ?? chunks[0]).slice(0, 9000)}</Text>
        </ScrollView>
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.screen}>
      {renderHeader('Settings')}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}>
        <SectionTitle title="Make it yours" eyebrow="Personal study space" />
        <Text style={styles.inputLabel}>Your name</Text>
        <TextInput value={state.name} onChangeText={(name) => saveState({ name })} placeholder="Enter your name" placeholderTextColor={theme.mutedForeground} style={styles.textField} />
        <Text style={styles.inputLabel}>Theme colour</Text>
        <View style={styles.themeGrid}>
          {(Object.keys(colors.themes) as ThemeName[]).map((name) => (
            <Pressable key={name} onPress={() => saveState({ themeColor: name })} style={[styles.themeChoice, state.themeColor === name && styles.themeChoiceActive]}>
              <View style={[styles.themeSwatch, { backgroundColor: colors.themes[name].light.primary }]} />
              <Text style={styles.themeChoiceText}>{name === 'sky' ? 'Sky blue' : name === 'emerald' ? 'Emerald green' : name === 'amber' ? 'Amber' : 'Violet'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputLabel}>Appearance</Text>
        <View style={styles.modeRow}>
          {(['system', 'light', 'dark'] as ColorMode[]).map((mode) => (
            <Pressable key={mode} onPress={() => saveState({ colorMode: mode })} style={[styles.modeChoice, state.colorMode === mode && styles.modeChoiceActive]}>
              <Text style={[styles.modeChoiceText, state.colorMode === mode && styles.modeChoiceTextActive]}>{mode[0].toUpperCase() + mode.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Daily practice goal</Text><Text style={styles.settingDescription}>{state.dailyGoal} minutes each day</Text></View><View style={styles.goalControls}><IconButton icon="minus" color={theme.primary} onPress={() => saveState({ dailyGoal: Math.max(5, state.dailyGoal - 5) })} accessibilityLabel="Decrease daily goal" /><Text style={styles.goalValue}>{state.dailyGoal}</Text><IconButton icon="plus" color={theme.primary} onPress={() => saveState({ dailyGoal: Math.min(60, state.dailyGoal + 5) })} accessibilityLabel="Increase daily goal" /></View></View>
        <View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Sound and haptics</Text><Text style={styles.settingDescription}>Gentle feedback while you practice</Text></View><Switch value={state.sound} onValueChange={(sound) => saveState({ sound })} trackColor={{ false: theme.border, true: theme.primary }} /></View>
        <View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Daily reminder</Text><Text style={styles.settingDescription}>Practice at 10:00 PM local time</Text></View><Switch value={state.notifications} onValueChange={(notifications) => saveState({ notifications })} trackColor={{ false: theme.border, true: theme.primary }} /></View>
        <View style={styles.integrityBanner}><Feather name="database" size={17} color={theme.primary} /><Text style={styles.integrityText}>Offline bundle: {words.length} workbook entries and the full previous-year source are stored on this device.</Text></View>
        <ActionButton label="Reset local progress" icon="trash-2" secondary onPress={() => Alert.alert('Reset progress?', 'This clears memorized words, bookmarks, scores and mistakes on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => setState(initialState) }])} />
      </ScrollView>
    </View>
  );

  const renderSession = (mode: 'quiz' | 'exam') => {
    if (!currentQuestion) return null;
    if (reviewing) {
      const wrong = questions.filter((question, index) => answers[index] !== question.correct);
      const totalCorrect = questions.length - wrong.length;
      return <View style={styles.screen}>{renderHeader(sessionLabel)}<ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}><View style={styles.resultCircle}><Text style={styles.resultValue}>{Math.round((totalCorrect / questions.length) * 100)}%</Text><Text style={styles.resultLabel}>{totalCorrect} / {questions.length} correct</Text></View><Text style={styles.resultTitle}>{totalCorrect === questions.length ? 'Perfect recall.' : 'Good work. Review and return stronger.'}</Text><ActionButton label="Back to home" icon="home" onPress={() => setView('home')} />{wrong.length > 0 && <><SectionTitle title="Review mistakes" eyebrow={`${wrong.length} to revisit`} />{wrong.map((question, index) => <View key={`${question.sourceRow}-${index}`} style={styles.reviewCard}><Text style={styles.reviewQuestion}>{question.sentence.replace(question.preposition, '____')}</Text><Text style={styles.reviewAnswer}>Correct: {question.correct}</Text><Text style={styles.reviewMeaning}>{question.meaning}</Text><Text style={styles.reviewSentence}>{question.sentence}</Text>{question.source && <Text style={styles.reviewSource}>{question.source}</Text>}</View>)}</>}</ScrollView></View>;
    }
    const picked = answers[questionIndex];
     return <View style={styles.screen}>{renderHeader(sessionLabel)}<ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}><View style={styles.questionTop}><Text style={styles.questionCount}>{questionIndex + 1} / {questions.length}</Text><Text style={styles.questionScore}>{Object.values(answers).filter((answer, index) => answer === questions[index]?.correct).length} correct</Text></View><View style={styles.questionProgressTrack}><View style={[styles.progressFill, { width: `${((questionIndex + 1) / questions.length) * 100}%` }]} /></View><View style={styles.questionCard}><View style={styles.questionTag}><Text style={styles.questionTagText}>{currentQuestion.part}</Text></View><Text style={styles.questionSentence}>{currentQuestion.sentence.replace(currentQuestion.preposition, '____')}</Text>{mode === 'quiz' && <Text style={styles.questionMeaning}>{currentQuestion.meaning}</Text>}{currentQuestion.source && <Text style={styles.questionSource}>{currentQuestion.source}</Text>}</View><Text style={styles.chooseText}>Choose the appropriate preposition</Text><View style={styles.options}>{currentQuestion.options.map((option, index) => { const isPicked = picked === option; const isCorrect = option === currentQuestion.correct; return <Pressable key={`${option}-${index}`} onPress={() => handleAnswer(option)} style={[styles.option, isPicked && (isCorrect ? styles.optionCorrect : styles.optionWrong), picked && isCorrect && styles.optionCorrect]}><View style={[styles.optionLetter, isPicked && { backgroundColor: isCorrect ? palette.accentForeground : palette.destructive }]}><Text style={[styles.optionLetterText, isPicked && { color: palette.primaryForeground }]}>{String.fromCharCode(65 + index)}</Text></View><Text style={styles.optionText}>{option}</Text>{picked && isCorrect && <Feather name="check" size={18} color={palette.accentForeground} />}{picked && isPicked && !isCorrect && <Feather name="x" size={18} color={palette.destructive} />}</Pressable>; })}</View>{picked && <View style={[styles.explanation, picked === currentQuestion.correct ? styles.explanationCorrect : styles.explanationWrong]}><Feather name={picked === currentQuestion.correct ? 'check-circle' : 'info'} size={18} color={picked === currentQuestion.correct ? palette.accentForeground : palette.destructive} /><View style={{ flex: 1 }}><Text style={styles.explanationTitle}>{picked === currentQuestion.correct ? 'Correct answer' : 'Answer details'}</Text><Text style={styles.explanationText}>Correct option: “{currentQuestion.correct}”. {currentQuestion.explanation ?? `${currentQuestion.headword} takes “${currentQuestion.correct}”. ${currentQuestion.meaning}`}</Text></View></View>}{picked && <ActionButton label={questionIndex === questions.length - 1 ? 'See results' : 'Next question'} icon={questionIndex === questions.length - 1 ? 'award' : 'arrow-right'} onPress={() => questionIndex === questions.length - 1 ? finishSession() : setQuestionIndex((current) => current + 1)} />}</ScrollView></View>;
  };

  if (!state || !words.length) return <SafeAreaView style={styles.loading}><ActivityIndicator color={theme.primary} /></SafeAreaView>;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {view === 'home' && renderHome()}
      {view === 'dictionary' && renderDictionary()}
      {view === 'flashcards' && renderFlashcards()}
      {view === 'progress' && renderProgress()}
      {view === 'previous' && renderPrevious()}
      {view === 'settings' && renderSettings()}
      {view === 'quiz' && renderSession('quiz')}
      {view === 'exam' && renderSession('exam')}
      <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={() => setModal(null)}><Pressable style={styles.modalBackdrop} onPress={() => setModal(null)}><View style={[styles.modalSheet, { paddingBottom: insets.bottom + 18 }]}><Text style={styles.modalTitle}>{modal === 'part' ? 'Choose a part' : 'Choose a practice mode'}</Text>{(modal === 'part' ? parts : ['Quiz', 'Mock exam', 'Full mock exam']).map((item) => <Pressable key={item} onPress={() => { setModal(null); if (modal === 'part') setActivePart(item); else if (item === 'Quiz') startSession('quiz', activePart); else if (item === 'Mock exam') startSession('exam', activePart); else startSession('exam', activePart, true); }} style={styles.modalItem}><Text style={styles.modalItemText}>{item}</Text><Feather name="chevron-right" size={18} color={theme.mutedForeground} /></Pressable>)}</View></Pressable></Modal>
    </SafeAreaView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
  header: { minHeight: 68, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.background },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.foreground, letterSpacing: -0.3 },
  logoMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 13, color: palette.mutedForeground, marginBottom: 5 },
  title: { fontSize: 32, lineHeight: 36, color: palette.foreground, fontWeight: '800', letterSpacing: -1.2 },
  titleAccent: { color: palette.primary },
  subtitle: { color: palette.mutedForeground, fontSize: 15, lineHeight: 22, marginTop: 7, marginBottom: 20 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sessionCard: { borderRadius: 24, padding: 20, overflow: 'hidden', marginBottom: 14, shadowColor: '#0A1B34', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  sessionGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, right: -45, top: -70, backgroundColor: 'rgba(255,255,255,0.09)' },
  sessionCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sessionBadgeText: { color: '#B9E9E0', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  sessionWord: { color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '800', marginTop: 17 },
  sessionPrep: { color: '#F7C96B', fontSize: 18, fontWeight: '700', marginTop: 2 },
  sessionMeaning: { color: '#D4EBF1', fontSize: 15, marginTop: 8 },
  sessionSentence: { color: '#B9D4DE', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginTop: 12 },
  sessionActions: { flexDirection: 'row', gap: 9, marginTop: 17 },
  lightPill: { backgroundColor: '#D9F1EC', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', gap: 7, alignItems: 'center' },
  lightPillText: { color: '#123A51', fontSize: 12, fontWeight: '700' },
  ghostPill: { borderColor: 'rgba(213,244,239,0.4)', borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', gap: 7, alignItems: 'center' },
  ghostPillText: { color: '#D5F4EF', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  statBox: { flex: 1, borderRadius: 17, paddingVertical: 13, paddingHorizontal: 12, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  statValue: { fontSize: 21, fontWeight: '800', color: palette.foreground },
  statLabel: { fontSize: 11, color: palette.mutedForeground, marginTop: 2 },
  sectionTitle: { marginBottom: 12, marginTop: 5 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: '800', color: palette.primary, marginBottom: 5 },
  sectionHeading: { fontSize: 21, fontWeight: '800', color: palette.foreground, letterSpacing: -0.4 },
  partsGrid: { gap: 9, marginBottom: 28 },
  partCard: { minHeight: 67, borderRadius: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, padding: 11, flexDirection: 'row', alignItems: 'center' },
  partNumber: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: palette.secondary },
  partNumberText: { fontSize: 13, fontWeight: '800', color: palette.primary },
  partInfo: { flex: 1, marginLeft: 11 },
  partName: { fontSize: 14, fontWeight: '800', color: palette.foreground },
  partCount: { color: palette.mutedForeground, fontSize: 11, marginTop: 2 },
  partButtons: { flexDirection: 'row', gap: 6 },
  partAction: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: palette.secondary, flexDirection: 'row', alignItems: 'center', gap: 4 },
  partMockAction: { backgroundColor: palette.accent },
  partActionText: { color: palette.primary, fontSize: 11, fontWeight: '800' },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  toolCard: { width: '48.2%', minHeight: 130, borderRadius: 18, padding: 14, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 },
  toolIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  toolTitle: { color: palette.foreground, fontWeight: '800', fontSize: 14 },
  toolText: { color: palette.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4, paddingRight: 5 },
  toolArrow: { position: 'absolute', right: 13, top: 15 },
  integrityBanner: { backgroundColor: palette.secondary, borderRadius: 15, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 14 },
  integrityText: { color: palette.secondaryForeground, fontSize: 12, lineHeight: 18, flex: 1 },
  actionButton: { minHeight: 49, borderRadius: 16, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 9 },
  primaryButton: { backgroundColor: palette.primary },
  secondaryButton: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  compactButton: { minHeight: 43, flex: 1, marginTop: 0 },
  actionText: { color: palette.primaryForeground, fontSize: 14, fontWeight: '800' },
  secondaryActionText: { color: palette.primary },
  searchWrap: { marginHorizontal: 18, height: 49, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, color: palette.foreground, fontSize: 14 },
  filterRow: { paddingHorizontal: 19, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between' },
  resultText: { color: palette.mutedForeground, fontSize: 12 },
  clearText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  wordCard: { borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card },
  compactWordCard: { padding: 13 },
  wordCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partPill: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: palette.accent },
  partPillText: { color: palette.accentForeground, fontSize: 10, fontWeight: '800' },
  wordActions: { flexDirection: 'row', gap: 2 },
  headword: { color: palette.foreground, fontWeight: '800', fontSize: 19, marginTop: 12 },
  preposition: { color: palette.primary, fontWeight: '800', fontSize: 14, marginTop: 3 },
  meaning: { color: palette.mutedForeground, fontSize: 13, marginTop: 5 },
  sentence: { color: palette.foreground, fontSize: 13, lineHeight: 20, marginTop: 12, fontStyle: 'italic' },
  deckRow: { gap: 8, paddingBottom: 17 },
  deckChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 15, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, marginRight: 7 },
  deckChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  deckChipText: { color: palette.mutedForeground, fontSize: 12, fontWeight: '700' },
  deckChipTextActive: { color: palette.primaryForeground },
  flashCounter: { textAlign: 'center', color: palette.mutedForeground, fontSize: 12, marginBottom: 10 },
  flashCard: { borderRadius: 24, overflow: 'hidden', minHeight: 380, shadowColor: '#0A1B34', shadowOpacity: 0.16, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  flashCardPressable: { flex: 1 },
  flashCardGradient: { flex: 1, minHeight: 380, alignItems: 'center', justifyContent: 'center', padding: 25 },
  flashHint: { color: '#AFDDE0', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 17 },
  flashHeadword: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', textAlign: 'center' },
  flashMeaning: { color: '#C9EBE4', fontSize: 17, marginTop: 18, textAlign: 'center' },
  flashSentence: { color: '#C0D6E0', fontSize: 14, lineHeight: 22, fontStyle: 'italic', textAlign: 'center', marginTop: 18 },
  flashDetails: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, marginTop: 12 },
  detailLabel: { color: palette.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  detailText: { color: palette.foreground, fontSize: 14, lineHeight: 20 },
  flashControls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  swipeHint: { textAlign: 'center', color: palette.mutedForeground, fontSize: 11, marginTop: 10 },
  emptyState: { padding: 50, alignItems: 'center' },
  emptyTitle: { fontWeight: '800', color: palette.foreground, fontSize: 17, marginTop: 15 },
  emptyText: { color: palette.mutedForeground, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  progressHero: { borderRadius: 24, padding: 23, marginBottom: 12 },
  progressHeroLabel: { color: '#B9E9E0', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  progressHeroValue: { color: '#FFFFFF', fontSize: 48, lineHeight: 56, fontWeight: '800', marginTop: 6 },
  progressHeroText: { color: '#C8E0E4', fontSize: 13 },
  progressMetrics: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: palette.border, marginBottom: 22 },
  metricValue: { color: palette.foreground, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  metricLabel: { color: palette.mutedForeground, fontSize: 11, marginTop: 3, textAlign: 'center' },
  progressRow: { marginBottom: 15 },
  progressRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPart: { color: palette.foreground, fontWeight: '700', fontSize: 13 },
  progressPercent: { color: palette.primary, fontWeight: '800', fontSize: 13 },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: palette.secondary, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: palette.accentForeground },
  progressCaption: { color: palette.mutedForeground, fontSize: 10, marginTop: 5 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20 },
  heatCell: { width: 47, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heatCellText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  previousIntro: { padding: 15, borderRadius: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', gap: 12, marginBottom: 12 },
  previousIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  previousTitle: { color: palette.foreground, fontSize: 15, fontWeight: '800' },
  previousText: { color: palette.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 4 },
  previousFilter: { marginTop: 24, marginBottom: 12 },
  rawSource: { color: palette.foreground, fontSize: 12, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inputLabel: { color: palette.foreground, fontWeight: '700', fontSize: 13, marginBottom: 7 },
  textField: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 15, height: 50, paddingHorizontal: 14, color: palette.foreground, marginBottom: 12 },
  settingRow: { paddingVertical: 17, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.border },
  settingTitle: { color: palette.foreground, fontWeight: '800', fontSize: 14 },
  settingDescription: { color: palette.mutedForeground, fontSize: 12, marginTop: 4 },
  goalControls: { flexDirection: 'row', alignItems: 'center' },
  goalValue: { color: palette.foreground, fontSize: 16, fontWeight: '800', width: 26, textAlign: 'center' },
  questionTop: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  questionCount: { color: palette.foreground, fontWeight: '800', fontSize: 13 },
  questionScore: { color: palette.accentForeground, fontWeight: '800', fontSize: 13 },
  questionProgressTrack: { height: 7, backgroundColor: palette.secondary, borderRadius: 4, marginTop: 10, marginBottom: 19, overflow: 'hidden' },
  questionCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 21, padding: 20 },
  questionTag: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: palette.accent },
  questionTagText: { color: palette.accentForeground, fontSize: 10, fontWeight: '800' },
  questionSentence: { color: palette.foreground, fontSize: 20, lineHeight: 30, fontWeight: '700', marginTop: 17 },
  questionMeaning: { color: palette.mutedForeground, fontSize: 13, marginTop: 15 },
  questionSource: { color: palette.primary, fontSize: 11, lineHeight: 17, marginTop: 12, fontWeight: '700' },
  chooseText: { color: palette.mutedForeground, fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 9 },
  options: { gap: 9 },
  option: { minHeight: 54, borderRadius: 15, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 11 },
  optionCorrect: { borderColor: palette.accentForeground, backgroundColor: palette.accent },
  optionWrong: { borderColor: palette.destructive, backgroundColor: palette.card },
  optionLetter: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.secondary },
  optionLetterText: { color: palette.foreground, fontSize: 12, fontWeight: '800' },
  optionText: { color: palette.foreground, fontSize: 14, fontWeight: '700', flex: 1 },
  explanation: { marginTop: 14, padding: 14, borderRadius: 16, flexDirection: 'row', gap: 10 },
  explanationCorrect: { backgroundColor: palette.accent },
  explanationWrong: { backgroundColor: palette.secondary },
  explanationTitle: { color: palette.secondaryForeground, fontWeight: '800', fontSize: 13 },
  explanationText: { color: palette.secondaryForeground, fontSize: 12, lineHeight: 18, marginTop: 4 },
  resultCircle: { width: 150, height: 150, borderRadius: 75, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 28 },
  resultValue: { color: palette.accentForeground, fontSize: 34, fontWeight: '800' },
  resultLabel: { color: palette.accentForeground, fontSize: 11, fontWeight: '700', marginTop: 2 },
  resultTitle: { color: palette.foreground, fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 17, marginBottom: 10 },
  reviewCard: { borderRadius: 17, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, padding: 14, marginBottom: 9 },
  reviewQuestion: { color: palette.foreground, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  reviewAnswer: { color: palette.accentForeground, fontWeight: '800', fontSize: 12, marginTop: 8 },
  reviewMeaning: { color: palette.mutedForeground, fontSize: 12, marginTop: 4 },
  reviewSentence: { color: palette.foreground, fontStyle: 'italic', fontSize: 12, lineHeight: 18, marginTop: 7 },
  reviewSource: { color: palette.primary, fontSize: 11, fontWeight: '700', marginTop: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11, 24, 44, 0.42)' },
  modalSheet: { backgroundColor: palette.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 18 },
  modalTitle: { color: palette.foreground, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalItem: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalItemText: { color: palette.foreground, fontSize: 15, fontWeight: '700' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 16 },
  themeChoice: { width: '48%', minHeight: 53, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, flexDirection: 'row', alignItems: 'center', gap: 9 },
  themeChoiceActive: { borderColor: palette.primary, backgroundColor: palette.accent },
  themeSwatch: { width: 26, height: 26, borderRadius: 13 },
  themeChoiceText: { color: palette.foreground, fontSize: 12, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeChoice: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: palette.border, paddingVertical: 10, alignItems: 'center', backgroundColor: palette.card },
  modeChoiceActive: { borderColor: palette.primary, backgroundColor: palette.primary },
  modeChoiceText: { color: palette.mutedForeground, fontSize: 12, fontWeight: '700' },
  modeChoiceTextActive: { color: palette.primaryForeground },
  });
}