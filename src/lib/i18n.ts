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
  disbandRoom: string;
  closeRoom: string;
  copyInviteLink: string;
  linkCopied: string;
  copyCode: string;
  codeCopied: string;
  copyFailed: string;
  shareWhatsApp: string;
  shareWhatsAppNormal: string;
  shareWhatsAppBusiness: string;
  shareOtherApps: string;
  whatsAppMessage: (code: string, url: string) => string;
  roomLobby: string;
  roomCode: string;
  hostBadge: string;
  botBadge: string;
  youBadge: string;
  partnerBadge: string;
  online: string;
  offline: string;
  offlineBotIn: (sec: number) => string;
  botTakeoverBadge: string;
  botTakeoverBanner: (name: string) => string;
  emptySeat: string;
  clickToSit: string;
  addBot: string;
  removeBot: string;
  fillWithBots: string;
  shuffleTeams: string;
  dragToArrange: string;
  tapSeatToSwap: string;
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
  matchPoint: string;
  selectTrumpTitle: string;
  selectTrumpSubtitle: string;
  orPickBlindCard: string;
  blindCardLabel: (pos: 5 | 6 | 7 | 8) => string;
  dealerRevealedCard: (
    dealer: string,
    selector: string,
    pos: 5 | 6 | 7 | 8
  ) => string;
  trumpIsNow: (suitName: string) => string;
  dealingRemainingCards: string;
  waitingForTrump: (name: string) => string;
  waitingForCardsAfterTrump: (name: string) => string;
  yourTurn: string;
  playersTurn: (name: string) => string;
  trickWinnerBanner: (name: string) => string;
  cutBanner: string;
  wonCardsLabel: (tricks: number) => string;
  peekHint: string;
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
  roomClosedNotice: string;
  roomFull: string;
  spectatorNotice: string;
  backHome: string;
  // Emotes & Memes
  chatTabEmotes: string;
  chatTabMemes: string;
  memeCooldownNotice: (sec: number) => string;
  memeSentBy: (name: string) => string;
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
  enterTable: "Join Room",
  creating: "Creating Room...",
  joining: "Joining Room...",
  howToPlay: "How to Play",
  settings: "Settings",
  leaveRoom: "Leave",
  disbandRoom: "Disband Room",
  closeRoom: "Finish & Close",
  copyInviteLink: "Copy Invite Link",
  linkCopied: "Invite Link Copied!",
  copyCode: "Copy Code",
  codeCopied: "Copied!",
  copyFailed: "Could not copy. Please try again or copy the text manually.",
  shareWhatsApp: "WhatsApp",
  shareWhatsAppNormal: "WhatsApp (Normal)",
  shareWhatsAppBusiness: "WhatsApp Business",
  shareOtherApps: "More Apps...",
  whatsAppMessage: (code, url) =>
    `Join my Omi game! 🃏\nRoom Code: ${code}\nPlay here: ${url}`,
  roomLobby: "Game Lobby",
  roomCode: "Room",
  hostBadge: "Host",
  botBadge: "AI Bot",
  youBadge: "You",
  partnerBadge: "Partner",
  online: "Online",
  offline: "Offline",
  offlineBotIn: (sec) => `Offline • AI in ${sec}s`,
  botTakeoverBadge: "AI Sub",
  botTakeoverBanner: (name) => `AI is subbing for ${name} until they return`,
  emptySeat: "Open Seat",
  clickToSit: "Tap to sit here",
  addBot: "+ AI Bot",
  removeBot: "Remove",
  fillWithBots: "Fill Empty Seats with Bots",
  shuffleTeams: "Shuffle Teams",
  dragToArrange: "Host: Drag players between seats (or tap two seats) to arrange teams",
  tapSeatToSwap: "Tap any seat to swap here",
  startGame: "Deal & Start Match",
  waitingForPlayers: "Fill all 4 seats to start (invite friends or add AI bots)",
  waitingForHost: "Waiting for host to start...",
  teamA: "Team A",
  teamB: "Team B",
  redTokens: "Red Tokens",
  blackTokens: "Black Tokens",
  turnTimer: "Turn Timer",
  timerOff: "Off",
  secondsShort: "s",
  sweepTermLabel: "8-Trick Sweep Name",
  roomOptions: "Room Options",
  trump: "Trump",
  tokens: "Tokens",
  tricks: "Tricks",
  cut: "Trump Cut",
  tie: "Tie (4–4)",
  shuffle: "Shuffling",
  hand: "Round",
  dealer: "Dealer",
  trumpCaller: "Trump Caller",
  matchPoint: "Match Point!",
  selectTrumpTitle: "Call the Trump Suit",
  selectTrumpSubtitle: "Pick a suit from your first 4 cards — or draw a blind card below.",
  orPickBlindCard: "Not happy with these 4? Draw the 5th, 6th, 7th, or 8th card:",
  blindCardLabel: (pos) => `${pos}th`,
  dealerRevealedCard: (dealer, selector, pos) =>
    `${dealer} reveals ${selector}'s ${pos}th card`,
  trumpIsNow: (suitName) => `${suitName} is Trump!`,
  dealingRemainingCards: "Dealing remaining cards...",
  waitingForTrump: (name) => `Waiting for ${name} to call Trump...`,
  waitingForCardsAfterTrump: (name) =>
    `${name} is checking their first 4 cards. Everyone else gets cards once Trump is called.`,
  yourTurn: "Your Turn",
  playersTurn: (name) => `${name}'s Turn`,
  trickWinnerBanner: (name) => `${name} wins the trick`,
  cutBanner: "Trump Cut!",
  wonCardsLabel: (tricks) => `${tricks} won`,
  peekHint: "Hold / hover to peek",
  revokeTitle: "Foul — Failed to Follow Suit!",
  revokeSubtitle: (playerName, ledSuitName) =>
    `${playerName} played another suit while still holding ${ledSuitName}!`,
  revokePlayedLabel: "Played",
  revokeHadInHandLabel: "Still in Hand",
  revokePenaltyNote: (winningTeam) =>
    `${winningTeam} wins the round by forfeit!`,
  handComplete: "Round Over",
  matchComplete: "Match Victory!",
  winsHand: (team) => `${team} Wins the Round`,
  winsMatch: (team) => `${team} Wins the Match!`,
  seporuTitle: "4–4 Tie (Seporu!)",
  seporuDesc: "No tokens awarded this round. +1 bonus token carries over to the next winning round!",
  carryOverActive: (count) => `+${count} Tie Bonus`,
  tokensAwarded: (count) => `+${count} Tokens`,
  baseTokensLabel: "Round Tokens",
  bonusTokensLabel: "Tie Bonus",
  nextHand: "Deal Next Round",
  playAgain: "Play New Match",
  backToLobby: "Back to Lobby",
  settingsTitle: "Settings",
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
  welcomeToRoom: (code) => `Join Omi Room ${code}`,
  enterNameToJoin: "Enter your nickname to take a seat.",
  joinTable: "Take a Seat",
  roomNotFound: "Room not found or has been closed.",
  roomClosedNotice: "This room has ended and was closed.",
  roomFull: "All 4 seats are currently taken.",
  spectatorNotice: "Watching as Spectator",
  backHome: "Back to Home",
  chatTabEmotes: "Chat",
  chatTabMemes: "Memes",
  memeCooldownNotice: (sec) => `Cooldown: wait ${sec}s`,
  memeSentBy: (name) => `${name} sent a meme`,
  emotes: {
    niceCut: { label: "Nice cut!", emoji: "✂️" },
    kapothiIncoming: { label: "Sweep incoming!", emoji: "🔥" },
    seporu: { label: "It's a tie!", emoji: "⚖️" },
    wellPlayed: { label: "Well played!", emoji: "👏" },
    hurryUp: { label: "Your turn!", emoji: "⏱️" },
    goodGame: { label: "GG!", emoji: "🃏" },
    trustMe: { label: "Trust me, partner!", emoji: "🤝" },
    noTrumps: { label: "Out of trumps!", emoji: "😅" },
    aceComing: { label: "Watch out, Ace!", emoji: "♠️" },
    oops: { label: "Oops, my bad!", emoji: "😬" },
    haha: { label: "Haha! Gotcha!", emoji: "😂" },
    danger: { label: "Uh oh... trouble!", emoji: "💀" },
    bigBrain: { label: "Big brain move!", emoji: "🧠" },
    rematch: { label: "One more round!", emoji: "🔁" },
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
        "4 players in 2 teams sitting across from each other: Team A (Seats 1 & 3) vs Team B (Seats 2 & 4).",
        "Dealing, trump selection, and turns always move anti-clockwise (to the right).",
      ],
    },
    {
      title: "First 4 Cards & Blind 5th–8th Trump Draw",
      points: [
        "After shuffling, only the Trump Caller gets their first 4 cards first.",
        "They can call Trump from those 4 cards — or draw the face-down 5th, 6th, 7th, or 8th card.",
        "If a blind card is drawn, the dealer flips only that card for everyone and its suit becomes Trump (displayed at the top).",
        "Everyone then gets their 8 cards, and the Trump Caller leads the first trick. Next round, the Trump Caller rotates anti-clockwise.",
      ],
    },
    {
      title: "Trick Play, Trump Cuts & Follow-Suit Foul",
      points: [
        "You must follow the led suit if you have it. All cards in your hand stay freely clickable with no hints.",
        "If you hold the led suit and still play another suit or cut with Trump, it's a foul — the other team immediately wins the round (+2 tokens)!",
        "If you genuinely don't have the led suit, you can cut with a Trump card or discard any card.",
        "Won tricks sit face-down next to the player who won them — hover or press-and-hold to flip and peek at any won pile!",
      ],
    },
    {
      title: "Token Scoring (First to 10 Wins)",
      points: [
        "Trump team wins 5–7 tricks → +1 token.",
        "Non-trump team wins 5–7 tricks → +2 tokens.",
        "Kapothi / Basthe (8–0 sweep) → +3 tokens!",
        "4–4 Tie (Seporu) → 0 tokens now, +1 bonus token stacks onto the next winning round.",
        "If a player goes offline for 15 seconds, an AI bot fills in until that same player reconnects.",
      ],
    },
  ],
  footerNote: "Built for live Sri Lankan Omi games with friends.",
};

