/**
 * Brain-mapping data layer.
 *
 * Turns a user's focus sessions into a set of "lit" brain regions, grouped into
 * plain-language functional groups for the general public, with the underlying
 * anatomical regions available for a detailed view.
 *
 * Pure and deterministic: same input always produces the same output (no
 * Math.random, no reads of the current time except the caller-supplied `now`),
 * so it can be unit-tested and safely memoized.
 */

// ============================================================
// Types
// ============================================================

/** A raw focus session as returned by `api.focusSessions.list` (Convex). */
export interface FocusSessionInput {
  startTime?: string; // ISO timestamp
  endTime?: string;
  durationSeconds?: number;
  subject?: string;
  taskId?: string;
  status?: string;
}

/** A task as returned by `api.tasks.list` (Convex). */
export interface TaskInput {
  _id?: string;
  id?: string;
  title?: string;
  category?: string;
}

export interface BrainDataInput {
  sessions?: FocusSessionInput[];
  tasks?: TaskInput[];
}

/** One of the twelve anatomical regions. */
export interface Brain3DRegion {
  id: string;
  name: string;
  groupId: string;
  position: { x: number; y: number; z: number };
  activity: number; // 0-1
  color: string;
  studyMinutes: number;
  lastActive: string; // human-readable, "" when never
  description: string;
}

/** A plain-language functional group shown by default (the "core" view). */
export interface BrainGroup {
  id: string;
  name: string;
  tagline: string; // one-line, public-friendly
  description: string;
  color: string;
  icon: string; // Ionicons name
  activity: number; // 0-1, max over member regions
  studyMinutes: number;
  lastActive: string;
  subjects: string[]; // subjects that contributed, most-studied first
  regionIds: string[];
}

export interface BrainVisualization {
  groups: BrainGroup[];
  regions: Brain3DRegion[];
  topSubjects: { subject: string; minutes: number; groupId: string }[];
  totalMinutes: number;
  hasActivity: boolean;
}

// ============================================================
// Functional groups (public-facing) → anatomical regions
// ============================================================
//
// Colors are assigned per functional group so that everything belonging to the
// same group (its regions, its cards, its hotspots on the model) share one hue.

interface GroupDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
}

export const BRAIN_GROUPS: GroupDef[] = [
  {
    id: "focus_planning",
    name: "Focus & Planning",
    tagline: "Deciding, planning, staying on task",
    description:
      "Your brain's control center. It lights up when you plan, make decisions, hold information in mind, and push through distractions to stay focused.",
    color: "#4CAF50",
    icon: "compass",
  },
  {
    id: "math_logic",
    name: "Math & Logic",
    tagline: "Numbers, reasoning, problem-solving",
    description:
      "Handles numbers, step-by-step reasoning, and spatial problem-solving. Active during math, physics, coding, and anything that needs logical calculation.",
    color: "#2196F3",
    icon: "calculator",
  },
  {
    id: "language_reading",
    name: "Language & Reading",
    tagline: "Words, speech, writing",
    description:
      "The language network — understanding what you read and hear, and forming words when you write or speak. Active during reading, writing, and language study.",
    color: "#FF9800",
    icon: "chatbubbles",
  },
  {
    id: "memory",
    name: "Memory",
    tagline: "Forming and recalling what you learn",
    description:
      "Turns study sessions into lasting memories and helps you recall facts later. Central to memorization-heavy subjects like history and biology.",
    color: "#00BCD4",
    icon: "bookmark",
  },
  {
    id: "creativity_music",
    name: "Creativity & Music",
    tagline: "Patterns, rhythm, imagination",
    description:
      "Processes rhythm, melody, and creative pattern-making. Lights up during music practice, art, and open-ended creative work.",
    color: "#9C27B0",
    icon: "color-palette",
  },
  {
    id: "visual_learning",
    name: "Visual Learning",
    tagline: "Diagrams, images, spatial detail",
    description:
      "Your visual processor — makes sense of diagrams, charts, and images, and builds mental pictures. Active when you learn from visual material.",
    color: "#E91E63",
    icon: "eye",
  },
];

