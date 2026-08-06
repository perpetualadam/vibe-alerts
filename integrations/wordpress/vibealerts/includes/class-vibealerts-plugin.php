<?php
/**
 * Main plugin orchestrator.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Plugin
{
    /** @var self|null */
    private static $instance = null;

    public static function instance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public static function activate(): void
    {
        // Default bridges to enabled; detector will show which are installed.
        $defaults = [
            'vibealerts_enable_cf7'       => '1',
            'vibealerts_enable_wpforms'   => '1',
            'vibealerts_enable_gravity'   => '1',
            'vibealerts_enable_fluent'    => '1',
            'vibealerts_enable_elementor' => '1',
        ];
        foreach ($defaults as $key => $value) {
            if (get_option($key, null) === null) {
                add_option($key, $value);
            }
        }
    }

    public function init(): void
    {
        load_plugin_textdomain('vibealerts', false, dirname(plugin_basename(VIBEALERTS_PLUGIN_FILE)) . '/languages');

        if (is_admin()) {
            VibeAlerts_Admin::register();
        }

        // Register form bridges (hooks no-op when the form plugin is absent).
        VibeAlerts_Bridge_CF7::register();
        VibeAlerts_Bridge_WPForms::register();
        VibeAlerts_Bridge_Gravity::register();
        VibeAlerts_Bridge_Fluent::register();
        VibeAlerts_Bridge_Elementor::register();
    }
}
