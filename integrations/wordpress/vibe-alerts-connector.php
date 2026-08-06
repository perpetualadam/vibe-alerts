<?php
/**
 * Legacy stub — the VibeAlerts WordPress plugin now lives in ./vibealerts/
 *
 * Install `integrations/wordpress/vibealerts` via Plugins → Add New → Upload Plugin
 * (zip the vibealerts folder), or copy that folder into wp-content/plugins/vibealerts.
 *
 * This file is kept so older docs that reference vibe-alerts-connector.php still resolve.
 */

if (!defined('ABSPATH')) {
    // Allow reading this file outside WordPress for documentation discovery.
    return;
}

add_action('admin_notices', static function () {
    if (!current_user_can('activate_plugins')) {
        return;
    }
    echo '<div class="notice notice-warning"><p>';
    echo esc_html__('The legacy VibeAlerts connector stub is loaded. Please install the vibealerts plugin folder instead (integrations/wordpress/vibealerts).', 'vibealerts');
    echo '</p></div>';
});