const GROUP_COLOR: Record<string, string> = Object.fromEntries(
  BRAIN_GROUPS.map((g) => [g.id, g.color]),
);

interface RegionDef {
  id: string;
  name: string;
  groupId: string;
  position: { x: number; y: number; z: number };
  description: string;
}

// Anatomical regions. `position` is a normalized coordinate (-1..1) used both to
// place hotspots on the 3D model and to lay out the detailed list.
export const BRAIN_3D_REGIONS: RegionDef[] = [
  {
    id: "prefrontal_cortex",
    name: "Prefrontal Cortex",
    groupId: "focus_planning",
    position: { x: 0, y: 0.8, z: 0.6 },
    description:
      "Executive function, decision-making, and working memory. Critical for planning and problem-solving.",
  },
  {
    id: "anterior_cingulate",
    name: "Anterior Cingulate",
    groupId: "focus_planning",
    position: { x: 0, y: 0.2, z: 0.5 },
    description:
      "Attention control, error-monitoring, and emotion regulation — helps you stay on task.",
  },
  {
    id: "left_parietal",
    name: "Left Parietal Lobe",
    groupId: "math_logic",
    position: { x: -0.7, y: 0.3, z: 0.2 },
    description:
      "Mathematical processing, numerical magnitude, and logical reasoning.",
  },
  {
    id: "right_parietal",
    name: "Right Parietal Lobe",
    groupId: "math_logic",
    position: { x: 0.7, y: 0.3, z: 0.2 },
    description:
      "Spatial reasoning, attention, and visual-spatial problem-solving.",
  },
  {
    id: "broca_area",
    name: "Broca's Area",
    groupId: "language_reading",
    position: { x: -0.6, y: 0.5, z: 0.4 },
    description:
      "Speech production, language formation, and verbal expression.",
  },
  {
    id: "wernicke_area",
    name: "Wernicke's Area",
    groupId: "language_reading",
    position: { x: -0.8, y: 0.1, z: 0.3 },
    description:
      "Language comprehension, understanding speech, and semantic processing.",
  },
  {
    id: "left_temporal",
    name: "Left Temporal Lobe",
    groupId: "language_reading",
    position: { x: -0.72, y: -0.22, z: 0.1 },
    description: "Auditory processing, verbal memory, and word meaning.",
  },
  {
    id: "hippocampus_left",
    name: "Left Hippocampus",
    groupId: "memory",
    position: { x: -0.4, y: -0.3, z: 0.0 },
    description:
      "Memory formation, learning consolidation, and spatial navigation.",
  },
  {
    id: "hippocampus_right",
    name: "Right Hippocampus",
    groupId: "memory",
    position: { x: 0.4, y: -0.3, z: 0.0 },
    description:
      "Memory formation, pattern recognition, and associative recall.",
  },
  {
    id: "right_temporal",
    name: "Right Temporal Lobe",
    groupId: "creativity_music",
    position: { x: 0.72, y: -0.22, z: 0.1 },
    description:
      "Musical processing, rhythm, and recognition of complex patterns.",
  },
  {
    id: "motor_cortex",
    name: "Motor Cortex",
    groupId: "creativity_music",
    position: { x: 0, y: 0.6, z: 0.2 },
    description:
      "Movement control and fine motor skills — engaged in music practice and hands-on work.",
  },
  {
    id: "occipital_lobe",
    name: "Occipital Lobe",
    groupId: "visual_learning",
    position: { x: 0, y: 0.1, z: -0.9 },
    description:
      "Visual processing — interpreting diagrams, charts, images, and written material.",
  },
];

const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(
  BRAIN_3D_REGIONS.map((r) => [r.id, r]),
);

const REGIONS_BY_GROUP: Record<string, string[]> = BRAIN_GROUPS.reduce(
  (acc, g) => {
    acc[g.id] = BRAIN_3D_REGIONS.filter((r) => r.groupId === g.id).map(
      (r) => r.id,
    );
    return acc;
  },
  {} as Record<string, string[]>,
);

