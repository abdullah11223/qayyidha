import { DB } from '../db.js';
import { GameTypes, engineFor } from '../engines.js';
import { ICONS } from '../icons.js';

export function renderNewSession(el, Nav, preselectedGameType) {
  const initialGameType = preselectedGameType || DB.getLastGameType() || 'baloot';
  const state = {
    gameType: initialGameType,
    targetScore: engineFor(initialGameType).defaultTargetScore,
    selectedPlayers: [],
    teamAssignment: {}, // playerId -> 0/1
    teamNames: ['لنا', 'لهم'],
    lastShuffleSeats: [],
    enableReverseViewByDefault: DB.getReverseDefaultPref(),
  };

  function maxPlayers() {
    return GameTypes[state.gameType].maxPlayers;
  }
  function minPlayers() {
    return GameTypes[state.gameType].minPlayers;
  }

  function togglePlayer(player) {
    const idx = state.selectedPlayers.findIndex((p) => p.id === player.id);
    if (idx !== -1) {
      state.selectedPlayers.splice(idx, 1);
      delete state.teamAssignment[player.id];
      state.lastShuffleSeats = [];
    } else {
      const cap = state.gameType === 'baloot' ? Infinity : maxPlayers();
      if (state.selectedPlayers.length >= cap) return;
      state.selectedPlayers.push(player);
      if (state.gameType === 'baloot') {
        state.teamAssignment[player.id] = state.selectedPlayers.length % 2 === 1 ? 0 : 1;
      }
    }
    render();
  }

  function canShuffleTeams() {
    return state.gameType === 'baloot' && state.selectedPlayers.length >= 4;
  }

  function shuffleTeams() {
    if (!canShuffleTeams()) return;
    const drawn = [...state.selectedPlayers].sort(() => Math.random() - 0.5).slice(0, 4);
    state.selectedPlayers = drawn;
    state.teamAssignment = {};
    drawn.forEach((p, seatIndex) => {
      state.teamAssignment[p.id] = seatIndex % 2;
    });
    state.lastShuffleSeats = drawn;
    render();
  }

  function canStart() {
    if (state.targetScore <= 0) return false;
    if (state.selectedPlayers.length < minPlayers()) return false;
    if (state.gameType === 'baloot') {
      if (state.selectedPlayers.length !== 4) return false;
      const t0 = state.selectedPlayers.filter((p) => (state.teamAssignment[p.id] ?? 0) === 0).length;
      const t1 = state.selectedPlayers.filter((p) => (state.teamAssignment[p.id] ?? 0) === 1).length;
      return t0 === 2 && t1 === 2;
    }
    return true;
  }

  function createSessionAndStart() {
    DB.setLastGameType(state.gameType);
    DB.setReverseDefaultPref(state.enableReverseViewByDefault);

    const seatCount = GameTypes[state.gameType].isTeamBasedByDefault ? 4 : state.selectedPlayers.length;
    const dealerStartSeat = seatCount > 0 ? Math.floor(Math.random() * seatCount) : 0;

    const session = DB.createSession({
      gameType: state.gameType,
      targetScore: state.targetScore,
      dealerStartSeat,
      reverseViewEnabledByDefault: state.enableReverseViewByDefault,
    });

    if (GameTypes[state.gameType].isTeamBasedByDefault) {
      for (let teamIndex = 0; teamIndex < 2; teamIndex++) {
        const members = state.selectedPlayers.filter((p) => (state.teamAssignment[p.id] ?? 0) === teamIndex);
        DB.addParticipant({
          sessionId: session.id,
          name: state.teamNames[teamIndex] || `الفريق ${teamIndex + 1}`,
          playerIds: members.map((p) => p.id),
          orderIndex: teamIndex,
        });
      }
    } else {
      state.selectedPlayers.forEach((p, index) => {
        DB.addParticipant({ sessionId: session.id, name: p.name, playerIds: [p.id], orderIndex: index });
      });
    }

    Nav.openScoring(session.id);
  }

  function playersHeaderText() {
    if (state.gameType === 'baloot' && state.selectedPlayers.length > maxPlayers()) {
      return `المرشحون (${state.selectedPlayers.length})`;
    }
    return `اللاعبون (${state.selectedPlayers.length}/${maxPlayers()})`;
  }

  function render() {
    const allPlayers = DB.allPlayers();
    const showTargetStepper = engineFor(state.gameType).isTargetScoreConfigurable;
    const showTeamSection = state.gameType === 'baloot' && state.selectedPlayers.length === 4;

    el.innerHTML = `
      <div class="topbar">
        <button class="btn-secondary" id="cancel-btn">إلغاء</button>
        <span></span>
      </div>
      <h2 style="font-size:22px; font-weight:800; margin: 6px 0 16px;">جلسة جديدة</h2>

      <div class="field-label">اختر اللعبة</div>
      <div class="segmented" id="game-type-seg">
        <button data-gt="bintAlSebha" class="${state.gameType === 'bintAlSebha' ? 'active' : ''}">بنت السبيت</button>
        <button data-gt="baloot" class="${state.gameType === 'baloot' ? 'active' : ''}">البلوت</button>
      </div>

      ${showTargetStepper ? `
        <div class="field-label">رقم الخسارة</div>
        <div class="stepper-row">
          <div class="stepper-controls">
            <button id="ts-minus">−</button>
            <div class="stepper-value">${state.targetScore}</div>
            <button id="ts-plus">+</button>
          </div>
          <span class="hint" style="margin:0;">اللاعب اللي يوصله أو أكثر يخسر</span>
        </div>
      ` : ''}

      <div class="field-label">${playersHeaderText()}</div>
      <div class="add-player-row">
        <input class="text-input" id="new-player-name" placeholder="اسم لاعب جديد" />
        <button class="btn-secondary" id="add-player-btn">إضافة</button>
      </div>
      <div id="players-list">
        ${allPlayers
          .map((p) => {
            const selected = state.selectedPlayers.some((sp) => sp.id === p.id);
            return `<div class="player-row">
              <button class="del" data-del-player="${p.id}">حذف</button>
              <div style="flex:1; text-align:center;" data-toggle-player="${p.id}">
                <span class="name">${p.name}</span>
              </div>
              <span class="check">${selected ? '✓' : ''}</span>
            </div>`;
          })
          .join('') || '<div class="hint">لا يوجد لاعبون محفوظون بعد</div>'}
      </div>
      <div class="hint">${
        state.gameType === 'baloot'
          ? 'يمكنك اختيار أكثر من 4 لاعبين في البلوت لاستخدام "دِق الولد" أدناه.'
          : ''
      }</div>

      ${canShuffleTeams() ? `
        <div class="field-label">توزيع عشوائي</div>
        <div class="card">
          <button class="btn-secondary" id="shuffle-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
            🔀 دِق الولد
          </button>
          ${state.lastShuffleSeats.length ? seatingDiagram(state.lastShuffleSeats) : ''}
        </div>
        <div class="hint">يسحب 4 لاعبين عشوائيًا ويوزعهم على فريقين؛ المتقابلان في المخطط شريكان.</div>
      ` : ''}

      ${showTeamSection ? `
        <div class="field-label">توزيع الفرق</div>
        <div class="card">
          <input class="text-input" id="team-name-0" value="${state.teamNames[0]}" placeholder="اسم الفريق الأول" style="margin-bottom:8px;" />
          <input class="text-input" id="team-name-1" value="${state.teamNames[1]}" placeholder="اسم الفريق الثاني" style="margin-bottom:12px;" />
          ${state.selectedPlayers
            .map(
              (p) => `<div class="player-row">
                <select data-team-for="${p.id}" class="text-input" style="width:auto;">
                  <option value="0" ${(state.teamAssignment[p.id] ?? 0) === 0 ? 'selected' : ''}>${state.teamNames[0]}</option>
                  <option value="1" ${(state.teamAssignment[p.id] ?? 0) === 1 ? 'selected' : ''}>${state.teamNames[1]}</option>
                </select>
                <span class="name">${p.name}</span>
              </div>`
            )
            .join('')}
        </div>
      ` : ''}

      <div class="card" style="margin-top:18px;">
        <div class="toggle-row">
          <label class="switch">
            <input type="checkbox" id="reverse-toggle" ${state.enableReverseViewByDefault ? 'checked' : ''} />
            <span class="track"><span class="thumb"></span></span>
          </label>
          <span>تفعيل انعكاس النتيجة تلقائيًا</span>
        </div>
        <div class="hint">يعرض شريط النقاط مقلوبًا 180° أسفل الشاشة منذ بداية الجلسة.</div>
      </div>

      <div style="flex:1;"></div>
      <button class="btn-primary" id="start-btn" style="margin-top:20px;" ${canStart() ? '' : 'disabled'}>ابدأ الجلسة</button>
    `;

    wire();
  }

  function seatingDiagram(seats) {
    const names = seats.map((p) => p.name);
    return `<div class="seat-diagram">
      <div class="seat">${names[0] || ''}</div>
      <div class="seat-row">
        <div class="seat">${names[3] || ''}</div>
        <div class="seat-center" style="font-size:22px;">🔀</div>
        <div class="seat">${names[1] || ''}</div>
      </div>
      <div class="seat">${names[2] || ''}</div>
    </div>`;
  }

  function wire() {
    el.querySelector('#cancel-btn').addEventListener('click', () => Nav.back());

    el.querySelectorAll('#game-type-seg button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.gameType = btn.dataset.gt;
        state.targetScore = engineFor(state.gameType).defaultTargetScore;
        state.selectedPlayers = [];
        state.teamAssignment = {};
        state.lastShuffleSeats = [];
        render();
      });
    });

    const tsMinus = el.querySelector('#ts-minus');
    const tsPlus = el.querySelector('#ts-plus');
    if (tsMinus) tsMinus.addEventListener('click', () => { state.targetScore = Math.max(10, state.targetScore - 10); render(); });
    if (tsPlus) tsPlus.addEventListener('click', () => { state.targetScore = Math.min(2000, state.targetScore + 10); render(); });

    el.querySelector('#add-player-btn').addEventListener('click', () => {
      const input = el.querySelector('#new-player-name');
      const name = input.value.trim();
      if (!name) return;
      const player = DB.addPlayer(name);
      togglePlayer(player);
    });

    el.querySelectorAll('[data-toggle-player]').forEach((n) => {
      n.addEventListener('click', () => {
        const player = DB.allPlayers().find((p) => p.id === n.dataset.togglePlayer);
        if (player) togglePlayer(player);
      });
    });

    el.querySelectorAll('[data-del-player]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delPlayer;
        DB.deletePlayer(id);
        state.selectedPlayers = state.selectedPlayers.filter((p) => p.id !== id);
        delete state.teamAssignment[id];
        render();
      });
    });

    const shuffleBtn = el.querySelector('#shuffle-btn');
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleTeams);

    const tn0 = el.querySelector('#team-name-0');
    const tn1 = el.querySelector('#team-name-1');
    if (tn0) tn0.addEventListener('input', () => { state.teamNames[0] = tn0.value; });
    if (tn1) tn1.addEventListener('input', () => { state.teamNames[1] = tn1.value; });

    el.querySelectorAll('[data-team-for]').forEach((sel) => {
      sel.addEventListener('change', () => {
        state.teamAssignment[sel.dataset.teamFor] = parseInt(sel.value, 10);
      });
    });

    const reverseToggle = el.querySelector('#reverse-toggle');
    if (reverseToggle) reverseToggle.addEventListener('change', () => {
      state.enableReverseViewByDefault = reverseToggle.checked;
    });

    const startBtn = el.querySelector('#start-btn');
    startBtn.addEventListener('click', () => {
      if (canStart()) createSessionAndStart();
    });
  }

  render();
}
