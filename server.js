const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'urls.json');

// ==========================================
// 1. Data Store Helper Functions
// ==========================================
function loadUrls() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading URLs file:', err);
    return [];
  }
}

function saveUrls(urls) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(urls, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving URLs file:', err);
  }
}

// Generate a random, safe short code (e.g. "x9b2q1")
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

// Validate that a string is a valid web URL with http/https
function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ==========================================
// 2. Middleware (Handling Incoming Requests)
// ==========================================
// Parse JSON payloads in request body
app.use(express.json());
// Parse URL-encoded bodies (for standard HTML form submissions)
app.use(express.urlencoded({ extended: true }));
// Serve static client assets (HTML, CSS, JS) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 3. API Routes
// ==========================================

// GET /api/urls - Retrieve all shortened URLs and their click statistics
app.get('/api/urls', (req, res) => {
  const urls = loadUrls();
  res.json({ success: true, count: urls.length, urls });
});

// POST /api/shorten - Shorten a given long web URL
app.post('/api/shorten', (req, res) => {
  let { originalUrl, customCode } = req.body;

  if (!originalUrl || typeof originalUrl !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Original URL is required.'
    });
  }

  originalUrl = originalUrl.trim();

  // Automatically prepend https:// if protocol was omitted
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = 'https://' + originalUrl;
  }

  // Validate the URL format
  if (!isValidHttpUrl(originalUrl)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid web URL (must start with http:// or https://).'
    });
  }

  const urls = loadUrls();

  let shortCode;
  if (customCode && typeof customCode === 'string') {
    const sanitizedCode = customCode.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedCode.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Custom code must be at least 3 alphanumeric characters.'
      });
    }

    const exists = urls.some(
      (entry) => entry.shortCode.toLowerCase() === sanitizedCode.toLowerCase()
    );
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Custom short code '${sanitizedCode}' is already taken. Please choose another.`
      });
    }
    shortCode = sanitizedCode;
  } else {
    // Generate a unique random code
    do {
      shortCode = generateShortCode(6);
    } while (urls.some((entry) => entry.shortCode === shortCode));
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const shortUrl = `${protocol}://${host}/${shortCode}`;

  const newEntry = {
    shortCode,
    originalUrl,
    shortUrl,
    clicks: 0,
    createdAt: new Date().toISOString()
  };

  urls.unshift(newEntry);
  saveUrls(urls);

  return res.status(201).json({
    success: true,
    message: 'Short URL created successfully!',
    data: newEntry
  });
});

// DELETE /api/urls/:code - Delete a shortened URL
app.delete('/api/urls/:code', (req, res) => {
  const { code } = req.params;
  const urls = loadUrls();
  const index = urls.findIndex((u) => u.shortCode.toLowerCase() === code.toLowerCase());

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'URL not found.' });
  }

  urls.splice(index, 1);
  saveUrls(urls);
  return res.json({ success: true, message: 'URL deleted successfully.' });
});

// ==========================================
// 4. Dynamic Routing & Immediate HTTP Redirection
// ==========================================
// Handles incoming requests mapped to /:shortUrl
// Example: visiting http://localhost:3000/xyz123 matches here
app.get('/:shortUrl', (req, res) => {
  const { shortUrl } = req.params;

  // Guard against favicon requests or browser internal lookups
  if (shortUrl === 'favicon.ico') {
    return res.status(204).end();
  }

  const urls = loadUrls();
  const entry = urls.find(
    (item) => item.shortCode.toLowerCase() === shortUrl.toLowerCase()
  );

  if (!entry) {
    // Render custom 404 page when the short code is not found
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // Track redirection analytics
  entry.clicks = (entry.clicks || 0) + 1;
  entry.lastAccessedAt = new Date().toISOString();
  saveUrls(urls);

  console.log(`[Redirect] /${shortUrl} -> ${entry.originalUrl} (Total clicks: ${entry.clicks})`);

  // Formal HTTP Redirection
  // res.redirect() issues an HTTP 302 Found response with a "Location" header pointing to originalUrl
  return res.redirect(entry.originalUrl);
});

// Catch-all 404 for any other unrecognized paths
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ==========================================
// 5. Server Startup
// ==========================================
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 URL Shortener Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});

