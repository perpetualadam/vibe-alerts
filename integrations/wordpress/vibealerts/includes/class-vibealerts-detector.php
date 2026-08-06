<?php
/**
 * Auto-detect popular WordPress form plugins.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Detector
{
    /**
     * Known form bridges.
     *
     * @return array<string, array{label: string, option: string, active: bool, detect: callable}>
     */
    public static function bridges(): array
    {
        return [
            'cf7' => [
                'label'  => 'Contact Form 7',
                'option' => 'vibealerts_enable_cf7',
                'active' => self::is_cf7_active(),
            ],
            'wpforms' => [
                'label'  => 'WPForms',
                'option' => 'vibealerts_enable_wpforms',
                'active' => self::is_wpforms_active(),
            ],
            'gravity' => [
                'label'  => 'Gravity Forms',
                'option' => 'vibealerts_enable_gravity',
                'active' => self::is_gravity_active(),
            ],
            'fluent' => [
                'label'  => 'Fluent Forms',
                'option' => 'vibealerts_enable_fluent',
                'active' => self::is_fluent_active(),
            ],
            'elementor' => [
                'label'  => 'Elementor Forms',
                'option' => 'vibealerts_enable_elementor',
                'active' => self::is_elementor_active(),
            ],
        ];
    }

    public static function is_cf7_active(): bool
    {
        return defined('WPCF7_VERSION') || class_exists('WPCF7_ContactForm');
    }

    public static function is_wpforms_active(): bool
    {
        return function_exists('wpforms') || defined('WPFORMS_VERSION');
    }

    public static function is_gravity_active(): bool
    {
        return class_exists('GFForms') || class_exists('GFAPI');
    }

    public static function is_fluent_active(): bool
    {
        return defined('FLUENTFORM') || function_exists('wpFluentForm') || class_exists('FluentForm\App\Modules\Form\Form');
    }

    public static function is_elementor_active(): bool
    {
        return defined('ELEMENTOR_PRO_VERSION') || did_action('elementor_pro/init') || class_exists('\ElementorPro\Plugin');
    }

    /**
     * Whether a bridge is enabled in settings (defaults to on when detected).
     */
    public static function is_bridge_enabled(string $id): bool
    {
        $bridges = self::bridges();
        if (!isset($bridges[$id])) {
            return false;
        }
        $option = $bridges[$id]['option'];
        $default = $bridges[$id]['active'] ? '1' : '0';
        return get_option($option, $default) === '1';
    }

    /**
     * Detected (active) form plugin labels.
     *
     * @return string[]
     */
    public static function detected_labels(): array
    {
        $labels = [];
        foreach (self::bridges() as $bridge) {
            if ($bridge['active']) {
                $labels[] = $bridge['label'];
            }
        }
        return $labels;
    }
}
