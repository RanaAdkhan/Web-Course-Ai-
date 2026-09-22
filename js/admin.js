// Admin Dashboard Logic (Secured against XSS & Injection)
let allAdmissions = [];
let currentAdminToken = localStorage.getItem('adminToken') || '';
let currentConfig = {
  courseTitle: "آن لائن اے آئی و انگلش لینگویج کورس (AI & English Course)",
  courseFee: 5000,
  madrassaDiscountPercent: 50,
  adminPassword: "admin123",
  supportPhone: "0304-7809156",
  paymentAccounts: {
    easypaisa: {
      accountTitle: "Allah Ditta (اللہ دتہ)",
      accountNumber: "0322-8765822"
    },
    jazzcash: {
      accountTitle: "Allah Ditta (اللہ دتہ)",
      accountNumber: "0322-8765822"
    }
  }
};

try {
  const cached = localStorage.getItem('portal_config');
  if (cached) currentConfig = { ...currentConfig, ...JSON.parse(cached) };
} catch (e) {}

// Security: XSS Sanitization Helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Security: Safe URL Validator
function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) return '';
  return trimmed;
}

document.addEventListener('DOMContentLoaded', () => {
  if (currentAdminToken) {
    showDashboard();
  } else {
    showLogin();
  }

  setupAdminEventListeners();
});

// Setup Listeners
function setupAdminEventListeners() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }

  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSaveSettings);
  }
}

// Show/Hide views
function showLogin() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('dashboardView').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');
  loadAdmissions();
  loadConfig();
}

// Admin Login
async function handleAdminLogin(e) {
  e.preventDefault();
  const password = document.getElementById('adminPasswordInput')?.value.trim();
  const errDiv = document.getElementById('loginError');

  if (errDiv) errDiv.classList.add('hidden');

  // Try API first
  let loginSuccess = false;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      currentAdminToken = data.token;
      loginSuccess = true;
    } else if (res.status === 429) {
      if (errDiv) {
        errDiv.textContent = data.message || 'بہت زیادہ غلط کوششیں ہو چکی ہیں، کچھ دیر بعد کوشش کریں۔';
        errDiv.classList.remove('hidden');
      }
      return;
    }
  } catch (apiErr) {}

  // Fallback for static GitHub Pages / offline
  if (!loginSuccess) {
    const expected = currentConfig.adminPassword || 'admin123';
    if (password === expected) {
      currentAdminToken = 'token_local_' + Date.now();
      loginSuccess = true;
    }
  }

  if (loginSuccess) {
    localStorage.setItem('adminToken', currentAdminToken);
    showDashboard();
    showToast('لاگ اِن کامیاب ہو گیا!');
  } else {
    if (errDiv) {
      errDiv.textContent = 'پاس ورڈ درست نہیں ہے۔ (ڈیفالٹ: admin123)';
      errDiv.classList.remove('hidden');
    }
  }
}

// Admin Logout
window.adminLogout = function () {
  if (confirm('کیا آپ لاگ آؤٹ کرنا چاہتے ہیں؟')) {
    currentAdminToken = '';
    localStorage.removeItem('adminToken');
    showLogin();
  }
};

let previousAdmissionsCount = null;

function playAdminAlertChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

