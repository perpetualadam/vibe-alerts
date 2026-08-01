/**
 * VibeAlerts Google Forms connector (Google Apps Script)
 *
 * 1. Open your form → Extensions → Apps Script
 * 2. Paste this file, set WEBHOOK_URL and API_KEY
 * 3. Run setupTrigger() once (authorize when prompted)
 */
var WEBHOOK_URL = 'YOUR_WEBHOOK_URL';
var API_KEY = 'YOUR_API_KEY';
var PLATFORM = 'google_forms';

function onFormSubmit(e) {
  if (!e || !e.response) return;

  var form = FormApp.getActiveForm();
  var response = e.response;
  var itemResponses = response.getItemResponses();
  var answers = {};

  itemResponses.forEach(function (itemResponse) {
    answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  });

  var payload = {
    _platform: PLATFORM,
    formId: form.getId(),
    formTitle: form.getTitle(),
    responseId: response.getId(),
    responseTimestamp: response.getTimestamp().toISOString(),
    respondentEmail: response.getRespondentEmail() || '',
    answers: answers,
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-VibeAlerts-Platform': PLATFORM,
      'X-VibeAlerts-Key': API_KEY,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

function setupTrigger() {
  var form = FormApp.getActiveForm();
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
}