const si: I18nDict = {
  appName: "ඕමි",
  tagline: "අපේ සුපුරුදු ශ්‍රී ලාංකික ඕමි අත්දැකීම",
  createRoom: "අලුත් කාමරයක් හදන්න",
  joinRoom: "කාමරයකට එක්වෙන්න",
  nicknameLabel: "ඔයාගේ නම",
  nicknamePlaceholder: "උදා: කසුන්, දිල්ෂාන්, නිමාලි...",
  roomCodeLabel: "අක්ෂර 6 කාමර කේතය",
  roomCodePlaceholder: "ABC123",
  enterTable: "ඇතුළු වෙන්න",
  creating: "කාමරය හදනවා...",
  joining: "කාමරය හොයනවා...",
  howToPlay: "සෙල්ලම් කරන හැටි",
  settings: "සැකසුම්",
  leaveRoom: "ඉවත් වෙන්න",
  disbandRoom: "කාමරය වහන්න",
  closeRoom: "අවසන් කර වහන්න",
  copyInviteLink: "ලින්ක් එක කොපි කරන්න",
  linkCopied: "ලින්ක් එක කොපි වුණා!",
  copyCode: "කේතය කොපි කරන්න",
  codeCopied: "කොපි වුණා!",
  copyFailed: "කොපි කරන්න බැරි වුණා. නැවත උත්සාහ කරන්න හෝ අතින් කොපි කරන්න.",
  shareWhatsApp: "WhatsApp",
  shareWhatsAppNormal: "WhatsApp (සාමාන්‍ය)",
  shareWhatsAppBusiness: "WhatsApp Business",
  shareOtherApps: "වෙනත් ඇප්...",
  whatsAppMessage: (code, url) =>
    `එන්න ඕමි අතක් ගහමු! 🃏\nකාමර කේතය: ${code}\nමෙතැනින් එන්න: ${url}`,
  roomLobby: "ඕමි කාමරය",
  roomCode: "කේතය",
  hostBadge: "ප්‍රධානියා",
  botBadge: "AI බොට්",
  youBadge: "ඔයා",
  partnerBadge: "සගයා",
  online: "සබැඳි",
  offline: "නොබැඳි",
  offlineBotIn: (sec) => `නොබැඳි • බොට් ${sec}ත.`,
  botTakeoverBadge: "AI ආදේශක",
  botTakeoverBanner: (name) => `${name} ආපහු එනකල් AI බොට් සෙල්ලම් කරනවා`,
  emptySeat: "හිස් අසුන",
  clickToSit: "වාඩි වෙන්න ඔබන්න",
  addBot: "+ AI බොට්",
  removeBot: "ඉවත් කරන්න",
  fillWithBots: "හිස් තැන් වලට බොට්ලා දාන්න",
  shuffleTeams: "පිල් මිශ්‍ර කරන්න",
  dragToArrange: "ප්‍රධානියා: පිල් හදන්න ක්‍රීඩකයන් ඇදලා දාන්න (හෝ අසුන් 2ක් ඔබන්න)",
  tapSeatToSwap: "මාරු කරන්න වෙන අසුනක් ඔබන්න",
  startGame: "අනනවා • අත අරඹන්න",
  waitingForPlayers: "අසුන් 4ම පිරුණාම අත අරඹන්න පුළුවන් (යාලුවන්ට ලින්ක් එක යවන්න හෝ බොට්ලා දාන්න)",
  waitingForHost: "ප්‍රධානියා අත අරඹනකල් පොඩ්ඩක් ඉන්න...",
  teamA: "පිල A",
  teamB: "පිල B",
  redTokens: "රතු කැට",
  blackTokens: "කළු කැට",
  turnTimer: "වාර කාලය",
  timerOff: "නැත",
  secondsShort: "ත.",
  sweepTermLabel: "ගොඩ 8ම ජයග්‍රහණය",
  roomOptions: "කාමර සැකසුම්",
  trump: "තුරුම්පු",
  tokens: "කැට",
  tricks: "ගොඩ",
  cut: "කපනවා",
  tie: "සෙපෝරු (4–4)",
  shuffle: "අනනවා",
  hand: "අත",
  dealer: "බෙදන්නා",
  trumpCaller: "තුරුම්පු අඬන්නා",
  matchPoint: "අවසන් කැට!",
  selectTrumpTitle: "තුරුම්පු තෝරන්න",
  selectTrumpSubtitle: "මුල් කාඩ් 4 බලලා තුරුම්පු කියන්න — නැත්නම් පහළින් 5–8 කාඩ් එකක් අදින්න.",
  orPickBlindCard: "මුල් කාඩ් 4 හරි නැද්ද? 5, 6, 7 හෝ 8 වෙනි කාඩ් එක තෝරන්න:",
  blindCardLabel: (pos) => `${pos}වෙනි`,
  dealerRevealedCard: (dealer, selector, pos) =>
    `${dealer} විසින් ${selector} ගේ ${pos}වෙනි කාඩ් එක පෙන්නුවා`,
  trumpIsNow: (suitName) => `තුරුම්පු ${suitName}!`,
  dealingRemainingCards: "ඉතිරි කාඩ් බෙදනවා...",
  waitingForTrump: (name) => `${name} තුරුම්පු අනනකල් ඉන්න...`,
  waitingForCardsAfterTrump: (name) =>
    `${name} මුල් කාඩ් 4 බලනවා. තුරුම්පු කිව්වම අනිත් හැමෝටම කාඩ් ලැබෙනවා.`,
  yourTurn: "ඔයාගේ වාරේ!",
  playersTurn: (name) => `${name} ගේ වාරේ`,
  trickWinnerBanner: (name) => `${name} ගොඩ ගත්තා!`,
  cutBanner: "කපනවා!",
  wonCardsLabel: (tricks) => `ගොඩ ${tricks}`,
  peekHint: "බලන්න ඔබාගෙන ඉන්න",
  revokeTitle: "වැරදි කාඩ් එකක් දැම්මා!",
  revokeSubtitle: (playerName, ledSuitName) =>
    `${playerName} ළඟ ${ledSuitName} තියෙද්දි වෙන කාඩ් එකක් දැම්මා!`,
  revokePlayedLabel: "දාපු කාඩ් එක",
  revokeHadInHandLabel: "අතේ තිබුණු කාඩ් එක",
  revokePenaltyNote: (winningTeam) =>
    `ඒ වරද නිසා ${winningTeam} මේ අත දිනුවා!`,
  handComplete: "අත ඉවරයි",
  matchComplete: "තරගය දිනුවා!",
  winsHand: (team) => `${team} මේ අත දිනුවා!`,
  winsMatch: (team) => `${team} තරගය දිනුවා!`,
  seporuTitle: "සෙපෝරු! (4–4 සම)",
  seporuDesc: "දැන් කැට ලැබෙන්නේ නෑ. ඊළඟ දිනන අතට අමතර කැට +1 ක් එකතු වෙනවා!",
  carryOverActive: (count) => `සෙපෝරු +${count}`,
  tokensAwarded: (count) => `කැට +${count}`,
  baseTokensLabel: "අතේ කැට",
  bonusTokensLabel: "සෙපෝරු අමතර",
  nextHand: "ඊළඟ අත බෙදන්න",
  playAgain: "අලුත් තරගයක්",
  backToLobby: "කාමරයට ආපහු",
  settingsTitle: "සැකසුම්",
  languageLabel: "භාෂාව / Language",
  soundEffects: "ශබ්ද",
  masterVolume: "ශබ්ද ප්‍රමාණය",
  animationSpeed: "වේගය",
  speedNormal: "සාමාන්‍ය",
  speedFast: "වේගවත්",
  tableTheme: "මේස පාට",
  themeEmerald: "මරකත කොළ",
  themeNavy: "රාජකීය නිල්",
  themeSlate: "රාත්‍රී අළු",
  cardBackLabel: "කාඩ් පිටුපස",
  cardBackCrimson: "රාජකීය රතු",
  cardBackGold: "ලංකා රන්",
  cardBackSapphire: "නිල් මැණික්",
  close: "වහන්න",
  welcomeToRoom: (code) => `ඕමි කාමරය ${code}`,
  enterNameToJoin: "වාඩි වෙන්න ඔයාගේ නම දාන්න.",
  joinTable: "වාඩි වෙන්න",
  roomNotFound: "කාමරය හොයාගන්න බෑ හෝ වහලා දාලා.",
  roomClosedNotice: "මේ කාමරය අවසන් කරලා වහලා දැම්මා.",
  roomFull: "අසුන් 4ම දැනටමත් පිරිලා.",
  spectatorNotice: "බලාගෙන ඉන්නවා",
  backHome: "මුල් පිටුවට",
  chatTabEmotes: "චැට්",
  chatTabMemes: "මීම්ස්",
  memeCooldownNotice: (sec) => `පොඩ්ඩක් ඉන්න: ${sec}ත.`,
  memeSentBy: (name) => `${name} මීම් එකක් දැම්මා`,
  emotes: {
    niceCut: { label: "නියම කැපිල්ල!", emoji: "✂️" },
    kapothiIncoming: { label: "කපෝති එනවා!", emoji: "🔥" },
    seporu: { label: "සෙපෝරු!", emoji: "⚖️" },
    wellPlayed: { label: "සුපිරි ගැහිල්ලක්!", emoji: "👏" },
    hurryUp: { label: "දාන්නකෝ ඉක්මනට!", emoji: "⏱️" },
    goodGame: { label: "නියම අතක්!", emoji: "🃏" },
    trustMe: { label: "මාව විශ්වාස කරපන්!", emoji: "🤝" },
    noTrumps: { label: "මගේ තුරුම්පු ඉවරයි!", emoji: "😅" },
    aceComing: { label: "ආසියා එනවා බලාගෙන!", emoji: "♠️" },
    oops: { label: "අයියෝ වැරදුණා!", emoji: "😬" },
    haha: { label: "හහ්හා අහුවුණානේ!", emoji: "😂" },
    danger: { label: "බඩුම තමයි!", emoji: "💀" },
    bigBrain: { label: "මොළේ තමයි මොළේ!", emoji: "🧠" },
    rematch: { label: "තව අතක් ගහමු!", emoji: "🔁" },
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
  rulesTitle: "ඕමි සෙල්ලම් කරන හැටි",
  rulesSections: [
    {
      title: "කාඩ් 32, පිල් සහ දිශාව",
      points: [
        "ඉස්කෝප්ප (♠), හාරත (♥), රුවිත (♦), කලාබර (♣) වර්ග 4න් ආසියා (ලොකුම), හේරා, පොරෝ, බූරුවා, 10, 9, 8, 7.",
        "4 දෙනා මුහුණට මුහුණ පිල් 2කට වාඩි වෙනවා: පිල A (අසුන් 1 & 3) සහ පිල B (අසුන් 2 & 4).",
        "කාඩ් අනනවා, බෙදනවා සහ වාර යන්නේ වාමාවර්තව (දකුණු පැත්තට).",
      ],
    },
    {
      title: "මුල් කාඩ් 4 සහ 5–8 තුරුම්පු ඇදීම",
      points: [
        "කාඩ් අනලා මුලින්ම තුරුම්පු අඬන කෙනාට විතරක් කාඩ් 4ක් ලැබෙනවා.",
        "ඒ කාඩ් 4න් තුරුම්පු කියන්න පුළුවන් — හරි කාඩ් නැත්නම් 5, 6, 7 හෝ 8 වෙනි කාඩ් එක තෝරන්න පුළුවන්.",
        "එතකොට බෙදන්නා ඒ තෝරපු කාඩ් එක විතරක් හැමෝටම පෙන්නලා ඒකේ වර්ගය තුරුම්පු කරනවා (උඩින් පේනවා).",
        "ඊට පස්සේ හැමෝටම කාඩ් 8 ලැබිලා තුරුම්පු අඬපු කෙනා මුල් කාඩ් එක දානවා. ඊළඟ අතේ තුරුම්පු අඬන කෙනා වාමාවර්තව මාරු වෙනවා.",
      ],
    },
    {
      title: "ගොඩ ගැනීම, කපනවා සහ වැරදි කාඩ් නීතිය",
      points: [
        "මුලින් දාපු වර්ගයේ කාඩ් අතේ තියෙනවා නම් ඒකෙන්ම දාන්න ඕනේ. කිසිම කාඩ් එකක් අවහිර කරන්නේ නෑ.",
        "ඒ වර්ගයේ කාඩ් අතේ තියෙද්දි වෙන කාඩ් එකක් හෝ තුරුම්පු වලින් කපනවා නම් අනිත් පිල ක්ෂණිකව ඒ අත දිනනවා (කැට +2)!",
        "ඒ වර්ගය ඇත්තටම අතේ නැත්නම් තුරුම්පු වලින් කපනවා හෝ ඕනෑම කාඩ් එකක් දාන්න පුළුවන්.",
        "දිනපු ගොඩවල් ඒ ක්‍රීඩකයා ළඟ යටිකුරුව තියෙනවා — ඒවා උඩ ඔබාගෙන ඉඳලා බලන්න පුළුවන්!",
      ],
    },
    {
      title: "කැට ගණන් (කැට 10 මුලින්ම දිනන පිල ජය)",
      points: [
        "තුරුම්පු අඬපු පිල ගොඩ 5–7 දිනුවොත් → කැට +1.",
        "අනිත් පිල ගොඩ 5–7 දිනුවොත් → කැට +2.",
        "කපෝති / බස්තේ (ගොඩ 8ම දිනුවොත්) → කැට +3!",
        "සෙපෝරු (4–4 සම) → දැන් කැට 0; ඊළඟ දිනන අතට අමතර කැට +1 එකතු වෙනවා.",
        "කවුරුහරි තත්පර 15ක් නොබැඳි වුණොත් AI බොට් ආදේශ වෙනවා; ඒ කෙනාම ආපහු ආවම සෙල්ලම දිගටම කරන්න පුළුවන්.",
      ],
    },
  ],
  footerNote: "යාලුවන් එක්ක සජීවීව ඕමි ගහන්නම හදපු ඇප් එක.",
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