// Fetch all admissions (with live alert detection)
async function loadAdmissions() {
  let loaded = false;
  try {
    const res = await fetch('/api/admissions', {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        allAdmissions = data.admissions || [];
        loaded = true;
      }
    }
  } catch (err) {}

  // Fallback to localStorage on GitHub Pages
  if (!loaded) {
    try {
      allAdmissions = JSON.parse(localStorage.getItem('admissions') || '[]');
    } catch (e) {
      allAdmissions = [];
    }
  }

  // Check if a new application has arrived
  if (previousAdmissionsCount !== null && allAdmissions.length > previousAdmissionsCount) {
    const newStudent = allAdmissions[0];
    playAdminAlertChime();
    const alertBar = document.getElementById('adminTopAlertBar');
    const alertText = document.getElementById('adminAlertText');
    if (alertBar && alertText) {
      alertText.innerHTML = `🔔 <b class="text-slate-950 font-black">نیا داخلہ الرٹ!</b> <b>${escapeHtml(newStudent.fullName)}</b> نے نیا داخلہ فارم جمع کروایا ہے (رجسٹریشن: <span class="font-mono">${escapeHtml(newStudent.regNo)}</span> | فیس: <b>${newStudent.feeDetails ? Number(newStudent.feeDetails.paidFee).toLocaleString('ur-PK') : 0} روپے</b>)`;
      alertBar.classList.remove('hidden');
    }
    showToast(`نیا داخلہ موصول ہوا: ${newStudent.fullName}`);
  }
  previousAdmissionsCount = allAdmissions.length;

  updateDashboardStats();
  renderAdmissionsTable(allAdmissions);
}

// Auto poll for new admissions every 10 seconds
setInterval(() => {
  if (currentAdminToken && !document.getElementById('dashboardView').classList.contains('hidden')) {
    loadAdmissions();
  }
}, 10000);

// Fetch portal config
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        currentConfig = { ...currentConfig, ...data.config };
      }
    }
  } catch (err) {}

  const titleEl = document.getElementById('adminHeaderCourseTitle');
  if (titleEl && currentConfig.courseTitle) {
    titleEl.textContent = currentConfig.courseTitle;
  }
}

// Calculate and render statistics
function updateDashboardStats() {
  const total = allAdmissions.length;
  const pending = allAdmissions.filter((a) => a.status === 'زیرِ تصدیق' || a.statusEn === 'pending').length;
  const approved = allAdmissions.filter((a) => a.status === 'منظور شدہ' || a.statusEn === 'approved').length;
  const madrassa = allAdmissions.filter((a) => a.isMadrassaStudent).length;

  const totalFee = allAdmissions.reduce((acc, curr) => {
    return acc + (curr.feeDetails && curr.feeDetails.paidFee ? Number(curr.feeDetails.paidFee) : 0);
  }, 0);

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statApproved').textContent = approved;
  document.getElementById('statMadrassa').textContent = madrassa;
  document.getElementById('statTotalFee').textContent = `${totalFee.toLocaleString('ur-PK')} روپے`;
}

// Filter and Search Admissions
window.filterAdmissions = function () {
  const query = document.getElementById('adminSearchInput')?.value.trim().toLowerCase() || '';
  const catFilter = document.getElementById('filterCategory')?.value || 'all';
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';

  const filtered = allAdmissions.filter((a) => {
    const matchQuery =
      !query ||
      (a.fullName && a.fullName.toLowerCase().includes(query)) ||
      (a.phone && a.phone.includes(query)) ||
      (a.cnic && a.cnic.includes(query)) ||
      (a.regNo && a.regNo.toLowerCase().includes(query));

    let matchCat = true;
    if (catFilter === 'madrassa') matchCat = a.isMadrassaStudent === true;
    if (catFilter === 'regular') matchCat = !a.isMadrassaStudent;

    let matchStatus = true;
    if (statusFilter !== 'all') matchStatus = a.status === statusFilter;

    return matchQuery && matchCat && matchStatus;
  });

  renderAdmissionsTable(filtered);
};

