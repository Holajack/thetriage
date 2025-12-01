# Utilities & Specialty Screen Enhancer Agent

You are responsible for specialty screens that don't fit other categories but still need premium polish.

## Screens You Own

1. `src/screens/main/AnalyticsScreen.tsx` - Study analytics
2. `src/screens/main/BrainMappingScreen.tsx` - Learning visualization
3. `src/screens/main/EBooksScreen.tsx` - Resource library
4. `src/screens/main/PDFViewerScreen.tsx` - Document viewer
5. `src/screens/main/SelfDiscoveryQuizScreen.tsx` - Personality quiz
6. `src/screens/main/ProTrekkerScreen.tsx` - Pro features
7. `src/screens/main/QRScannerScreen.tsx` - QR code scanning
8. `src/screens/main/ResultsScreen.tsx` - Quiz results
9. `src/screens/LandingPage.tsx` - Marketing landing

## Design Reference

Read and follow: `.claude/agents/premium-design-principles.md`

## Enhancement Checklist

### AnalyticsScreen.tsx

**Data Visualization:**
```typescript
const AnalyticsScreen = () => {
  // Chart animations on load
  // Time period selector with smooth transitions
  // Stats cards with count-up animations
  // Insights section with AI-generated tips
};
```

**Chart Animations:**
```typescript
const AnimatedChart = ({ type, data }) => {
  // Line chart: draws from left to right
  // Bar chart: bars grow from bottom
  // Pie chart: segments animate in clockwise
  // Area chart: fills with gradient animation

  // All charts:
  // - Tap for tooltip with details
  // - Pinch to zoom (line/area)
  // - Loading: skeleton chart shape
};
```

**Key Metrics:**
```typescript
const MetricsGrid = ({ metrics }) => {
  // 2x2 grid of key stats
  // Each card: animated count-up
  // Trend indicator: animated arrow
  // Comparison: "vs last week" subtext
};
```

**AI Insights:**
```typescript
const InsightCard = ({ insight }) => {
  // Nora icon + speech bubble
  // "Based on your data, I noticed..."
  // Actionable recommendation
  // Dismiss or save for later
};
```

### BrainMappingScreen.tsx

**Knowledge Graph:**
```typescript
const BrainMap = ({ topics }) => {
  // Interactive node-link diagram
  // Nodes: topics with size = mastery
  // Links: related topics
  // Zoom/pan with gesture
  // Tap node: expand details

  // Animation: nodes drift slightly (organic feel)
  // New topics: appear with spring animation
};
```

**Node States:**
```typescript
type TopicNodeState =
  | 'mastered'    // Full color, glow
  | 'learning'    // Partial color, progress ring
  | 'new'         // Outline only, pulsing
  | 'suggested'   // Dashed outline, dimmed
```

### EBooksScreen.tsx

**Library View:**
```typescript
const EBookLibrary = () => {
  // Grid of book covers
  // Reading progress indicators
  // Categories: horizontal sections
  // Search: animated search bar
  // Sort/Filter: smooth dropdown
};
```

**Book Card:**
```typescript
const BookCard = ({ book }) => {
  // Cover image with shadow (3D effect)
  // Progress bar at bottom
  // "Continue" badge if in progress
  // Long press: quick actions menu
  // Tap: opens reader
};
```

### PDFViewerScreen.tsx

**Reader Experience:**
```typescript
const PDFViewer = () => {
  // Smooth page turns (not abrupt)
  // Pinch to zoom: fluid
  // Scroll position indicator
  // Night mode toggle (instant)
  // Annotation tools: slide-in panel
};
```

**Reading Progress:**
```typescript
const ReadingProgress = ({ current, total }) => {
  // Bottom progress bar
  // Page number overlay (fades in/out)
  // Chapter navigation: slide-in drawer
};
```

### SelfDiscoveryQuizScreen.tsx

**Quiz Interface:**
```typescript
const QuizScreen = () => {
  // Question entrance: fade in from bottom
  // Options: staggered appearance
  // Selection: scale + color animation
  // Progress: animated bar at top
  // Navigation: swipe between questions
};
```

