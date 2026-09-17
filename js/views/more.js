import { DB } from '../db.js';
import { ICONS } from '../icons.js';

const APP_VERSION = '1.0';

async function shareApp(Nav) {
  const url = window.location.origin + window.location.pathname;
  const shareData = {
    title: 'قيّدها',
    text: 'قيّدها - حاسبة نقاط البلوت وبنت السبيت، جرّبها',
    url,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      // ألغى المستخدم المشاركة
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    Nav.showConfirm({
      title: 'تم نسخ الرابط',
      message: 'الصق الرابط في واتساب أو أي تطبيق لمشاركته مع أصحابك.',
      actions: [{ label: 'تم' }],
    });
  } catch (e) {
    Nav.showConfirm({
      title: 'رابط التطبيق',
      message: url,
      actions: [{ label: 'تم' }],
    });
  }
}

export function renderMore(el, Nav) {
  el.innerHTML = `
    <div class="topbar"><div class="title">المزيد</div></div>

    <div class="card" style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <div style="color:var(--gold); width:36px; height:36px;">${ICONS.crown}</div>
      <div>
        <div style="font-weight:800;">قيّدها</div>
        <div class="hint">الإصدار ${APP_VERSION} — نسخة الويب</div>
      </div>
    </div>

    <div class="history-row" id="manage-players-row" style="margin-bottom:10px;">
      <div class="icon-badge">${ICONS.people}</div>
      <div class="texts">
        <div class="t1">إدارة اللاعبين</div>
        <div class="t2">تعديل الأسماء أو حذف لاعبين محفوظين</div>
      </div>
      <div class="chevron">${ICONS.chevronLeft}</div>
    </div>

    <div class="history-row" id="share-app-row" style="margin-bottom:10px;">
      <div class="icon-badge" style="font-size:18px;">📤</div>
      <div class="texts">
        <div class="t1">شارك التطبيق</div>
        <div class="t2">أرسل رابط قيّدها لأصحابك</div>
      </div>
      <div class="chevron">${ICONS.chevronLeft}</div>
    </div>

    <div class="card" style="margin-top:20px;">
      <button class="btn-primary btn-danger" id="reset-btn" style="width:100%;">مسح جميع البيانات</button>
      <div class="hint" style="text-align:center;">يحذف كل اللاعبين والجلسات والنتائج نهائيًا من هذا الجهاز.</div>
    </div>
  `;

  el.querySelector('#manage-players-row').addEventListener('click', () => Nav.openPlayers());
  el.querySelector('#share-app-row').addEventListener('click', () => shareApp(Nav));

  el.querySelector('#reset-btn').addEventListener('click', () => {
    Nav.showConfirm({
      title: 'مسح جميع البيانات؟',
      message: 'سيتم حذف كل اللاعبين والجلسات والنتائج والإعدادات نهائيًا من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء.',
      actions: [
        { label: 'مسح كل شيء', danger: true, onTap: () => { DB.resetAll(); location.reload(); } },
        { label: 'إلغاء' },
      ],
    });
  });
}
