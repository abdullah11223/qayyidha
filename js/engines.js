// محرّكات قواعد الألعاب — منقولة حرفيًا من منطق BalootEngine / BintAlSebhaEngine
// الأصلي (Swift). كل محرك يطبّق نفس الواجهة: totals(), evaluate(), objectiveDescription().

function totals(participants, rounds) {
  const t = {};
  for (const p of participants) t[p.id] = 0;
  for (const round of rounds) {
    for (const score of round.scores) {
      t[score.participantId] = (t[score.participantId] || 0) + score.points;
    }
  }
  return t;
}

export const BalootEngine = {
  gameType: 'baloot',
  allowsNegativeInput: false,
  defaultTargetScore: 152,
  isTargetScoreConfigurable: false,
  objectiveDescription(targetScore) {
    return `الفريق الذي يصل إلى ${targetScore} نقطة أو أكثر يفوز`;
  },
  totals,
  evaluate(participants, rounds, targetScore) {
    const t = totals(participants, rounds);
    const qualifying = Object.keys(t).filter((id) => t[id] >= targetScore);
    if (qualifying.length === 0) return { isFinished: false, winnerIDs: [], summary: '' };

    const highest = Math.max(...qualifying.map((id) => t[id]));
    const winners = qualifying.filter((id) => t[id] === highest);

    // تعادل تام بين فريقين وصلا معًا لنفس النقاط: نكمل جولة فاصلة إضافية.
    if (winners.length > 1) return { isFinished: false, winnerIDs: [], summary: '' };

    const winnerId = winners[0];
    const winner = participants.find((p) => p.id === winnerId);
    if (!winner) return { isFinished: false, winnerIDs: [], summary: '' };

    const scoreLine = [...participants]
      .sort((a, b) => (t[b.id] || 0) - (t[a.id] || 0))
      .map((p) => `${p.name}: ${t[p.id] || 0}`)
      .join(' - ');

    return {
      isFinished: true,
      winnerIDs: [winnerId],
      summary: `فاز ${winner.name} بنتيجة ${scoreLine}`,
    };
  },
};

export const BintAlSebhaEngine = {
  gameType: 'bintAlSebha',
  allowsNegativeInput: true,
  defaultTargetScore: 300,
  isTargetScoreConfigurable: true,
  objectiveDescription(targetScore) {
    return `اللاعب الذي يصل إلى ${targetScore} نقطة أو أكثر يخسر، والأقل نقاطًا يفوز`;
  },
  totals,
  evaluate(participants, rounds, targetScore) {
    const t = totals(participants, rounds);
    const losers = Object.keys(t).filter((id) => t[id] >= targetScore);
    if (losers.length === 0) return { isFinished: false, winnerIDs: [], summary: '' };

    const lowest = Math.min(...Object.values(t));
    const winnerIDs = Object.keys(t).filter((id) => t[id] === lowest);

    const winnerNames = participants
      .filter((p) => winnerIDs.includes(p.id))
      .map((p) => p.name)
      .join(' و ');

    const scoreLine = [...participants]
      .sort((a, b) => (t[a.id] || 0) - (t[b.id] || 0))
      .map((p) => `${p.name}: ${t[p.id] || 0}`)
      .join(' - ');

    return {
      isFinished: true,
      winnerIDs,
      summary: `فاز ${winnerNames} بنتيجة ${scoreLine}`,
    };
  },
};

export function engineFor(gameType) {
  return gameType === 'baloot' ? BalootEngine : BintAlSebhaEngine;
}

export const GameTypes = {
  baloot: {
    id: 'baloot',
    displayName: 'البلوت',
    isTeamBasedByDefault: true,
    maxPlayers: 4,
    minPlayers: 4,
    symbol: 'club',
  },
  bintAlSebha: {
    id: 'bintAlSebha',
    displayName: 'بنت السبيت',
    isTeamBasedByDefault: false,
    maxPlayers: 4,
    minPlayers: 2,
    symbol: 'people',
  },
};
