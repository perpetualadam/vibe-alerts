(function () {
  var button = document.getElementById('vibealerts-send-test');
  var status = document.getElementById('vibealerts-test-status');
  if (!button || typeof vibeAlertsAdmin === 'undefined') {
    return;
  }

  button.addEventListener('click', function () {
    button.disabled = true;
    if (status) {
      status.className = 'vibealerts-test-status';
      status.textContent = vibeAlertsAdmin.i18n.sending;
    }

    var body = new FormData();
    body.append('action', 'vibealerts_send_test');
    body.append('nonce', vibeAlertsAdmin.nonce);

    fetch(vibeAlertsAdmin.ajaxUrl, {
      method: 'POST',
      credentials: 'same-origin',
      body: body,
    })
      .then(function (res) {
        return res.json().then(function (json) {
          return { ok: res.ok, json: json };
        });
      })
      .then(function (result) {
        var json = result.json || {};
        var message =
          (json.data && json.data.message) ||
          (json.success ? vibeAlertsAdmin.i18n.success : vibeAlertsAdmin.i18n.failed);
        if (status) {
          status.className =
            'vibealerts-test-status ' + (json.success ? 'is-ok' : 'is-error');
          status.textContent = message;
        }
      })
      .catch(function () {
        if (status) {
          status.className = 'vibealerts-test-status is-error';
          status.textContent = vibeAlertsAdmin.i18n.failed;
        }
      })
      .finally(function () {
        button.disabled = false;
      });
  });
})();
