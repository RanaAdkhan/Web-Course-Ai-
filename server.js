const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Disable Express fingerprinting
app.disable('x-powered-by');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

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

// Input Sanitization Helper to prevent XSS
function sanitizeInput(str, maxLen = 250) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // strip dangerous tags
    .trim()
    .substring(0, maxLen);
}

// Rate Limiter Memory Store
const rateLimitMap = new Map();

function createRateLimiter(maxAttempts, windowMs, message) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip) || { count: 0, firstAttempt: now, blockedUntil: 0 };

    if (clientRecord.blockedUntil > now) {
      const waitSeconds = Math.ceil((clientRecord.blockedUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `${message} برائے مہربانی ${waitSeconds} سیکنڈ بعد دوبارہ کوشش کریں۔`
      });
    }

    if (now - clientRecord.firstAttempt > windowMs) {
      clientRecord.count = 0;
      clientRecord.firstAttempt = now;
    }

    clientRecord.count += 1;

    if (clientRecord.count > maxAttempts) {
      clientRecord.blockedUntil = now + windowMs;
      rateLimitMap.set(ip, clientRecord);
      return res.status(429).json({
        success: false,
        message: `${message} سیکیورٹی کی خاطر عارضی طور پر بلاک کر دیا گیا ہے۔`
      });
    }

    rateLimitMap.set(ip, clientRecord);
    next();
  };
}

// Rate limiters
const loginLimiter = createRateLimiter(5, 15 * 60 * 1000, 'بہت زیادہ لاگ اِن کی غلط کوششیں کی گئی ہیں!');
const submissionLimiter = createRateLimiter(15, 60 * 60 * 1000, 'بہت زیادہ درخواستیں بھیجی جا چکی ہیں!');

// Multer storage with cryptographically secure random filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeRandom = crypto.randomBytes(16).toString('hex');
    cb(null, `${file.fieldname}-${Date.now()}-${safeRandom}${ext}`);
  }
});

// Strict MIME & extension file filter
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('سیکیورٹی وارننگ: صرف محفوظ تصاویر (JPG, PNG, WEBP) یا PDF فائل اپلوڈ کی جا سکتی ہے۔'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Serve uploads with safe download/inline headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
}, express.static(UPLOADS_DIR));

// Cryptographically secure token store with expiration (24 hours)
const activeTokens = new Map();

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'ایڈمن لاگ اِن درکار ہے' });
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const tokenData = activeTokens.get(token);

  if (tokenData && tokenData.expiresAt > Date.now()) {
    return next();
  }

  // Token expired or invalid
  if (tokenData) activeTokens.delete(token);
  return res.status(403).json({ success: false, message: 'لاگ اِن سیشن ختم ہو چکا ہے، براہ کرم دوبارہ لاگ اِن کریں۔' });
}

// Routes

// 1. Get Public Config (Sensitive details never exposed)
app.get('/api/config', (req, res) => {
  const config = readJson(CONFIG_FILE, {});
  const { adminPassword, ...publicConfig } = config;
  res.json({ success: true, config: publicConfig });
});

// 2. Admin Login (With Rate Limiting & Timing Attack Protection)
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  const config = readJson(CONFIG_FILE, {});
  const expectedPassword = config.adminPassword || 'admin123';

  if (typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'درست پاس ورڈ درج کریں' });
  }

  // Timing safe comparison to prevent timing attacks
  const inputBuffer = Buffer.from(password);
  const targetBuffer = Buffer.from(expectedPassword);

  let isMatch = false;
  if (inputBuffer.length === targetBuffer.length) {
    isMatch = crypto.timingSafeEqual(inputBuffer, targetBuffer);
  }

  if (isMatch) {
    const token = generateSecureToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    activeTokens.set(token, { expiresAt });
    return res.json({ success: true, token, message: 'لاگ اِن کامیاب!' });
  }

  return res.status(401).json({ success: false, message: 'پاس ورڈ درست نہیں ہے۔' });
});

// 3. Admin Update Config
app.post('/api/config', verifyAdmin, (req, res) => {
  const currentConfig = readJson(CONFIG_FILE, {});
  const { courseTitle, courseFee, madrassaDiscountPercent, paymentAccounts, adminPassword } = req.body;

  const updated = {
    ...currentConfig,
    courseTitle: sanitizeInput(courseTitle, 100) || currentConfig.courseTitle,
    courseFee: Number(courseFee) || currentConfig.courseFee,
    madrassaDiscountPercent: Math.min(100, Math.max(0, Number(madrassaDiscountPercent) || 50)),
    paymentAccounts: paymentAccounts || currentConfig.paymentAccounts
  };

  if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim().length >= 6) {
    updated.adminPassword = adminPassword.trim();
  }

  writeJson(CONFIG_FILE, updated);
  res.json({ success: true, message: 'سیٹنگز کامیابی سے محفوظ ہو گئیں!' });
});

// 4. Submit Admission Form (With Rate Limiter & File Validation)
const uploadFields = upload.fields([
  { name: 'studentPhoto', maxCount: 1 },
  { name: 'madrassaCard', maxCount: 1 },
  { name: 'paymentReceipt', maxCount: 1 }
]);

