const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ADMISSIONS_FILE = path.join(DATA_DIR, 'admissions.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Helper to read JSON
function readJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

// Helper to write JSON
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter (images and pdfs)
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('صرف تصویر (JPG, PNG, WEBP) یا PDF فائل اپلوڈ کی جا سکتی ہے۔'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple admin session management
const activeTokens = new Set();

function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'ایڈمن لاگ اِن درکار ہے' });
  }
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (activeTokens.has(token)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'غیر معتبر سیشن یا ٹوکن' });
}

// Routes

// 1. Get Public Config
app.get('/api/config', (req, res) => {
  const config = readJson(CONFIG_FILE, {});
  const { adminPassword, ...publicConfig } = config;
  res.json({ success: true, config: publicConfig });
});

// 2. Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const config = readJson(CONFIG_FILE, {});
  const expectedPassword = config.adminPassword || 'admin123';

  if (password === expectedPassword) {
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    activeTokens.add(token);
    return res.json({ success: true, token, message: 'لاگ اِن کامیاب!' });
  }
  return res.status(401).json({ success: false, message: 'پاس ورڈ درست نہیں ہے۔' });
});

// 3. Admin Update Config
app.post('/api/config', verifyAdmin, (req, res) => {
  const currentConfig = readJson(CONFIG_FILE, {});
  const updated = {
    ...currentConfig,
    ...req.body
  };
  // Don't overwrite password if blank
  if (!req.body.adminPassword) {
    updated.adminPassword = currentConfig.adminPassword;
  }
  writeJson(CONFIG_FILE, updated);
  res.json({ success: true, message: 'سیٹنگز کامیابی سے محفوظ ہو گئیں!' });
});

// 4. Submit Admission Form
const uploadFields = upload.fields([
  { name: 'studentPhoto', maxCount: 1 },
  { name: 'madrassaCard', maxCount: 1 },
  { name: 'paymentReceipt', maxCount: 1 }
]);

app.post('/api/admissions', (req, res) => {
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'فائل اپلوڈ کرنے میں خرابی پیش آئی۔' });
    }

    try {
      const {
        fullName,
        fatherName,
        cnic,
        phone,
        email,
        city,
        address,
        qualification,
        isMadrassaStudent,
        madrassaName,
        madrassaClass,
        paymentMethod,
        transactionId,
        notes
      } = req.body;

      // Validation
      if (!fullName || !fatherName || !cnic || !phone || !city) {
        return res.status(400).json({
          success: false,
          message: 'برائے مہربانی تمام لازمی خانے (نام، والد کا نام، شناختی کارڈ، فون اور شہر) پر کریں۔'
        });
      }

      if (!req.files || !req.files['studentPhoto']) {
        return res.status(400).json({
          success: false,
          message: 'طالب علم کی پاسپورٹ سائز تصویر اپلوڈ کرنا لازمی ہے۔'
        });
      }

      if (!req.files['paymentReceipt']) {
        return res.status(400).json({
          success: false,
          message: 'فیس ادائیگی کی رسید / سکرین شاٹ اپلوڈ کرنا لازمی ہے۔'
        });
      }

      const isMadrassa = isMadrassaStudent === 'true' || isMadrassaStudent === true;
      if (isMadrassa && !madrassaName) {
        return res.status(400).json({
          success: false,
          message: 'مدرسے کی رعایت کے لیے مدرسہ / جامعہ کا نام درج کرنا لازمی ہے۔'
        });
      }

      const config = readJson(CONFIG_FILE, {});
      const courseFee = Number(config.courseFee) || 5000;
      const discountPercent = isMadrassa ? (Number(config.madrassaDiscountPercent) || 50) : 0;
      const discountAmount = Math.round((courseFee * discountPercent) / 100);
      const payableFee = courseFee - discountAmount;

      const admissions = readJson(ADMISSIONS_FILE, []);
      const nextNum = admissions.length + 1;
      const regNo = `ADM-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const id = `adm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const newAdmission = {
        id,
        regNo,
        submittedAt: new Date().toISOString(),
        status: 'زیرِ تصدیق', // Pending
        statusEn: 'pending',
        fullName: fullName.trim(),
        fatherName: fatherName.trim(),
        cnic: cnic.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : '',
        city: city.trim(),
        address: address ? address.trim() : '',
        qualification: qualification ? qualification.trim() : '',
        isMadrassaStudent: isMadrassa,
        madrassaName: isMadrassa ? (madrassaName ? madrassaName.trim() : '') : '',
        madrassaClass: isMadrassa ? (madrassaClass ? madrassaClass.trim() : '') : '',
        paymentMethod: paymentMethod || 'easypaisa',
        transactionId: transactionId ? transactionId.trim() : '',
        notes: notes ? notes.trim() : '',
        feeDetails: {
          originalFee: courseFee,
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          paidFee: payableFee
        },
        files: {
          studentPhoto: req.files['studentPhoto'] ? `/uploads/${req.files['studentPhoto'][0].filename}` : null,
          madrassaCard: req.files['madrassaCard'] ? `/uploads/${req.files['madrassaCard'][0].filename}` : null,
          paymentReceipt: req.files['paymentReceipt'] ? `/uploads/${req.files['paymentReceipt'][0].filename}` : null
        }
      };

      admissions.unshift(newAdmission);
      writeJson(ADMISSIONS_FILE, admissions);

      res.status(201).json({
        success: true,
        message: 'آپ کی داخلہ درخواست اور فیس کی تفصیلات کامیابی سے موصول ہو گئی ہیں!',
        admission: newAdmission
      });
    } catch (error) {
      console.error('Error saving admission:', error);
      res.status(500).json({ success: false, message: 'درخواست محفوظ کرنے میں خرابی واقع ہوئی۔' });
    }
  });
});

