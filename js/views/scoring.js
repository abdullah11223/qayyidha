import { DB } from '../db.js';
import { engineFor, GameTypes } from '../engines.js';
import { ICONS } from '../icons.js';

const QUICK_ADD = {
  baloot: [4, 8, 16, 20, 26, 30, 44],
  bintAlSebha: [-5, 5, 7, 10, 15, 20],
};

export function renderScoring(el, Nav, sessionId) {
  const state = {
    inputs: {},
    focusedId: null,
    isReversedViewEnabled: false,
    prevScores: {},
  };

  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

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
    if (GameTypes[session.gameType].isTeamBasedByDefault) {
      const idx = currentDealerSeatIndex();
      return participants[idx] ? participants[idx].name : '-';
    }
    // في بنت السبيت: صاحب أعلى نقاط حاليًا هو من يوزّع (لا تناوب دوري).
    if (!participants.length) return '-';
    if (!rounds.length) {
      return (participants[session.dealerStartSeat] || participants[0]).name;
    }
    const t = totals();
    let leader = participants[0];
    for (const p of participants) {
      if ((t[p.id] || 0) > (t[leader.id] || 0)) leader = p;
    }
    return leader.name;
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
    vibrate(15);
    render();
    if (outcome.isFinished) {
      vibrate([30, 60, 30]);
      showGameOver();
    }
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
    vibrate(8);
    render();
  }

  function totalsHeaderHTML(reversed) {
    const t = totals();
    const cards = participants.map(
      (p) => `<div class="total-card card">
        <div class="pname">${p.name}</div>
        ${memberNames(p) ? `<span class="members">${memberNames(p)}</span>` : ''}
        <div class="score" data-pid="${p.id}" data-target="${t[p.id] || 0}">${state.prevScores[p.id] ?? t[p.id] ?? 0}</div>
      </div>`
    );

    const showMidDealer = GameTypes[session.gameType].isTeamBasedByDefault && !session.isFinished && cards.length === 2;
    let inner = cards.join('');
    if (showMidDealer) {
      const angle = currentDealerSeatIndex() * 90;
      inner = `${cards[0]}<div class="dealer-mid" data-dealer-mid="1" title="الموزّع - اضغط للتغيير اليدوي">
        <span class="dealer-arrow" style="transform:rotate(${angle}deg);">↑</span>
      </div>${cards[1]}`;
    }

    return `<div class="totals-row" style="${reversed ? 'transform:rotate(180deg);' : ''}">${inner}</div>`;
  }

  function animateScores() {
    el.querySelectorAll('.score[data-target]').forEach((node) => {
      const pid = node.dataset.pid;
      const target = parseInt(node.dataset.target, 10) || 0;
      const start = state.prevScores[pid] ?? target;
      if (start === target) {
        node.textContent = target;
        return;
      }
      const card = node.closest('.total-card');
      if (card) card.classList.add('pulse');
      const duration = 400;
      const startTime = performance.now();
      function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          state.prevScores[pid] = target;
          if (card) card.classList.remove('pulse');
        }
      }
      requestAnimationFrame(step);
    });
  }

  function dealerSectionHTML() {
    if (session.isFinished) return '';
    if (GameTypes[session.gameType].isTeamBasedByDefault) return '';
    return `<div class="objective" style="text-align:center; margin: 10px 0;">🂠 الموزّع: ${currentDealerName()}</div>`;
  }

  function roundEntryHTML() {
    if (session.isFinished) return '';
    return `<div class="card" style="margin-top:14px;">
      ${participants
        .map(
          (p) => `<div class="entry-row">
            <span class="name">${p.name}</span>
            ${engine.allowsNegativeInput ? `<button class="sign-btn" data-sign="${p.id}" type="button">±</button>` : ''}
            <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-entry="${p.id}"
              value="${state.inputs[p.id] || ''}" placeholder="0" class="${state.focusedId === p.id ? 'focused' : ''}" />
          </div>`
        )
        .join('')}
      <div class="quick-add-label">إضافة سريعة</div>
      <div class="quick-add-row">
        ${QUICK_ADD[session.gameType].map((v) => `<button data-qa="${v}">${v > 0 ? '+' + v : v}</button>`).join('')}
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
        'margin-top:auto; position:sticky; bottom:0; background:rgba(12,46,31,0.95); backdrop-filter:blur(8px); padding:14px 0;';
      mirror.innerHTML = totalsHeaderHTML(true);
      el.appendChild(mirror);
    }

    wire();
    animateScores();
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

    el.querySelectorAll('[data-dealer-mid]').forEach((node) => {
      node.addEventListener('click', advanceDealerManually);
    });

    el.querySelectorAll('[data-sign]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sign;
        const n = parseInt(state.inputs[id] || '0', 10) || 0;
        state.inputs[id] = String(-n);
        state.focusedId = id;
        render();
      });
    });

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

  function startRematch() {
    const isTeam = GameTypes[session.gameType].isTeamBasedByDefault;
    const seatCount = isTeam ? 4 : participants.length;
    const dealerStartSeat = seatCount > 0 ? Math.floor(Math.random() * seatCount) : 0;

    const newSession = DB.createSession({
      gameType: session.gameType,
      targetScore: session.targetScore,
      dealerStartSeat,
      reverseViewEnabledByDefault: session.reverseViewEnabledByDefault,
    });

    participants.forEach((p, index) => {
      DB.addParticipant({
        sessionId: newSession.id,
        name: p.name,
        playerIds: p.playerIds,
        orderIndex: index,
      });
    });

    Nav.hideSheet();
    Nav.openScoring(newSession.id);
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
          <div class="result-actions">
            <button class="btn-primary" id="rematch-btn">صكّة جديدة</button>
            <button class="btn-secondary" id="home-btn">القائمة الرئيسية</button>
            <button class="btn-secondary" id="view-log-btn">مشاهدة السجل</button>
          </div>
        </div>
      `;
      content.querySelector('#rematch-btn').addEventListener('click', startRematch);
      content.querySelector('#home-btn').addEventListener('click', () => {
        Nav.hideSheet();
        Nav.showTab('home');
      });
      content.querySelector('#view-log-btn').addEventListener('click', () => Nav.hideSheet());
    });
  }

  load();
  state.isReversedViewEnabled = session.reverseViewEnabledByDefault;
  render();
  if (session.isFinished) showGameOver();
}
