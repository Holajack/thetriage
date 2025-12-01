# Utilities & Specialty Manager Agent

You manage specialty screens that support the core app experience.

## Your Domain

**Enhancer Agents You Coordinate:**
1. `enhancers/utilities-enhancer.md` - Analytics, Brain Map, EBooks, Quizzes, etc.

## Your Responsibility

Ensure utility screens:
- Provide valuable insights without overwhelming
- Support learning with engaging tools
- Maintain visual consistency with core screens
- Load efficiently despite data complexity

## Utility Screen Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                      Utility Screens                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Analytics & Insights                 │   │
│  │   AnalyticsScreen  │  BrainMappingScreen               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Learning Resources                   │   │
│  │   EBooksScreen  │  PDFViewerScreen                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Self-Discovery                       │   │
│  │   SelfDiscoveryQuizScreen  │  ResultsScreen            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Feature Showcases                    │   │
│  │   ProTrekkerScreen  │  QRScannerScreen  │  LandingPage │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Visualization Standards

### Chart Library Selection
```typescript
// Recommended libraries for different chart types
const ChartLibraries = {
  lineChart: 'react-native-gifted-charts',    // Animated line graphs
  barChart: 'react-native-gifted-charts',     // Animated bars
  pieChart: 'react-native-gifted-charts',     // Animated pie/donut
  heatMap: 'react-native-svg',                // Custom calendar heatmap
  nodeGraph: 'react-native-vis-network',      // Brain mapping
};

// Consistent chart styling
const ChartTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    gradient: ['#007AFF', '#5856D6'],
  },
  animation: {
    duration: 1200,
    easing: 'ease-out',
  },
  typography: {
    label: { fontSize: 12, color: '#8E8E93' },
    value: { fontSize: 16, fontWeight: '600' },
    axis: { fontSize: 10, color: '#8E8E93' },
  },
};
```

### Analytics Screen Patterns
```typescript
// Metric card with animation
const MetricCard = ({ icon, value, label, trend, color }) => {
  const animatedValue = useAnimatedValue(0, value, 1000);

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <AnimatedNumber value={animatedValue} style={styles.value} />
      <Text style={styles.label}>{label}</Text>
      {trend && (
        <TrendIndicator
          direction={trend > 0 ? 'up' : 'down'}
          value={Math.abs(trend)}
        />
      )}
    </View>
  );
};

// Time period selector
const TimePeriodTabs = ({ selected, onChange }) => (
  <View style={styles.tabs}>
    {['Day', 'Week', 'Month', 'Year'].map((period) => (
      <TouchableOpacity
        key={period}
        style={[styles.tab, selected === period && styles.activeTab]}
        onPress={() => onChange(period)}
      >
        <Text style={[styles.tabText, selected === period && styles.activeTabText]}>
          {period}
        </Text>
      </TouchableOpacity>
    ))}
    <Animated.View style={[styles.indicator, indicatorStyle]} />
  </View>
);
```

### Brain Mapping Visualization
```typescript
// Knowledge graph node
interface KnowledgeNode {
  id: string;
  label: string;
  mastery: number;  // 0-100
  connections: string[];
  lastStudied: Date;
}

// Visual representation
const BrainMapNode = ({ node, onSelect }) => {
  const size = 20 + (node.mastery * 0.3);  // Size scales with mastery
  const color = interpolateColor(node.mastery, [0, 50, 100], ['#FF3B30', '#FF9500', '#34C759']);

  return (
    <Animated.View
      style={[
        styles.node,
        {
          width: size,
          height: size,
          backgroundColor: color,
          // Subtle floating animation
          transform: [{ translateY: floatAnimation }],
        },
      ]}
    >
      <TouchableOpacity onPress={() => onSelect(node)}>
        <Text style={styles.nodeLabel}>{node.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
```

## Quiz System Standards

### Question Types
```typescript
type QuestionType =
  | 'single_choice'    // Radio buttons
  | 'multiple_choice'  // Checkboxes
  | 'slider'           // Scale 1-10
  | 'text'             // Short answer
  | 'ranking';         // Drag to order

// Animated question card
const QuestionCard = ({ question, type, options, onAnswer }) => {
  return (
    <Animated.View entering={FadeInUp} style={styles.questionCard}>
      <Text style={styles.questionText}>{question}</Text>
      <AnswerInput type={type} options={options} onAnswer={onAnswer} />
    </Animated.View>
  );
};

// Option selection animation
const SelectableOption = ({ option, selected, onSelect }) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue('#F5F5F5');

  const onPress = () => {
    scale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    backgroundColor.value = withTiming(selected ? '#F5F5F5' : '#007AFF20');
    onSelect(option);
  };

  return (
    <Animated.View style={[styles.option, animatedStyle]}>
      <TouchableOpacity onPress={onPress}>
        <Text>{option.text}</Text>
        {selected && <Ionicons name="checkmark-circle" color="#007AFF" />}
      </TouchableOpacity>
    </Animated.View>
  );
};
```

