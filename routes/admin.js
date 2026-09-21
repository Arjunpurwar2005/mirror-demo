// NOTE: This admin dashboard has NO authentication. Anyone with the URL can
// view, edit, or delete previews. Do not expose this deployment publicly
// without adding an auth check (basic auth / login) in front of these routes.

const express = require('express');

const Preview = require('../models/Preview');
const { isValidHttpUrl, checkIframeBlocked } = require('../utils/siteInspector');
const { escapeHtml } = require('../utils/html');

const router = express.Router();

// Outline icons, aria-hidden since every use sits beside visible text (decorative context).
const ICON_EDIT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>';
const ICON_DELETE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const ICON_PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const ICON_BACK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
const ICON_INBOX = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';
const ICON_BOT = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/public/style.css">
<link rel="stylesheet" href="/public/admin.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="/">${ICON_BOT} Botza Demo Preview</a>
  <nav class="topbar-nav" aria-label="Primary">
    <a class="nav-link" href="/">Generator</a>
    <a class="nav-link active" href="/admin" aria-current="page">Admin</a>
  </nav>
</header>
<main class="page page-wide">
  <div class="admin-shell">
${body}
  </div>
</main>
</body>
</html>`;
}

function baseUrlFor(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

router.get('/', async (req, res) => {
  const previews = await Preview.find().sort({ createdAt: -1 });
  const baseUrl = baseUrlFor(req);

  const rows = previews.map((preview) => {
    const previewUrl = `${baseUrl}/preview/${preview.slug}`;
    const chatbotId = preview.demoChatbotId || process.env.DEMO_CHATBOT_ID || '';
    const modeTag = preview.iframeBlocked
      ? '<span class="tag tag-mirror">Mirror</span>'
      : '<span class="tag tag-live">Live iframe</span>';
    const created = preview.createdAt.toISOString().slice(0, 19).replace('T', ' ');
    return `<tr>
      <td class="truncate"><a href="${escapeHtml(preview.targetUrl)}" target="_blank" rel="noopener">${escapeHtml(preview.targetUrl)}</a></td>
      <td class="truncate">
        <div class="cell-meta">
          <a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener">${escapeHtml(previewUrl)}</a>
          ${modeTag}
        </div>
      </td>
      <td>${chatbotId ? `<span class="chatbot-id">${escapeHtml(chatbotId)}</span>` : '<span class="meta-sub">default</span>'}</td>
      <td class="meta-sub">${escapeHtml(created)}</td>
      <td class="actions">
        <a class="icon-btn" href="/admin/edit/${encodeURIComponent(preview.slug)}">${ICON_EDIT} Edit</a>
        <form method="POST" action="/admin/delete/${encodeURIComponent(preview.slug)}" onsubmit="return confirm('Delete this preview? This cannot be undone.');">
          <button type="submit" class="icon-btn danger">${ICON_DELETE} Delete</button>
        </form>
      </td>
    </tr>`;
  }).join('\n');

  const emptyState = `<tr><td colspan="5">
    <div class="empty-state">
      ${ICON_INBOX}
      <p>No previews generated yet.</p>
      <a href="/" class="button-link small">${ICON_PLUS} Generate your first preview</a>
    </div>
  </td></tr>`;

  const body = `
    <section class="admin-card">
      <div class="admin-header">
        <div class="admin-header-text">
          <p class="eyebrow">Admin</p>
          <h1>Preview Dashboard</h1>
          <p class="subtitle">No login is required for this page. Keep this deployment private.</p>
        </div>
        <a href="/" class="button-link">${ICON_PLUS} New Preview</a>
      </div>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Target URL</th>
              <th>Preview Link</th>
              <th>Chatbot ID</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows || emptyState}
          </tbody>
        </table>
      </div>
    </section>`;

  res.send(layout('Preview Admin', body));
});

router.get('/edit/:slug', async (req, res) => {
  const preview = await Preview.findOne({ slug: req.params.slug });

  if (!preview) {
    return res.status(404).sendFile(require('path').join(__dirname, '..', 'views', 'notfound.html'));
  }

  const body = `
    <section class="admin-card admin-form-card">
      <div class="admin-header">
        <div class="admin-header-text">
          <p class="eyebrow">Admin</p>
          <h1>Edit Preview</h1>
        </div>
        <a href="/admin" class="icon-btn">${ICON_BACK} Back to list</a>
      </div>
      <p class="subtitle">Slug stays the same so shared links keep working: <span class="slug-pill">/preview/${escapeHtml(preview.slug)}</span></p>
      <form method="POST" action="/admin/edit/${encodeURIComponent(preview.slug)}">
        <div class="field">
          <label for="targetUrl">Target website URL</label>
          <input type="url" id="targetUrl" name="targetUrl" value="${escapeHtml(preview.targetUrl)}" required>
        </div>

        <div class="field">
          <label for="botzaWidgetScriptUrl">Botza Widget Script URL <span class="label-hint">(optional)</span></label>
          <input type="text" id="botzaWidgetScriptUrl" name="botzaWidgetScriptUrl" value="${escapeHtml(preview.botzaWidgetScriptUrl)}" placeholder="Falls back to BOTZA_WIDGET_SCRIPT_URL env var">
        </div>

        <div class="field">
          <label for="demoChatbotId">Chatbot ID <span class="label-hint">(optional)</span></label>
          <input type="text" id="demoChatbotId" name="demoChatbotId" value="${escapeHtml(preview.demoChatbotId)}" placeholder="Falls back to DEMO_CHATBOT_ID env var">
        </div>

        <button type="submit">Save Changes</button>
      </form>
    </section>`;

  res.send(layout('Edit Preview', body));
});

router.post('/edit/:slug', async (req, res) => {
  const preview = await Preview.findOne({ slug: req.params.slug });

  if (!preview) {
    return res.status(404).sendFile(require('path').join(__dirname, '..', 'views', 'notfound.html'));
  }

  const targetUrl = (req.body.targetUrl || '').trim();
  const botzaWidgetScriptUrl = (req.body.botzaWidgetScriptUrl || '').trim();
  const demoChatbotId = (req.body.demoChatbotId || '').trim();

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    return res.status(400).send('Please provide a valid http(s) URL.');
  }

  if (targetUrl !== preview.targetUrl) {
    try {
      preview.iframeBlocked = await checkIframeBlocked(targetUrl);
    } catch {
      return res.status(422).send('Could not reach the new target URL. Go back and try again.');
    }
    preview.targetUrl = targetUrl;
  }

  preview.botzaWidgetScriptUrl = botzaWidgetScriptUrl;
  preview.demoChatbotId = demoChatbotId;

  await preview.save();

  res.redirect('/admin');
});

router.post('/delete/:slug', async (req, res) => {
  await Preview.deleteOne({ slug: req.params.slug });
  res.redirect('/admin');
});

module.exports = router;