// 5. Lookup admission slip by regNo
app.get('/api/admissions/slip/:regNo', (req, res) => {
  const admissions = readJson(ADMISSIONS_FILE, []);
  const found = admissions.find((a) => a.regNo.toLowerCase() === req.params.regNo.toLowerCase());
  if (!found) {
    return res.status(404).json({ success: false, message: 'داخلہ نمبر نہیں ملا۔' });
  }
  res.json({ success: true, admission: found });
});

// 6. Get All Admissions (Admin)
app.get('/api/admissions', verifyAdmin, (req, res) => {
  const admissions = readJson(ADMISSIONS_FILE, []);
  res.json({ success: true, admissions });
});

// 7. Update Admission Status (Admin)
app.patch('/api/admissions/:id/status', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { status, statusEn } = req.body;
  const admissions = readJson(ADMISSIONS_FILE, []);

  const idx = admissions.findIndex((a) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
  }

  admissions[idx].status = status || admissions[idx].status;
  admissions[idx].statusEn = statusEn || admissions[idx].statusEn;
  admissions[idx].updatedAt = new Date().toISOString();

  writeJson(ADMISSIONS_FILE, admissions);
  res.json({ success: true, message: 'حیثیت کامیابی سے تبدیل ہو گئی!', admission: admissions[idx] });
});

// 8. Delete Admission (Admin)
app.delete('/api/admissions/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const admissions = readJson(ADMISSIONS_FILE, []);

  const itemToDelete = admissions.find((a) => a.id === id);
  if (!itemToDelete) {
    return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
  }

  // Optionally delete files
  if (itemToDelete.files) {
    Object.values(itemToDelete.files).forEach((filePath) => {
      if (filePath) {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {}
        }
      }
    });
  }

  const filtered = admissions.filter((a) => a.id !== id);
  writeJson(ADMISSIONS_FILE, filtered);

  res.json({ success: true, message: 'ریکارڈ حذف کر دیا گیا ہے۔' });
});

// 9. Export Admissions as CSV (Admin)
app.get('/api/admissions/export-csv', verifyAdmin, (req, res) => {
  const admissions = readJson(ADMISSIONS_FILE, []);

  // CSV Headers in Urdu
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
    'مدرسہ طالب علم',
    'مدرسے کا نام',
    'مدرسہ کلاس',
    'اصل فیس',
    'رعایت فیصد',
    'ادا شدہ فیس',
    'ادائیگی کا طریقہ',
    'ٹرانزیکشن آئی ڈی'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = admissions.map((a) => [
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
    escapeCsv(a.isMadrassaStudent ? 'ہاں (50% رعایت)' : 'نہیں'),
    escapeCsv(a.madrassaName || '-'),
    escapeCsv(a.madrassaClass || '-'),
    escapeCsv(a.feeDetails ? a.feeDetails.originalFee : ''),
    escapeCsv(a.feeDetails ? a.feeDetails.discountPercent + '%' : ''),
    escapeCsv(a.feeDetails ? a.feeDetails.paidFee : ''),
    escapeCsv(a.paymentMethod),
    escapeCsv(a.transactionId || '-')
  ]);

  // UTF-8 BOM so Excel opens Urdu properly
  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="course_admissions_${Date.now()}.csv"`);
  res.send(csvContent);
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 کورس داخلہ پورٹل کامیابی سے آن لائن ہو گیا ہے!`);
  console.log(`🌐 طالب علم فارم لنک: http://localhost:${PORT}`);
  console.log(`🛡️ ایڈمن پینل لنک:   http://localhost:${PORT}/admin.html`);
  console.log(`🔑 ڈیفالٹ ایڈمن پاس ورڈ: admin123`);
  console.log(`====================================================`);
});
