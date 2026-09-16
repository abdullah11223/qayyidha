import { DB } from '../db.js';
import { statsFor } from '../stats.js';
import { GameTypes } from '../engines.js';
import { ICONS } from '../icons.js';

export function renderPlayerDetail(el, Nav, playerId) {
  const player = DB.allPlayers().find((p) => p.id === playerId);
  const sessionsData = DB.allSessionsWithData();

  if (!player) {
    Nav.back();
    return;
  }

  const allStats = Object.keys(GameTypes).map((gt) => statsFor(player, gt, sessionsData));
  const totalMatches = allStats.reduce((a, s) => a + s.matchesPlayed, 0);
  const withMatches = allStats.filter((s) => s.matchesPlayed > 0);
  const bestGameType = withMatches.length
    ? withMatches.reduce((a, b) => (b.winRate > a.winRate ? b : a)).gameType
    : null;

  const initial = player.name.trim().charAt(0) || '؟';

  el.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="back-btn">${ICONS.chevronLeft}</button>
      <div class="title">${player.name}</div>
      <span style="width:28px;"></span>
    </div>

    <div style="text-align:center; margin: 10px 0 20px;">
      <div class="avatar" style="width:64px;height:64px;font-size:26px;margin:0 auto 10px;">${initial}</div>
      <div style="font-weight:800; font-size:18px;">${player.name}</div>
      <div class="hint">${totalMatches} مباراة إجمالًا</div>
    </div>

    ${allStats.map((s) => gameStatCard(s, s.gameType === bestGameType)).join('')}
  `;

  el.querySelector('#back-btn').addEventListener('click', () => Nav.back());
}

function gameStatCard(stats, isBest) {
  const gt = GameTypes[stats.gameType];
  const pct = Math.round(stats.winRate * 100);
  return `
    <div class="card game-stat-card">
      <div class="head">
        <div class="name">${ICONS[gt.symbol]} ${gt.displayName}</div>
        ${isBest ? '<div class="badge-best">الأفضل</div>' : ''}
      </div>
      <div class="stat-tiles">
        <div class="stat-tile"><div class="v">${stats.matchesPlayed}</div><div class="l">مباراة</div></div>
        <div class="stat-tile"><div class="v">${stats.wins}</div><div class="l">فوز</div></div>
        <div class="stat-tile"><div class="v">${stats.averagePoints.toFixed(1)}</div><div class="l">متوسط النقاط</div></div>
      </div>
      ${
        stats.matchesPlayed > 0
          ? `<div class="progress-row">
              <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
              <div class="pct">${pct}%</div>
            </div>`
          : ''
      }
    </div>
  `;
}
