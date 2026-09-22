// Student Admission Form Logic (Professional Edition)
let appConfig = {
  courseTitle: "آن لائن اے آئی مع اسپوکن انگلش کورس (Complete AI & English Course)",
  courseDescription: "شاندار مستقبل کی طرف ایک قدم - ویب، ایپ ڈویلپمنٹ، اے آئی ویڈیو ایڈز اور انگلش لینگویج پریکٹیکل کورس (دورانیہ: 3 ماہ | لیپ ٹاپ لازمی | پہلے 5 طلباء کو Gemini Pro فری)",
  courseDuration: "3 ماہ",
  courseFee: 5000,
  madrassaDiscountPercent: 50,
  requiresLaptop: true,
  specialOffer: "پہلے 5 سٹوڈنٹس کو جیمینائی پرو (Gemini Pro) بالکل مفت دیا جائے گا!",
  supportPhone: "0304-7809156",
  whatsappNumber: "03047809156",
  paymentAccounts: {
    easypaisa: {
      name: "ایزی پیسہ (Easypaisa)",
      accountTitle: "Allah Ditta (اللہ دتہ)",
      accountNumber: "0328-8765822",
      rawNumber: "03288765822"
    }
  }
};

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

// Check local storage config if available
try {
  const cachedCfg = localStorage.getItem('portal_config');
  if (cachedCfg) {
    appConfig = { ...appConfig, ...JSON.parse(cachedCfg) };
  }
} catch (e) {}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateUiWithConfig();
  fetchConfig();
  setupEventListeners();
  setupCnicFormatter();
  startRecentAdmissionsTicker();
});

// Fetch configuration from backend if online
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('No API');
    const data = await res.json();
    if (data.success && data.config) {
      appConfig = { ...appConfig, ...data.config };
      try {
        localStorage.setItem('portal_config', JSON.stringify(appConfig));
      } catch (e) {}
      updateUiWithConfig();
    }
  } catch (err) {
    updateUiWithConfig();
  }
}

// Update UI elements with dynamic config
function updateUiWithConfig() {
  if (appConfig.courseTitle) {
    const navTitle = document.getElementById('navCourseTitle');
    const heroTitle = document.getElementById('heroCourseTitle');
    if (navTitle) navTitle.textContent = appConfig.courseTitle;
    if (heroTitle) heroTitle.textContent = appConfig.courseTitle;
  }
  if (appConfig.courseDescription) {
    const heroDesc = document.getElementById('heroCourseDesc');
    if (heroDesc) heroDesc.textContent = appConfig.courseDescription;
  }

  // Update payment accounts
  if (appConfig.paymentAccounts) {
    const ep = appConfig.paymentAccounts.easypaisa;
    if (ep) {
      const elTitle = document.getElementById('easypaisaTitle');
      const elNum = document.getElementById('easypaisaNumber');
      if (elTitle) elTitle.textContent = ep.accountTitle || 'Allah Ditta (اللہ دتہ)';
      if (elNum) elNum.textContent = ep.accountNumber || '0328-8765822';
    }
  }

  // Recalculate fee display
  calculateFee();
}

// Setup Event Listeners
function setupEventListeners() {
  const form = document.getElementById('admissionForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const madrassaCheckbox = document.getElementById('isMadrassaStudent');
  if (madrassaCheckbox) {
    madrassaCheckbox.addEventListener('change', function () {
      const area = document.getElementById('madrassaFieldsArea');
      const madrassaName = document.getElementById('madrassaName');
      const madrassaClass = document.getElementById('madrassaClass');

      if (this.checked) {
        if (area) area.classList.remove('hidden');
        if (madrassaName) madrassaName.setAttribute('required', 'required');
        if (madrassaClass) madrassaClass.setAttribute('required', 'required');
      } else {
        if (area) area.classList.add('hidden');
        if (madrassaName) madrassaName.removeAttribute('required');
        if (madrassaClass) madrassaClass.removeAttribute('required');
      }
      calculateFee();
    });
  }
}

// CNIC auto-formatter (12345-1234567-1)
function setupCnicFormatter() {
  const cnicInput = document.getElementById('cnic');
  if (!cnicInput) return;

  cnicInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (val.length > 0) {
      formatted += val.substring(0, Math.min(5, val.length));
    }
    if (val.length > 5) {
      formatted += '-' + val.substring(5, Math.min(12, val.length));
    }
    if (val.length > 12) {
      formatted += '-' + val.substring(12, 13);
    }
    e.target.value = formatted;
  });
}

