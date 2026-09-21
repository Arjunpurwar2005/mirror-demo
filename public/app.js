const form = document.getElementById('generate-form');
const resultBox = document.getElementById('result');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('error-text');
const linkInput = document.getElementById('preview-link');
const modeNote = document.getElementById('mode-note');
const copyBtn = document.getElementById('copy-btn');
const copyLabel = document.getElementById('copy-label');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  resultBox.hidden = true;

  const url = document.getElementById('url').value.trim();
  const botzaWidgetScriptUrl = document.getElementById('widgetScriptUrl').value.trim();
  const demoChatbotId = document.getElementById('chatbotId').value.trim();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating...';

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, botzaWidgetScriptUrl, demoChatbotId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    linkInput.value = data.previewUrl;
    modeNote.textContent = data.iframeBlocked
      ? 'This site blocks iframes, so the preview mirrors it directly (same-origin mode).'
      : 'This site allows iframe embedding, so the preview loads it live in an iframe.';
    resultBox.hidden = false;
  } catch (err) {
    errorText.textContent = err.message;
    errorBox.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate Preview';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(linkInput.value);
    copyLabel.textContent = 'Copied!';
    setTimeout(() => { copyLabel.textContent = 'Copy'; }, 1500);
  } catch {
    linkInput.select();
    document.execCommand('copy');
  }
});
