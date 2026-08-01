/**
 * VibeAlerts Squarespace form connector
 * Settings → Advanced → Code Injection → Footer
 *
 * Replace YOUR_WEBHOOK_URL and YOUR_API_KEY before publishing.
 */
(function () {
  var WEBHOOK_URL = 'YOUR_WEBHOOK_URL';
  var API_KEY = 'YOUR_API_KEY';
  var PLATFORM = 'squarespace';

  function collectFormFields(form) {
    var fields = {};
    var inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(function (el) {
      var name = el.name || el.id;
      if (!name || el.type === 'submit' || el.type === 'hidden') return;
      if (el.type === 'checkbox') {
        fields[name] = el.checked ? (el.value || 'yes') : '';
      } else if (el.type === 'radio') {
        if (el.checked) fields[name] = el.value;
      } else {
        fields[name] = el.value;
      }
    });
    return fields;
  }

  function sendSubmission(form) {
    var payload = {
      _platform: PLATFORM,
      formName: form.getAttribute('data-form-name') || document.title,
      pageUrl: window.location.href,
      submissionTimestamp: new Date().toISOString(),
      fields: collectFormFields(form),
    };

    return fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VibeAlerts-Platform': PLATFORM,
        'X-VibeAlerts-Key': API_KEY,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (!form.closest('.form-block, .react-form-contents, [data-form-type]')) return;

    e.preventDefault();
    e.stopPropagation();

    sendSubmission(form)
      .then(function (res) {
        if (!res.ok) throw new Error('VibeAlerts request failed');
        alert('Thank you! Your message has been sent.');
        form.reset();
      })
      .catch(function () {
        alert('Could not send your message. Please try again.');
      });
  }, true);
})();
