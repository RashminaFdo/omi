import type { EmoteKey, KapothiLabel, Language, Rank, Suit } from "./types";

export interface I18nDict {
  appName: string;
  tagline: string;
  createRoom: string;
  joinRoom: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  roomCodeLabel: string;
  roomCodePlaceholder: string;
  enterTable: string;
  creating: string;
  joining: string;
  howToPlay: string;
  settings: string;
  leaveRoom: string;
  copyInviteLink: string;
  linkCopied: string;
  copyCode: string;
  codeCopied: string;
  shareWhatsApp: string;
  whatsAppMessage: (code: string, url: string) => string;
  roomLobby: string;
  roomCode: string;
  hostBadge: string;
  botBadge: string;
  youBadge: string;
  partnerBadge: string;
  online: string;
  offline: string;
  emptySeat: string;
  clickToSit: string;
  addBot: string;
  removeBot: string;
  fillWithBots: string;
  startGame: string;
  waitingForPlayers: string;
  waitingForHost: string;
  teamA: string;
  teamB: string;
  redTokens: string;
  blackTokens: string;
  turnTimer: string;
  timerOff: string;
  secondsShort: string;
  sweepTermLabel: string;
  roomOptions: string;
  // Game terminology
  trump: string;
  tokens: string;
  tricks: string;
  cut: string;
  tie: string;
  shuffle: string;
  hand: string;
  dealer: string;
  trumpCaller: string;
  selectTrumpTitle: string;
  selectTrumpSubtitle: string;
  orPickBlindCard: string;
  blindCardLabel: (pos: 5 | 6 | 7 | 8) => string;
  dealerRevealedCard: (dealer: string, selector: string, pos: 5 | 6 | 7 | 8) => string;
  trumpIsNow: (suitName: string) => string;
  dealingRemainingCards: string;
  waitingForTrump: (name: string) => string;
  waitingForCardsAfterTrump: (name: string) => string;
  yourTurn: string;
  playersTurn: (name: string) => string;
  trickWinnerBanner: (name: string) => string;
  cutBanner: string;
  // Revoke (Rule Violation)
  revokeTitle: string;
  revokeSubtitle: (playerName: string, ledSuitName: string) => string;
  revokePlayedLabel: string;
  revokeHadInHandLabel: string;
  revokePenaltyNote: (winningTeam: string) => string;
  // Hand & Match summary
  handComplete: string;
  matchComplete: string;
  winsHand: (team: string) => string;
  winsMatch: (team: string) => string;
  seporuTitle: string;
  seporuDesc: string;
  carryOverActive: (count: number) => string;
  tokensAwarded: (count: number) => string;
  baseTokensLabel: string;
  bonusTokensLabel: string;
  nextHand: string;
  playAgain: string;
  backToLobby: string;
  // Settings
  settingsTitle: string;
  languageLabel: string;
  soundEffects: string;
  masterVolume: string;
  animationSpeed: string;
  speedNormal: string;
  speedFast: string;
  tableTheme: string;
  themeEmerald: string;
  themeNavy: string;
  themeSlate: string;
  cardBackLabel: string;
  cardBackCrimson: string;
  cardBackGold: string;
  cardBackSapphire: string;
  close: string;
  // Join modal
  welcomeToRoom: (code: string) => string;
  enterNameToJoin: string;
  joinTable: string;
  roomNotFound: string;
  roomFull: string;
  spectatorNotice: string;
  backHome: string;
  // Emotes
  emotes: Record<EmoteKey, { label: string; emoji: string }>;
  // Suits & Ranks
  suits: Record<Suit, string>;
  ranks: Record<Rank, string>;
  sweepName: (pref: KapothiLabel) => string;
  // Rules modal sections
  rulesTitle: string;
  rulesSections: {
    title: string;
    points: string[];
  }[];
  footerNote: string;
}

