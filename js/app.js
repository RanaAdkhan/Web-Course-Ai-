// Student Admission Form Logic
let appConfig = {
  courseTitle: "آن لائن پروفیشنل آئی ٹی و کمپیوٹر کورس",
  courseDescription: "شاندار مستقبل کی طرف ایک قدم - بنیادی سے لے کر ایڈوانس تک مکمل پریکٹیکل کورس",
  courseFee: 5000,
  madrassaDiscountPercent: 50,
  supportPhone: "0300-1234567",
  whatsappGroup: "https://chat.whatsapp.com/example",
  paymentAccounts: {
    easypaisa: {
      name: "ایزی پیسہ (Easypaisa)",
      accountTitle: "کورس ایڈمن",
      accountNumber: "03001234567"
    },
    jazzcash: {
      name: "جاز کیش (JazzCash)",
      accountTitle: "کورس ایڈمن",
      accountNumber: "03217654321"
    },
    bank: {
      name: "بینک اکاؤنٹ",
      bankName: "Meezan Bank Limited",
      accountTitle: "کورس فاؤنڈیشن",
      accountNumber: "01010102030405"
    }
  }
};

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
    // Running in static GitHub Pages mode or offline
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
      if (elTitle) elTitle.textContent = ep.accountTitle;
      if (elNum) elNum.textContent = ep.accountNumber;
    }

    const jc = appConfig.paymentAccounts.jazzcash;
    if (jc) {
      const elTitle = document.getElementById('jazzcashTitle');
      const elNum = document.getElementById('jazzcashNumber');
      if (elTitle) elTitle.textContent = jc.accountTitle;
      if (elNum) elNum.textContent = jc.accountNumber;
    }

    const bk = appConfig.paymentAccounts.bank;
    if (bk) {
      const elBankName = document.getElementById('bankName');
      const elTitle = document.getElementById('bankTitle');
      const elNum = document.getElementById('bankNumber');
      if (elBankName) elBankName.textContent = bk.bankName || 'بینک اکاؤنٹ';
      if (elTitle) elTitle.textContent = bk.accountTitle;
      if (elNum) elNum.textContent = `A/C: ${bk.accountNumber}`;
    }
  }

  // Recalculate fee display
  calculateFee();
}