// ============================================================
// Subject → regions mapping
// ============================================================
//
// Each subject lights a primary region (weight 1.0) plus supporting regions
// (weights below). Weights let a subject contribute strongly to its core region
// and partially to related ones, so the model shows a realistic spread.

interface SubjectMap {
  regions: { id: string; weight: number }[];
}

const SUBJECT_REGION_MAP: Record<string, SubjectMap> = {
  Math: {
    regions: [
      { id: "left_parietal", weight: 1.0 },
      { id: "prefrontal_cortex", weight: 0.6 },
      { id: "anterior_cingulate", weight: 0.35 },
    ],
  },
  Science: {
    regions: [
      { id: "occipital_lobe", weight: 1.0 },
      { id: "left_parietal", weight: 0.6 },
      { id: "prefrontal_cortex", weight: 0.35 },
    ],
  },
  Physics: {
    regions: [
      { id: "left_parietal", weight: 1.0 },
      { id: "occipital_lobe", weight: 0.6 },
      { id: "prefrontal_cortex", weight: 0.35 },
    ],
  },
  Chemistry: {
    regions: [
      { id: "occipital_lobe", weight: 1.0 },
      { id: "left_parietal", weight: 0.6 },
      { id: "hippocampus_left", weight: 0.35 },
    ],
  },
  Biology: {
    regions: [
      { id: "occipital_lobe", weight: 1.0 },
      { id: "hippocampus_left", weight: 0.6 },
      { id: "left_temporal", weight: 0.35 },
    ],
  },
  History: {
    regions: [
      { id: "hippocampus_left", weight: 1.0 },
      { id: "hippocampus_right", weight: 0.6 },
      { id: "left_temporal", weight: 0.35 },
    ],
  },
  Language: {
    regions: [
      { id: "broca_area", weight: 1.0 },
      { id: "wernicke_area", weight: 0.7 },
      { id: "left_temporal", weight: 0.5 },
    ],
  },
  Art: {
    regions: [
      { id: "right_parietal", weight: 1.0 },
      { id: "occipital_lobe", weight: 0.6 },
      { id: "right_temporal", weight: 0.35 },
    ],
  },
  Music: {
    regions: [
      { id: "right_temporal", weight: 1.0 },
      { id: "motor_cortex", weight: 0.6 },
      { id: "anterior_cingulate", weight: 0.35 },
    ],
  },
  Programming: {
    regions: [
      { id: "left_parietal", weight: 1.0 },
      { id: "prefrontal_cortex", weight: 0.6 },
      { id: "occipital_lobe", weight: 0.35 },
    ],
  },
  Psychology: {
    regions: [
      { id: "prefrontal_cortex", weight: 1.0 },
      { id: "anterior_cingulate", weight: 0.6 },
      { id: "hippocampus_left", weight: 0.35 },
    ],
  },
  Economics: {
    regions: [
      { id: "left_parietal", weight: 1.0 },
      { id: "prefrontal_cortex", weight: 0.6 },
      { id: "anterior_cingulate", weight: 0.35 },
    ],
  },
  Geography: {
    regions: [
      { id: "right_parietal", weight: 1.0 },
      { id: "hippocampus_right", weight: 0.6 },
      { id: "occipital_lobe", weight: 0.35 },
    ],
  },
  General: {
    regions: [
      { id: "prefrontal_cortex", weight: 1.0 },
      { id: "hippocampus_left", weight: 0.4 },
    ],
  },
};

// Keyword rules for classifying a free-text task title.
//
// Matching is word-anchored, never a raw substring: a bare `includes("art")`
// also fires on "start", "chart", "quarterly" and "departments", and
// `includes("cs ")` fires on "economi[cs ]". Rule kinds:
//   word   — token equals the value exactly ("art", not "start")
//   prefix — token starts with the value ("read" hits "reading", not "already")
//   sub    — substring of the whole text; only for stems that appear mid-word
//            ("econ" must still match "microeconomics")
//   phrase — multi-word phrase, checked against the whole text
//
// Weights separate what is being studied from how. Subject nouns score 3; a
// generic study verb scores 1, so "Intro to Psychology reading" is Psychology,
// not Language.
type RuleKind = "word" | "prefix" | "sub" | "phrase";