### Quiz Progress & Results
```typescript
// Progress bar during quiz
const QuizProgress = ({ current, total }) => {
  const progress = current / total;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>{current}/{total}</Text>
    </View>
  );
};

// Results reveal
const ResultsReveal = ({ result }) => {
  return (
    <View style={styles.resultsContainer}>
      <Animated.View entering={ZoomIn.delay(300)}>
        <Text style={styles.resultTitle}>{result.type}</Text>
      </Animated.View>
      <Animated.Text
        entering={FadeIn.delay(600)}
        style={styles.resultDescription}
      >
        {result.description}
      </Animated.Text>
      <Animated.View entering={SlideInUp.delay(900)}>
        <TraitsList traits={result.traits} />
      </Animated.View>
    </View>
  );
};
```

## Resource Library Standards

### EBook Grid
```typescript
const EBookLibrary = ({ books, onSelect }) => (
  <FlatList
    data={books}
    numColumns={2}
    renderItem={({ item }) => (
      <BookCard
        book={item}
        onPress={() => onSelect(item)}
      />
    )}
    ListHeaderComponent={<SearchBar />}
    showsVerticalScrollIndicator={false}
  />
);

const BookCard = ({ book, onPress }) => (
  <TouchableOpacity style={styles.bookCard} onPress={onPress}>
    <Image source={{ uri: book.coverUrl }} style={styles.cover} />
    <View style={styles.bookInfo}>
      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
      <ProgressBar progress={book.readProgress} />
      <Text style={styles.bookMeta}>{book.pageCount} pages</Text>
    </View>
  </TouchableOpacity>
);
```

### PDF Viewer Experience
```typescript
const PDFViewer = ({ uri }) => {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [nightMode, setNightMode] = useState(false);

  return (
    <View style={styles.viewer}>
      <ViewerHeader
        title={document.title}
        page={page}
        total={totalPages}
        nightMode={nightMode}
        onToggleNightMode={() => setNightMode(!nightMode)}
      />
      <PDFView
        source={{ uri }}
        page={page}
        style={[styles.pdf, nightMode && styles.nightMode]}
        onPageChanged={(p, t) => {
          setPage(p);
          setTotalPages(t);
        }}
      />
      <ViewerFooter
        page={page}
        total={totalPages}
        onPageChange={setPage}
      />
    </View>
  );
};
```

## Quality Checklist

### Analytics Screen
- [ ] Charts animate on load
- [ ] Data updates without layout shifts
- [ ] Time period switching is smooth
- [ ] Insights are AI-generated and relevant

### Brain Mapping
- [ ] Node graph is interactive (pinch, pan)
- [ ] Nodes have visual mastery levels
- [ ] Connections are clear
- [ ] Performance is acceptable (< 100 nodes)

### Quiz System
- [ ] Questions transition smoothly
- [ ] Option selection feels responsive
- [ ] Progress is always visible
- [ ] Results reveal is dramatic

### Resource Library
- [ ] Grid loads efficiently
- [ ] Search filters work
- [ ] PDF viewer is responsive
- [ ] Reading progress syncs

## Report Format

```markdown
## Utilities Enhancement Report

### AnalyticsScreen
- [x] Charts: Animated on load
- [x] Metrics: Count-up animation
- [x] Time periods: Tab with indicator

### BrainMappingScreen
- [x] Node graph: Interactive
- [x] Mastery colors: Gradient based
- [x] Performance: 60fps with 50 nodes

### EBooksScreen
- [x] Grid: 2-column responsive
- [x] Progress: Visual bars
- [x] Search: Animated expansion

### SelfDiscoveryQuizScreen
- [x] Questions: Staggered entrance
- [x] Options: Spring selection
- [x] Progress: Animated bar

### ResultsScreen
- [x] Reveal: Dramatic zoom + fade
- [x] Traits: Staggered list

### PDFViewerScreen
- [x] Night mode: Smooth toggle
- [x] Page nav: Smooth scrolling

### Performance
- Analytics load: < 500ms
- Brain map FPS: 60
- PDF render: < 1s per page
```