// Setup Event Listeners
function setupEventListeners() {
  const madrassaToggle = document.getElementById('isMadrassaStudent');
  const madrassaArea = document.getElementById('madrassaFieldsArea');
  const madrassaNameInput = document.getElementById('madrassaName');
  const madrassaClassInput = document.getElementById('madrassaClass');

  if (madrassaToggle) {
    madrassaToggle.addEventListener('change', () => {
      const isChecked = madrassaToggle.checked;
      if (isChecked) {
        madrassaArea.classList.remove('hidden');
        madrassaNameInput.setAttribute('required', 'true');
        madrassaClassInput.setAttribute('required', 'true');
      } else {
        madrassaArea.classList.add('hidden');
        madrassaNameInput.removeAttribute('required');
        madrassaClassInput.removeAttribute('required');
      }
      calculateFee();
    });
  }

  const form = document.getElementById('admissionForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

// CNIC Auto Formatter (XXXXX-XXXXXXX-X)
function setupCnicFormatter() {
  const cnicInput = document.getElementById('cnic');
  if (!cnicInput) return;

  cnicInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, ''); // strip non-digits
    if (val.length > 13) val = val.substring(0, 13);

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

// Calculate fee dynamically
function calculateFee() {
  const isMadrassa = document.getElementById('isMadrassaStudent')?.checked;
  const originalFee = Number(appConfig.courseFee) || 5000;
  const discountPercent = isMadrassa ? (Number(appConfig.madrassaDiscountPercent) || 50) : 0;
  const discountAmount = Math.round((originalFee * discountPercent) / 100);
  const payableFee = originalFee - discountAmount;

  const elOriginal = document.getElementById('displayOriginalFee');
  const elDiscount = document.getElementById('displayDiscount');
  const elPayable = document.getElementById('displayPayableFee');

  if (elOriginal) elOriginal.textContent = `${originalFee.toLocaleString('ur-PK')} روپے`;
  if (elDiscount) {
    if (isMadrassa) {
      elDiscount.textContent = `${discountPercent}% (-${discountAmount.toLocaleString('ur-PK')} روپے)`;
      elDiscount.className = 'text-xl font-bold font-mono text-emerald-400 badge-pulse';
    } else {
      elDiscount.textContent = '0% (0 روپے)';
      elDiscount.className = 'text-xl font-bold font-mono text-slate-400';
    }
  }
  if (elPayable) elPayable.textContent = `${payableFee.toLocaleString('ur-PK')} روپے`;
}

// Image Preview Helper
window.previewImage = function (input, imgId, placeholderId, nameId) {
  const file = input.files && input.files[0];
  const img = document.getElementById(imgId);
  const placeholder = document.getElementById(placeholderId);
  const nameLabel = document.getElementById(nameId);

  if (file) {
    if (nameLabel) nameLabel.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (img) {
        img.src = e.target.result;
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

// Helper: Convert File to Data URL
function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Handle Form Submit
async function handleFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('admissionForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');

  // Basic validations
  const fullName = document.getElementById('fullName')?.value.trim();
  const fatherName = document.getElementById('fatherName')?.value.trim();
  const cnic = document.getElementById('cnic')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const address = document.getElementById('address')?.value.trim() || '';
  const qualification = document.getElementById('qualification')?.value || '';
  const email = document.getElementById('email')?.value.trim() || '';
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

  // Validate CNIC (13 digits)
  const cleanCnic = cnic.replace(/\D/g, '');
  if (cleanCnic.length !== 13) {
    showAlert('شناختی کارڈ یا ب فارم نمبر 13 ہندسوں پر مشتمل ہونا لازمی ہے۔');
    return;
  }

  // Validate Photo
  if (!studentPhoto) {
    showAlert('طالب علم کی پاسپورٹ سائز تصویر اپلوڈ کرنا لازمی ہے۔');
    return;
  }

  // Validate Madrassa
  if (isMadrassa && !madrassaName) {
    showAlert('مدرسہ رعایت حاصل کرنے کے لیے جامعہ / مدرسے کا نام درج کرنا لازمی ہے۔');
    return;
  }

  // Validate Receipt
  if (!paymentReceipt) {
    showAlert('فیس ادائیگی کی رسید یا سکرین شاٹ اپلوڈ کرنا لازمی ہے۔');
    return;
  }

  // Validate Declaration
  if (!declaration) {
    showAlert('برائے مہربانی اقرار نامے کے چیک باکس کو منتخب کریں۔');
    return;
  }

  // Set loading state
  submitBtn.disabled = true;
  submitBtnText.textContent = 'درخواست جمع ہو رہی ہے، برائے مہربانی انتظار فرمائیں...';
  submitSpinner.classList.remove('hidden');

  const courseFee = Number(appConfig.courseFee) || 5000;
  const discountPercent = isMadrassa ? (Number(appConfig.madrassaDiscountPercent) || 50) : 0;
  const discountAmount = Math.round((courseFee * discountPercent) / 100);
  const payableFee = courseFee - discountAmount;

  try {
    // Try sending to Node.js backend if available
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
    } catch (apiErr) {
      // Backend not running (e.g. static GitHub Pages)
    }

    // If backend wasn't available, handle on client side
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
        fullName,
        fatherName,
        cnic,
        phone,
        email,
        city,
        address,
        qualification,
        isMadrassaStudent: isMadrassa,
        madrassaName: isMadrassa ? madrassaName : '',
        madrassaClass: isMadrassa ? madrassaClass : '',
        paymentMethod,
        transactionId,
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
        // In case localStorage is full with big images, save without large base64
        const lightweight = { ...savedAdmission, files: {} };
        localStorage.setItem('admissions_light', JSON.stringify([lightweight]));
      }
    }

    showAlert('آپ کی داخلہ درخواست کامیابی سے تیار ہو گئی ہے! نیچے دی گئی سلپ محفوظ کریں اور واٹس ایپ پر ایڈمن کو رسید بھیجیں۔', 'success');
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

// Reset image previews after successful submission
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
  document.getElementById('slipRegNo').textContent = `رجسٹریشن نمبر: ${adm.regNo}`;
  document.getElementById('slipStatus').textContent = `حیثیت: ${adm.status}`;

  if (adm.files && adm.files.studentPhoto) {
    document.getElementById('slipPhoto').src = adm.files.studentPhoto;
  }

  document.getElementById('slipName').textContent = adm.fullName;
  document.getElementById('slipFatherName').textContent = adm.fatherName;
  document.getElementById('slipCnic').textContent = adm.cnic;
  document.getElementById('slipPhone').textContent = adm.phone;
  document.getElementById('slipCityAddress').textContent = `${adm.city} ${adm.address ? ' - ' + adm.address : ''}`;

  if (adm.isMadrassaStudent) {
    document.getElementById('slipMadrassaInfo').innerHTML = `
      <span class="inline-flex items-center gap-1 text-emerald-700 font-bold">
        <i class="fa-solid fa-circle-check"></i> دینی مدرسہ طالب علم (50% رعایت منظور)
      </span>
      <div class="text-[11px] text-slate-500 mt-0.5">${adm.madrassaName || ''} (${adm.madrassaClass || ''})</div>
    `;
  } else {
    document.getElementById('slipMadrassaInfo').textContent = 'عام طالب علم (بغیر رعایت)';
  }

  const fee = adm.feeDetails || {};
  document.getElementById('slipOriginalFee').textContent = `${(fee.originalFee || 5000).toLocaleString('ur-PK')} روپے`;
  document.getElementById('slipDiscount').textContent = `${fee.discountPercent || 0}% (${(fee.discountAmount || 0).toLocaleString('ur-PK')} روپے)`;
  document.getElementById('slipPaidFee').textContent = `${(fee.paidFee || 5000).toLocaleString('ur-PK')} روپے`;
  document.getElementById('slipTid').textContent = adm.transactionId || 'دستیاب نہیں';

  // WhatsApp share link
  const supportPhone = (appConfig.supportPhone || '03001234567').replace(/\D/g, '');
  const shareMsg = encodeURIComponent(
    `السلام علیکم!\nمیں نے آن لائن داخلہ فارم پر کر دیا ہے۔\nنام: ${adm.fullName}\nوالد کا نام: ${adm.fatherName}\nشناختی کارڈ: ${adm.cnic}\nرجسٹریشن نمبر: ${adm.regNo}\nفون نمبر: ${adm.phone}\nشہر: ${adm.city}\nمدرسہ رعایت: ${adm.isMadrassaStudent ? 'ہاں (50% ڈسکاؤنٹ)' : 'نہیں'}\nادا شدہ فیس: ${fee.paidFee || 0} روپے\nٹرانزیکشن آئی ڈی: ${adm.transactionId || '-'}\n\nبرائے مہربانی فیس تصدیق کر کے واٹس ایپ گروپ میں شامل فرما لیں۔`
  );
  const waBtn = document.getElementById('slipWhatsappShare');
  if (waBtn) {
    waBtn.href = `https://wa.me/92${supportPhone.replace(/^0/, '')}?text=${shareMsg}`;
  }

  modal.classList.remove('hidden');
}

// Close Slip Modal
window.closeSlipModal = function () {
  const modal = document.getElementById('admissionSlipModal');
  if (modal) modal.classList.add('hidden');
};
