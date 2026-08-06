<?php
/**
 * Elementor Pro Forms bridge.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Bridge_Elementor
{
    public static function register(): void
    {
        add_action('elementor_pro/forms/new_record', [__CLASS__, 'on_new_record'], 10, 2);
    }

    /**
     * @param \ElementorPro\Modules\Forms\Classes\Form_Record $record
     * @param \ElementorPro\Modules\Forms\Classes\Ajax_Handler $handler
     */
    public static function on_new_record($record, $handler = null): void
    {
        if (!VibeAlerts_Detector::is_bridge_enabled('elementor')) {
            return;
        }

        if (!is_object($record) || !method_exists($record, 'get')) {
            return;
        }

        $raw_fields = method_exists($record, 'get_formatted_data')
            ? $record->get_formatted_data()
            : [];

        $fields = [];
        if (is_array($raw_fields)) {
            foreach ($raw_fields as $label => $value) {
                if (is_array($value)) {
                    $value = implode(', ', array_map('strval', $value));
                }
                if ($value === '' || $value === null) {
                    continue;
                }
                $fields[(string) $label] = $value;
            }
        }

        // Fallback to raw submitted fields if formatted data is empty.
        if (!$fields && method_exists($record, 'get_field')) {
            $raw = $record->get('fields');
            if (is_array($raw)) {
                foreach ($raw as $id => $field) {
                    if (!is_array($field)) {
                        continue;
                    }
                    $label = !empty($field['title']) ? (string) $field['title'] : (string) $id;
                    $value = $field['value'] ?? '';
                    if (is_array($value)) {
                        $value = implode(', ', array_map('strval', $value));
                    }
                    if ($value === '' || $value === null) {
                        continue;
                    }
                    $fields[$label] = $value;
                }
            }
        }

        $form_name = (string) $record->get_form_settings('form_name');
        $form_id = (string) $record->get_form_settings('id');

        VibeAlerts_Client::send_async([
            'form_id'    => $form_id,
            'form_title' => $form_name,
            'fields'     => $fields,
        ], 'elementor-forms');
    }
}
