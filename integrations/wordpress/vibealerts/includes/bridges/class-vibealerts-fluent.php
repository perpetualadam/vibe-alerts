<?php
/**
 * Fluent Forms bridge.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Bridge_Fluent
{
    public static function register(): void
    {
        add_action('fluentform_submission_inserted', [__CLASS__, 'on_submission_inserted'], 10, 3);
    }

    /**
     * @param int|string           $insert_id
     * @param array<string, mixed> $form_data
     * @param object|array         $form
     */
    public static function on_submission_inserted($insert_id, $form_data, $form): void
    {
        if (!VibeAlerts_Detector::is_bridge_enabled('fluent')) {
            return;
        }

        $fields = [];
        if (is_array($form_data)) {
            foreach ($form_data as $key => $value) {
                if (strpos((string) $key, '_') === 0) {
                    continue;
                }
                if (is_array($value)) {
                    $value = implode(', ', array_map('strval', $value));
                }
                if ($value === '' || $value === null) {
                    continue;
                }
                $fields[(string) $key] = $value;
            }
        }

        $form_id = '';
        $form_title = '';
        if (is_object($form)) {
            $form_id = isset($form->id) ? (string) $form->id : '';
            $form_title = isset($form->title) ? (string) $form->title : '';
        } elseif (is_array($form)) {
            $form_id = isset($form['id']) ? (string) $form['id'] : '';
            $form_title = isset($form['title']) ? (string) $form['title'] : '';
        }

        VibeAlerts_Client::send_async([
            'form_id'    => $form_id,
            'form_title' => $form_title,
            'entry_id'   => (string) $insert_id,
            'fields'     => $fields,
        ], 'fluent-forms');
    }
}
