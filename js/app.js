// Student Admission Form Logic (Professional Edition)
let appConfig = {
  courseTitle: "آن لائن ویب و موبائل ایپ ڈویلپمنٹ کورس (Web & App Development)",
  courseDescription: "مکمل ویب سائٹ و موبائل ایپ ڈویلپمنٹ مع جدید اے آئی اور اسپوکن انگلش پریکٹیکل کورس (آغاز: 20 ستمبر | کلاس ٹائم: مغرب کے بعد | دورانیہ: 3 ماہ)",
  courseDuration: "3 ماہ",
  courseStartDate: "20 ستمبر سے باقاعدہ آغاز",
  classTiming: "کلاسز کا وقت مغرب کے بعد کا طے کریں گے",
  courseFee: 5000,
  madrassaDiscountPercent: 50,
  totalSeats: 30,
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
  setupStrictFormSecurity();
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

  // Also query live admissions count from backend if available
  try {
    const admRes = await fetch('/api/admissions');
    if (admRes.ok) {
      const admData = await admRes.json();
      if (admData && Array.isArray(admData.admissions)) {
        updateSeatsCounter(admData.admissions.length);
      }
    }
  } catch (e) {}
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

  // Update Seats Counter dynamically
  updateSeatsCounter();
}

// Dynamic Real-Time Seats Counter (Starts from 0 and fills up as students register)
function updateSeatsCounter(customCount = null) {
  const totalSeats = Number(appConfig.totalSeats) || 30;

  let admissionsCount = 0;
  if (customCount !== null && typeof customCount === 'number') {
    admissionsCount = customCount;
  } else {
    try {
      const local = JSON.parse(localStorage.getItem('admissions') || '[]');
      if (Array.isArray(local)) {
        admissionsCount = local.length;
      }
    } catch (e) {
      admissionsCount = 0;
    }
  }

  const seatsCountText = document.getElementById('seatsCountText');
  const seatsProgressBar = document.getElementById('seatsProgressBar');
  const seatsRemainingNotice = document.getElementById('seatsRemainingNotice');

  const remaining = Math.max(0, totalSeats - admissionsCount);
  const percentage = Math.min(100, Math.round((admissionsCount / totalSeats) * 100));

  if (seatsCountText) {
    seatsCountText.textContent = `${admissionsCount} / ${totalSeats} نشستیں مکمل`;
  }

  if (seatsProgressBar) {
    seatsProgressBar.style.width = `${percentage}%`;
  }

  if (seatsRemainingNotice) {
    if (admissionsCount === 0) {
      seatsRemainingNotice.textContent = `داخلے ابھی شروع ہوئے ہیں — کل ${totalSeats} نشستیں ہیں، سب سے پہلے داخلہ لے کر اپنی سیٹ محفوظ کریں!`;
    } else if (remaining > 0) {
      seatsRemainingNotice.textContent = `اب تک ${admissionsCount} طلباء داخل ہو چکے ہیں — صرف ${remaining} نشستیں باقی ہیں!`;
    } else {
      seatsRemainingNotice.textContent = `تمام ${totalSeats} نشستیں مکمل ہو چکی ہیں!`;
    }
  }
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

// Strict Form Security System: اردو کی جگہ اردو، ریاضی کی جگہ ریاضی، انگلش کی جگہ انگلش
function setupStrictFormSecurity() {
  // Helper: Show or hide field error with clean UI feedback
  function setFieldError(fieldId, isError, message = '') {
    const input = document.getElementById(fieldId);
    const errContainer = document.getElementById(`${fieldId}Error`);
    const errText = document.getElementById(`${fieldId}ErrorText`);

    if (!input) return;

    if (isError) {
      input.classList.remove('input-valid', 'border-slate-300', 'border-emerald-500');
      input.classList.add('input-error');
      if (errContainer) {
        errContainer.classList.remove('hidden');
        if (errText && message) errText.textContent = message;
      }
    } else {
      input.classList.remove('input-error');
      if (input.value.trim().length > 0) {
        input.classList.add('input-valid');
      } else {
        input.classList.remove('input-valid');
      }
      if (errContainer) {
        errContainer.classList.add('hidden');
      }
    }
  }

  // 1. اردو کی جگہ صرف اردو (اردو والی جگہ ریاضی اور انگلش قبول نا کرے)
  const urduFields = [
    { id: 'fullName', label: 'طالب علم کا نام', minLen: 3, required: true },
    { id: 'fatherName', label: 'والد کا نام', minLen: 3, required: true },
    { id: 'city', label: 'شہر یا گاؤں کا نام', minLen: 2, required: true },
    { id: 'madrassaName', label: 'جامعہ / مدرسے کا نام', minLen: 3, required: false },
    { id: 'madrassaClass', label: 'موجودہ درجہ / کلاس', minLen: 2, required: false }
  ];

  const urduCharRegex = /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]$/;
  const digitsRegex = /[0-9۰-۹٠-٩]/;
  const englishRegex = /[a-zA-Z]/;

  urduFields.forEach(({ id, label, minLen, required }) => {
    const input = document.getElementById(id);
    if (!input) return;

    // Block Math/digits & English on keypress
    input.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      if (e.key.length === 1) {
        if (digitsRegex.test(e.key)) {
          e.preventDefault();
          setFieldError(id, true, `اردو کی جگہ ریاضی قبول نہیں ہے! "${label}" میں صرف اردو الفاظ لکھیں۔`);
          setTimeout(() => {
            if (input.value.trim().length >= minLen) setFieldError(id, false);
          }, 3000);
          return;
        }

        if (englishRegex.test(e.key)) {
          e.preventDefault();
          setFieldError(id, true, `اس خانے میں انگلش کی اجازت نہیں ہے! "${label}" میں صرف اردو الفاظ لکھیں۔`);
          setTimeout(() => {
            if (input.value.trim().length >= minLen) setFieldError(id, false);
          }, 3000);
          return;
        }

        if (!urduCharRegex.test(e.key)) {
          e.preventDefault();
          setFieldError(id, true, `"${label}" میں صرف اردو حروف درج کریں۔`);
          setTimeout(() => {
            if (input.value.trim().length >= minLen) setFieldError(id, false);
          }, 3000);
          return;
        }
      }
    });

    // Real-time cleanup on paste or typing
    input.addEventListener('input', () => {
      const original = input.value;
      const cleaned = original
        .replace(/[0-9۰-۹٠-٩a-zA-Z]/g, '')
        .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '');

      if (original !== cleaned) {
        input.value = cleaned;
        setFieldError(id, true, `اردو کی جگہ ریاضی یا انگلش قبول نہیں کی جا سکتی!`);
        setTimeout(() => {
          if (input.value.trim().length >= minLen) setFieldError(id, false);
        }, 2000);
      }

      const val = input.value.trim();
      const isMadrassa = document.getElementById('isMadrassaStudent')?.checked;
      const isRequiredNow = required || (isMadrassa && (id === 'madrassaName' || id === 'madrassaClass'));

      if (val.length === 0) {
        if (isRequiredNow) {
          setFieldError(id, true, `${label} درج کرنا لازمی ہے۔`);
        } else {
          setFieldError(id, false);
        }
      } else if (val.length < minLen) {
        setFieldError(id, true, `${label} کم از کم ${minLen} اردو حروف پر مشتمل ہونا چاہیے۔`);
      } else {
        setFieldError(id, false);
      }
    });

    input.addEventListener('blur', () => {
      const val = input.value.trim();
      const isMadrassa = document.getElementById('isMadrassaStudent')?.checked;
      const isRequiredNow = required || (isMadrassa && (id === 'madrassaName' || id === 'madrassaClass'));

      if (isRequiredNow && val.length === 0) {
        setFieldError(id, true, `${label} درج کرنا لازمی ہے۔`);
      } else if (val.length > 0 && val.length < minLen) {
        setFieldError(id, true, `${label} کم از کم ${minLen} اردو حروف پر مشتمل ہونا چاہیے۔`);
      } else {
        setFieldError(id, false);
      }
    });
  });

  // 2. انگلش کی جگہ صرف انگلش (انگلش والی جگہ اردو اور ریاضی قبول نا کرے)
  const englishNameInput = document.getElementById('fullNameEn');
  if (englishNameInput) {
    const englishCharRegex = /^[a-zA-Z\s]$/;

    englishNameInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      if (e.key.length === 1) {
        if (urduCharRegex.test(e.key) && !/^\s$/.test(e.key)) {
          e.preventDefault();
          setFieldError('fullNameEn', true, 'انگلش کی جگہ اردو قبول نہیں ہے! صرف انگریزی حروف (A-Z) لکھیں۔');
          setTimeout(() => {
            if (englishNameInput.value.trim().length >= 3) setFieldError('fullNameEn', false);
          }, 3000);
          return;
        }

        if (digitsRegex.test(e.key)) {
          e.preventDefault();
          setFieldError('fullNameEn', true, 'انگلش نام میں ریاضی (نمبرز) کی اجازت نہیں ہے!');
          setTimeout(() => {
            if (englishNameInput.value.trim().length >= 3) setFieldError('fullNameEn', false);
          }, 3000);
          return;
        }

        if (!englishCharRegex.test(e.key)) {
          e.preventDefault();
          setFieldError('fullNameEn', true, 'صرف انگریزی حروف (A-Z) درج کریں۔');
          return;
        }
      }
    });

    englishNameInput.addEventListener('input', () => {
      const original = englishNameInput.value;
      const cleaned = original.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
      if (original !== cleaned) {
        englishNameInput.value = cleaned;
        setFieldError('fullNameEn', true, 'انگلش نام میں صرف انگریزی حروف A-Z کی اجازت ہے۔');
      }

      const val = englishNameInput.value.trim();
      if (val.length === 0) {
        setFieldError('fullNameEn', true, 'طالب علم کا نام انگلش میں درج کرنا لازمی ہے۔');
      } else if (val.length < 3) {
        setFieldError('fullNameEn', true, 'انگلش نام کم از کم 3 حروف (A-Z) پر مشتمل ہونا چاہیے۔');
      } else {
        setFieldError('fullNameEn', false);
      }
    });

    englishNameInput.addEventListener('blur', () => {
      const val = englishNameInput.value.trim();
      if (val.length < 3) {
        setFieldError('fullNameEn', true, 'طالب علم کا نام انگلش میں درج کرنا لازمی ہے (کم از کم 3 حروف)۔');
      } else {
        setFieldError('fullNameEn', false);
      }
    });
  }

  // Email Field (Strict English, Urdu strictly blocked)
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }
      if (e.key.length === 1 && urduCharRegex.test(e.key) && !/^\s$/.test(e.key)) {
        e.preventDefault();
        setFieldError('email', true, 'ای میل میں اردو حروف کی اجازت نہیں ہے! صرف انگلش لکھیں۔');
        setTimeout(() => setFieldError('email', false), 3000);
      }
    });

    emailInput.addEventListener('input', () => {
      const original = emailInput.value;
      const cleaned = original.replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '');
      if (original !== cleaned) {
        emailInput.value = cleaned;
      }
      const val = emailInput.value.trim();
      if (val.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setFieldError('email', true, 'درست انگلش ای میل ایڈریس درج کریں (مثال: student@gmail.com)');
      } else {
        setFieldError('email', false);
      }
    });
  }

  // 3. ریاضی کی جگہ صرف ریاضی (ریاضی والی جگہ اردو اور الفاظ قبول نا کرے)
  // CNIC: 12345-1234567-1 (13 digits)
  const cnicInput = document.getElementById('cnic');
  if (cnicInput) {
    cnicInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      if (e.key.length === 1) {
        if (urduCharRegex.test(e.key)) {
          e.preventDefault();
          setFieldError('cnic', true, 'ریاضی کی جگہ اردو قبول نہیں ہے! شناختی کارڈ میں صرف ہندسے درج کریں۔');
          setTimeout(() => {
            const raw = cnicInput.value.replace(/\D/g, '');
            if (raw.length === 13) setFieldError('cnic', false);
          }, 3000);
          return;
        }

        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setFieldError('cnic', true, 'اس خانے میں الفاظ کی اجازت نہیں ہے، صرف ریاضی کے ہندسے درج کریں!');
          setTimeout(() => {
            const raw = cnicInput.value.replace(/\D/g, '');
            if (raw.length === 13) setFieldError('cnic', false);
          }, 3000);
          return;
        }
      }
    });

    cnicInput.addEventListener('input', (e) => {
      const urduDigits = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
      let val = e.target.value.replace(/[۰-۹٠-٩]/g, d => urduDigits[d] || d).replace(/\D/g, '');
      if (val.length > 13) val = val.substring(0, 13);

      let formatted = '';
      if (val.length > 0) formatted += val.substring(0, Math.min(5, val.length));
      if (val.length > 5) formatted += '-' + val.substring(5, Math.min(12, val.length));
      if (val.length > 12) formatted += '-' + val.substring(12, 13);
      e.target.value = formatted;

      if (val.length === 13) {
        setFieldError('cnic', false);
      } else if (val.length > 0) {
        setFieldError('cnic', true, `شناختی کارڈ 13 ریاضی ہندسوں کا ہونا ضروری ہے (اب تک ${val.length} ہندسے درج ہیں)`);
      } else {
        setFieldError('cnic', true, 'شناختی کارڈ یا ب فارم نمبر درج کرنا لازمی ہے۔');
      }
    });

    cnicInput.addEventListener('blur', () => {
      const raw = cnicInput.value.replace(/\D/g, '');
      if (raw.length === 13) {
        setFieldError('cnic', false);
      } else {
        setFieldError('cnic', true, 'شناختی کارڈ یا ب فارم نمبر مکمل 13 ریاضی ہندسوں کا ہونا لازمی ہے۔');
      }
    });
  }

  // Mobile / WhatsApp: 0300-1234567 (11 digits)
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      if (e.key.length === 1) {
        if (urduCharRegex.test(e.key)) {
          e.preventDefault();
          setFieldError('phone', true, 'ریاضی کی جگہ اردو قبول نہیں ہے! موبائل نمبر میں صرف ہندسے درج کریں۔');
          setTimeout(() => {
            const raw = phoneInput.value.replace(/\D/g, '');
            if (raw.length === 11 && raw.startsWith('03')) setFieldError('phone', false);
          }, 3000);
          return;
        }

        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setFieldError('phone', true, 'اس خانے میں الفاظ کی اجازت نہیں ہے، صرف ریاضی کے ہندسے درج کریں!');
          setTimeout(() => {
            const raw = phoneInput.value.replace(/\D/g, '');
            if (raw.length === 11 && raw.startsWith('03')) setFieldError('phone', false);
          }, 3000);
          return;
        }
      }
    });

    phoneInput.addEventListener('input', (e) => {
      const urduDigits = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
      let val = e.target.value.replace(/[۰-۹٠-٩]/g, d => urduDigits[d] || d).replace(/\D/g, '');
      if (val.length > 11) val = val.substring(0, 11);

      let formatted = '';
      if (val.length > 0) formatted += val.substring(0, Math.min(4, val.length));
      if (val.length > 4) formatted += '-' + val.substring(4, Math.min(11, val.length));
      e.target.value = formatted;

      if (val.length === 11) {
        if (!val.startsWith('03')) {
          setFieldError('phone', true, 'پاکستانی موبائل نمبر 03 سے شروع ہونا لازمی ہے (مثال: 0300-1234567)');
        } else {
          setFieldError('phone', false);
        }
      } else if (val.length > 0) {
        setFieldError('phone', true, `موبائل نمبر 11 ریاضی ہندسوں کا ہونا ضروری ہے (اب تک ${val.length} ہندسے درج ہیں)`);
      } else {
        setFieldError('phone', true, 'موبائل / واٹس ایپ نمبر درج کرنا لازمی ہے۔');
      }
    });

    phoneInput.addEventListener('blur', () => {
      const raw = phoneInput.value.replace(/\D/g, '');
      if (raw.length === 11 && raw.startsWith('03')) {
        setFieldError('phone', false);
      } else {
        setFieldError('phone', true, 'درست 11 ہندسوں کا موبائل نمبر درج کریں جو 03 سے شروع ہو (مثال: 0300-1234567)۔');
      }
    });
  }

  // Transaction ID (TID): Math digits only
  const tidInput = document.getElementById('transactionId');
  if (tidInput) {
    tidInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      if (e.key.length === 1) {
        if (urduCharRegex.test(e.key)) {
          e.preventDefault();
          setFieldError('transactionId', true, 'ریاضی کی جگہ اردو قبول نہیں ہے! رسید نمبر میں صرف ہندسے درج کریں۔');
          setTimeout(() => setFieldError('transactionId', false), 3000);
          return;
        }

        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setFieldError('transactionId', true, 'رسید نمبر (TID) میں صرف ریاضی کے ہندسے درج کریں!');
          setTimeout(() => setFieldError('transactionId', false), 3000);
          return;
        }
      }
    });

    tidInput.addEventListener('input', (e) => {
      const urduDigits = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
      const cleaned = e.target.value.replace(/[۰-۹٠-٩]/g, d => urduDigits[d] || d).replace(/\D/g, '');
      if (e.target.value !== cleaned) {
        e.target.value = cleaned;
      }
      setFieldError('transactionId', false);
    });
  }
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

  const selectedCourse = document.getElementById('selectedCourse')?.value || 'مکمل کورس: آن لائن ویب و موبائل ایپ ڈویلپمنٹ کورس';
  const fullName = document.getElementById('fullName')?.value.trim();
  const fullNameEn = document.getElementById('fullNameEn')?.value.trim();
  const fatherName = document.getElementById('fatherName')?.value.trim();
  const gender = document.querySelector('input[name="gender"]:checked')?.value || 'male';
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

  // 1. اردو کی جگہ صرف اردو چیک (اردو والی جگہ ریاضی قبول نا کرے)
  const urduValidationList = [
    { id: 'fullName', name: 'طالب علم کا نام (اردو میں)', val: fullName, min: 3, req: true },
    { id: 'fatherName', name: 'والد کا نام (اردو میں)', val: fatherName, min: 3, req: true },
    { id: 'city', name: 'شہر یا گاؤں کا نام (اردو میں)', val: city, min: 2, req: true }
  ];
  if (isMadrassa) {
    urduValidationList.push(
      { id: 'madrassaName', name: 'جامعہ / مدرسے کا نام (اردو میں)', val: madrassaName, min: 3, req: true },
      { id: 'madrassaClass', name: 'موجودہ درجہ / کلاس (اردو میں)', val: madrassaClass, min: 2, req: true }
    );
  }

  const urduOnlyRegex = /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;
  for (const item of urduValidationList) {
    const el = document.getElementById(item.id);
    if (item.req && (!item.val || item.val.length === 0)) {
      el?.focus();
      showAlert(`برائے مہربانی "${item.name}" درج کریں۔`);
      return;
    }
    if (item.val && /[0-9۰-۹٠-٩]/.test(item.val)) {
      el?.focus();
      showAlert(`اردو کی جگہ ریاضی قبول نہیں ہے! "${item.name}" میں صرف اردو الفاظ لکھیں۔`);
      return;
    }
    if (item.val && /[a-zA-Z]/.test(item.val)) {
      el?.focus();
      showAlert(`اس خانے میں انگلش کی اجازت نہیں ہے! "${item.name}" میں صرف اردو الفاظ لکھیں۔`);
      return;
    }
    if (item.val && !urduOnlyRegex.test(item.val)) {
      el?.focus();
      showAlert(`"${item.name}" میں صرف اردو حروف درج کریں۔`);
      return;
    }
    if (item.val && item.val.length < item.min) {
      el?.focus();
      showAlert(`"${item.name}" کم از کم ${item.min} اردو حروف پر مشتمل ہونا چاہیے۔`);
      return;
    }
  }

  // 2. انگلش کی جگہ صرف انگلش چیک
  if (!fullNameEn || fullNameEn.length === 0) {
    document.getElementById('fullNameEn')?.focus();
    showAlert('برائے مہربانی طالب علم کا نام انگلش میں (Student Name in English) درج کریں۔');
    return;
  }
  if (!/^[a-zA-Z\s]+$/.test(fullNameEn)) {
    document.getElementById('fullNameEn')?.focus();
    showAlert('انگلش کی جگہ اردو یا ریاضی قبول نہیں ہے! صرف انگریزی حروف (A-Z) لکھیں۔');
    return;
  }
  if (fullNameEn.length < 3) {
    document.getElementById('fullNameEn')?.focus();
    showAlert('انگلش نام کم از کم 3 حروف پر مشتمل ہونا چاہیے۔');
    return;
  }

  if (email && email.length > 0) {
    if (/[\u0600-\u06FF]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('email')?.focus();
      showAlert('برائے مہربانی درست انگلش ای میل ایڈریس درج کریں (مثال: student@gmail.com)۔');
      return;
    }
  }

  // 3. ریاضی کی جگہ صرف ریاضی چیک (ریاضی کی جگہ اردو قبول نا کرے)
  if (/[\u0600-\u06FF]/.test(cnic)) {
    document.getElementById('cnic')?.focus();
    showAlert('ریاضی کی جگہ اردو قبول نہیں ہے! شناختی کارڈ میں صرف 13 ہندسے درج کریں۔');
    return;
  }
  const cleanCnic = cnic.replace(/\D/g, '');
  if (cleanCnic.length !== 13) {
    document.getElementById('cnic')?.focus();
    showAlert('سیکیورٹی وارننگ: شناختی کارڈ یا ب فارم میں صرف ریاضی کے 13 ہندسے درج کرنا لازمی ہے۔');
    return;
  }

  if (/[\u0600-\u06FF]/.test(phone)) {
    document.getElementById('phone')?.focus();
    showAlert('ریاضی کی جگہ اردو قبول نہیں ہے! موبائل نمبر میں صرف 11 ہندسے درج کریں۔');
    return;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 11 || !cleanPhone.startsWith('03')) {
    document.getElementById('phone')?.focus();
    showAlert('سیکیورٹی وارننگ: موبائل / واٹس ایپ نمبر میں صرف ریاضی کے 11 ہندسے درج کریں جو 03 سے شروع ہوں (مثال: 0300-1234567)۔');
    return;
  }

  if (transactionId) {
    if (/[\u0600-\u06FF]/.test(transactionId)) {
      document.getElementById('transactionId')?.focus();
      showAlert('ریاضی کی جگہ اردو قبول نہیں ہے! رسید نمبر میں صرف ہندسے درج کریں۔');
      return;
    }
    const cleanTid = transactionId.replace(/\D/g, '');
    if (cleanTid.length === 0 || cleanTid !== transactionId.replace(/[\s\-]/g, '')) {
      document.getElementById('transactionId')?.focus();
      showAlert('سیکیورٹی وارننگ: رسید نمبر / TID میں صرف ریاضی کے ہندسے درج کیے جا سکتے ہیں۔');
      return;
    }
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
        fullNameEn: (fullNameEn || '').replace(/[<>]/g, '').toUpperCase(),
        fatherName: fatherName.replace(/[<>]/g, ''),
        gender: gender,
        genderUrdu: gender === 'female' ? 'فی میل (عورت / Female)' : 'میل (مرد / Male)',
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
    updateSeatsCounter();

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
    elSlipCourse.textContent = adm.selectedCourse || appConfig.courseTitle || 'آن لائن ویب و موبائل ایپ ڈویلپمنٹ کورس';
  }

  document.getElementById('slipName').textContent = escapeHtml(adm.fullName);
  const elSlipNameEn = document.getElementById('slipNameEn');
  if (elSlipNameEn) elSlipNameEn.textContent = escapeHtml(adm.fullNameEn || '-');
  const elSlipGender = document.getElementById('slipGender');
  if (elSlipGender) elSlipGender.textContent = escapeHtml(adm.genderUrdu || (adm.gender === 'female' ? 'فی میل (عورت)' : 'میل (مرد)'));
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
    `السلام علیکم!\nمیں نے آن لائن داخلہ فارم پر کر دیا ہے۔\n\nکورس: ${adm.selectedCourse || appConfig.courseTitle}\nطالب علم کا نام (اردو): ${adm.fullName}\nنام (English Name): ${adm.fullNameEn || '-'}\nجنس: ${adm.genderUrdu || (adm.gender === 'female' ? 'فی میل (عورت)' : 'میل (مرد)')}\nوالد کا نام: ${adm.fatherName}\nشناختی کارڈ: ${adm.cnic}\nرجسٹریشن نمبر: ${adm.regNo}\nموبائل نمبر: ${adm.phone}\nشہر: ${adm.city}\nکورس دورانیہ: 3 ماہ\nلیپ ٹاپ: ${adm.hasLaptop !== false ? 'موجود ہے' : 'انتظام ہو جائے گا'}\nادا شدہ ایڈوانس فیس: ${paidFee} روپے\nادائیگی کا طریقہ: ${paymentMethodLabel}\nٹرانزیکشن آئی ڈی: ${adm.transactionId || '-'}\n\nبرائے مہربانی فیس تصدیق فرما کر مجھے واٹس ایپ کلاس گروپ میں شامل فرما لیں۔`
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
