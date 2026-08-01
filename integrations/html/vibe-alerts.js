/**
 * VibeAlerts HTML form connector
 * Attach to forms with data-vibealerts-form attribute
 */
(function (global) {
  const PLATFORM = 'html';

  function init(config) {
    if (!config?.webhookUrl || !config?.apiKey) {
      console.error('[VibeAlerts] webhookUrl and apiKey are required');
      return;
    }

    document.querySelectorAll('[data-vibealerts-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = { _platform: PLATFORM };
        formData.forEach(function (value, key) {
          payload[key] = value;
        });

        fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-VibeAlerts-Platform': PLATFORM,
            'X-VibeAlerts-Key': config.apiKey,
          },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('VibeAlerts request failed');
            form.dispatchEvent(new CustomEvent('vibealerts:success'));
            if (config.onSuccess) config.onSuccess();
            else alert('Sent! We will be in touch soon.');
            form.reset();
          })
          .catch(function (err) {
            form.dispatchEvent(new CustomEvent('vibealerts:error', { detail: err }));
            if (config.onError) config.onError(err);
            else alert('Could not send. Please try again.');
          });
      });
    });
  }

  global.VibeAlerts = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
