// Admin Dashboard Logic
let allAdmissions = [];
let currentAdminToken = localStorage.getItem('adminToken') || '';
let currentConfig = {};

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
  const password = document.getElementById('adminPasswordInput')?.value;
  const errDiv = document.getElementById('loginError');

  if (errDiv) errDiv.classList.add('hidden');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (data.success && data.token) {
      currentAdminToken = data.token;
      localStorage.setItem('adminToken', data.token);
      showDashboard();
      showToast('لاگ اِن کامیاب ہو گیا!');
    } else {
      if (errDiv) {
        errDiv.textContent = data.message || 'پاس ورڈ درست نہیں ہے۔';
        errDiv.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Login error:', err);
    if (errDiv) {
      errDiv.textContent = 'سرور سے رابطہ نہیں ہو سکا۔';
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

// Fetch all admissions
async function loadAdmissions() {
  try {
    const res = await fetch('/api/admissions', {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      currentAdminToken = '';
      localStorage.removeItem('adminToken');
      showLogin();
      return;
    }

    const data = await res.json();
    if (data.success) {
      allAdmissions = data.admissions || [];
      updateDashboardStats();
      renderAdmissionsTable(allAdmissions);
    }
  } catch (err) {
    console.error('Error loading admissions:', err);
  }
}

// Fetch portal config
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success && data.config) {
      currentConfig = data.config;
      const titleEl = document.getElementById('adminHeaderCourseTitle');
      if (titleEl && currentConfig.courseTitle) {
        titleEl.textContent = currentConfig.courseTitle;
      }
    }
  } catch (err) {
    console.error('Error loading config:', err);
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
    // Search query matches name, phone, cnic, regNo
    const matchQuery =
      !query ||
      (a.fullName && a.fullName.toLowerCase().includes(query)) ||
      (a.phone && a.phone.includes(query)) ||
      (a.cnic && a.cnic.includes(query)) ||
      (a.regNo && a.regNo.toLowerCase().includes(query));

    // Category filter
    let matchCat = true;
    if (catFilter === 'madrassa') matchCat = a.isMadrassaStudent === true;
    if (catFilter === 'regular') matchCat = !a.isMadrassaStudent;

    // Status filter
    let matchStatus = true;
    if (statusFilter !== 'all') matchStatus = a.status === statusFilter;

    return matchQuery && matchCat && matchStatus;
  });

  renderAdmissionsTable(filtered);
};