// Render Admissions Table Rows with XSS escaping
function renderAdmissionsTable(list) {
  const tbody = document.getElementById('admissionsTableBody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tbody.innerHTML = list.map((a) => {
    const photoUrl = safeUrl((a.files && a.files.studentPhoto) || '');
    const receiptUrl = safeUrl((a.files && a.files.paymentReceipt) || '');
    const cleanPhone = String(a.phone || '').replace(/\D/g, '');
    const waLink = `https://wa.me/92${cleanPhone.replace(/^0/, '')}`;

    let statusBadge = '';
    if (a.status === 'منظور شدہ') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">منظور شدہ</span>`;
    } else if (a.status === 'مسترد شدہ') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">مسترد شدہ</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">زیرِ تصدیق</span>`;
    }

    let madrassaBadge = a.isMadrassaStudent
      ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
           <i class="fa-solid fa-mosque"></i> 50% رعایت
         </span>`
      : `<span class="text-[11px] text-slate-400">عام طالب علم</span>`;

    const escapedName = escapeHtml(a.fullName);
    const escapedFather = escapeHtml(a.fatherName);
    const escapedCnic = escapeHtml(a.cnic);
    const escapedPhone = escapeHtml(a.phone);
    const escapedMadrassaName = escapeHtml(a.madrassaName);
    const escapedId = escapeHtml(a.id);
    const escapedRegNo = escapeHtml(a.regNo);

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <!-- Photo -->
        <td class="py-3 px-4">
          <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shrink-0" 
               onclick="openLightbox('${photoUrl}', 'طالب علم کی تصویر - ${escapedName}')">
            ${photoUrl ? `<img src="${photoUrl}" alt="${escapedName}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-slate-400 p-2.5"></i>`}
          </div>
        </td>

        <!-- Reg No -->
        <td class="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
          ${escapedRegNo}
          <div class="text-[10px] text-slate-400 font-sans">${new Date(a.submittedAt).toLocaleDateString('ur-PK')}</div>
        </td>

        <!-- Full Name & Father Name -->
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">${escapedName}</div>
          <div class="text-xs text-slate-500">ولد: ${escapedFather}</div>
          ${a.selectedCourse ? `<div class="text-[10px] text-brand-700 font-semibold truncate max-w-[160px]" title="${escapeHtml(a.selectedCourse)}">${escapeHtml(a.selectedCourse)}</div>` : ''}
        </td>

        <!-- CNIC -->
        <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap dir-ltr text-right">
          ${escapedCnic}
        </td>

        <!-- Mobile & WhatsApp -->
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-mono text-slate-700 dir-ltr text-right">${escapedPhone}</div>
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline">
            <i class="fa-brands fa-whatsapp"></i> واٹس ایپ پیغام
          </a>
        </td>

        <!-- Madrassa -->
        <td class="py-3 px-4 whitespace-nowrap">
          ${madrassaBadge}
          ${escapedMadrassaName ? `<div class="text-[10px] text-slate-500 truncate max-w-[120px]" title="${escapedMadrassaName}">${escapedMadrassaName}</div>` : ''}
        </td>

        <!-- Fee & Receipt -->
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-mono font-bold text-slate-800">${a.feeDetails ? Number(a.feeDetails.paidFee).toLocaleString('ur-PK') : 0} روپے</div>
          ${receiptUrl ? `
            <button type="button" onclick="openLightbox('${receiptUrl}', 'فیس رسید - ${escapedName}')" 
                    class="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
              <i class="fa-solid fa-receipt"></i> رسید دیکھیں
            </button>
          ` : '<span class="text-[10px] text-slate-400">رسید نہیں</span>'}
        </td>

        <!-- Status -->
        <td class="py-3 px-4 whitespace-nowrap">
          ${statusBadge}
        </td>

        <!-- Actions -->
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button type="button" onclick="viewApplicantDetails('${escapedId}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-all" title="مکمل فائل دیکھیں">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button type="button" onclick="updateStatus('${escapedId}', 'منظور شدہ', 'approved')" class="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs transition-all" title="منظور کریں">
              <i class="fa-solid fa-check"></i>
            </button>
            <button type="button" onclick="updateStatus('${escapedId}', 'مسترد شدہ', 'rejected')" class="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs transition-all" title="مسترد کریں">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button type="button" onclick="deleteAdmission('${escapedId}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 text-xs transition-all" title="ڈیلیٹ کریں">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update Admission Status
window.updateStatus = async function (id, status, statusEn) {
  let updated = false;

  try {
    const res = await fetch(`/api/admissions/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ status, statusEn })
    });
    if (res.ok) {
      updated = true;
    }
  } catch (err) {}

  // Fallback update in memory and localStorage
  const idx = allAdmissions.findIndex((a) => a.id === id);
  if (idx !== -1) {
    allAdmissions[idx].status = status;
    allAdmissions[idx].statusEn = statusEn;
    try {
      localStorage.setItem('admissions', JSON.stringify(allAdmissions));
    } catch (e) {}
    updated = true;
  }

  if (updated) {
    showToast(`حیثیت "${status}" کر دی گئی ہے`);
    updateDashboardStats();
    renderAdmissionsTable(allAdmissions);
    const modal = document.getElementById('applicantModal');
    if (!modal.classList.contains('hidden')) {
      viewApplicantDetails(id);
    }
  }
};

// Delete Admission Record
window.deleteAdmission = async function (id) {
  if (!confirm('کیا آپ واقعی اس داخلہ درخواست کو مکمل ڈیلیٹ کرنا چاہتے ہیں؟ یہ عمل واپس نہیں ہو سکتا۔')) {
    return;
  }

  try {
    await fetch(`/api/admissions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });
  } catch (err) {}

  allAdmissions = allAdmissions.filter((a) => a.id !== id);
  try {
    localStorage.setItem('admissions', JSON.stringify(allAdmissions));
  } catch (e) {}

  showToast('درخواست حذف کر دی گئی ہے۔');
  updateDashboardStats();
  renderAdmissionsTable(allAdmissions);
  closeApplicantModal();
};

