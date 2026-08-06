<?php
/**
 * Plugin Name:       VibeAlerts
 * Plugin URI:        https://vibe-alerts.com
 * Description:       Send WordPress form submissions to VibeAlerts automatically. Supports Contact Form 7, WPForms, Gravity Forms, Fluent Forms, and Elementor Forms — no per-form webhook setup.
 * Version:           2.1.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            VibeAlerts
 * Author URI:        https://vibe-alerts.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       vibealerts
 */

if (!defined('ABSPATH')) {
    exit;
}

define('VIBEALERTS_VERSION', '2.1.0');
define('VIBEALERTS_PLUGIN_FILE', __FILE__);
define('VIBEALERTS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VIBEALERTS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VIBEALERTS_PLATFORM', 'wordpress');
define('VIBEALERTS_PLATFORM_HEADER', 'X-VibeAlerts-Platform');
define('VIBEALERTS_KEY_HEADER', 'X-VibeAlerts-Key');

require_once VIBEALERTS_PLUGIN_DIR . 'includes/class-vibealerts-client.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/class-vibealerts-detector.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/class-vibealerts-admin.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/bridges/class-vibealerts-cf7.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/bridges/class-vibealerts-wpforms.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/bridges/class-vibealerts-gravity.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/bridges/class-vibealerts-fluent.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/bridges/class-vibealerts-elementor.php';
require_once VIBEALERTS_PLUGIN_DIR . 'includes/class-vibealerts-plugin.php';

/**
 * Bootstrap the plugin.
 */
function vibealerts(): VibeAlerts_Plugin
{
    return VibeAlerts_Plugin::instance();
}

add_action('plugins_loaded', static function () {
    vibealerts()->init();
});

register_activation_hook(__FILE__, ['VibeAlerts_Plugin', 'activate']);
