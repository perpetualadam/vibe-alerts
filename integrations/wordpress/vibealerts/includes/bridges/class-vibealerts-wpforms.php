<?php
/**
 * WPForms bridge.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Bridge_WPForms
{
    public static function register(): void
    {
        add_action('wpforms_process_complete', [__CLASS__, 'on_process_complete'], 10, 4);
    }

    /**
     * @param array<int, array<string, mixed>> $fields
     * @param array<string, mixed>             $entry
     * @param array<string, mixed>             $form_data
     * @param int                              $entry_id
     */
    public static function on_process_complete($fields, $entry, $form_data, $entry_id = 0): void
    {
        if (!VibeAlerts_Detector::is_bridge_enabled('wpforms')) {
            return;
        }

        $normalized = [];
        if (is_array($fields)) {
            foreach ($fields as $field) {
                if (!is_array($field)) {
                    continue;
                }
                $name = !empty($field['name']) ? (string) $field['name'] : (!empty($field['id']) ? 'field_' . $field['id'] : '');
                if ($name === '' || !isset($field['value'])) {
                    continue;
                }
                $value = $field['value'];
                if (is_array($value)) {
                    $value = implode(', ', array_map('strval', $value));
                }
                $normalized[$name] = $value;
            }
        }

        VibeAlerts_Client::send_async([
            'form_id'    => isset($form_data['id']) ? (string) $form_data['id'] : '',
            'form_title' => $form_data['settings']['form_title'] ?? '',
            'fields'     => $normalized,
        ], 'wpforms');
    }
}
