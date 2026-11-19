# Omi (ඕමි) — Sri Lankan Multiplayer Card Game

Real-time 4-player multiplayer web app for the classic Sri Lankan card game **Omi (ඕමි)** built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Framer Motion**, **Firebase Realtime Database**, and **Firebase Anonymous Auth**.

## Features

- **Strict Sri Lankan Omi Rules Engine (`src/lib/omiEngine.ts`):**
  - 32-card deck (`A`, `K`, `Q`, `J`, `10`, `9`, `8`, `7` across ♠ ♥ ♦ ♣)
  - 4 seats in 2 teams sitting opposite each other (**Team A**: Seats 1 & 3 vs **Team B**: Seats 2 & 4)
  - Counter-clockwise dealing and turn order
  - Two-stage deal: 4 cards → dealer's right selects Trump (*Thurumpu*) → remaining 4 cards dealt
  - Strict follow-suit validation & trump cutting (*Kapanawa*)
  - 20 *Keta* tokens (10 Red, 10 Black), first team to 10 wins:
    - Trump team wins 5–7 tricks: **+1 Keta**
    - Non-trump team wins 5–7 tricks: **+2 Keta**
    - *Kapothi / Basthe* (8–0 sweep): **+3 Keta**
    - *Seporu* (4–4 tie): **0 now, +1 stacking bonus** for the next winning hand
- **Zero-Friction Multiplayer:**
  - Create a room to get a 6-character code, one-click invite link, and WhatsApp share button
  - Join via invite link or 6-character code
  - Click empty seats to swap teams/partners in the lobby
  - Smart AI bots to fill empty seats for solo, 2-player, or 3-player sessions
  - Firebase `onDisconnect` live presence tracking and seamless reload reconnection
- **Full Bilingual Support (English & සිංහල):**
  - Instant language toggle with authentic Sinhala Omi terminology (*ඉස්කෝප්ප, හාරත, රුවිත, කලාබර, ආසියා, හේරා, පොරෝ, බූරුවා, තුරුම්පු, කැට, ගොඩ, කපනවා, කපෝති/බස්තේ, සෙපෝරු*)
- **Custom Audio & Personalization:**
  - Synthesized Web Audio API sound effects (zero external audio dependencies)
  - Settings panel for volume, animation speed, table felt themes, and card back designs

## Local Development

1. Copy `.env.example` to `.env.local` and fill in your Firebase Web App credentials (`NEXT_PUBLIC_FIREBASE_*`).
2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser (or open multiple incognito windows to test 4-player multiplayer locally, or click **Fill Empty Seats with Bots** in the lobby to test solo immediately).
