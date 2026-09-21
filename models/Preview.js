const mongoose = require('mongoose');

const previewSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  targetUrl: { type: String, required: true },
  iframeBlocked: { type: Boolean, required: true, default: false },
  // Per-preview widget overrides. When unset, the preview route falls back
  // to the BOTZA_WIDGET_SCRIPT_URL / DEMO_CHATBOT_ID env vars.
  botzaWidgetScriptUrl: { type: String, default: '' },
  demoChatbotId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Preview', previewSchema);
