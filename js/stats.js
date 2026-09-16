import { engineFor, GameTypes } from './engines.js';

// يوازي PlayerStatsCalculator الأصلي: يمر على كل الجلسات المنتهية لحساب
// عدد المباريات، الفوز، ومتوسط النقاط للاعب ضمن لعبة واحدة — بدون تخزين مكرر.
export function statsFor(player, gameType, allSessionsWithData) {
  const finished = allSessionsWithData.filter(
    (s) => s.session.isFinished && s.session.gameType === gameType
  );

  let matchesPlayed = 0;
  let wins = 0;
  let pointsSum = 0;
  const engine = engineFor(gameType);

  for (const { session, participants, rounds } of finished) {
    const participant = participants.find((p) => p.playerIds.includes(player.id));
    if (!participant) continue;
    matchesPlayed++;

    const totals = engine.totals(participants, rounds);
    pointsSum += totals[participant.id] || 0;

    if (session.winnerParticipantIDs.includes(participant.id)) wins++;
  }

  const averagePoints = matchesPlayed > 0 ? pointsSum / matchesPlayed : 0;
  const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

  return {
    playerId: player.id,
    playerName: player.name,
    gameType,
    matchesPlayed,
    wins,
    averagePoints,
    winRate,
  };
}

export function overallStatsFor(player, allSessionsWithData) {
  let matches = 0;
  let wins = 0;
  for (const gameType of Object.keys(GameTypes)) {
    const s = statsFor(player, gameType, allSessionsWithData);
    matches += s.matchesPlayed;
    wins += s.wins;
  }
  return { matches, winRate: matches > 0 ? wins / matches : 0 };
}
