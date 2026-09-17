import { DB } from '../db.js';
import { overallStatsFor } from '../stats.js';

export function renderStats(el, Nav) {
  const players = DB.allPlayers();
  const sessionsData = DB.allSessionsWithData();

  const ranked = players
    .map((player) => ({ player, ...overallStatsFor(player, sessionsData) }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.matches - a.matches;
    });

  let html = `<div class="topbar"><div class="title">الأبطال</div></div>`;

  if (players.length === 0) {
    html += `<div class="empty-state">
      <div class="icon">👥</div>
      <div class="t">لا يوجد لاعبون بعد</div>
      <div>أضف لاعبين عند إنشاء أول جلسة</div>
    </div>`;
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    html += ranked
      .map((entry, index) => {
        const medal = entry.matches > 0 && index < 3 ? medals[index] : '';
        const initial = entry.player.name.trim().charAt(0) || '؟';
        return `
        <div class="player-stat-row" data-player="${entry.player.id}">
          <div class="avatar">${initial}</div>
          <div class="info">
            <div class="pname">${entry.player.name}</div>
            <div class="meta">${entry.matches} مباراة ${
          entry.matches > 0 ? `· <span class="wr">${Math.round(entry.winRate * 100)}% فوز</span>` : ''
        }</div>
          </div>
          ${medal ? `<div class="crown">${medal}</div>` : ''}
        </div>`;
      })
      .join('');
  }

  el.innerHTML = html;
  el.querySelectorAll('[data-player]').forEach((row) => {
    row.addEventListener('click', () => Nav.openPlayerDetail(row.dataset.player));
  });
}
