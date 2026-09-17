import { DB } from '../db.js';
import { ICONS } from '../icons.js';

export function renderPlayers(el, Nav) {
  const state = { editingId: null };

  function render() {
    const players = DB.allPlayers();
    el.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="back-btn">${ICONS.chevronLeft}</button>
        <div class="title">إدارة اللاعبين</div>
        <span style="width:32px;"></span>
      </div>
      ${
        players.length === 0
          ? `<div class="empty-state"><div class="icon">👥</div><div class="t">لا يوجد لاعبون محفوظون بعد</div></div>`
          : `<div class="card" style="margin-top:12px;">
              ${players
                .map((p) => {
                  if (state.editingId === p.id) {
                    return `<div class="player-row">
                      <input class="text-input" id="edit-input" value="${p.name}" style="flex:1;" />
                      <button class="btn-secondary" data-save="${p.id}" style="margin-inline-start:8px; flex-shrink:0;">حفظ</button>
                    </div>`;
                  }
                  return `<div class="player-row">
                    <button class="del" data-del="${p.id}">حذف</button>
                    <div style="flex:1; text-align:center;">${p.name}</div>
                    <button class="icon-btn" data-edit="${p.id}" title="تعديل الاسم">✏️</button>
                  </div>`;
                })
                .join('')}
            </div>`
      }
    `;
    wire();
  }

  function commitEdit() {
    const input = el.querySelector('#edit-input');
    const name = input ? input.value.trim() : '';
    if (name) DB.renamePlayer(state.editingId, name);
    state.editingId = null;
    render();
  }

  function wire() {
    el.querySelector('#back-btn').addEventListener('click', () => Nav.back());

    el.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.editingId = btn.dataset.edit;
        render();
        const input = el.querySelector('#edit-input');
        if (input) {
          input.focus();
          input.select();
        }
      });
    });

    const input = el.querySelector('#edit-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitEdit();
      });
    }

    el.querySelectorAll('[data-save]').forEach((btn) => {
      btn.addEventListener('click', commitEdit);
    });

    el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.del;
        Nav.showConfirm({
          title: 'حذف اللاعب؟',
          message: 'لن يؤثر هذا على الجلسات والإحصائيات السابقة، لكنه لن يظهر بعد الآن في قوائم اللاعبين.',
          actions: [
            { label: 'حذف', danger: true, onTap: () => { DB.deletePlayer(id); render(); } },
            { label: 'إلغاء' },
          ],
        });
      });
    });
  }

  render();
}