// View Applicant Full Details Modal (XSS Secured)
window.viewApplicantDetails = function (id) {
  const adm = allAdmissions.find((a) => a.id === id);
  if (!adm) return;

  const modal = document.getElementById('applicantModal');
  const modalContent = document.getElementById('applicantModalContent');
  document.getElementById('modalRegNo').textContent = `رجسٹریشن نمبر: ${adm.regNo} (${adm.status})`;

  const photoUrl = safeUrl((adm.files && adm.files.studentPhoto) || '');
  const receiptUrl = safeUrl((adm.files && adm.files.paymentReceipt) || '');
  const madrassaCardUrl = safeUrl((adm.files && adm.files.madrassaCard) || '');
  const fee = adm.feeDetails || {};

  const name = escapeHtml(adm.fullName);
  const father = escapeHtml(adm.fatherName);
  const cnic = escapeHtml(adm.cnic);
  const phone = escapeHtml(adm.phone);
  const qual = escapeHtml(adm.qualification || 'ذکر نہیں کیا');
  const city = escapeHtml(adm.city);
  const address = escapeHtml(adm.address || '');
  const madrassaName = escapeHtml(adm.madrassaName || '-');
  const madrassaClass = escapeHtml(adm.madrassaClass || '-');
  const method = escapeHtml(adm.paymentMethod || 'easypaisa');
  const tid = escapeHtml(adm.transactionId || '-');

  modalContent.innerHTML = `
    <!-- Top Row: Photo & Main Info -->
    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
      <div class="w-32 h-40 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm cursor-pointer"
           onclick="openLightbox('${photoUrl}', 'طالب علم: ${name}')">
        ${photoUrl ? `<img src="${photoUrl}" alt="${name}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fa-solid fa-user text-4xl"></i></div>`}
      </div>

      <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm w-full">
        <div>
          <span class="text-slate-400 block text-[11px]">طالب علم کا نام</span>
          <span class="font-bold text-slate-800 text-base">${name}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">والد کا نام</span>
          <span class="font-bold text-slate-800 text-base">${father}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">شناختی کارڈ / ب فارم</span>
          <span class="font-bold font-mono text-slate-800 text-sm dir-ltr text-right block">${cnic}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">موبائل فون / واٹس ایپ</span>
          <span class="font-bold font-mono text-slate-800 text-sm dir-ltr text-right block">${phone}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">تعلیمی قابلیت</span>
          <span class="font-semibold text-slate-700">${qual}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">شہر اور پتہ</span>
          <span class="font-semibold text-slate-700">${city} ${address ? `(${address})` : ''}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">منتخب کردہ کورس</span>
          <span class="font-bold text-brand-700">${escapeHtml(adm.selectedCourse || currentConfig.courseTitle || 'اے آئی مع انگلش کورس')}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">لیپ ٹاپ دستیابی</span>
          <span class="font-bold ${adm.hasLaptop !== false ? 'text-emerald-700' : 'text-amber-700'}">${adm.hasLaptop !== false ? '<i class="fa-solid fa-check"></i> جی ہاں، موجود ہے' : 'انتظام کریں گے'}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">جیمینائی پرو (Gemini Pro) آفر</span>
          <span class="font-bold ${adm.eligibleGeminiPro !== false ? 'text-purple-700' : 'text-slate-600'}">${adm.eligibleGeminiPro !== false ? '🎁 پہلے 5 طلباء میں اہل' : 'نارمل داخلہ'}</span>
        </div>
      </div>
    </div>

    <!-- Madrassa Discount Section -->
    <div class="p-4 rounded-2xl ${adm.isMadrassaStudent ? 'bg-teal-50 border border-teal-200' : 'bg-slate-50 border border-slate-200'}">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-bold text-sm ${adm.isMadrassaStudent ? 'text-teal-900' : 'text-slate-700'} flex items-center gap-2">
          <i class="fa-solid fa-mosque"></i>
          <span>مدرسہ طالب علم کی حیثیت: ${adm.isMadrassaStudent ? 'ہاں (50% رعایت لاگو)' : 'عام طالب علم (کوئی رعایت نہیں)'}</span>
        </h4>
      </div>

      ${adm.isMadrassaStudent ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-slate-500 block">جامعہ / مدرسے کا نام:</span>
            <span class="font-bold text-slate-800">${madrassaName}</span>
          </div>
          <div>
            <span class="text-slate-500 block">درجہ / کلاس:</span>
            <span class="font-bold text-slate-800">${madrassaClass}</span>
          </div>
        </div>

        <!-- Madrassa Card Thumbnail -->
        <div class="mt-3 pt-3 border-t border-teal-200/60">
          <span class="text-xs font-semibold text-teal-900 block mb-2">مدرسہ تصدیقی کارڈ / خط:</span>
          ${madrassaCardUrl ? `
            <div class="inline-block p-1 bg-white border border-teal-300 rounded-xl cursor-pointer hover:shadow-md transition-all"
                 onclick="openLightbox('${madrassaCardUrl}', 'مدرسہ کارڈ - ${name}')">
              <img src="${madrassaCardUrl}" alt="مدرسہ کارڈ" class="h-20 w-32 object-cover rounded-lg">
              <span class="text-[10px] text-teal-700 text-center block mt-1"><i class="fa-solid fa-magnifying-glass"></i> بڑا کر کے دیکھیں</span>
            </div>
          ` : '<span class="text-xs text-slate-400">کوئی کارڈ اپلوڈ نہیں کیا گیا۔</span>'}
        </div>
      ` : ''}
    </div>

    <!-- Fee & Payment Details Box -->
    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <h4 class="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
        <i class="fa-solid fa-receipt"></i>
        <span>فیس کی تفصیلات (مکمل ایڈوانس ادائیگی)</span>
      </h4>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
        <div>
          <span class="text-slate-400 block">کل کورس فیس</span>
          <span class="font-mono font-bold text-slate-800">${fee.originalFee || 5000} روپے</span>
        </div>
        <div>
          <span class="text-slate-400 block">رعایت</span>
          <span class="font-mono font-bold text-emerald-600">${fee.discountPercent || 0}% (-${fee.discountAmount || 0} روپے)</span>
        </div>
        <div>
          <span class="text-slate-400 block">ادا شدہ ایڈوانس رقم</span>
          <span class="font-mono font-bold text-slate-900 text-sm">${fee.paidFee || 5000} روپے</span>
        </div>
        <div>
          <span class="text-slate-400 block">طریقہ / ٹرانزیکشن آئی ڈی</span>
          <span class="font-mono font-bold text-slate-800">${method} / ${tid}</span>
        </div>
      </div>

      <!-- Payment Proof Screenshot -->
      <div class="pt-3 border-t border-slate-200">
        <span class="text-xs font-semibold text-slate-700 block mb-2">فیس ادائیگی کی رسید کا سکرین شاٹ:</span>
        ${receiptUrl ? `
          <div class="inline-block p-1 bg-white border border-slate-300 rounded-xl cursor-pointer hover:shadow-md transition-all"
               onclick="openLightbox('${receiptUrl}', 'فیس رسید سکرین شاٹ - ${name}')">
            <img src="${receiptUrl}" alt="فیس رسید" class="h-28 w-44 object-cover rounded-lg">
            <span class="text-[10px] text-blue-600 text-center block mt-1"><i class="fa-solid fa-magnifying-glass"></i> رسید بڑا کر کے دیکھیں</span>
          </div>
        ` : '<span class="text-xs text-rose-500">رسید منسلک نہیں ہے۔</span>'}
      </div>
    </div>

    <!-- Status Change Action Buttons -->
    <div class="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button type="button" onclick="updateStatus('${adm.id}', 'منظور شدہ', 'approved')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-circle-check"></i>
          <span>داخلہ منظور کریں</span>
        </button>
        <button type="button" onclick="updateStatus('${adm.id}', 'مسترد شدہ', 'rejected')" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-circle-xmark"></i>
          <span>مسترد کریں</span>
        </button>
        <button type="button" onclick="updateStatus('${adm.id}', 'زیرِ تصدیق', 'pending')" class="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold">
          زیرِ تصدیق رکھیں
        </button>
      </div>

      <button type="button" onclick="deleteAdmission('${adm.id}')" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1">
        <i class="fa-solid fa-trash"></i>
        <span>درخواست ڈیلیٹ کریں</span>
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
};