const en: I18nDict = {
  appName: "Omi",
  tagline: "The Classic Sri Lankan 4-Player Card Game",
  createRoom: "Create Room",
  joinRoom: "Join Room",
  nicknameLabel: "Your Nickname",
  nicknamePlaceholder: "e.g. Kasun, Dilshan, Nimali...",
  roomCodeLabel: "6-Character Room Code",
  roomCodePlaceholder: "ABC123",
  enterTable: "Join Table",
  creating: "Creating Room...",
  joining: "Finding Room...",
  howToPlay: "How to Play",
  settings: "Settings",
  leaveRoom: "Leave",
  copyInviteLink: "Copy Invite Link",
  linkCopied: "Invite Link Copied!",
  copyCode: "Copy Code",
  codeCopied: "Copied!",
  shareWhatsApp: "WhatsApp",
  whatsAppMessage: (code, url) =>
    `Join my Sri Lankan Omi table! 🃏\nRoom Code: ${code}\nPlay here: ${url}`,
  roomLobby: "Table Lobby",
  roomCode: "Room",
  hostBadge: "Host",
  botBadge: "AI Bot",
  youBadge: "You",
  partnerBadge: "Partner",
  online: "Online",
  offline: "Offline",
  emptySeat: "Open Seat",
  clickToSit: "Click to sit here",
  addBot: "+ AI Bot",
  removeBot: "Remove Bot",
  fillWithBots: "Fill Empty Seats with Bots",
  startGame: "Deal & Start Match",
  waitingForPlayers: "Fill all 4 seats to begin (invite friends or add AI bots)",
  waitingForHost: "Waiting for host to start the match...",
  teamA: "Team A",
  teamB: "Team B",
  redTokens: "Red Keta",
  blackTokens: "Black Keta",
  turnTimer: "Turn Timer",
  timerOff: "Off",
  secondsShort: "s",
  sweepTermLabel: "8-Trick Sweep Term",
  roomOptions: "Table Options",
  trump: "Trump (Thurumpu)",
  tokens: "Keta Tokens",
  tricks: "Tricks",
  cut: "Cut (Kapanawa)",
  tie: "Seporu (4–4 Tie)",
  shuffle: "Shuffling",
  hand: "Hand",
  dealer: "Dealer",
  trumpCaller: "Trump Caller",
  selectTrumpTitle: "Choose Trump Suit (Thurumpu)",
  selectTrumpSubtitle: "Pick a suit from your first 4 cards — or draw a blind card below.",
  orPickBlindCard: "Not happy with these 4? Pick 5th, 6th, 7th, or 8th card:",
  blindCardLabel: (pos) => `${pos}th`,
  dealerRevealedCard: (dealer, selector, pos) =>
    `${dealer} reveals ${selector}'s ${pos}th card`,
  trumpIsNow: (suitName) => `${suitName} is Trump!`,
  dealingRemainingCards: "Dealing cards to all players...",
  waitingForTrump: (name) => `Waiting for ${name} to choose Trump (Thurumpu)...`,
  waitingForCardsAfterTrump: (name) =>
    `${name} is viewing their first 4 cards. Everyone else receives cards once Trump is called.`,
  yourTurn: "Your Turn",
  playersTurn: (name) => `${name}'s Turn`,
  trickWinnerBanner: (name) => `${name} takes the trick`,
  cutBanner: "Kapanawa! (Cut)",
  revokeTitle: "Rule Violation — Failed to Follow Suit!",
  revokeSubtitle: (playerName, ledSuitName) =>
    `${playerName} played another suit while still holding ${ledSuitName}!`,
  revokePlayedLabel: "Played",
  revokeHadInHandLabel: "Still in Hand",
  revokePenaltyNote: (winningTeam) =>
    `${winningTeam} wins the hand by forfeit!`,
  handComplete: "Hand Complete",
  matchComplete: "Match Victory!",
  winsHand: (team) => `${team} Wins the Hand`,
  winsMatch: (team) => `${team} Wins the Match!`,
  seporuTitle: "Seporu! (4–4 Tie)",
  seporuDesc: "No Keta tokens awarded. +1 bonus token carries over to the next winning hand!",
  carryOverActive: (count) => `+${count} Seporu Bonus`,
  tokensAwarded: (count) => `+${count} Keta`,
  baseTokensLabel: "Hand Tokens",
  bonusTokensLabel: "Seporu Bonus",
  nextHand: "Deal Next Hand",
  playAgain: "Play New Match",
  backToLobby: "Return to Lobby",
  settingsTitle: "Table Settings",
  languageLabel: "Language / භාෂාව",
  soundEffects: "Sound Effects",
  masterVolume: "Master Volume",
  animationSpeed: "Animation Speed",
  speedNormal: "Normal",
  speedFast: "Fast",
  tableTheme: "Table Felt Theme",
  themeEmerald: "Classic Emerald",
  themeNavy: "Royal Navy",
  themeSlate: "Midnight Slate",
  cardBackLabel: "Card Back Design",
  cardBackCrimson: "Royal Crimson",
  cardBackGold: "Ceylon Gold",
  cardBackSapphire: "Sapphire Lattice",
  close: "Close",
  welcomeToRoom: (code) => `Join Omi Table ${code}`,
  enterNameToJoin: "Enter your nickname to take a seat at the table.",
  joinTable: "Take a Seat",
  roomNotFound: "Room not found. Double-check your 6-character code.",
  roomFull: "All 4 seats are currently occupied.",
  spectatorNotice: "Watching as Spectator",
  backHome: "Back to Home",
  emotes: {
    niceCut: { label: "Nice cut!", emoji: "✂️" },
    kapothiIncoming: { label: "Kapothi incoming!", emoji: "🔥" },
    seporu: { label: "Seporu!", emoji: "⚖️" },
    wellPlayed: { label: "Well played!", emoji: "👏" },
    hurryUp: { label: "Your turn!", emoji: "⏱️" },
    goodGame: { label: "GG!", emoji: "🃏" },
  },
  suits: {
    S: "Spades",
    H: "Hearts",
    D: "Diamonds",
    C: "Clubs",
  },
  ranks: {
    A: "Ace",
    K: "King",
    Q: "Queen",
    J: "Jack",
    "10": "10",
    "9": "9",
    "8": "8",
    "7": "7",
  },
  sweepName: (pref) => (pref === "basthe" ? "Basthe" : "Kapothi"),
  rulesTitle: "How to Play Sri Lankan Omi",
  rulesSections: [
    {
      title: "Deck, Teams & Direction",
      points: [
        "32-card deck: Ace (highest) down to 7 (lowest) in Spades, Hearts, Diamonds, and Clubs.",
        "4 players in 2 teams sitting opposite each other: Team A (Seats 1 & 3) vs Team B (Seats 2 & 4).",
        "Dealing and turn order always move counter-clockwise (to the right).",
      ],
    },
    {
      title: "Two-Stage Deal & Blind 5th–8th Trump Card",
      points: [
        "After shuffling, ONLY the Trump Selector receives their first 4 cards.",
        "They can declare Trump (Thurumpu) from those 4 cards — or, if the 4 cards aren't good, pick their blind 5th, 6th, 7th, or 8th card.",
        "If a blind card is picked, the dealer reveals ONLY that card to everyone and its suit becomes Trump (shown at the top of the table).",
        "Everyone then receives their full 8 cards, and the Trump Selector leads Trick 1. Each new hand, the Trump Selector rotates anti-clockwise.",
      ],
    },
    {
      title: "Trick Play, Cutting (Kapanawa) & Revoke Rule",
      points: [
        "You must follow the led suit if you have a card of that symbol. You are free to play any card from your hand without system hints.",
        "If you DO have a card of the led suit and still play another suit or cut with a Trump card, you break the rule and the opposing team immediately wins the hand (+2 Keta)!",
        "If you genuinely do not have the led suit, you may cut with Trump (Kapanawa) or discard any card.",
        "Highest Trump card wins the trick; if no Trump is played, highest card of the led suit wins.",
      ],
    },
    {
      title: "Keta Token Scoring (First to 10 Wins)",
      points: [
        "Trump-calling team wins 5–7 tricks → +1 Keta token.",
        "Non-trump team wins 5–7 tricks → +2 Keta tokens.",
        "Kapothi / Basthe (winning all 8 tricks) → +3 Keta tokens!",
        "Seporu (4–4 tie) → 0 tokens awarded immediately, and +1 bonus token stacks onto the next winning hand.",
        "Dealer rotates counter-clockwise each hand until a team reaches 10 Keta tokens.",
      ],
    },
  ],
  footerNote: "Built for real-time Sri Lankan Omi nights with friends.",
};

