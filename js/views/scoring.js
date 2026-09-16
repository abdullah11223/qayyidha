import { DB } from '../db.js';
import { engineFor, GameTypes } from '../engines.js';
import { ICONS } from '../icons.js';

const QUICK_ADD = [10, 16, 20, 26, 30, 40, 50, 100];

export function renderScoring(el, Nav, sessionId) {
  const state = {
    inputs: {},
    focusedId: null,
    isReversedViewEnabled: false,
  };

  let session, participants, rounds, engine;

  function load() {
    session = DB.getSession(sessionId);
    participants = DB.participantsForSession(sessionId);
    rounds = DB.roundsForSession(sessionId);
    engine = engineFor(session.gameType);
  }

  function playerName(id) {
    const p = DB.allPlayers().find((pl) => pl.id === id);
    return p ? p.name : '-';
  }

  function memberNames(participant) {
    if (participant.playerIds.length <= 1) return '';
    return participant.playerIds.map(playerName).join(' و ');
  }

  function seatCount() {
    return GameTypes[session.gameType].isTeamBasedByDefault ? 4 : Math.max(participants.length, 1);
  }

  function currentDealerSeatIndex() {
    const totalSteps = rounds.length + session.dealerManualOffset;
    const raw = (session.dealerStartSeat - totalSteps) % seatCount();
    return raw >= 0 ? raw : raw + seatCount();
  }

  function currentDealerName() {
    const idx = currentDealerSeatIndex();
    return participants[idx] ? participants[idx].name : '-';
  }

  function advanceDealerManually() {
    session = DB.updateSession(session.id, { dealerManualOffset: session.dealerManualOffset + 1 });
    render();
  }

  function totals() {
    return engine.totals(participants, rounds);
  }

  function saveRound() {
    const points = {};
    for (const p of participants) {
      const raw = state.inputs[p.id];
      points[p.id] = raw ? parseInt(raw, 10) || 0 : 0;
    }
    DB.addRound(session.id, points);
    load();

    const outcome = engine.evaluate(participants, rounds, session.targetScore);
    if (outcome.isFinished) {
      session = DB.updateSession(session.id, {
        isFinished: true,
        winnerParticipantIDs: outcome.winnerIDs,
        resultSummary: outcome.summary,
      });
      load();
    }

    state.inputs = {};
    state.focusedId = null;
    render();
    if (outcome.isFinished) showGameOver();
  }

  function undoLastRound() {
    DB.deleteLastRound(session.id);
    session = DB.updateSession(session.id, {
      isFinished: false,
      winnerParticipantIDs: [],
      resultSummary: null,
    });
    load();
    render();
  }

  function applyQuickAdd(value) {
    const targetId = state.focusedId || (participants[0] && participants[0].id);
    if (!targetId) return;
    const current = parseInt(state.inputs[targetId] || '0', 10) || 0;
    state.inputs[targetId] = String(current + value);
    state.focusedId = targetId;
    render();
    const input = el.querySelector(`[data-entry="${targetId}"]`);
    if (input) input.focus();
  }

  function totalsHeaderHTML(reversed) {
    const t = totals();
    return `<div class="totals-row" style="${reversed ? 'transform:rotate(180deg);' : ''}">
      ${participants
        .map(
          (p) => `<div class="total-card card">
            <div class="pname">${p.name}</div>
            ${memberNames(p) ? `<span class="members">${memberNames(p)}</span>` : ''}
            <div class="score">${t[p.id] || 0}</div>
          </div>`
        )
        .join('')}
    </div>`;
  }

  function dealerSectionHTML() {
    if (session.isFinished) return '';
    if (GameTypes[session.gameType].isTeamBasedByDefault) {
      const angle = currentDealerSeatIndex() * 90;
      return `<div class="card dealer-arrow-wrap" id="dealer-arrow-wrap">
        <span class="dealer-arrow" style="transform:rotate(${angle}deg);">↑</span>
        <span class="label">الموزّع</span>
      </div>`;
    }
    return `<div class="objective" style="text-align:center; margin: 10px 0;">🂠 الموزّع: ${currentDealerName()}</div>`;
  }

  function roundEntryHTML() {
    if (session.isFinished) return '';
    return `<div class="card" style="margin-top:14px;">
      ${participants
        .map(
          (p) => `<div class="entry-row">
            <span class="name">${p.name}</span>
            <input type="number" inputmode="${engine.allowsNegativeInput ? 'text' : 'numeric'}" data-entry="${p.id}"
              value="${state.inputs[p.id] || ''}" placeholder="0" class="${state.focusedId === p.id ? 'focused' : ''}" />
          </div>`
        )
        .join('')}
      <div class="quick-add-label">إضافة سريعة</div>
      <div class="quick-add-row">
        ${QUICK_ADD.map((v) => `<button data-qa="${v}">+${v}</button>`).join('')}
        ${engine.allowsNegativeInput ? QUICK_ADD.map((v) => `<button data-qa="-${v}">-${v}</button>`).join('') : ''}
      </div>
      <button class="btn-primary" id="save-round-btn" style="margin-top:14px;">تسجيل اللفة</button>
    </div>`;
  }

  function roundsListHTML() {
    if (!rounds.length) return '';
    return `<div class="rounds-list">
      ${[...rounds]
        .reverse()
        .map(
          (r) => `<div class="round-row">
            <span class="idx">لفة ${r.index + 1}</span>
            ${participants
              .map((p) => `<span class="val">${(r.scores.find((s) => s.participantId === p.id) || {}).points ?? 0}</span>`)
              .join('')}
          </div>`
        )
        .join('')}
    </div>`;
  }

  function render() {
    el.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="back-btn">${ICONS.chevronLeft}</button>
        <div class="title">${GameTypes[session.gameType].displayName}</div>
        <div style="display:flex; gap:6px;">
          ${!session.isFinished && rounds.length ? '<button class="icon-btn" id="undo-btn" title="تراجع">↩</button>' : ''}
          <button class="icon-btn" id="reverse-btn" title="انعكاس النتيجة">⇅</button>
        </div>
      </div>

      ${totalsHeaderHTML(false)}
      ${dealerSectionHTML()}
      <div class="objective">${engine.objectiveDescription(session.targetScore)}</div>
      ${roundEntryHTML()}
      ${roundsListHTML()}
    `;

    if (state.isReversedViewEnabled) {
      const mirror = document.createElement('div');
      mirror.style.cssText =
        'position:sticky; bottom:0; background:rgba(12,46,31,0.95); backdrop-filter:blur(8px); padding:14px 0; margin-top:10px;';
      mirror.innerHTML = totalsHeaderHTML(true);
      el.appendChild(mirror);
    }

    wire();
  }

  function wire() {
    el.querySelector('#back-btn').addEventListener('click', () => {
      if (session.isFinished) {
        Nav.back();
        return;
      }
      Nav.showConfirm({
        title: 'هل تريد الخروج من الجلسة الحالية؟',
        message: 'النتائج محفوظة ويمكنك إكمال الجلسة لاحقًا من تبويب المباريات.',
        actions: [
          { label: 'خروج', danger: true, onTap: () => Nav.back() },
          { label: 'إلغاء' },
        ],
      });
    });

    const undoBtn = el.querySelector('#undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', undoLastRound);

    el.querySelector('#reverse-btn').addEventListener('click', () => {
      state.isReversedViewEnabled = !state.isReversedViewEnabled;
      render();
    });

    const dealerWrap = el.querySelector('#dealer-arrow-wrap');
    if (dealerWrap) dealerWrap.addEventListener('click', advanceDealerManually);

    el.querySelectorAll('[data-entry]').forEach((input) => {
      input.addEventListener('focus', () => { state.focusedId = input.dataset.entry; });
      input.addEventListener('input', () => { state.inputs[input.dataset.entry] = input.value; });
    });

    el.querySelectorAll('[data-qa]').forEach((btn) => {
      btn.addEventListener('click', () => applyQuickAdd(parseInt(btn.dataset.qa, 10)));
    });

    const saveBtn = el.querySelector('#save-round-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveRound);
  }

  function showGameOver() {
    Nav.showSheet((content) => {
      const t = totals();
      const ascending = session.gameType === 'bintAlSebha';
      const sorted = [...participants].sort((a, b) => (ascending ? t[a.id] - t[b.id] : t[b.id] - t[a.id]));

      content.innerHTML = `
        <div class="sheet-handle"></div>
        <div class="result-card">
          <div class="brand">🏆 قيّدها</div>
          <div class="gname">${GameTypes[session.gameType].displayName}</div>
          ${sorted
            .map((p, i) => {
              const isWinner = session.winnerParticipantIDs.includes(p.id);
              return `<div class="result-row ${isWinner ? 'win' : 'lose'}">
                <span class="rname">${i === 0 ? '👑' : ''} ${p.name}</span>
                <span class="rscore">${t[p.id] || 0}</span>
              </div>`;
            })
            .join('')}
          <div class="result-summary">${session.resultSummary || ''}</div>
          <button class="btn-primary" id="close-result-btn">تم</button>
        </div>
      `;
      content.querySelector('#close-result-btn').addEventListener('click', () => Nav.hideSheet());
    });
  }

  load();
  state.isReversedViewEnabled = session.reverseViewEnabledByDefault;
  render();
  if (session.isFinished) showGameOver();
}