app.post('/api/admissions', submissionLimiter, (req, res) => {
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'فائل اپلوڈ کرنے میں سیکیورٹی یا سائز کی خرابی پیش آئی۔' });
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

      // Required fields validation
      if (!fullName || !fatherName || !cnic || !phone || !city) {
        return res.status(400).json({
          success: false,
          message: 'برائے مہربانی تمام لازمی خانے (نام، والد کا نام، شناختی کارڈ، فون اور شہر) پر کریں۔'
        });
      }

      // CNIC Validation: 13 digits
      const cleanCnic = String(cnic).replace(/\D/g, '');
      if (cleanCnic.length !== 13) {
        return res.status(400).json({
          success: false,
          message: 'شناختی کارڈ یا ب فارم نمبر 13 ہندسوں پر مشتمل ہونا لازمی ہے۔'
        });
      }

      // Phone Validation: Pakistani mobile format
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 12) {
        return res.status(400).json({
          success: false,
          message: 'برائے مہربانی درست پاکستانی موبائل / واٹس ایپ نمبر درج کریں۔'
        });
      }

      // Mandatory Photo & Receipt
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

      // Server-side authoritative fee calculation (cannot be tampered by client)
      const config = readJson(CONFIG_FILE, {});
      const courseFee = Number(config.courseFee) || 5000;
      const discountPercent = isMadrassa ? (Number(config.madrassaDiscountPercent) || 50) : 0;
      const discountAmount = Math.round((courseFee * discountPercent) / 100);
      const payableFee = courseFee - discountAmount;

      const admissions = readJson(ADMISSIONS_FILE, []);
      const nextNum = admissions.length + 1;
      const regNo = `ADM-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const id = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const newAdmission = {
        id,
        regNo,
        submittedAt: new Date().toISOString(),
        status: 'زیرِ تصدیق',
        statusEn: 'pending',
        fullName: sanitizeInput(fullName, 70),
        fatherName: sanitizeInput(fatherName, 70),
        cnic: sanitizeInput(cnic, 20),
        phone: sanitizeInput(phone, 20),
        email: sanitizeInput(email, 100),
        city: sanitizeInput(city, 50),
        address: sanitizeInput(address, 200),
        qualification: sanitizeInput(qualification, 50),
        isMadrassaStudent: isMadrassa,
        madrassaName: isMadrassa ? sanitizeInput(madrassaName, 100) : '',
        madrassaClass: isMadrassa ? sanitizeInput(madrassaClass, 50) : '',
        paymentMethod: sanitizeInput(paymentMethod, 30) || 'easypaisa',
        transactionId: sanitizeInput(transactionId, 50),
        notes: sanitizeInput(notes, 300),
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

// 5. Lookup admission slip by regNo (Sanitized)
app.get('/api/admissions/slip/:regNo', (req, res) => {
  const regNoParam = sanitizeInput(req.params.regNo, 30).toLowerCase();
  const admissions = readJson(ADMISSIONS_FILE, []);
  const found = admissions.find((a) => a.regNo.toLowerCase() === regNoParam);
  if (!found) {
    return res.status(404).json({ success: false, message: 'داخلہ نمبر نہیں ملا۔' });
  }
  res.json({ success: true, admission: found });
});

// 6. Get All Admissions (Admin only)
app.get('/api/admissions', verifyAdmin, (req, res) => {
  const admissions = readJson(ADMISSIONS_FILE, []);
  res.json({ success: true, admissions });
});

// 7. Update Admission Status (Admin only)
app.patch('/api/admissions/:id/status', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { status, statusEn } = req.body;
  const admissions = readJson(ADMISSIONS_FILE, []);

  const idx = admissions.findIndex((a) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
  }

  admissions[idx].status = sanitizeInput(status, 30) || admissions[idx].status;
  admissions[idx].statusEn = sanitizeInput(statusEn, 30) || admissions[idx].statusEn;
  admissions[idx].updatedAt = new Date().toISOString();

  writeJson(ADMISSIONS_FILE, admissions);
  res.json({ success: true, message: 'حیثیت کامیابی سے تبدیل ہو گئی!', admission: admissions[idx] });
});

// 8. Delete Admission (Admin only)
app.delete('/api/admissions/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const admissions = readJson(ADMISSIONS_FILE, []);

  const itemToDelete = admissions.find((a) => a.id === id);
  if (!itemToDelete) {
    return res.status(404).json({ success: false, message: 'ریکارڈ نہیں ملا۔' });
  }

  // Delete associated files safely
  if (itemToDelete.files) {
    Object.values(itemToDelete.files).forEach((filePath) => {
      if (filePath && typeof filePath === 'string') {
        const safeFilename = path.basename(filePath);
        const fullPath = path.join(UPLOADS_DIR, safeFilename);
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

// 9. Export Admissions as CSV (Admin only, UTF-8 BOM with sanitization)
app.get('/api/admissions/export-csv', verifyAdmin, (req, res) => {
  const admissions = readJson(ADMISSIONS_FILE, []);

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

  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="course_admissions_${Date.now()}.csv"`);
  res.send(csvContent);
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️ محفوظ کورس داخلہ پورٹل کامیابی سے آن لائن ہو گیا ہے!`);
  console.log(`🌐 طالب علم فارم لنک: http://localhost:${PORT}`);
  console.log(`🛡️ ایڈمن پینل لنک:   http://localhost:${PORT}/admin.html`);
  console.log(`🔒 تمام سیکیورٹی فیچرز، ریٹ لمٹنگ اور ہیڈرز فعال ہیں۔`);
  console.log(`====================================================`);
});