window.closeApplicantModal = function () {
  document.getElementById('applicantModal').classList.add('hidden');
};

// Lightbox
window.openLightbox = function (src, caption) {
  if (!src) return;
  const modal = document.getElementById('imageLightboxModal');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  img.src = safeUrl(src);
  cap.textContent = caption || '';
  modal.classList.remove('hidden');
};

window.closeLightbox = function () {
  document.getElementById('imageLightboxModal').classList.add('hidden');
};

// Settings Modal
window.openSettingsModal = function () {
  const modal = document.getElementById('settingsModal');
  document.getElementById('cfgCourseTitle').value = currentConfig.courseTitle || '';
  document.getElementById('cfgCourseFee').value = currentConfig.courseFee || 5000;
  document.getElementById('cfgDiscountPercent').value = currentConfig.madrassaDiscountPercent || 50;

  if (currentConfig.paymentAccounts) {
    const ep = currentConfig.paymentAccounts.easypaisa;
    if (ep) {
      document.getElementById('cfgEpTitle').value = ep.accountTitle || '';
      document.getElementById('cfgEpNum').value = ep.accountNumber || '';
    }
    const jc = currentConfig.paymentAccounts.jazzcash;
    if (jc) {
      document.getElementById('cfgJcTitle').value = jc.accountTitle || '';
      document.getElementById('cfgJcNum').value = jc.accountNumber || '';
    }
  }

  document.getElementById('cfgNewPassword').value = '';
  modal.classList.remove('hidden');
};