// Calculate fee dynamically (Full Advance Payment)
function calculateFee() {
  const isMadrassa = document.getElementById('isMadrassaStudent')?.checked;
  const originalFee = Number(appConfig.courseFee) || 5000;
  const discountPercent = isMadrassa ? (Number(appConfig.madrassaDiscountPercent) || 50) : 0;
  const discountAmount = Math.round((originalFee * discountPercent) / 100);
  const payableFee = originalFee - discountAmount;

  const elOriginal = document.getElementById('displayOriginalFee');
  const elDiscount = document.getElementById('displayDiscount');
  const elPayable = document.getElementById('displayPayableFee');
  const elDiscountNote = document.getElementById('displayDiscountNote');

  if (elOriginal) elOriginal.textContent = `${originalFee.toLocaleString('ur-PK')} روپے`;
  if (elDiscount) {
    if (isMadrassa) {
      elDiscount.textContent = `${discountPercent}% (-${discountAmount.toLocaleString('ur-PK')} روپے)`;
      elDiscount.className = 'text-xl sm:text-2xl font-bold font-mono text-emerald-400 badge-pulse';
      if (elDiscountNote) elDiscountNote.textContent = 'دینی طلباء کے لیے 50% رعایت لاگو ہے';
    } else {
      elDiscount.textContent = '0% (0 روپے)';
      elDiscount.className = 'text-xl sm:text-2xl font-bold font-mono text-slate-400';
      if (elDiscountNote) elDiscountNote.textContent = 'دینی طلباء کے لیے 50% رعایت';
    }
  }
  if (elPayable) elPayable.textContent = `${payableFee.toLocaleString('ur-PK')} روپے`;
}

// Image Preview Helper (Safe)
window.previewImage = function (input, imgId, placeholderId, nameId) {
  const file = input.files && input.files[0];
  const img = document.getElementById(imgId);
  const placeholder = document.getElementById(placeholderId);
  const nameLabel = document.getElementById(nameId);

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('سیکیورٹی وارننگ: فائل کا سائز 5MB سے زیادہ نہیں ہونا چاہیے۔');
      input.value = '';
      return;
    }

    if (nameLabel) nameLabel.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (img) {
        img.src = safeUrl(e.target.result);
        img.classList.remove('hidden');
      }
      if (placeholder) {
        placeholder.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
  } else {
    if (img) img.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (nameLabel) nameLabel.textContent = 'کوئی فائل منتخب نہیں ہوئی';
  }
};

// Simple File Name Preview Helper
window.previewFileName = function (input, labelId) {
  const file = input.files && input.files[0];
  const label = document.getElementById(labelId);
  if (file && file.size > 5 * 1024 * 1024) {
    alert('سیکیورٹی وارننگ: فائل کا سائز 5MB سے زیادہ نہیں ہونا چاہیے۔');
    input.value = '';
    if (label) label.textContent = 'کوئی فائل منتخب نہیں ہوئی';
    return;
  }
  if (label) {
    label.textContent = file ? file.name : 'کوئی فائل منتخب نہیں ہوئی';
  }
};

// Copy Text Helper
window.copyText = function (text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`کاپی ہو گیا: ${text}`);
  }).catch(() => {
    showToast(`کاپی نہیں ہو سکا`);
  });
};

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (toast && toastMsg) {
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
}

// Audio Chime Synthesizer for instant success notification
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    osc2.frequency.setValueAtTime(392, ctx.currentTime); // G4
    osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.25); // C6

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}

// Native Mobile App-Style Top Push Notification System
let topNotifTimer = null;

window.showTopAppNotification = function({ icon = '🎉', title, body, time = 'ابھی ابھی', playSound = true }) {
  const notif = document.getElementById('topAppNotification');
  if (!notif) return;

  if (playSound) {
    playSuccessChime();
  }

  const iconEl = document.getElementById('topNotifIcon');
  const titleEl = document.getElementById('topNotifTitle');
  const bodyEl = document.getElementById('topNotifBody');
  const timeEl = document.getElementById('topNotifTime');

  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.innerHTML = title;
  if (bodyEl) bodyEl.innerHTML = body;
  if (timeEl) timeEl.textContent = time;

  // Slide down from top smoothly
  notif.classList.remove('-translate-y-40', 'opacity-0', 'pointer-events-none');
  notif.classList.add('translate-y-0', 'opacity-100');

  if (topNotifTimer) clearTimeout(topNotifTimer);
  topNotifTimer = setTimeout(() => {
    window.hideTopAppNotification();
  }, 6500);
};