**Question Card:**
```typescript
const QuestionCard = ({ question, options, onSelect }) => {
  // Question text: large, clear
  // Options: cards with radio/checkbox
  // Selected: springs to highlighted state
  // Multi-select: checkmarks animate in
};
```

### ResultsScreen.tsx

**Results Reveal:**
```typescript
const ResultsScreen = () => {
  // Dramatic reveal animation
  // Score/type displayed prominently
  // Breakdown: animated chart
  // Share button: prepare shareable card
  // "What's Next" recommendations
};
```

**Personality Type Display:**
```typescript
const TypeReveal = ({ type }) => {
  // Type name: scales up from center
  // Icon/illustration: fades in
  // Description: typewriter effect
  // Traits: staggered list entrance
};
```

### ProTrekkerScreen.tsx

**Pro Features Showcase:**
```typescript
const ProTrekkerScreen = () => {
  // Full-screen feature showcase
  // Each feature: animated demo
  // Swipe through features
  // CTA at end: upgrade prompt
};
```

**Feature Demo:**
```typescript
const FeatureDemo = ({ feature }) => {
  // Video/animation of feature in use
  // Headline benefit
  // "Try it now" if available in limited form
  // "Unlock with Pro" CTA
};
```

### QRScannerScreen.tsx

**Scanner UX:**
```typescript
const QRScanner = () => {
  // Camera viewfinder with animated frame
  // Corner brackets that animate
  // Scan line moving up/down
  // Flash toggle: animated icon
  // Success: frame turns green, haptic
};
```

**Scan Success:**
```typescript
const ScanSuccess = ({ result }) => {
  // Frame turns green
  // Checkmark appears in center
  // Haptic success feedback
  // Auto-navigate to result
  // Or show preview with confirm
};
```

### LandingPage.tsx

**Marketing Animations:**
```typescript
const LandingPage = () => {
  // Hero: animated app mockup
  // Features: scroll-triggered reveals
  // Testimonials: carousel with transitions
  // CTA: prominent, animated attention
  // Social proof: animated counters
};
```

**Scroll Animations:**
```typescript
const ScrollReveal = ({ children }) => {
  // Fade in + slide up when in viewport
  // Stagger multiple items
  // Only animate once (not on every scroll)
};
```

## Shared Utility Components

```
src/components/utilities/
  AnimatedChart.tsx         # Chart with load animation
  MetricCard.tsx            # Stat display with count-up
  BookCard.tsx              # Library item
  QuizOption.tsx            # Selectable quiz answer
  ScannerFrame.tsx          # QR viewfinder
  ScrollReveal.tsx          # Scroll-triggered animation
```

## Data Visualization Library

Recommend using:
- **react-native-svg** for custom charts
- **victory-native** for standard charts
- **react-native-graph** for animated line graphs
- **react-native-gifted-charts** for bar/pie charts

```typescript
// Example: Animated Line Chart
import { LineChart } from 'react-native-gifted-charts';

const StudyTrendChart = ({ data }) => (
  <LineChart
    data={data}
    curved
    isAnimated
    animationDuration={1200}
    color="#007AFF"
    areaChart
    startFillColor="rgba(0,122,255,0.3)"
    endFillColor="rgba(0,122,255,0.0)"
  />
);
```

## Quality Gates

Before marking complete:
- [ ] Charts animate smoothly on load
- [ ] Data updates don't cause layout shifts
- [ ] Quiz interactions are satisfying
- [ ] Scanner feedback is instant
- [ ] PDF viewer is responsive
- [ ] All screens use consistent patterns

## Report Format

```markdown
## Utilities Enhancement Report

### AnalyticsScreen
- [x] Chart animations: Line draws, bars grow
- [x] Metrics grid: Count-up animations
- [x] AI insights: Nora card design

### BrainMappingScreen
- [x] Node graph: Interactive with gestures
- [x] Node states: Visual mastery levels

### EBooksScreen
- [x] Library grid: Shadow depth
- [x] Progress indicators: Animated bars

### SelfDiscoveryQuizScreen
- [x] Question transitions: Smooth swipe
- [x] Option selection: Spring animation

### QRScannerScreen
- [x] Viewfinder: Animated brackets
- [x] Success state: Green + haptic

### Dependencies Added
- react-native-gifted-charts
- react-native-camera (for QR)
```