interface Rule {
  kind: RuleKind;
  value: string;
  weight: number;
}

const subject = (name: string, rules: Rule[]) => ({ subject: name, rules });
const w = (value: string, weight = 3): Rule => ({
  kind: "word",
  value,
  weight,
});
const p = (value: string, weight = 3): Rule => ({
  kind: "prefix",
  value,
  weight,
});
const s = (value: string, weight = 3): Rule => ({ kind: "sub", value, weight });
const ph = (value: string, weight = 4): Rule => ({
  kind: "phrase",
  value,
  weight,
});

// Order matters only for ties: earlier subjects win an equal score.
const SUBJECT_RULES = [
  subject("Math", [
    p("math"),
    p("algebra"),
    p("calculus"),
    w("calc"),
    p("geometr"),
    p("trigonometr"),
    p("statistic"),
    p("arithmetic"),
    p("equation"),
    p("derivative"),
    p("integral"),
    ph("number theory"),
  ]),
  subject("Physics", [
    p("physic"),
    p("mechanic"),
    p("thermodynamic"),
    p("momentum"),
    p("kinematic"),
  ]),
  subject("Chemistry", [
    p("chem"),
    p("molecul"),
    p("stoichiometr"),
    p("titration"),
    ph("periodic table"),
  ]),
  subject("Biology", [
    p("biolog"), // deliberately not "bio" — that also matches "biography"
    p("anatomy"),
    p("genetic"),
    p("ecolog"),
    p("physiolog"),
    p("photosynthes"),
    w("cell"),
  ]),
  subject("Science", [
    p("science"),
    p("scientific"),
    w("lab", 2),
    p("experiment", 2),
  ]),
  subject("History", [
    p("histor"),
    p("biograph"),
    p("civiliz"),
    p("revolution"),
    p("ancient"),
    w("war"),
    w("ww1"),
    w("ww2"),
  ]),
  subject("Language", [
    p("english"),
    p("spanish"),
    p("french"),
    p("german"),
    p("latin"),
    p("mandarin"),
    p("language"),
    p("essay"),
    p("grammar"),
    p("vocab"),
    p("literature"),
    p("poetry"),
    p("read", 1), // a study verb, not a subject
    p("writ", 1),
  ]),
  subject("Programming", [
    p("program"),
    p("python"),
    p("javascript"),
    p("algorithm"),
    w("java"),
    w("code"),
    w("coding"),
    w("cs"),
    p("software"),
    ph("computer science"),
  ]),
  subject("Art", [
    w("art"), // exact word: never "start", "chart", "smart", "quarterly"
    p("artist"),
    p("draw"),
    p("paint"),
    p("sketch"),
    p("sculpt"),
  ]),
  subject("Music", [
    p("music"),
    p("piano"),
    p("guitar"),
    p("violin"),
    p("compos"),
    p("rhythm"),
    ph("music theory"), // "theory" alone would steal "number theory"
  ]),
  subject("Psychology", [p("psych"), p("cognit"), p("behavio")]),
  subject("Economics", [
    s("econ"), // substring: must still hit "microeconomics"
    p("finance"),
    p("financial"),
    ph("game theory"),
  ]),
  subject("Geography", [
    p("geograph"),
    p("climate"),
    p("terrain"),
    p("cartograph"),
    w("map"), // exact word: never "roadmap"
    w("maps"),
  ]),
];

const CANONICAL_SUBJECTS = new Set(Object.keys(SUBJECT_REGION_MAP));

/**
 * Map free text (a session subject, task title, or category) to a canonical
 * subject key. Returns "General" when nothing matches confidently.
 */
