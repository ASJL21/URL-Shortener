document.addEventListener('DOMContentLoaded', () => {
  const shortenForm = document.getElementById('shortenForm');
  const originalUrlInput = document.getElementById('originalUrl');
  const customCodeInput = document.getElementById('customCode');
  const domainPrefix = document.getElementById('domainPrefix');
  const submitBtn = document.getElementById('submitBtn');
  const alertBox = document.getElementById('alertBox');
  const resultBox = document.getElementById('resultBox');
  const shortUrlDisplay = document.getElementById('shortUrlDisplay');
  const targetUrlDisplay = document.getElementById('targetUrlDisplay');
  const resultClicks = document.getElementById('resultClicks');
  const copyBtn = document.getElementById('copyBtn');
  const visitBtn = document.getElementById('visitBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const urlsTableBody = document.getElementById('urlsTableBody');
  const toast = document.getElementById('toast');

  // Set the current domain prefix dynamically
  if (domainPrefix) {
    domainPrefix.textContent = `${window.location.host}/`;
  }

  // Load existing shortened URLs on page load
  fetchUrls();

  // Handle Form Submission
  shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    setLoading(true);

    const originalUrl = originalUrlInput.value.trim();
    const customCode = customCodeInput.value.trim();

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl, customCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to shorten URL');
      }

      // Display the result
      showResult(data.data);
      // Reset custom input
      customCodeInput.value = '';
      // Refresh table
      fetchUrls();
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Handle Copy to Clipboard
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shortUrlDisplay.value);
      showToast('Copied short URL to clipboard! 📋');
    } catch (err) {
      // Fallback for older browsers
      shortUrlDisplay.select();
      document.execCommand('copy');
      showToast('Copied short URL to clipboard! 📋');
    }
  });

  // Handle Refresh Button
  refreshBtn.addEventListener('click', () => {
    fetchUrls();
    showToast('Link stats refreshed 🔄');
  });

  // Fetch all active URLs from the server
  async function fetchUrls() {
    try {
      const res = await fetch('/api/urls');
      const data = await res.json();

      if (data.success && Array.isArray(data.urls)) {
        renderTable(data.urls);
      }
    } catch (err) {
      console.error('Error fetching URLs:', err);
      urlsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state" style="color: #ef4444;">
            Failed to load links. Ensure the server is running.
          </td>
        </tr>
      `;
    }
  }

  // Render URL entries into HTML table
  function renderTable(urls) {
    if (urls.length === 0) {
      urlsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            No shortened URLs yet. Shorten your first link above!
          </td>
        </tr>
      `;
      return;
    }

    const host = window.location.origin;

    urlsTableBody.innerHTML = urls
      .map((item) => {
        const fullShortUrl = `${host}/${item.shortCode}`;
        const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return `
          <tr>
            <td>
              <a href="/${escapeHtml(item.shortCode)}" target="_blank" class="short-link-cell">
                /${escapeHtml(item.shortCode)}
              </a>
            </td>
            <td>
              <div class="dest-cell" title="${escapeHtml(item.originalUrl)}">
                ${escapeHtml(item.originalUrl)}
              </div>
            </td>
            <td>
              <span class="clicks-badge">${item.clicks || 0} ${item.clicks === 1 ? 'click' : 'clicks'}</span>
            </td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">
              ${formattedDate}
            </td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <button
                  class="btn btn-secondary"
                  style="padding: 0.25rem 0.6rem; font-size: 0.75rem;"
                  onclick="copyText('${fullShortUrl}')"
                  title="Copy link"
                >
                  Copy
                </button>
                <button
                  class="btn-delete"
                  onclick="deleteUrl('${item.shortCode}')"
                  title="Delete URL"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Expose deleteUrl globally so onclick handlers can access it
  window.deleteUrl = async function (shortCode) {
    if (!confirm(`Delete short link "/${shortCode}"?`)) return;

    try {
      const res = await fetch(`/api/urls/${shortCode}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Link deleted successfully');
        fetchUrls();
      } else {
        alert(data.message || 'Could not delete link');
      }
    } catch (err) {
      alert('Error deleting link');
    }
  };

  // Expose copyText globally
  window.copyText = function (text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard! 📋');
    });
  };

  function showResult(item) {
    const fullShortUrl = `${window.location.origin}/${item.shortCode}`;
    shortUrlDisplay.value = fullShortUrl;
    targetUrlDisplay.textContent = item.originalUrl;
    resultClicks.textContent = `${item.clicks || 0} clicks`;
    visitBtn.href = `/${item.shortCode}`;

    resultBox.classList.remove('hidden');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showAlert(msg, type = 'error') {
    alertBox.textContent = msg;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    alertBox.classList.add('hidden');
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.querySelector('.btn-text').textContent = isLoading
      ? 'Generating Short URL...'
      : 'Shorten URL';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

