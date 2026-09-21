const axios = require('axios');

const REQUEST_TIMEOUT_MS = 8000;
const USER_AGENT = 'Mozilla/5.0 (compatible; BotzaDemoPreview/1.0)';

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function headersBlockFraming(headers) {
  const xfo = (headers['x-frame-options'] || '').toLowerCase();
  if (xfo.includes('deny') || xfo.includes('sameorigin')) return true;

  const csp = (headers['content-security-policy'] || '').toLowerCase();
  if (csp.includes('frame-ancestors')) return true;

  return false;
}

/**
 * Checks whether a target URL can be embedded in an iframe by inspecting
 * X-Frame-Options / CSP frame-ancestors headers. Throws if the site is
 * entirely unreachable (DNS failure, timeout, connection refused).
 */
async function checkIframeBlocked(targetUrl) {
  const requestConfig = {
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT },
    validateStatus: () => true,
    maxRedirects: 5,
  };

  try {
    const headResponse = await axios.head(targetUrl, requestConfig);
    return headersBlockFraming(headResponse.headers);
  } catch {
    // Some servers reject HEAD; fall back to GET before treating as unreachable.
    const getResponse = await axios.get(targetUrl, requestConfig);
    return headersBlockFraming(getResponse.headers);
  }
}

/**
 * Fetches the raw HTML of the target URL for same-origin mirroring.
 */
async function fetchHtml(targetUrl) {
  const response = await axios.get(targetUrl, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT },
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 400,
  });
  return response.data;
}

/**
 * Injects a <base href> tag right after the opening <head> tag so that
 * relative asset paths on the mirrored page keep resolving against the
 * original site.
 */
function injectBaseTag(html, targetUrl) {
  const baseTag = `<base href="${targetUrl}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n${baseTag}`);
  }
  // No <head> tag found; prepend one so the base still applies.
  return `<head>${baseTag}</head>${html}`;
}

/**
 * Builds the fixed-position Botza widget overlay markup, injected into both
 * the iframe wrapper page and the mirrored HTML page.
 */
function buildWidgetOverlaySnippet({ widgetScriptUrl, chatbotId }) {
  if (!widgetScriptUrl) return '';
  return `
<div id="botza-demo-overlay" style="position:fixed;bottom:24px;right:24px;z-index:2147483647;"></div>
<script src="${widgetScriptUrl}" data-chatbot-id="${chatbotId || ''}" async></script>
`;
}

module.exports = {
  isValidHttpUrl,
  checkIframeBlocked,
  fetchHtml,
  injectBaseTag,
  buildWidgetOverlaySnippet,
};