export function classifySubject(raw: string | undefined | null): string {
  if (!raw) return "General";

  const text = raw.toLowerCase().trim();

  // A session's own subject field is usually already canonical.
  for (const key of CANONICAL_SUBJECTS) {
    if (text === key.toLowerCase()) return key;
  }

  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return "General";

  let bestSubject = "General";
  let bestScore = 0;

  for (const { subject: name, rules } of SUBJECT_RULES) {
    let score = 0;
    for (const rule of rules) {
      let hit = false;
      switch (rule.kind) {
        case "word":
          hit = tokens.includes(rule.value);
          break;
        case "prefix":
          hit = tokens.some((token) => token.startsWith(rule.value));
          break;
        case "sub":
          hit = text.includes(rule.value);
          break;
        case "phrase":
          hit = text.includes(rule.value);
          break;
      }
      if (hit) score += rule.weight;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSubject = name;
    }
  }

  return bestSubject;
}

// ============================================================
// Time helpers
// ============================================================

const WINDOW_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatRelative(from: number, now: number): string {
  const diffMs = now - from;
  if (diffMs < 0) return "just now";
  const mins = Math.round(diffMs / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ============================================================
// Main generator
// ============================================================

interface RegionAccumulator {
  weightedMinutes: number; // Σ (subjectMinutes × regionWeight)
  rawMinutes: number; // Σ subjectMinutes touching this region
  lastActive: number; // epoch ms, 0 if never
  subjects: Map<string, number>; // subject → minutes
}

interface GenerateOptions {
  /** Current time in epoch ms. Defaults to Date.now(); pass explicitly in tests. */
  now?: number;
}

/**
 * Build the full brain visualization from user study data.
 * Only sessions within the trailing 28-day window are counted.
 */
export function generateBrainVisualizationData(
  data: BrainDataInput | null | undefined,
  options: GenerateOptions = {},
): BrainVisualization {
  const now = options.now ?? Date.now();
  const windowStart = now - WINDOW_DAYS * MS_PER_DAY;

  const sessions = data?.sessions ?? [];
  const tasks = data?.tasks ?? [];

  // Index tasks so a session's taskId can resolve to a title/category.
  const taskById = new Map<string, TaskInput>();
  for (const task of tasks) {
    const key = task._id ?? task.id;
    if (key) taskById.set(key, task);
  }

  // 1) Aggregate study minutes per subject within the window.
  const subjectMinutes = new Map<string, number>();
  const subjectLastActive = new Map<string, number>();

  for (const session of sessions) {
    if (session.status && session.status !== "completed") continue;

    const startMs = session.startTime ? Date.parse(session.startTime) : NaN;
    if (!Number.isFinite(startMs) || startMs < windowStart) continue;

    // Guard NaN explicitly: `NaN <= 0` is false, so a single corrupt row would
    // otherwise poison every downstream total.
    const rawMinutes = (session.durationSeconds ?? 0) / 60;
    if (!Number.isFinite(rawMinutes) || rawMinutes <= 0) continue;
    const minutes = rawMinutes;

    // Prefer the session's own subject; fall back to its linked task.
    const linkedTask = session.taskId
      ? taskById.get(session.taskId)
      : undefined;
    const rawSignal =
      session.subject || linkedTask?.title || linkedTask?.category || "General";
    const subject = classifySubject(rawSignal);

    subjectMinutes.set(subject, (subjectMinutes.get(subject) ?? 0) + minutes);
    const prevLast = subjectLastActive.get(subject) ?? 0;
    if (startMs > prevLast) subjectLastActive.set(subject, startMs);
  }

  // 2) Distribute subject minutes onto anatomical regions by weight.
  const regionAcc = new Map<string, RegionAccumulator>();
  for (const region of BRAIN_3D_REGIONS) {
    regionAcc.set(region.id, {
      weightedMinutes: 0,
      rawMinutes: 0,
      lastActive: 0,
      subjects: new Map(),
    });
  }

  for (const [subject, minutes] of subjectMinutes) {
    const map = SUBJECT_REGION_MAP[subject] ?? SUBJECT_REGION_MAP.General;
    const lastActive = subjectLastActive.get(subject) ?? 0;
    for (const { id, weight } of map.regions) {
      const acc = regionAcc.get(id);
      if (!acc) continue;
      acc.weightedMinutes += minutes * weight;
      acc.rawMinutes += minutes;
      if (lastActive > acc.lastActive) acc.lastActive = lastActive;
      acc.subjects.set(subject, (acc.subjects.get(subject) ?? 0) + minutes);
    }
  }

  // 3) Normalize activity. Scale relative to the busiest region so the top area
  //    reads as fully "lit" while quieter ones stay proportionally dimmer.
  const maxWeighted = Math.max(
    1,
    ...Array.from(regionAcc.values()).map((a) => a.weightedMinutes),
  );

  const regions: Brain3DRegion[] = BRAIN_3D_REGIONS.map((def) => {
    const acc = regionAcc.get(def.id)!;
    const activity =
      acc.weightedMinutes > 0
        ? Math.min(1, acc.weightedMinutes / maxWeighted)
        : 0;
    return {
      id: def.id,
      name: def.name,
      groupId: def.groupId,
      position: def.position,
      activity,
      color: GROUP_COLOR[def.groupId],
      studyMinutes: Math.round(acc.rawMinutes),
      lastActive: acc.lastActive ? formatRelative(acc.lastActive, now) : "",
      description: def.description,
    };
  });

  const regionById = new Map(regions.map((r) => [r.id, r]));

  // 4) Roll regions up into functional groups.
  const groups: BrainGroup[] = BRAIN_GROUPS.map((def) => {
    const memberIds = REGIONS_BY_GROUP[def.id] ?? [];
    const members = memberIds
      .map((id) => regionById.get(id))
      .filter((r): r is Brain3DRegion => Boolean(r));

    const activity = members.reduce((m, r) => Math.max(m, r.activity), 0);

    // A subject lights several regions inside one group (English touches Broca's,
    // Wernicke's AND the temporal lobe), and each of those regions records the
    // subject's FULL minutes. Summing the regions would report 3x the real study
    // time, so take each subject's minutes once.
    const subjectTotals = new Map<string, number>();
    let lastActiveMs = 0;
    for (const id of memberIds) {
      const acc = regionAcc.get(id);
      if (!acc) continue;
      if (acc.lastActive > lastActiveMs) lastActiveMs = acc.lastActive;
      for (const [subjectName, mins] of acc.subjects) {
        const prev = subjectTotals.get(subjectName) ?? 0;
        if (mins > prev) subjectTotals.set(subjectName, mins);
      }
    }

    const studyMinutes = Math.round(
      Array.from(subjectTotals.values()).reduce((sum, m) => sum + m, 0),
    );

    // "General" is real study time, but it is not a subject worth naming.
    const subjects = Array.from(subjectTotals.entries())
      .filter(([subjectName]) => subjectName !== "General")
      .sort((a, b) => b[1] - a[1])
      .map(([subjectName]) => subjectName);

    return {
      id: def.id,
      name: def.name,
      tagline: def.tagline,
      description: def.description,
      color: def.color,
      icon: def.icon,
      activity,
      studyMinutes,
      lastActive: lastActiveMs ? formatRelative(lastActiveMs, now) : "",
      subjects,
      regionIds: memberIds,
    };
  });

  // 5) Top subjects overall (for the "past 4 weeks" summary).
  const topSubjects = Array.from(subjectMinutes.entries())
    .filter(([subject]) => subject !== "General")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subject, minutes]) => {
      const map = SUBJECT_REGION_MAP[subject] ?? SUBJECT_REGION_MAP.General;
      const primaryRegionId = map.regions[0]?.id;
      const groupId = primaryRegionId
        ? (REGION_BY_ID[primaryRegionId]?.groupId ?? "focus_planning")
        : "focus_planning";
      return { subject, minutes: Math.round(minutes), groupId };
    });

  const totalMinutes = Math.round(
    Array.from(subjectMinutes.values()).reduce((s, m) => s + m, 0),
  );

  return {
    groups,
    regions,
    topSubjects,
    totalMinutes,
    hasActivity: totalMinutes > 0,
  };
}
