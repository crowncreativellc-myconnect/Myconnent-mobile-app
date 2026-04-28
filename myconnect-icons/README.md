# MyConnect Tab Icons — Option B (Clean Line with Arc Accent)

Drop these files directly into your existing MyConnect project.

---

## File placement

```
YOUR PROJECT ROOT/
│
├── assets/
│   └── icons/
│       ├── tab-home.svg        ← copy here
│       ├── tab-shout.svg       ← copy here
│       ├── tab-circle.svg      ← copy here
│       ├── tab-points.svg      ← copy here
│       └── tab-profile.svg     ← copy here
│
└── src/
    └── components/
        └── TabIcons.tsx        ← copy here (replaces emoji icons)
```

---

## What each file is

| File | Purpose |
|------|---------|
| `assets/icons/tab-*.svg` | Source SVG files — use for reference, Figma import, or web |
| `src/components/TabIcons.tsx` | React Native component — this is what goes in the app |

---

## Icon design language

Every icon shares the Arc Bridge logo DNA:

| Element | Meaning |
|---------|---------|
| Arc curve | The referral bridge — the core logo motif |
| Gold node `#F6C90E` | AI engine / you / the apex |
| Blue node `#4F6EF7` | The poster / requester |
| Green node `#10B981` | The matched contact |
| Violet `#7C3AED` | Trust / profile tier |

---

## Active vs inactive colors

| Tab | Active color |
|-----|-------------|
| Home | `#4F6EF7` blue |
| Shout Out | `#F6C90E` gold |
| My Circle | `#10B981` green |
| Points | `#F6C90E` gold |
| Profile | `#7C3AED` violet |

Inactive: all icons render in `#4A5578` at 45% opacity.

---

## Dependencies required

The `TabIcons.tsx` component uses `react-native-svg`.
Install it if not already present:

```bash
npx expo install react-native-svg
```

---

## Usage in _layout.tsx

```tsx
import { TabIcon } from '../../src/components/TabIcons';

// Inside your Tabs.Screen options:
tabBarIcon: ({ focused }) => (
  <TabIcon tab="home" size={26} active={focused} />
)
```

Paste the full Claude Code prompt (provided separately) to have
Claude implement all changes automatically.