const si: I18nDict = {
  appName: "ඕමි",
  tagline: "සාම්ප්‍රදායික ශ්‍රී ලාංකික කාඩ් ක්‍රීඩාව",
  createRoom: "නව මේසයක් සාදන්න",
  joinRoom: "මේසයකට එක්වන්න",
  nicknameLabel: "ඔබේ නම",
  nicknamePlaceholder: "උදා: කසුන්, දිල්ෂාන්, නිමාලි...",
  roomCodeLabel: "අක්ෂර 6 කාමර කේතය",
  roomCodePlaceholder: "ABC123",
  enterTable: "මේසයට පිවිසෙන්න",
  creating: "මේසය සාදමින්...",
  joining: "මේසය සොයමින්...",
  howToPlay: "ක්‍රීඩා නීති",
  settings: "සැකසුම්",
  leaveRoom: "ඉවත්වන්න",
  copyInviteLink: "ආරාධනා සබැඳිය පිටපත් කරන්න",
  linkCopied: "සබැඳිය පිටපත් විය!",
  copyCode: "කේතය පිටපත් කරන්න",
  codeCopied: "පිටපත් විය!",
  shareWhatsApp: "WhatsApp",
  whatsAppMessage: (code, url) =>
    `මගේ ඕමි මේසයට එක්වන්න! 🃏\nකාමර කේතය: ${code}\nමෙතැනින් පිවිසෙන්න: ${url}`,
  roomLobby: "ක්‍රීඩා මේසය",
  roomCode: "කේතය",
  hostBadge: "සංවිධායක",
  botBadge: "AI බොට්",
  youBadge: "ඔබ",
  partnerBadge: "සහකරු",
  online: "සබැඳි",
  offline: "නොබැඳි",
  emptySeat: "හිස් අසුන",
  clickToSit: "අසුන් ගැනීමට ඔබන්න",
  addBot: "+ AI බොට්",
  removeBot: "බොට් ඉවත් කරන්න",
  fillWithBots: "හිස් අසුන් බොට්ලාගෙන් පුරවන්න",
  startGame: "අනනවා • තරගය අරඹන්න",
  waitingForPlayers: "තරගය ඇරඹීමට අසුන් 4ම පිරවිය යුතුයි (මිතුරන්ට ආරාධනා කරන්න හෝ AI බොට් එක් කරන්න)",
  waitingForHost: "සංවිධායක තරගය අරඹන තෙක් රැඳී සිටින්න...",
  teamA: "පිල A",
  teamB: "පිල B",
  redTokens: "රතු කැට",
  blackTokens: "කළු කැට",
  turnTimer: "වාර කාලය",
  timerOff: "නැත",
  secondsShort: "ත.",
  sweepTermLabel: "ගොඩ 8ම ජයග්‍රහණය",
  roomOptions: "මේස සැකසුම්",
  trump: "තුරුම්පු",
  tokens: "කැට",
  tricks: "ගොඩ",
  cut: "කපනවා",
  tie: "සෙපෝරු (4–4 සම)",
  shuffle: "අනනවා",
  hand: "වටය",
  dealer: "බෙදන්නා",
  trumpCaller: "තුරුම්පු අඬන්නා",
  selectTrumpTitle: "තුරුම්පු වර්ගය තෝරන්න",
  selectTrumpSubtitle: "මුල් කාඩ් 4න් තුරුම්පු තෝරන්න — නැතිනම් පහතින් 5–8 කාඩ් එකක් අදින්න.",
  orPickBlindCard: "මුල් කාඩ් 4 හොඳ නැද්ද? 5, 6, 7 හෝ 8 වෙනි කාඩ් එක තෝරන්න:",
  blindCardLabel: (pos) => `${pos}වෙනි`,
  dealerRevealedCard: (dealer, selector, pos) =>
    `${dealer} විසින් ${selector} ගේ ${pos}වෙනි කාඩ්පත පෙන්වයි`,
  trumpIsNow: (suitName) => `තුරුම්පු: ${suitName}!`,
  dealingRemainingCards: "සැමට කාඩ් බෙදමින්...",
  waitingForTrump: (name) => `${name} තුරුම්පු තෝරන තෙක් රැඳී සිටින්න...`,
  waitingForCardsAfterTrump: (name) =>
    `${name} මුල් කාඩ් 4 බලමින් සිටී. තුරුම්පු තේරූ පසු සැමට කාඩ් ලැබේ.`,
  yourTurn: "ඔබේ වාරය",
  playersTurn: (name) => `${name} ගේ වාරය`,
  trickWinnerBanner: (name) => `${name} ගොඩ දිනා ගත්තා`,
  cutBanner: "කපනවා!",
  revokeTitle: "නීති කඩකිරීමක් — වර්ගය මග හැරියා!",
  revokeSubtitle: (playerName, ledSuitName) =>
    `${playerName} ළඟ ${ledSuitName} කාඩ්පතක් තිබියදී වෙනත් කාඩ්පතක් දැමුවා!`,
  revokePlayedLabel: "දැමූ කාඩ්පත",
  revokeHadInHandLabel: "අතේ තිබූ කාඩ්පත",
  revokePenaltyNote: (winningTeam) =>
    `එම වරද නිසා ${winningTeam} වටය ජය ගත්තා!`,
  handComplete: "වටය අවසන්",
  matchComplete: "තරග ජයග්‍රහණය!",
  winsHand: (team) => `${team} වටය ජය ගත්තා`,
  winsMatch: (team) => `${team} තරගය ජය ගත්තා!`,
  seporuTitle: "සෙපෝරු! (4–4 සම)",
  seporuDesc: "කැට ලැබෙන්නේ නැත. ඊළඟ ජයග්‍රාහී වටයට අමතර කැට +1 ක් එකතු වේ!",
  carryOverActive: (count) => `සෙපෝරු අමතර +${count}`,
  tokensAwarded: (count) => `කැට +${count}`,
  baseTokensLabel: "වටයේ කැට",
  bonusTokensLabel: "සෙපෝරු අමතර",
  nextHand: "ඊළඟ වටය බෙදන්න",
  playAgain: "නව තරගයක් අරඹන්න",
  backToLobby: "මේසයට ආපසු",
  settingsTitle: "සැකසුම්",
  languageLabel: "භාෂාව / Language",
  soundEffects: "ශබ්ද ප්‍රයෝග",
  masterVolume: "ශබ්ද ප්‍රමාණය",
  animationSpeed: "සජීවිකරණ වේගය",
  speedNormal: "සාමාන්‍ය",
  speedFast: "වේගවත්",
  tableTheme: "මේස වර්ණය",
  themeEmerald: "මරකත කොළ",
  themeNavy: "රාජකීය නිල්",
  themeSlate: "රාත්‍රී අළු",
  cardBackLabel: "කාඩ් පිටුපස රටාව",
  cardBackCrimson: "රාජකීය රතු",
  cardBackGold: "ලංකා රන්",
  cardBackSapphire: "නිල් මැණික්",
  close: "වසන්න",
  welcomeToRoom: (code) => `ඕමි මේසය ${code} වෙත එක්වන්න`,
  enterNameToJoin: "මේසයේ අසුන් ගැනීමට ඔබේ නම ඇතුළත් කරන්න.",
  joinTable: "අසුන් ගන්න",
  roomNotFound: "මේසය සොයාගත නොහැක. කේතය නැවත පරීක්ෂා කරන්න.",
  roomFull: "අසුන් 4ම දැනට පිරී ඇත.",
  spectatorNotice: "නරඹන්නෙකු ලෙස",
  backHome: "මුල් පිටුවට",
  emotes: {
    niceCut: { label: "නියම කැපිල්ල!", emoji: "✂️" },
    kapothiIncoming: { label: "කපෝති එනවා!", emoji: "🔥" },
    seporu: { label: "සෙපෝරු!", emoji: "⚖️" },
    wellPlayed: { label: "සුපිරි!", emoji: "👏" },
    hurryUp: { label: "ඉක්මන් කරන්න!", emoji: "⏱️" },
    goodGame: { label: "සුබ පැතුම්!", emoji: "🃏" },
  },
  suits: {
    S: "ඉස්කෝප්ප",
    H: "හාරත",
    D: "රුවිත",
    C: "කලාබර",
  },
  ranks: {
    A: "ආසියා",
    K: "හේරා",
    Q: "පොරෝ",
    J: "බූරුවා",
    "10": "10",
    "9": "9",
    "8": "8",
    "7": "7",
  },
  sweepName: (pref) => (pref === "basthe" ? "බස්තේ" : "කපෝති"),
  rulesTitle: "ශ්‍රී ලාංකික ඕමි ක්‍රීඩා නීති",
  rulesSections: [
    {
      title: "කාඩ් කුට්ටම, පිල් සහ දිශාව",
      points: [
        "කාඩ් 32 කුට්ටම: ඉස්කෝප්ප (♠), හාරත (♥), රුවිත (♦), කලාබර (♣) වර්ග 4න් ආසියා (ඉහළම), හේරා, පොරෝ, බූරුවා, 10, 9, 8, 7.",
        "ක්‍රීඩකයන් 4 දෙනා පිල් 2කට මුහුණට මුහුණ අසුන් ගනී: පිල A (අසුන් 1 & 3) සහ පිල B (අසුන් 2 & 4).",
        "කාඩ් අනනවා සහ බෙදීම මෙන්ම වාර ගමන් කරන්නේ වාමාවර්තව (දකුණු පැත්තට) ය.",
      ],
    },
    {
      title: "මුල් කාඩ් 4 සහ 5–8 අන්ධ තුරුම්පු කාඩ්පත",
      points: [
        "කාඩ් ඇනූ පසු පළමුව තුරුම්පු තෝරන්නාට පමණක් මුල් කාඩ් 4 ලැබේ.",
        "එම කාඩ් 4න් තුරුම්පු පැවසිය හැක — නැතිනම් හොඳ කාඩ් නැත්නම් 5, 6, 7 හෝ 8 වෙනි කාඩ්පත තෝරාගත හැක.",
        "එවිට බෙදන්නා තෝරාගත් එම කාඩ්පත පමණක් සැමට පෙන්වා එහි වර්ගය තුරුම්පු ලෙස ප්‍රකාශ කරයි (මේසයේ ඉහළින් දිස්වේ).",
        "ඉන්පසු සැමට කාඩ් 8 බැගින් ලැබී තුරුම්පු තෝරන්නා මුල් කාඩ්පත දමයි. ඊළඟ වටයේදී තුරුම්පු තෝරන්නා වාමාවර්තව මාරු වේ.",
      ],
    },
    {
      title: "ගොඩ ගැසීම, කපනවා සහ වැරදි කාඩ්පත් නීතිය",
      points: [
        "මුලින් දැමූ වර්ගයේ කාඩ් අතේ තිබේ නම් එම වර්ගයෙන්ම දැමිය යුතුය. කිසිදු කාඩ්පතක් අවහිර නොකෙරේ.",
        "එම වර්ගයේ කාඩ්පතක් අතේ තිබියදී වෙනත් කාඩ්පතක් හෝ තුරුම්පු කාඩ්පතක් දැමුවහොත් ප්‍රතිවාදී පිල එම වටය ක්ෂණිකව ජය ගනී (කැට +2)!",
        "එම වර්ගය අතේ නොමැති නම් තුරුම්පු වලින් කපනවා හෝ ඕනෑම කාඩ්පතක් දැමිය හැක.",
        "ඉහළම තුරුම්පු කාඩ්පත ගොඩ දිනයි; තුරුම්පු නැත්නම් මුලින් දැමූ වර්ගයේ ඉහළම කාඩ්පත දිනයි.",
      ],
    },
    {
      title: "කැට ලකුණු ක්‍රමය (පළමුව කැට 10 ජය)",
      points: [
        "තුරුම්පු ඇඬූ පිල ගොඩ 5–7 දිනුවොත් → කැට +1.",
        "තුරුම්පු නොඇඬූ පිල ගොඩ 5–7 දිනුවොත් → කැට +2.",
        "කපෝති / බස්තේ (ගොඩ 8ම ජයග්‍රහණය) → කැට +3!",
        "සෙපෝරු (4–4 සම) → දැනට කැට 0; ඊළඟ ජයග්‍රාහී වටයට අමතර කැට +1 ක් එකතු වේ.",
        "පිලක් කැට 10 සම්පූර්ණ කරන තෙක් බෙදන්නා වාමාවර්තව මාරු වේ.",
      ],
    },
  ],
  footerNote: "මිතුරන් සමඟ සජීවීව ඕමි ක්‍රීඩා කිරීම සඳහා නිමවා ඇත.",
};

export const DICTIONARY: Record<Language, I18nDict> = { en, si };

export function getDict(lang: Language): I18nDict {
  return DICTIONARY[lang] ?? en;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}
