<?php
/**
 * Contact Form 7 bridge.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Bridge_CF7
{
    public static function register(): void
    {
        add_action('wpcf7_mail_sent', [__CLASS__, 'on_mail_sent'], 10, 1);
    }

    /**
     * @param WPCF7_ContactForm $contact_form
     */
    public static function on_mail_sent($contact_form): void
    {
        if (!VibeAlerts_Detector::is_bridge_enabled('cf7')) {
            return;
        }
        if (!class_exists('WPCF7_Submission')) {
            return;
        }

        $submission = WPCF7_Submission::get_instance();
        if (!$submission) {
            return;
        }

        $data = $submission->get_posted_data();
        if (!is_array($data)) {
            $data = [];
        }

        // Strip CF7 mail-tags / files that aren't useful as text.
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = implode(', ', array_map('strval', $value));
            }
        }

        $data['form_title'] = method_exists($contact_form, 'title') ? $contact_form->title() : '';
        $data['form_id'] = method_exists($contact_form, 'id') ? (string) $contact_form->id() : '';

        VibeAlerts_Client::send_async($data, 'contact-form-7');
    }
}
