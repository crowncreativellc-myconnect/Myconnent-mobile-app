# MyConnect — Mobile App

> **"Hired through a friend, not a stranger."**

MyConnect is an AI-powered professional trust network where every connection is vouched for, every review is verified, and every recommendation comes from someone who knows you.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Project Structure](#project-structure)
5. [Supabase Setup](#supabase-setup)
6. [Running Locally](#running-locally)
7. [Building for Production](#building-for-production)
8. [Submitting to TestFlight via EAS](#submitting-to-testflight-via-eas)
9. [Architecture Notes](#architecture-notes)
10. [Key Features](#key-features)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | Included with Node |
| Expo CLI | latest | `npm install -g expo` |
| EAS CLI | latest | `npm install -g eas-cli` |
| Xcode | ≥ 15 | Mac App Store (iOS builds) |
| Supabase account | — | [supabase.com](https://supabase.com) |

---

## Quick Start

```bash
# 1. Clone / unzip the project
cd myconnect

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Fill in your Supabase credentials in .env
#    EXPO_PUBLIC_SUPABASE_URL=...
#    EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# 5. Start the Expo dev server
npm start
```

Then press `i` for iOS simulator or `a` for Android emulator.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `OPENAI_API_KEY` | Edge Fn only | Used server-side for AI parsing — never expose client-side |
| `ANTHROPIC_API_KEY` | Edge Fn only | Alternative LLM for smart parsing |
| `PINECONE_API_KEY` | Edge Fn only | Vector DB for skill embeddings |
| `EAS_PROJECT_ID` | For builds | EAS project ID from `eas init` |

> **Security:** `EXPO_PUBLIC_*` variables are bundled into the client app. Never put secret API keys in `EXPO_PUBLIC_*` variables. All AI/ML keys live exclusively in Supabase Edge Functions (server-side).

---

## Project Structure

```
myconnect/
├── app/                         # Expo Router — file-based routes
│   ├── _layout.tsx              # Root layout (GestureHandler + auth init)
│   ├── +not-found.tsx           # 404 screen
│   ├── (auth)/                  # Unauthenticated route group
│   │   ├── _layout.tsx          # Auth stack + redirect if logged in
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── (app)/                   # Authenticated route group
│       ├── _layout.tsx          # Tab navigator + redirect if logged out
│       ├── index.tsx            # Home feed
│       ├── shout.tsx            # Create shout-out (AI parse + send)
│       ├── connections.tsx      # Circle of Trust
│       ├── points.tsx           # Konnect Points & trust score
│       ├── profile.tsx          # User profile
│       └── settings.tsx         # App settings
│
├── src/
│   ├── components/              # Typed, NativeWind-styled components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── TrustBadge.tsx
│   │   ├── ShoutCard.tsx
│   │   └── KonnectPointsBadge.tsx
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth actions (signIn, signUp, signOut)
│   │   ├── useSession.ts        # Lightweight session reader
│   │   └── useShouts.ts         # Shout-out CRUD + AI parse
│   ├── lib/
│   │   └── supabase.ts          # Supabase client + typed DB helpers
│   ├── store/
│   │   ├── authStore.ts         # Zustand auth state
│   │   └── shoutStore.ts        # Zustand shout-out state
│   ├── types/
│   │   └── index.ts             # All TypeScript types
│   └── utils/
│       └── index.ts             # cn(), formatters, tier helpers
│
├── supabase/
│   ├── schema.sql               # Full DB schema + RLS policies
│   └── functions/
│       └── parse-shout/         # Edge Function: AI smart parsing
│           └── index.ts
│
├── assets/                      # icon.png, splash.png, adaptive-icon.png
├── global.css                   # NativeWind entry
├── tailwind.config.js           # Brand color tokens
├── app.json                     # Expo config
├── eas.json                     # EAS build profiles
└── .env.example                 # Environment variable template
```

---

## Facebook Setup

MyConnect uses Facebook Login to let users authenticate and import trusted friends into their Circle of Trust.

### 1. Create a Facebook App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Choose **Consumer** type → name it **MyConnect**
3. Add the **Facebook Login** product from the dashboard
4. Under **Facebook Login → Settings**, add these OAuth redirect URIs:
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - `myconnect://` (for deep linking back into the app)

### 2. Get your credentials

From your Facebook App dashboard:
- **App ID** → goes into `EXPO_PUBLIC_FACEBOOK_APP_ID` in `.env` and `app.json`
- **App Secret** → goes into `FACEBOOK_APP_SECRET` in `.env` (server-side only)
- **Client Token** (Settings → Advanced → Client Token) → goes into `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`

### 3. Enable Facebook in Supabase

1. Supabase Dashboard → **Authentication → Providers → Facebook**
2. Toggle **Enable**, paste your **App ID** and **App Secret**
3. Copy the **Callback URL** shown and add it to your Facebook App's OAuth redirect URIs

### 4. Configure app.json

Replace the placeholder values in `app.json`:

```json
["react-native-fbsdk-next", {
  "appID": "YOUR_FACEBOOK_APP_ID",
  "clientToken": "YOUR_FACEBOOK_CLIENT_TOKEN",
  "scheme": "fbYOUR_FACEBOOK_APP_ID"
}]
```

### 5. Required Facebook Permissions

MyConnect requests these permissions on login:
| Permission | Purpose |
|-----------|---------|
| `public_profile` | Name, profile photo for identity |
| `email` | Account creation and auth |
| `user_friends` | Find which friends are on MyConnect |

> **Note:** `user_friends` only returns friends who have also granted the same permission to MyConnect. This is a Facebook platform restriction — it cannot be worked around.

### 6. Facebook App Review (before public launch)

The `user_friends` permission requires **Facebook App Review** before you can use it with accounts other than test users. Submit for review at developers.facebook.com → App Review → Permissions and Features, requesting `user_friends`.

During development, add test users at **Roles → Test Users**.

---

## Supabase Setup

### 1. Create a new Supabase project

Go to [app.supabase.com](https://app.supabase.com), create a new project, and copy your **Project URL** and **anon key** into `.env`.

### 2. Run the database schema

Open the Supabase **SQL Editor** and paste the contents of `supabase/schema.sql`. This creates:
- All tables (profiles, connections, shouts, reviews, points_ledger, notifications)
- Enums, indexes, and foreign keys
- Row Level Security policies
- Auto-profile trigger on user sign-up

### 3. Create storage buckets

In Supabase Dashboard → Storage → New Bucket:
- `avatars` (public)
- `voice-notes` (private)

### 4. Deploy the AI Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set the OpenAI secret
supabase secrets set OPENAI_API_KEY=sk-your-key

# Deploy the parse-shout function
supabase functions deploy parse-shout
```

---

## Running Locally

```bash
# Start development server
npm start

# Run on specific platform
npm run ios
npm run android

# Type check
npm run type-check

# Lint
npm run lint
```

---

## Building for Production

### Initial EAS setup (one time)

```bash
# Login to EAS
eas login

# Configure EAS for this project (generates projectId)
eas init

# Update eas.json with your Apple team/app IDs
```

### Create builds

```bash
# iOS development build (installs on device via dev client)
eas build --platform ios --profile development

# Android development build
eas build --platform android --profile development

# Production build (App Store / Play Store)
eas build --platform all --profile production
```

---

## Submitting to TestFlight via EAS

```bash
# Build production iOS
eas build --platform ios --profile production

# Submit to TestFlight (prompts for Apple credentials)
eas submit --platform ios --latest

# Or submit a specific build
eas submit --platform ios --id YOUR_BUILD_ID
```

Before submitting, make sure `eas.json` has your:
- `appleId`
- `ascAppId` (App Store Connect App ID)
- `appleTeamId`

---

## Architecture Notes

### AI Flow

```
User input (text / voice)
    ↓
parse-shout Edge Function (GPT-4o-mini)
    ↓  skill_tags, urgency, complexity, format, draft_text
Matching Engine (planned: cosine similarity on Pinecone embeddings)
    ↓  top 2–3 matched connections
Shout-out created → pushed to matched users via Realtime
```

### Trust Score

Composite of 5 weighted signals:
- **Completion rate** (30%) — confirmed completions / total accepted
- **Review quality** (25%) — avg rating × reviewer trust weight
- **Response time** (15%) — median response hours
- **Peer vouching** (20%) — circle size × their trust scores
- **Recency decay** (10%) — activity in last 90 days

### State Management

- **Zustand** for global app state (auth session, shout feed)
- **Supabase Realtime** subscriptions for live feed updates (hook stubs ready)
- No Redux — kept intentionally lean for MVP

---

## Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password auth | ✅ Scaffolded | Supabase Auth |
| **Facebook login** | ✅ Scaffolded | react-native-fbsdk-next + Supabase OAuth |
| **Facebook friend import** | ✅ Scaffolded | Cross-references friends via `facebook_id` |
| **Invite non-users** | ✅ Scaffolded | SMS + share-sheet with deep link |
| **Referral attribution** | ✅ DB trigger | Auto-credits +30 pts when invited friend joins |
| Circle of Trust feed | ✅ Scaffolded | Live data via `useShouts` |
| Shout-out creation | ✅ Scaffolded | Text input + AI parse |
| AI Smart Parsing | ✅ Edge Fn ready | Deploy `parse-shout` |
| AI Matching Engine | 🔜 Planned V1.1 | Pinecone embeddings |
| Konnect Points | ✅ Scaffolded | Ledger UI + types |
| Trust score | ✅ Scaffolded | Computed server-side |
| Voice shout-outs | 🔜 Planned V1.1 | Expo AV + Whisper |
| Push notifications | 🔜 Planned | Supabase + Expo Push |
| 2nd-degree expansion | 🔜 Planned V1.2 | Premium feature |

---

*MyConnect — Confidential — 2025*