// Render Admissions Table Rows
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
    const photoUrl = (a.files && a.files.studentPhoto) || '';
    const receiptUrl = (a.files && a.files.paymentReceipt) || '';
    const cleanPhone = (a.phone || '').replace(/\D/g, '');
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

    return `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <!-- Photo -->
        <td class="py-3 px-4">
          <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shrink-0" 
               onclick="openLightbox('${photoUrl}', 'طالب علم کی تصویر - ${a.fullName}')">
            ${photoUrl ? `<img src="${photoUrl}" alt="${a.fullName}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-slate-400 p-2.5"></i>`}
          </div>
        </td>

        <!-- Reg No -->
        <td class="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
          ${a.regNo}
          <div class="text-[10px] text-slate-400 font-sans">${new Date(a.submittedAt).toLocaleDateString('ur-PK')}</div>
        </td>

        <!-- Full Name & Father Name -->
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">${a.fullName}</div>
          <div class="text-xs text-slate-500">ولد: ${a.fatherName}</div>
        </td>

        <!-- CNIC -->
        <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap dir-ltr text-right">
          ${a.cnic}
        </td>

        <!-- Mobile & WhatsApp -->
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-mono text-slate-700 dir-ltr text-right">${a.phone}</div>
          <a href="${waLink}" target="_blank" class="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline">
            <i class="fa-brands fa-whatsapp"></i> واٹس ایپ پیغام
          </a>
        </td>

        <!-- Madrassa -->
        <td class="py-3 px-4 whitespace-nowrap">
          ${madrassaBadge}
          ${a.madrassaName ? `<div class="text-[10px] text-slate-500 truncate max-w-[120px]" title="${a.madrassaName}">${a.madrassaName}</div>` : ''}
        </td>

        <!-- Fee & Receipt -->
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="font-mono font-bold text-slate-800">${a.feeDetails ? a.feeDetails.paidFee.toLocaleString('ur-PK') : 0} روپے</div>
          ${receiptUrl ? `
            <button type="button" onclick="openLightbox('${receiptUrl}', 'فیس رسید - ${a.fullName}')" 
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
            <button type="button" onclick="viewApplicantDetails('${a.id}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-all" title="مکمل فائل دیکھیں">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button type="button" onclick="updateStatus('${a.id}', 'منظور شدہ', 'approved')" class="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs transition-all" title="منظور کریں">
              <i class="fa-solid fa-check"></i>
            </button>
            <button type="button" onclick="updateStatus('${a.id}', 'مسترد شدہ', 'rejected')" class="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs transition-all" title="مسترد کریں">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button type="button" onclick="deleteAdmission('${a.id}')" class="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 text-xs transition-all" title="ڈیلیٹ کریں">
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
  try {
    const res = await fetch(`/api/admissions/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ status, statusEn })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`حیثیت "${status}" کر دی گئی ہے`);
      loadAdmissions();
      // If modal is open for this applicant, refresh modal view
      const modal = document.getElementById('applicantModal');
      if (!modal.classList.contains('hidden')) {
        viewApplicantDetails(id);
      }
    } else {
      alert(data.message || 'اسٹیٹس اپڈیٹ نہیں ہو سکا۔');
    }
  } catch (err) {
    console.error('Error updating status:', err);
  }
};

// Delete Admission Record
window.deleteAdmission = async function (id) {
  if (!confirm('کیا آپ واقعی اس داخلہ درخواست کو مکمل ڈیلیٹ کرنا چاہتے ہیں؟ یہ عمل واپس نہیں ہو سکتا۔')) {
    return;
  }

  try {
    const res = await fetch(`/api/admissions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    const data = await res.json();
    if (data.success) {
      showToast('درخواست حذف کر دی گئی ہے۔');
      loadAdmissions();
      closeApplicantModal();
    } else {
      alert(data.message || 'درخواست حذف نہیں ہو سکی۔');
    }
  } catch (err) {
    console.error('Error deleting admission:', err);
  }
};

