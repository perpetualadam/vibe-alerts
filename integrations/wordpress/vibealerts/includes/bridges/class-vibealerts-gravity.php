<?php
/**
 * Gravity Forms bridge.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Bridge_Gravity
{
    public static function register(): void
    {
        add_action('gform_after_submission', [__CLASS__, 'on_after_submission'], 10, 2);
    }

    /**
     * @param array<string, mixed> $entry
     * @param array<string, mixed> $form
     */
    public static function on_after_submission($entry, $form): void
    {
        if (!VibeAlerts_Detector::is_bridge_enabled('gravity')) {
            return;
        }

        $entry_data = [];
        if (!empty($form['fields']) && is_array($form['fields'])) {
            foreach ($form['fields'] as $field) {
                if (!is_object($field) || !isset($field->id)) {
                    continue;
                }
                $value = function_exists('rgar') ? rgar($entry, (string) $field->id) : ($entry[(string) $field->id] ?? '');
                if ($value === '' || $value === null) {
                    continue;
                }
                if (is_array($value)) {
                    $value = implode(', ', array_map('strval', $value));
                }
                $label = !empty($field->label) ? (string) $field->label : 'field_' . $field->id;
                $entry_data[$label] = $value;
            }
        }

        VibeAlerts_Client::send_async([
            'form_id'    => $form['id'] ?? '',
            'form_title' => $form['title'] ?? '',
            'entry'      => $entry_data,
        ], 'gravity-forms');
    }
}