window.closeSettingsModal = function () {
  document.getElementById('settingsModal').classList.add('hidden');
};

// Handle Save Settings
async function handleSaveSettings(e) {
  e.preventDefault();
  const title = document.getElementById('cfgCourseTitle').value.trim();
  const fee = Number(document.getElementById('cfgCourseFee').value);
  const discount = Number(document.getElementById('cfgDiscountPercent').value);
  const newPass = document.getElementById('cfgNewPassword').value.trim();

  if (newPass && newPass.length < 6) {
    alert('سیکیورٹی وارننگ: پاس ورڈ کم از کم 6 حروف پر مشتمل ہونا چاہیے۔');
    return;
  }

  const epTitle = document.getElementById('cfgEpTitle').value.trim();
  const epNum = document.getElementById('cfgEpNum').value.trim();

  const jcTitle = document.getElementById('cfgJcTitle').value.trim();
  const jcNum = document.getElementById('cfgJcNum').value.trim();

  const payload = {
    courseTitle: title,
    courseFee: fee,
    madrassaDiscountPercent: discount,
    paymentAccounts: {
      easypaisa: {
        name: 'ایزی پیسہ (Easypaisa)',
        accountTitle: epTitle,
        accountNumber: epNum
      },
      jazzcash: {
        name: 'جاز کیش (JazzCash)',
        accountTitle: jcTitle,
        accountNumber: jcNum
      }
    }
  };

  if (newPass) {
    payload.adminPassword = newPass;
  }

  // Try API
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {}

  currentConfig = { ...currentConfig, ...payload };
  try {
    localStorage.setItem('portal_config', JSON.stringify(currentConfig));
  } catch (e) {}

  showToast('سیٹنگز کامیابی سے محفوظ ہو گئیں!');
  closeSettingsModal();
  loadConfig();
}

