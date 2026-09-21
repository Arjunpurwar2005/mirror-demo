const express = require('express');
const path = require('path');

const Preview = require('../models/Preview');
const { fetchHtml, injectBaseTag, buildWidgetOverlaySnippet } = require('../utils/siteInspector');

const router = express.Router();

function widgetSnippet(preview) {
  return buildWidgetOverlaySnippet({
    widgetScriptUrl: preview.botzaWidgetScriptUrl || process.env.BOTZA_WIDGET_SCRIPT_URL,
    chatbotId: preview.demoChatbotId || process.env.DEMO_CHATBOT_ID,
  });
}

function iframeWrapperHtml(targetUrl, widgetHtml) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Botza Live Demo Preview</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
  iframe { position: fixed; inset: 0; width: 100vw; height: 100vh; border: 0; }
</style>
</head>
<body>
<iframe src="${targetUrl}" allow="clipboard-write" referrerpolicy="no-referrer"></iframe>
${widgetHtml}
</body>
</html>`;
}

router.get('/:slug', async (req, res) => {
  const preview = await Preview.findOne({ slug: req.params.slug });

  if (!preview) {
    return res.status(404).sendFile(path.join(__dirname, '..', 'views', 'notfound.html'));
  }

  if (!preview.iframeBlocked) {
    return res.send(iframeWrapperHtml(preview.targetUrl, widgetSnippet(preview)));
  }

  try {
    const rawHtml = await fetchHtml(preview.targetUrl);
    const withBase = injectBaseTag(rawHtml, preview.targetUrl);
    const withWidget = withBase.replace(/<\/body>/i, `${widgetSnippet(preview)}</body>`);
    res.send(withWidget);
  } catch {
    res.status(502).send('Could not load the target site for this preview right now. Please try again shortly.');
  }
});

module.exports = router;
