/**
 * Platform-shaped sample payloads for "Send Test Notification".
 */

/**
 * @param {string} platformId
 * @returns {Record<string, unknown>}
 */
export function buildIntegrationTestPayload(platformId) {
  const baseMeta = {
    _vibealerts_test: true,
    _platform: platformId,
  };

  switch (platformId) {
    case 'typeform':
      return {
        ...baseMeta,
        event_id: 'test-evt',
        event_type: 'form_response',
        form_response: {
          form_id: 'test-form',
          token: 'test-token',
          submitted_at: new Date().toISOString(),
          answers: [
            {
              type: 'text',
              text: 'Integration Test',
              field: { ref: 'name', title: 'Name' },
            },
            {
              type: 'email',
              email: 'integration-test@vibealerts.local',
              field: { ref: 'email', title: 'Email' },
            },
            {
              type: 'text',
              text: 'Send Test Notification from VibeAlerts',
              field: { ref: 'message', title: 'Message' },
            },
          ],
        },
      };

    case 'jotform':
      return {
        ...baseMeta,
        formID: 'test-form',
        formTitle: 'VibeAlerts Test Form',
        submissionID: `test-${Date.now()}`,
        username: 'vibealerts',
        rawRequest: JSON.stringify({
          q3_name: { first: 'Integration', last: 'Test' },
          q4_email: 'integration-test@vibealerts.local',
          q5_message: 'Send Test Notification from VibeAlerts',
        }),
      };

    case 'webflow':
      return {
        ...baseMeta,
        triggerType: 'form_submission',
        name: 'Contact',
        site: 'vibealerts-test',
        _id: `test-${Date.now()}`,
        data: {
          name: 'Integration Test',
          email: 'integration-test@vibealerts.local',
          message: 'Send Test Notification from VibeAlerts',
        },
      };

    case 'wix':
      return {
        ...baseMeta,
        formName: 'Contact',
        metaSiteId: 'test-site',
        data: {
          name: 'Integration Test',
          email: 'integration-test@vibealerts.local',
          message: 'Send Test Notification from VibeAlerts',
        },
      };

    case 'squarespace':
      return {
        ...baseMeta,
        name: 'Integration Test',
        email: 'integration-test@vibealerts.local',
        message: 'Send Test Notification from VibeAlerts',
        form: 'Contact',
      };

    case 'contact_form_7':
      return {
        ...baseMeta,
        _vibealerts_source: 'contact-form-7',
        'your-name': 'Integration Test',
        'your-email': 'integration-test@vibealerts.local',
        'your-message': 'Send Test Notification from VibeAlerts',
      };

    case 'wpforms':
      return {
        ...baseMeta,
        _vibealerts_source: 'wpforms',
        form_id: '1',
        form_title: 'Contact',
        fields: {
          name: 'Integration Test',
          email: 'integration-test@vibealerts.local',
          message: 'Send Test Notification from VibeAlerts',
        },
      };

    case 'gravity_forms':
      return {
        ...baseMeta,
        _vibealerts_source: 'gravity-forms',
        form_id: '1',
        form_title: 'Contact',
        entry: {
          '1': 'Integration Test',
          '2': 'integration-test@vibealerts.local',
          '3': 'Send Test Notification from VibeAlerts',
        },
      };

    case 'elementor_forms':
      return {
        ...baseMeta,
        _vibealerts_source: 'elementor-forms',
        form_id: 'elementor-test',
        form_title: 'Contact',
        fields: {
          name: 'Integration Test',
          email: 'integration-test@vibealerts.local',
          message: 'Send Test Notification from VibeAlerts',
        },
      };

    case 'fluent_forms':
      return {
        ...baseMeta,
        _vibealerts_source: 'fluent-forms',
        form_id: '1',
        form_title: 'Contact',
        fields: {
          names: 'Integration Test',
          email: 'integration-test@vibealerts.local',
          message: 'Send Test Notification from VibeAlerts',
        },
      };

    case 'wordpress':
      return {
        ...baseMeta,
        _vibealerts_source: 'wordpress-plugin',
        name: 'Integration Test',
        email: 'integration-test@vibealerts.local',
        message: 'Send Test Notification from VibeAlerts',
      };

    case 'shopify':
    case 'google_forms':
    case 'html':
    default:
      return {
        ...baseMeta,
        name: 'Integration Test',
        email: 'integration-test@vibealerts.local',
        message: `Send Test Notification (${platformId})`,
        source: platformId,
      };
  }
}
