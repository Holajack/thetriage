# The Triage - Agent Hierarchy

This directory contains a comprehensive 4-tier agent system for transforming The Triage into a premium, "scroll-stopping" app based on **Chris Ro's design methodology** from "How I Design Apps 10x Better."

---

## Quick Start

To launch the premium enhancement:
```
Use the Nora-orchestrator agent to transform The Triage into a premium app following Chris Ro's design principles.
```

---

## Agent Hierarchy Overview

```
                    ┌─────────────────────────────────────┐
                    │          NORA ORCHESTRATOR          │
                    │              (Tier 4)               │
                    │                                     │
                    │          Nora-orchestrator          │
                    └─────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
   │      CDO        │     │      CXO        │     │      CGO        │
   │ (Design Quality)│     │ (User Journey)  │     │    (Growth)     │
   │    Tier 3       │     │    Tier 3       │     │    Tier 3       │
   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
   ┌────────────────────────────────┼────────────────────────────────┐
   │                                │                                │
   │           ┌────────────────────┴───────────────────┐            │
   │           │         MANAGER LAYER (Tier 2)        │            │
   │           │                                        │            │
   │           │  • auth-onboarding-manager            │            │
   │           │  • core-experience-manager            │            │
   │           │  • productivity-manager               │            │
   │           │  • social-engagement-manager          │            │
   │           │  • revenue-manager                    │            │
   │           │  • utilities-manager                  │            │
   │           └────────────────────────────────────────┘            │
   │                                │                                │
   │           ┌────────────────────┴───────────────────┐            │
   │           │        ENHANCER LAYER (Tier 1)        │            │
   │           │                                        │            │
   │           │  • auth-screen-enhancer               │            │
   │           │  • onboarding-screen-enhancer         │            │
   │           │  • home-profile-enhancer              │            │
   │           │  • ai-companions-enhancer             │            │
   │           │  • study-focus-enhancer               │            │
   │           │  • social-community-enhancer          │            │
   │           │  • monetization-enhancer              │            │
   │           │  • utilities-enhancer                 │            │
   │           └────────────────────────────────────────┘            │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: Screen Enhancers

Located in `enhancers/`

| Agent | Screens | Focus |
|-------|---------|-------|
| `auth-screen-enhancer` | Login, ForgotPassword, ResetPassword, EmailVerification | Form animations, error states |
| `onboarding-screen-enhancer` | ProfileCreation, StudyPreferences, AppTutorial, AppSummary | First impression, Nora intro |
| `home-profile-enhancer` | Home, Profile, Settings | Stats animations, parallax headers |
| `ai-companions-enhancer` | Nora, Patrick, AIIntegration | Mascot animations, chat bubbles |
| `study-focus-enhancer` | StudySession, FocusPreparation, Break, SessionHistory | Timer perfection, celebrations |
| `social-community-enhancer` | Community, Leaderboard, StudyRoom, Message | Real-time, presence indicators |
| `monetization-enhancer` | Shop, Subscription, Bonuses, Achievements | Holographic badges, purchase flows |
| `utilities-enhancer` | Analytics, BrainMapping, EBooks, Quiz, Results | Charts, data visualization |

---

## Tier 2: Managers

Located in `managers/`

| Agent | Enhancers Managed | Responsibility |
|-------|-------------------|----------------|
| `auth-onboarding-manager` | auth, onboarding | First-time user experience |
| `core-experience-manager` | home-profile | Daily hub screens |
| `productivity-manager` | study-focus, ai-companions (Nora) | Study session excellence |
| `social-engagement-manager` | social-community, ai-companions (Patrick) | Community and competition |
| `revenue-manager` | monetization | Conversion and value |
| `utilities-manager` | utilities | Support screens |

---

## Tier 3: Directors

Located in `directors/`

| Agent | Focus | Managers Overseen |
|-------|-------|-------------------|
| `chief-design-officer` (CDO) | Visual consistency, animation quality | All (design aspects) |
| `chief-experience-officer` (CXO) | User journeys, friction reduction | Auth, Core, Productivity, Utilities |
| `chief-growth-officer` (CGO) | Retention, widgets, monetization | Social, Revenue, Auth |

---

## Tier 4: Orchestrator

| Agent | Role |
|-------|------|
| `Nora-orchestrator` | Supreme coordinator, delegates to all tiers |

---

## Supporting Documents

| Document | Purpose |
|----------|---------|
| `premium-design-principles.md` | Chris Ro's methodology codified |
| `REQUIRED_RESOURCES.md` | APIs, dependencies, assets needed |

---

## Chris Ro's 5 Pillars (From the Video)

1. **Animations & Interactions** - Make it dynamic, not static
2. **Illustrations & Mascots** - Give the app personality
3. **Iconography & Typography** - Consistency is key
4. **Widgets** - Retention cheat code (2x retention)
5. **Gamification** - Holographic badges, streaks, rewards

---

## How to Use

### Full Enhancement Run
```
Use the Nora-orchestrator agent to coordinate the complete premium transformation.
```

### Specific Screen Enhancement
```
Use the [manager-name] manager agent to enhance all screens in [domain].
```

### Design Audit Only
```
Use the chief-design-officer agent to audit design consistency across all screens.
```

### Growth Analysis Only
```
Use the chief-growth-officer agent to analyze retention mechanics and widget opportunities.
```

---

## File Structure

```
.claude/agents/
├── README.md                           # This file
├── premium-design-principles.md        # Design methodology
├── Nora-orchestrator.md                # Master orchestrator (Tier 4)
├── REQUIRED_RESOURCES.md               # APIs and dependencies
│
├── directors/                          # Tier 3
│   ├── chief-design-officer.md
│   ├── chief-experience-officer.md
│   └── chief-growth-officer.md
│
├── managers/                           # Tier 2
│   ├── auth-onboarding-manager.md
│   ├── core-experience-manager.md
│   ├── productivity-manager.md
│   ├── social-engagement-manager.md
│   ├── revenue-manager.md
│   └── utilities-manager.md
│
├── enhancers/                          # Tier 1
│   ├── auth-screen-enhancer.md
│   ├── onboarding-screen-enhancer.md
│   ├── home-profile-enhancer.md
│   ├── ai-companions-enhancer.md
│   ├── study-focus-enhancer.md
│   ├── social-community-enhancer.md
│   ├── monetization-enhancer.md
│   └── utilities-enhancer.md
│
└── (existing agents)
    ├── screen-auditor.md
    ├── screen-generator.md
    ├── app-orchestrator.md
    ├── google-play-deployer.md
    └── apple-store-deployer.md
```

---

## Expected Outcomes

After running the full enhancement:

- **45 screens** with premium animations
- **127+ micro-interactions** added
- **2 animated mascots** (Nora, Patrick)
- **6 widgets** (Home + Lock Screen)
- **Holographic badges** with device-motion shine
- **Consistent design system** across all screens
- **60fps performance** on all animations

---

## Next Steps

1. Review `REQUIRED_RESOURCES.md` for APIs/assets needed
2. Install missing dependencies
3. Run the orchestrator
4. Review each phase's output
5. Deploy to TestFlight for testing
