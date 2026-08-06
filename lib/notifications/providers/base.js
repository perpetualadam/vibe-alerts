/**
 * Common notification provider interface.
 *
 * Every provider must implement:
 *   - send(context)        — deliver a lead/alert payload
 *   - test(context)        — send a test notification
 *   - healthCheck()        — report platform/provider readiness
 *
 * Webhook handlers never call providers directly. They go through
 * NotificationService, which fans out to every enabled & configured provider.
 *
 * @typedef {'text' | 'email' | 'url' | 'tel'} ConfigFieldType
 */

/**
 * @typedef {Object} ConfigFieldSchema
 * @property {string} key
 * @property {string} label
 * @property {ConfigFieldType} [type]
 * @property {string} [placeholder]
 * @property {boolean} [required]
 * @property {string} [help]
 */

/**
 * @typedef {Object} ConfigValidationResult
 * @property {boolean} valid
 * @property {Record<string, string>} [config]
 * @property {string} [error]
 */

/**
 * @typedef {Object} ChannelEntry
 * @property {boolean} enabled
 * @property {Record<string, string>} config
 * @property {string} [connected_at]
 */

/**
 * @typedef {Object} NotificationContext
 * @property {string} userId
 * @property {Record<string, string>} payload
 * @property {Record<string, unknown>} profile
 * @property {Record<string, unknown>} settings
 * @property {Record<string, ChannelEntry>} channelConfigs
 * @property {string} [webhookEventId]
 */

/**
 * @typedef {Object} DeliveryResult
 * @property {boolean} success
 * @property {Record<string, unknown>} [response]
 * @property {string} [error]
 * @property {boolean} [retryable]
 */

/**
 * @typedef {Object} HealthCheckResult
 * @property {boolean} healthy
 * @property {string} provider
 * @property {string} [message]
 * @property {Record<string, unknown>} [details]
 */

export const DEFAULT_TEST_PAYLOAD = {
  Name: 'John Doe',
  Message: 'System Test Working!',
};

/**
 * Base notification plugin provider.
 * Subclasses declare static metadata and implement channel-specific behavior.
 */
export class NotificationProvider {
  /** @type {string} */
  static id = 'base';

  /** @type {string} */
  static version = '1.0.0';

  /** @type {string} */
  static label = 'Base';

  /** @type {string} */
  static description = '';

  /** @type {ConfigFieldSchema[]} */
  static configSchema = [];

  /** @type {string[]} */
  static setupGuide = [];

  get id() {
    return /** @type {typeof NotificationProvider} */ (this.constructor).id;
  }

  get label() {
    return /** @type {typeof NotificationProvider} */ (this.constructor).label;
  }

  /**
   * @param {NotificationContext} context
   * @returns {ChannelEntry}
   */
  getChannelEntry(context) {
    return context.channelConfigs?.[this.id] ?? { enabled: false, config: {} };
  }

  /**
   * @param {NotificationContext} context
   * @returns {Record<string, string>}
   */
  getConfig(context) {
    const entry = this.getChannelEntry(context);
    return /** @type {Record<string, string>} */ (entry.config ?? {});
  }

  /**
   * @param {NotificationContext} context
   */
  isEnabled(context) {
    return Boolean(this.getChannelEntry(context).enabled);
  }

  /**
   * Validate tenant config. Override in subclasses.
   * @param {Record<string, unknown>} config
   * @returns {ConfigValidationResult}
   */
  validateConfig(config) {
    return { valid: false, error: 'Not implemented' };
  }

  /**
   * Whether server/platform credentials are available.
   */
  isPlatformReady() {
    return true;
  }

  /**
   * @param {NotificationContext} context
   */
  isConfigured(context) {
    if (!this.isEnabled(context)) return false;
    if (!this.isPlatformReady()) return false;
    return this.validateConfig(this.getConfig(context)).valid;
  }

  /**
   * Format payload for delivery. Each provider owns its format.
   * @param {Record<string, string>} payload
   * @returns {unknown}
   */
  formatMessage(payload) {
    return payload;
  }

  /**
   * Short preview string for notification_logs.
   * @param {Record<string, string>} payload
   */
  formatPreview(payload) {
    const formatted = this.formatMessage(payload);
    if (typeof formatted === 'string') return formatted.slice(0, 500);
    return JSON.stringify(formatted).slice(0, 500);
  }

  /**
   * Send a notification for an inbound lead/alert.
   * Part of the common provider interface (Send).
   *
   * @param {NotificationContext} context
   * @returns {Promise<DeliveryResult>}
   */
  async send(context) {
    throw new Error(`${this.id} provider send() not implemented`);
  }

  /**
   * Send a test notification using the tenant's configured destination.
   * Part of the common provider interface (Test).
   * Default implementation reuses send() with a standard test payload.
   *
   * @param {NotificationContext} context
   * @returns {Promise<DeliveryResult>}
   */
  async test(context) {
    const payload =
      context.payload && Object.keys(context.payload).length > 0
        ? context.payload
        : DEFAULT_TEST_PAYLOAD;

    return this.send({ ...context, payload });
  }

  /**
   * Report whether this provider is healthy / ready to send.
   * Part of the common provider interface (HealthCheck).
   *
   * @param {NotificationContext} [context]
   * @returns {Promise<HealthCheckResult>}
   */
  async healthCheck(context) {
    const platformReady = this.isPlatformReady();
    if (!platformReady) {
      return {
        healthy: false,
        provider: this.id,
        message: `${this.label} platform credentials are not configured`,
      };
    }

    if (context && this.isEnabled(context)) {
      const validation = this.validateConfig(this.getConfig(context));
      if (!validation.valid) {
        return {
          healthy: false,
          provider: this.id,
          message: validation.error || 'Tenant configuration is invalid',
          details: { enabled: true, configured: false },
        };
      }

      return {
        healthy: this.isConfigured(context),
        provider: this.id,
        message: this.isConfigured(context)
          ? `${this.label} is ready`
          : `${this.label} is enabled but not fully configured`,
        details: { enabled: true, configured: this.isConfigured(context) },
      };
    }

    return {
      healthy: true,
      provider: this.id,
      message: `${this.label} platform is ready`,
      details: { platformReady: true },
    };
  }
}