// View Applicant Full Details Modal
window.viewApplicantDetails = function (id) {
  const adm = allAdmissions.find((a) => a.id === id);
  if (!adm) return;

  const modal = document.getElementById('applicantModal');
  const modalContent = document.getElementById('applicantModalContent');
  document.getElementById('modalRegNo').textContent = `رجسٹریشن نمبر: ${adm.regNo} (${adm.status})`;

  const photoUrl = (adm.files && adm.files.studentPhoto) || '';
  const receiptUrl = (adm.files && adm.files.paymentReceipt) || '';
  const madrassaCardUrl = (adm.files && adm.files.madrassaCard) || '';
  const fee = adm.feeDetails || {};

  modalContent.innerHTML = `
    <!-- Top Row: Photo & Main Info -->
    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
      <div class="w-32 h-40 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm cursor-pointer"
           onclick="openLightbox('${photoUrl}', 'طالب علم: ${adm.fullName}')">
        ${photoUrl ? `<img src="${photoUrl}" alt="${adm.fullName}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fa-solid fa-user text-4xl"></i></div>`}
      </div>

      <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm w-full">
        <div>
          <span class="text-slate-400 block text-[11px]">طالب علم کا نام</span>
          <span class="font-bold text-slate-800 text-base">${adm.fullName}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">والد کا نام</span>
          <span class="font-bold text-slate-800 text-base">${adm.fatherName}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">شناختی کارڈ / ب فارم</span>
          <span class="font-bold font-mono text-slate-800 text-sm dir-ltr text-right block">${adm.cnic}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">موبائل فون / واٹس ایپ</span>
          <span class="font-bold font-mono text-slate-800 text-sm dir-ltr text-right block">${adm.phone}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">تعلیمی قابلیت</span>
          <span class="font-semibold text-slate-700">${adm.qualification || 'ذکر نہیں کیا'}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[11px]">شہر اور پتہ</span>
          <span class="font-semibold text-slate-700">${adm.city} ${adm.address ? `(${adm.address})` : ''}</span>
        </div>
      </div>
    </div>

    <!-- Madrassa Discount Section (if applicable) -->
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
            <span class="font-bold text-slate-800">${adm.madrassaName || '-'}</span>
          </div>
          <div>
            <span class="text-slate-500 block">درجہ / کلاس:</span>
            <span class="font-bold text-slate-800">${adm.madrassaClass || '-'}</span>
          </div>
        </div>

        <!-- Madrassa Card Thumbnail -->
        <div class="mt-3 pt-3 border-t border-teal-200/60">
          <span class="text-xs font-semibold text-teal-900 block mb-2">مدرسہ تصدیقی کارڈ / خط:</span>
          ${madrassaCardUrl ? `
            <div class="inline-block p-1 bg-white border border-teal-300 rounded-xl cursor-pointer hover:shadow-md transition-all"
                 onclick="openLightbox('${madrassaCardUrl}', 'مدرسہ کارڈ - ${adm.fullName}')">
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
        <span>فیس اور ادائیگی کی تفصیلات</span>
      </h4>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
        <div>
          <span class="text-slate-400 block">اصل فیس</span>
          <span class="font-mono font-bold text-slate-800">${fee.originalFee || 5000} روپے</span>
        </div>
        <div>
          <span class="text-slate-400 block">رعایت</span>
          <span class="font-mono font-bold text-emerald-600">${fee.discountPercent || 0}% (-${fee.discountAmount || 0} روپے)</span>
        </div>
        <div>
          <span class="text-slate-400 block">ادا شدہ رقم</span>
          <span class="font-mono font-bold text-slate-900 text-sm">${fee.paidFee || 5000} روپے</span>
        </div>
        <div>
          <span class="text-slate-400 block">طریقہ / ٹرانزیکشن آئی ڈی</span>
          <span class="font-mono font-bold text-slate-800">${adm.paymentMethod} / ${adm.transactionId || '-'}</span>
        </div>
      </div>

      <!-- Payment Proof Screenshot -->
      <div class="pt-3 border-t border-slate-200">
        <span class="text-xs font-semibold text-slate-700 block mb-2">فیس ادائیگی کی رسید کا سکرین شاٹ:</span>
        ${receiptUrl ? `
          <div class="inline-block p-1 bg-white border border-slate-300 rounded-xl cursor-pointer hover:shadow-md transition-all"
               onclick="openLightbox('${receiptUrl}', 'فیس رسید سکرین شاٹ - ${adm.fullName}')">
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
  img.src = src;
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
    const bk = currentConfig.paymentAccounts.bank;
    if (bk) {
      document.getElementById('cfgBankName').value = bk.bankName || '';
      document.getElementById('cfgBankTitle').value = bk.accountTitle || '';
      document.getElementById('cfgBankNum').value = bk.accountNumber || '';
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

  const epTitle = document.getElementById('cfgEpTitle').value.trim();
  const epNum = document.getElementById('cfgEpNum').value.trim();

  const jcTitle = document.getElementById('cfgJcTitle').value.trim();
  const jcNum = document.getElementById('cfgJcNum').value.trim();

  const bankName = document.getElementById('cfgBankName').value.trim();
  const bankTitle = document.getElementById('cfgBankTitle').value.trim();
  const bankNum = document.getElementById('cfgBankNum').value.trim();

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
      },
      bank: {
        name: bankName || 'بینک اکاؤنٹ',
        bankName: bankName,
        accountTitle: bankTitle,
        accountNumber: bankNum
      }
    }
  };

  if (newPass) {
    payload.adminPassword = newPass;
  }

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast('سیٹنگز کامیابی سے محفوظ ہو گئیں!');
      closeSettingsModal();
      loadConfig();
    } else {
      alert(data.message || 'سیٹنگز محفوظ نہیں ہو سکیں۔');
    }
  } catch (err) {
    console.error('Error saving settings:', err);
    alert('سیٹنگز محفوظ کرنے میں خرابی واقع ہوئی۔');
  }
}

// Export CSV
window.exportCsv = function () {
  const url = `/api/admissions/export-csv`;
  fetch(url, {
    headers: { 'Authorization': `Bearer ${currentAdminToken}` }
  })
    .then((res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      const downloadUrl = window.URL.createObjectURL(blob);
      a.href = downloadUrl;
      a.download = `admissions_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast('CSV فائل ڈاؤنلوڈ ہو گئی!');
    })
    .catch((err) => {
      console.error('Export error:', err);
      alert('CSV فائل ڈاؤنلوڈ کرنے میں مسئلہ پیش آیا۔');
    });
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