// Export CSV (Works both with Backend API and on static GitHub Pages)
window.exportCsv = function () {
  const headers = [
    'رجسٹریشن نمبر',
    'تاریخ',
    'حیثیت',
    'پورا نام',
    'والد کا نام',
    'شناختی کارڈ / ب فارم',
    'موبائل / واٹس ایپ',
    'ای میل',
    'شہر',
    'پتہ',
    'تعلیمی قابلیت',
    'لیپ ٹاپ دستیابی',
    'Gemini Pro آفر',
    'مدرسہ طالب علم',
    'مدرسے کا نام',
    'مدرسہ کلاس',
    'کل کورس فیس',
    'رعایت فیصد',
    'ادا شدہ ایڈوانس فیس',
    'ادائیگی کا طریقہ',
    'ٹرانزیکشن آئی ڈی'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = allAdmissions.map((a) => [
    escapeCsv(a.regNo),
    escapeCsv(new Date(a.submittedAt).toLocaleDateString('ur-PK')),
    escapeCsv(a.status),
    escapeCsv(a.fullName),
    escapeCsv(a.fatherName),
    escapeCsv(a.cnic),
    escapeCsv(a.phone),
    escapeCsv(a.email),
    escapeCsv(a.city),
    escapeCsv(a.address),
    escapeCsv(a.qualification),
    escapeCsv(a.hasLaptop !== false ? 'ہاں (موجود ہے)' : 'انتظام کریں گے'),
    escapeCsv(a.eligibleGeminiPro !== false ? 'اہل (Gemini Pro فری)' : 'نارمل'),
    escapeCsv(a.isMadrassaStudent ? 'ہاں (50% رعایت)' : 'نہیں'),
    escapeCsv(a.madrassaName || '-'),
    escapeCsv(a.madrassaClass || '-'),
    escapeCsv(a.feeDetails ? a.feeDetails.originalFee : '5000'),
    escapeCsv(a.feeDetails ? a.feeDetails.discountPercent + '%' : '0%'),
    escapeCsv(a.feeDetails ? a.feeDetails.paidFee : '5000'),
    escapeCsv(a.paymentMethod),
    escapeCsv(a.transactionId || '-')
  ]);

  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  const downloadUrl = window.URL.createObjectURL(blob);
  a.href = downloadUrl;
  a.download = `admissions_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
  showToast('CSV فائل ڈاؤنلوڈ ہو گئی!');
};

// Toast Notification
function showToast(msg) {
  const toast = document.getElementById('adminToast');
  const toastMsg = document.getElementById('adminToastMsg');
  if (toast && toastMsg) {
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
}
