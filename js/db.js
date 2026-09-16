// طبقة تخزين محلي (localStorage) توازي كيانات SwiftData الخمسة في التطبيق الأصلي:
// Player, GameSession, Participant, GameRound, RoundScore.
// كل كيان مخزّن كمصفوفة JSON مستقلة تحت مفتاحه الخاص.

const KEYS = {
  players: 'qayyidha_players',
  sessions: 'qayyidha_sessions',
  participants: 'qayyidha_participants',
  rounds: 'qayyidha_rounds',
  scores: 'qayyidha_scores',
};

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function save(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

export const DB = {
  // ---------- Players ----------
  allPlayers() {
    return load(KEYS.players).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  },
  addPlayer(name) {
    const players = load(KEYS.players);
    const player = { id: uid(), name: name.trim(), createdAt: Date.now() };
    players.push(player);
    save(KEYS.players, players);
    return player;
  },
  deletePlayer(id) {
    save(KEYS.players, load(KEYS.players).filter((p) => p.id !== id));
  },

  // ---------- Sessions ----------
  allSessions() {
    return load(KEYS.sessions).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  getSession(id) {
    return load(KEYS.sessions).find((s) => s.id === id) || null;
  },
  createSession({ gameType, targetScore, dealerStartSeat, reverseViewEnabledByDefault }) {
    const sessions = load(KEYS.sessions);
    const now = Date.now();
    const session = {
      id: uid(),
      gameType,
      createdAt: now,
      updatedAt: now,
      isFinished: false,
      targetScore,
      dealerStartSeat,
      dealerManualOffset: 0,
      reverseViewEnabledByDefault: !!reverseViewEnabledByDefault,
      winnerParticipantIDs: [],
      resultSummary: null,
    };
    sessions.push(session);
    save(KEYS.sessions, sessions);
    return session;
  },
  updateSession(id, patch) {
    const sessions = load(KEYS.sessions);
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], ...patch, updatedAt: Date.now() };
    save(KEYS.sessions, sessions);
    return sessions[idx];
  },
  deleteSession(id) {
    save(KEYS.sessions, load(KEYS.sessions).filter((s) => s.id !== id));
    const rounds = load(KEYS.rounds).filter((r) => r.sessionId === id).map((r) => r.id);
    save(KEYS.rounds, load(KEYS.rounds).filter((r) => r.sessionId !== id));
    save(KEYS.scores, load(KEYS.scores).filter((sc) => !rounds.includes(sc.roundId)));
    save(KEYS.participants, load(KEYS.participants).filter((p) => p.sessionId !== id));
  },

  // ---------- Participants ----------
  participantsForSession(sessionId) {
    return load(KEYS.participants)
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  },
  addParticipant({ sessionId, name, playerIds, orderIndex }) {
    const list = load(KEYS.participants);
    const participant = { id: uid(), sessionId, name, playerIds, orderIndex };
    list.push(participant);
    save(KEYS.participants, list);
    return participant;
  },

  // ---------- Rounds & Scores ----------
  roundsForSession(sessionId) {
    const rounds = load(KEYS.rounds)
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.index - b.index);
    const scores = load(KEYS.scores);
    return rounds.map((r) => ({
      ...r,
      scores: scores.filter((s) => s.roundId === r.id),
    }));
  },
  addRound(sessionId, pointsByParticipant) {
    const rounds = load(KEYS.rounds);
    const existing = rounds.filter((r) => r.sessionId === sessionId);
    const round = { id: uid(), sessionId, index: existing.length, createdAt: Date.now() };
    rounds.push(round);
    save(KEYS.rounds, rounds);

    const scores = load(KEYS.scores);
    for (const [participantId, points] of Object.entries(pointsByParticipant)) {
      scores.push({ id: uid(), roundId: round.id, participantId, points });
    }
    save(KEYS.scores, scores);
    return round;
  },
  deleteLastRound(sessionId) {
    const rounds = load(KEYS.rounds).filter((r) => r.sessionId === sessionId).sort((a, b) => a.index - b.index);
    const last = rounds[rounds.length - 1];
    if (!last) return;
    save(KEYS.rounds, load(KEYS.rounds).filter((r) => r.id !== last.id));
    save(KEYS.scores, load(KEYS.scores).filter((s) => s.roundId !== last.id));
  },

  // ---------- All sessions (for stats aggregation) ----------
  allSessionsWithData() {
    return this.allSessions().map((s) => ({
      session: s,
      participants: this.participantsForSession(s.id),
      rounds: this.roundsForSession(s.id),
    }));
  },
};