window.hideTopAppNotification = function() {
  const notif = document.getElementById('topAppNotification');
  if (!notif) return;
  notif.classList.remove('translate-y-0', 'opacity-100');
  notif.classList.add('-translate-y-40', 'opacity-0', 'pointer-events-none');
};

// Form submission trigger for top alert
function showTopAlertNotification(data) {
  const name = escapeHtml(data.fullName);
  const regNo = escapeHtml(data.regNo);
  const paidFee = data.feeDetails ? Number(data.feeDetails.paidFee).toLocaleString('ur-PK') : '5,000';

  window.showTopAppNotification({
    icon: '🎉',
    title: `<b class="text-amber-300 font-bold">${name}</b> کی داخلہ درخواست موصول ہو گئی!`,
    body: `رجسٹریشن نمبر: <span class="font-mono bg-white/20 px-1.5 py-0.5 rounded text-white">${regNo}</span> | فیس: <b>${paidFee} روپے</b>`,
    time: 'ابھی ابھی',
    playSound: true
  });
}

// Show alert banner
function showAlert(message, type = 'error') {
  const alertEl = document.getElementById('formAlert');
  if (!alertEl) return;

  alertEl.classList.remove('hidden', 'bg-rose-50', 'border-rose-200', 'text-rose-700', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-700');

  if (type === 'error') {
    alertEl.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
    alertEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5 text-base"></i><div>${message}</div>`;
  } else {
    alertEl.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
    alertEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mt-0.5 text-base"></i><div>${message}</div>`;
  }

  alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Helper: Convert File to Data URL safely
function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Handle Form Submit with Top Alert & Audio Chime
async function handleFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('admissionForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');

  const selectedCourse = document.getElementById('selectedCourse')?.value || 'مکمل کورس: اے آئی مع انگلش لینگویج (AI + English Language)';
  const fullName = document.getElementById('fullName')?.value.trim();
  const fatherName = document.getElementById('fatherName')?.value.trim();
  const cnic = document.getElementById('cnic')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const address = document.getElementById('address')?.value.trim() || '';
  const qualification = document.getElementById('qualification')?.value || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const hasLaptop = document.querySelector('input[name="hasLaptop"]:checked')?.value !== 'no';
  const studentPhoto = document.getElementById('studentPhoto')?.files[0];
  const paymentReceipt = document.getElementById('paymentReceipt')?.files[0];
  const madrassaCard = document.getElementById('madrassaCard')?.files[0];
  const isMadrassa = document.getElementById('isMadrassaStudent')?.checked;
  const madrassaName = document.getElementById('madrassaName')?.value.trim();
  const madrassaClass = document.getElementById('madrassaClass')?.value.trim() || '';
  const paymentMethod = document.getElementById('paymentMethod')?.value || 'easypaisa';
  const transactionId = document.getElementById('transactionId')?.value.trim() || '';
  const declaration = document.getElementById('declaration')?.checked;

  if (!fullName || !fatherName || !cnic || !phone || !city) {
    showAlert('برائے مہربانی تمام لازمی خانے (نام، والد کا نام، شناختی کارڈ، فون اور شہر) مکمل پر کریں۔');
    return;
  }

  if (/[<>]/.test(fullName) || /[<>]/.test(fatherName) || /[<>]/.test(city)) {
    showAlert('سیکیورٹی وارننگ: نام اور شہر میں غیر قانونی علامات (< >) استعمال نہیں ہو سکتیں۔');
    return;
  }

  const cleanCnic = cnic.replace(/\D/g, '');
  if (cleanCnic.length !== 13) {
    showAlert('شناختی کارڈ یا ب فارم نمبر 13 ہندسوں پر مشتمل ہونا لازمی ہے۔');
    return;
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 12) {
    showAlert('برائے مہربانی درست موبائل / واٹس ایپ نمبر درج کریں۔');
    return;
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  function checkFileSafe(f) {
    if (!f) return true;
    if (f.size > MAX_FILE_SIZE) return false;
    const lower = f.name.toLowerCase();
    return ALLOWED_EXTS.some((ext) => lower.endsWith(ext));
  }

  if (!studentPhoto || !checkFileSafe(studentPhoto)) {
    showAlert('طالب علم کی پاسپورٹ سائز تصویر اپلوڈ کرنا لازمی ہے (زیادہ سے زیادہ 5MB، فارمیٹ: JPG/PNG)۔');
    return;
  }

  if (isMadrassa && !madrassaName) {
    showAlert('مدرسہ رعایت حاصل کرنے کے لیے جامعہ / مدرسے کا نام درج کرنا لازمی ہے۔');
    return;
  }

  if (madrassaCard && !checkFileSafe(madrassaCard)) {
    showAlert('مدرسہ کارڈ کا سائز 5MB سے زیادہ یا غیر محفوظ فارمیٹ ہے۔');
    return;
  }

  if (!paymentReceipt || !checkFileSafe(paymentReceipt)) {
    showAlert('فیس ادائیگی کی رسید یا سکرین شاٹ اپلوڈ کرنا لازمی ہے (زیادہ سے زیادہ 5MB)۔');
    return;
  }

  if (!declaration) {
    showAlert('برائے مہربانی اقرار نامے کے چیک باکس کو منتخب کریں۔');
    return;
  }

  submitBtn.disabled = true;
  submitBtnText.textContent = 'درخواست جمع ہو رہی ہے، برائے مہربانی انتظار فرمائیں...';
  submitSpinner.classList.remove('hidden');

  const courseFee = Number(appConfig.courseFee) || 5000;
  const discountPercent = isMadrassa ? (Number(appConfig.madrassaDiscountPercent) || 50) : 0;
  const discountAmount = Math.round((courseFee * discountPercent) / 100);
  const payableFee = courseFee - discountAmount;

  try {
    let savedAdmission = null;

    try {
      const formData = new FormData(form);
      const res = await fetch('/api/admissions', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.admission) {
          savedAdmission = data.admission;
        }
      }
    } catch (apiErr) {}

    if (!savedAdmission) {
      const photoBase64 = await fileToDataUrl(studentPhoto);
      const receiptBase64 = await fileToDataUrl(paymentReceipt);
      const cardBase64 = await fileToDataUrl(madrassaCard);

      let localAdmissions = [];
      try {
        localAdmissions = JSON.parse(localStorage.getItem('admissions') || '[]');
      } catch (e) {}

      const nextNum = localAdmissions.length + 1;
      const regNo = `ADM-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

      savedAdmission = {
        id: `adm_${Date.now()}`,
        regNo,
        submittedAt: new Date().toISOString(),
        status: 'زیرِ تصدیق',
        statusEn: 'pending',
        selectedCourse,
        hasLaptop,
        fullName: fullName.replace(/[<>]/g, ''),
        fatherName: fatherName.replace(/[<>]/g, ''),
        cnic: cnic.replace(/[<>]/g, ''),
        phone: phone.replace(/[<>]/g, ''),
        email: email.replace(/[<>]/g, ''),
        city: city.replace(/[<>]/g, ''),
        address: address.replace(/[<>]/g, ''),
        qualification: qualification.replace(/[<>]/g, ''),
        isMadrassaStudent: isMadrassa,
        madrassaName: isMadrassa ? madrassaName.replace(/[<>]/g, '') : '',
        madrassaClass: isMadrassa ? madrassaClass.replace(/[<>]/g, '') : '',
        paymentMethod,
        transactionId: transactionId.replace(/[<>]/g, ''),
        feeDetails: {
          originalFee: courseFee,
          discountPercent,
          discountAmount,
          paidFee: payableFee
        },
        files: {
          studentPhoto: photoBase64,
          madrassaCard: cardBase64,
          paymentReceipt: receiptBase64
        }
      };

      localAdmissions.unshift(savedAdmission);
      try {
        localStorage.setItem('admissions', JSON.stringify(localAdmissions));
      } catch (quotaErr) {
        const lightweight = { ...savedAdmission, files: {} };
        localStorage.setItem('admissions_light', JSON.stringify([lightweight]));
      }
    }

    // Trigger Top Alert Notification with Audio Chime!
    showTopAlertNotification(savedAdmission);

    showAlert('آپ کی داخلہ درخواست کامیابی سے موصول ہو گئی ہے! اوپر الرٹ اور نیچے دی گئی سلپ دیکھیں۔', 'success');
    form.reset();
    resetImagePreviews();
    calculateFee();

    // Show digital slip
    showAdmissionSlip(savedAdmission);

  } catch (err) {
    console.error('Submission error:', err);
    showAlert('فارم جمع کرنے میں مسئلہ پیش آیا، براہ کرم دوبارہ کوشش کریں۔');
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = 'داخلہ فارم اور فیس جمع کروائیں';
    submitSpinner.classList.add('hidden');
  }
}

// Reset image previews
function resetImagePreviews() {
  const photoImg = document.getElementById('photoPreviewImg');
  const photoPlaceholder = document.getElementById('photoPlaceholder');
  const photoFileName = document.getElementById('photoFileName');
  if (photoImg) photoImg.classList.add('hidden');
  if (photoPlaceholder) photoPlaceholder.classList.remove('hidden');
  if (photoFileName) photoFileName.textContent = 'کوئی تصویر منتخب نہیں ہوئی';

  const receiptImg = document.getElementById('receiptPreviewImg');
  const receiptPlaceholder = document.getElementById('receiptPlaceholder');
  const receiptFileName = document.getElementById('receiptFileName');
  if (receiptImg) receiptImg.classList.add('hidden');
  if (receiptPlaceholder) receiptPlaceholder.classList.remove('hidden');
  if (receiptFileName) receiptFileName.textContent = 'کوئی رسید منتخب نہیں ہوئی';

  const madrassaCardName = document.getElementById('madrassaCardName');
  if (madrassaCardName) madrassaCardName.textContent = 'کوئی فائل منتخب نہیں ہوئی';

  const madrassaArea = document.getElementById('madrassaFieldsArea');
  if (madrassaArea) madrassaArea.classList.add('hidden');
}

// Display Digital Admission Slip Modal
function showAdmissionSlip(adm) {
  const modal = document.getElementById('admissionSlipModal');
  if (!modal) return;

  document.getElementById('slipCourseTitle').textContent = appConfig.courseTitle || 'کورس داخلہ تصدیقی سلپ';
  document.getElementById('slipRegNo').textContent = `رجسٹریشن نمبر: ${escapeHtml(adm.regNo)}`;
  document.getElementById('slipStatus').textContent = `حیثیت: ${escapeHtml(adm.status)}`;

  if (adm.files && adm.files.studentPhoto) {
    document.getElementById('slipPhoto').src = safeUrl(adm.files.studentPhoto);
  }

  const elSlipCourse = document.getElementById('slipCourseName');
  if (elSlipCourse) {
    elSlipCourse.textContent = adm.selectedCourse || appConfig.courseTitle || 'مکمل کورس: اے آئی مع انگلش لینگویج';
  }

  document.getElementById('slipName').textContent = escapeHtml(adm.fullName);
  document.getElementById('slipFatherName').textContent = escapeHtml(adm.fatherName);
  document.getElementById('slipCnic').textContent = escapeHtml(adm.cnic);
  document.getElementById('slipPhone').textContent = escapeHtml(adm.phone);
  document.getElementById('slipCityAddress').textContent = `${escapeHtml(adm.city)} ${adm.address ? ' - ' + escapeHtml(adm.address) : ''}`;

  if (adm.isMadrassaStudent) {
    document.getElementById('slipMadrassaInfo').innerHTML = `
      <span class="inline-flex items-center gap-1 text-emerald-700 font-bold">
        <i class="fa-solid fa-circle-check"></i> دینی مدرسہ طالب علم (50% رعایت منظور)
      </span>
      <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(adm.madrassaName)} (${escapeHtml(adm.madrassaClass)})</div>
    `;
  } else {
    document.getElementById('slipMadrassaInfo').textContent = 'عام طالب علم (بغیر رعایت)';
  }

  const fee = adm.feeDetails || {};
  const originalFee = fee.originalFee || 5000;
  const discountPercent = fee.discountPercent || 0;
  const discountAmount = fee.discountAmount || 0;
  const paidFee = fee.paidFee || (originalFee - discountAmount);

  const elSlipOrig = document.getElementById('slipOriginalFee');
  const elSlipDisc = document.getElementById('slipDiscount');
  const elSlipPaid = document.getElementById('slipPaidFee');
  const elSlipLaptop = document.getElementById('slipLaptop');
  const elSlipGemini = document.getElementById('slipGeminiOffer');

  if (elSlipOrig) elSlipOrig.textContent = `${originalFee.toLocaleString('ur-PK')} روپے`;
  if (elSlipDisc) elSlipDisc.textContent = `${discountPercent}% (${discountAmount.toLocaleString('ur-PK')} روپے)`;
  if (elSlipPaid) elSlipPaid.textContent = `${paidFee.toLocaleString('ur-PK')} روپے (مکمل ایڈوانس فیس)`;
  if (elSlipLaptop) {
    elSlipLaptop.innerHTML = adm.hasLaptop !== false
      ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check"></i> جی ہاں، لیپ ٹاپ موجود ہے</span>`
      : `<span class="text-amber-700 font-semibold">کلاسز سے پہلے انتظام کر لیں گے</span>`;
  }
  if (elSlipGemini) {
    elSlipGemini.innerHTML = adm.eligibleGeminiPro !== false
      ? `<span class="text-purple-700 font-bold"><i class="fa-solid fa-gift text-amber-500"></i> مبارک ہو! پہلے 5 سٹوڈنٹس میں شامل (Gemini Pro مفت)</span>`
      : `<span>سٹوڈنٹ لسٹ میں تصدیق کی جائے گی</span>`;
  }
  document.getElementById('slipTid').textContent = escapeHtml(adm.transactionId || 'دستیاب نہیں');

  // WhatsApp share link - Directed to 03047809156
  const targetWhatsapp = '03047809156';
  const paymentMethodLabel = 'ایزی پیسہ (Easypaisa)';
  const shareMsg = encodeURIComponent(
    `السلام علیکم!\nمیں نے آن لائن داخلہ فارم پر کر دیا ہے۔\n\nکورس: ${adm.selectedCourse || appConfig.courseTitle}\nطالب علم کا نام: ${adm.fullName}\nوالد کا نام: ${adm.fatherName}\nشناختی کارڈ: ${adm.cnic}\nرجسٹریشن نمبر: ${adm.regNo}\nموبائل نمبر: ${adm.phone}\nشہر: ${adm.city}\nکورس دورانیہ: 3 ماہ\nلیپ ٹاپ: ${adm.hasLaptop !== false ? 'موجود ہے' : 'انتظام ہو جائے گا'}\nادا شدہ ایڈوانس فیس: ${paidFee} روپے\nادائیگی کا طریقہ: ${paymentMethodLabel}\nٹرانزیکشن آئی ڈی: ${adm.transactionId || '-'}\n\nبرائے مہربانی فیس تصدیق فرما کر مجھے واٹس ایپ کلاس گروپ میں شامل فرما لیں۔`
  );
  const waBtn = document.getElementById('slipWhatsappShare');
  if (waBtn) {
    waBtn.href = `https://wa.me/92${targetWhatsapp.replace(/^0/, '')}?text=${shareMsg}`;
  }

  modal.classList.remove('hidden');
}

// Close Slip Modal
window.closeSlipModal = function () {
  const modal = document.getElementById('admissionSlipModal');
  if (modal) modal.classList.add('hidden');
};

// Live Recent Admissions Ticker (App-Style Top Push Notifications)
function startRecentAdmissionsTicker() {
  const sampleNames = [
    { name: 'محمد حمزہ', city: 'لاہور', tag: '50% مدرسہ رعایت منظور' },
    { name: 'عثمان غنی', city: 'فیصل آباد', tag: 'Gemini Pro مفت آفر اہل' },
    { name: 'عبدالرحمٰن', city: 'کراچی', tag: '50% مدرسہ رعایت منظور' },
    { name: 'حافظ بلال', city: 'راولپنڈی', tag: 'داخلہ کنفرم ہو گیا' },
    { name: 'محمد یاسین', city: 'ملتان', tag: '50% مدرسہ رعایت منظور' },
    { name: 'علی احمد', city: 'گوجرانوالہ', tag: 'Gemini Pro مفت آفر اہل' }
  ];

  let index = 0;

  // Show first notification after 3.5 seconds
  setTimeout(() => {
    showNextAdmissionPush();
    setInterval(showNextAdmissionPush, 13000);
  }, 3500);

  function showNextAdmissionPush() {
    // Don't override if user is currently looking at their own admission modal
    const modal = document.getElementById('admissionSlipModal');
    if (modal && !modal.classList.contains('hidden')) return;

    const student = sampleNames[index % sampleNames.length];
    index++;

    window.showTopAppNotification({
      icon: '🔔',
      title: `<b class="text-white">${student.name}</b> <span class="text-slate-300 font-normal">(${student.city})</span>`,
      body: `نے آن لائن داخلہ لیا! • <span class="text-amber-300 font-semibold">${student.tag}</span>`,
      time: `${Math.floor(Math.random() * 6) + 2} منٹ پہلے`,
      playSound: false
    });
  }
}
