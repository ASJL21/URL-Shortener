# 🔗 Node.js URL Shortener

A lightweight, beginner-friendly URL Shortener application built with **Node.js** and **Express**. It maps long web addresses to short unique identifiers and handles immediate browser redirection with click analytics.

---

## 🎯 Key Skills & Concepts Learned

| Concept | Implementation in Code | Purpose |
| :--- | :--- | :--- |
| **Dynamic Routing** | `app.get('/:shortUrl', (req, res) => ...)` | Captures variable path segments dynamically via `req.params.shortUrl`. |
| **Request Handling** | `express.json()`, `express.urlencoded()`, `req.body` | Parses and validates incoming payloads (URLs, custom aliases). |
| **HTTP Redirection** | `res.redirect(entry.originalUrl)` | Issues standard `HTTP 302 Found` with a `Location` header to redirect the browser. |

---

## 📁 Project Structure

```
nodejs project/
├── data/
│   └── urls.json          # Persistent JSON storage for shortened URLs
├── public/
│   ├── css/
│   │   └── style.css      # Modern dark-mode UI styling
│   ├── js/
│   │   └── app.js         # Frontend interactive logic & API calls
│   ├── 404.html           # Custom 404 page for unknown short links
│   └── index.html         # Main dashboard and link generator UI
├── package.json           # Dependencies and run scripts
├── server.js              # Express server, dynamic routes, and redirect logic
├── test.js                # Automated verification test suite
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure [Node.js](https://nodejs.org/) (v16+) is installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
- **Standard start:**
  ```bash
  npm start
  ```
- **Development mode** (auto-reloads on file changes):
  ```bash
  npm run dev
  ```

Once started, open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

### 4. Run Automated Tests
```bash
npm test
```

---

## 🛠️ How It Works Under the Hood

### 1. Generating Short Links
When you submit a long URL:
- The server checks if the URL starts with `http://` or `https://` (automatically prepends `https://` if omitted).
- A 6-character random string (or custom alias) is assigned:
  ```javascript
  const shortCode = customCode || generateShortCode(6);
  ```
- The mapping is saved to `data/urls.json` alongside click metrics.

### 2. Handling Redirection via Dynamic Routing
When any visitor requests `http://localhost:3000/:shortUrl`:
```javascript
app.get('/:shortUrl', (req, res) => {
  const { shortUrl } = req.params;
  const entry = urls.find((item) => item.shortCode === shortUrl);

  if (!entry) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // Increment click analytics
  entry.clicks = (entry.clicks || 0) + 1;
  saveUrls(urls);

  // Issue formal HTTP 302 Found redirect
  return res.redirect(entry.originalUrl);
});
```

---

## 🔌 API Reference

### `POST /api/shorten`
Shortens a URL.

**Request Body:**
```json
{
  "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "customCode": "mdn-js" // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Short URL created successfully!",
  "data": {
    "shortCode": "mdn-js",
    "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "shortUrl": "http://localhost:3000/mdn-js",
    "clicks": 0,
    "createdAt": "2026-11-02T12:00:00.000Z"
  }
}
```

### `GET /api/urls`
Returns all stored short URLs and their click counts.

### `DELETE /api/urls/:code`
Deletes a shortened link.

### `GET /:shortUrl`
Direct redirect endpoint to destination URL.

