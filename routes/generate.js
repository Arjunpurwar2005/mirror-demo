const express = require('express');
const { nanoid } = require('nanoid');

const Preview = require('../models/Preview');
const { isValidHttpUrl, checkIframeBlocked } = require('../utils/siteInspector');

const router = express.Router();

router.post('/', async (req, res) => {
  const targetUrl = (req.body.url || '').trim();
  const botzaWidgetScriptUrl = (req.body.botzaWidgetScriptUrl || '').trim();
  const demoChatbotId = (req.body.demoChatbotId || '').trim();

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    return res.status(400).json({ error: 'Please provide a valid http(s) URL.' });
  }

  let iframeBlocked;
  try {
    iframeBlocked = await checkIframeBlocked(targetUrl);
  } catch {
    return res.status(422).json({
      error: 'Could not reach that URL. Check the address and try again.',
    });
  }

  const slug = nanoid(8);

  const preview = await Preview.create({
    slug,
    targetUrl,
    iframeBlocked,
    // Empty strings fall back to the BOTZA_WIDGET_SCRIPT_URL / DEMO_CHATBOT_ID
    // env vars at render time (see routes/preview.js).
    botzaWidgetScriptUrl,
    demoChatbotId,
  });

  const baseUrl = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const previewUrl = `${baseUrl}/preview/${preview.slug}`;

  res.json({ slug: preview.slug, previewUrl, iframeBlocked });
});

module.exports = router;
