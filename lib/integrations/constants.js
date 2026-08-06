/** Header sent by platform connectors to identify payload format */
export const PLATFORM_HEADER = 'x-vibealerts-platform';

/** Platform ids */
export const PLATFORMS = {
  WORDPRESS: 'wordpress',
  CONTACT_FORM_7: 'contact_form_7',
  WPFORMS: 'wpforms',
  GRAVITY_FORMS: 'gravity_forms',
  ELEMENTOR_FORMS: 'elementor_forms',
  FLUENT_FORMS: 'fluent_forms',
  WIX: 'wix',
  WEBFLOW: 'webflow',
  SHOPIFY: 'shopify',
  HTML: 'html',
  SQUARESPACE: 'squarespace',
  TYPEFORM: 'typeform',
  JOTFORM: 'jotform',
  GOOGLE_FORMS: 'google_forms',
};

/** First-class native integrations highlighted in Prompt 14 */
export const NATIVE_INTEGRATION_IDS = [
  'wix',
  'squarespace',
  'webflow',
  'jotform',
  'typeform',
  'gravity_forms',
  'elementor_forms',
  'contact_form_7',
  'wpforms',
  'fluent_forms',
];
