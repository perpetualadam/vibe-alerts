/**
 * Base class for website platform integrations.
 * Each platform normalizes its native form payload into flat VibeAlerts JSON.
 */
export class PlatformIntegration {
  /** @type {string} */
  static id = 'base';

  /** @type {string} */
  static label = 'Base';

  /** @type {string} */
  static description = '';

  /** @type {string} */
  static version = '1.0.0';

  /** @type {string[]} */
  static setupSteps = [];

  get id() {
    return /** @type {typeof PlatformIntegration} */ (this.constructor).id;
  }

  /**
   * Convert platform-native payload to flat key/value lead object.
   * @param {unknown} raw
   * @returns {Record<string, string>}
   */
  normalizePayload(raw) {
    throw new Error(`${this.id} normalizePayload not implemented`);
  }

  /**
   * Whether this adapter recognizes the payload shape (for auto-detect).
   * @param {unknown} raw
   */
  detectPayload(raw) {
    return false;
  }
}
