<?php
/**
 * Plugin Name: VibeAlerts Connector
 * Plugin URI: https://github.com/perpetualadam/vibe-alerts
 * Description: Sends WordPress form submissions to VibeAlerts (Contact Form 7, WPForms, Gravity Forms).
 * Version: 1.0.0
 * Author: VibeAlerts
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

define('VIBEALERTS_VERSION', '1.0.0');
define('VIBEALERTS_PLATFORM_HEADER', 'X-VibeAlerts-Platform');
define('VIBEALERTS_KEY_HEADER', 'X-VibeAlerts-Key');

/**
 * Send normalized payload to VibeAlerts webhook.
 *
 * @param array<string, mixed> $payload
 */
function vibealerts_send(array $payload): void
{
    $webhook_url = get_option('vibealerts_webhook_url', '');
    $api_key     = get_option('vibealerts_api_key', '');

    if (empty($webhook_url) || empty($api_key)) {
        return;
    }

    $payload['_platform'] = 'wordpress';
    $payload['_vibealerts_source'] = 'wordpress-plugin';

    wp_remote_post($webhook_url, [
        'timeout' => 15,
        'headers' => [
            'Content-Type'              => 'application/json',
            VIBEALERTS_PLATFORM_HEADER  => 'wordpress',
            VIBEALERTS_KEY_HEADER       => $api_key,
        ],
        'body' => wp_json_encode($payload),
    ]);
}

/** Contact Form 7 */
add_action('wpcf7_mail_sent', function ($contact_form) {
    if (!get_option('vibealerts_enable_cf7', '1')) {
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
    $data['form_title'] = $contact_form->title();
    vibealerts_send($data);
});

/** WPForms */
add_action('wpforms_process_complete', function ($fields, $entry, $form_data) {
    if (!get_option('vibealerts_enable_wpforms', '1')) {
        return;
    }
    $normalized = [];
    foreach ($fields as $field) {
        if (!empty($field['name']) && isset($field['value'])) {
            $normalized[$field['name']] = $field['value'];
        }
    }
    vibealerts_send([
        'form_id' => $form_data['id'] ?? '',
        'form_title' => $form_data['settings']['form_title'] ?? '',
        'fields' => $normalized,
    ]);
}, 10, 3);

/** Gravity Forms */
add_action('gform_after_submission', function ($entry, $form) {
    if (!get_option('vibealerts_enable_gravity', '1')) {
        return;
    }
    if (!class_exists('GFAPI')) {
        return;
    }
    $entry_data = [];
    foreach ($form['fields'] as $field) {
        $value = rgar($entry, (string) $field->id);
        if ($value !== '' && $value !== null) {
            $entry_data[$field->label ?: 'field_' . $field->id] = $value;
        }
    }
    vibealerts_send([
        'form_id' => $form['id'],
        'form_title' => $form['title'] ?? '',
        'entry' => $entry_data,
    ]);
}, 10, 2);

/** Admin settings */
add_action('admin_menu', function () {
    add_options_page(
        'VibeAlerts',
        'VibeAlerts',
        'manage_options',
        'vibealerts',
        'vibealerts_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('vibealerts', 'vibealerts_webhook_url', [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
    ]);
    register_setting('vibealerts', 'vibealerts_api_key', [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
    ]);
    register_setting('vibealerts', 'vibealerts_enable_cf7', ['type' => 'string', 'default' => '1']);
    register_setting('vibealerts', 'vibealerts_enable_wpforms', ['type' => 'string', 'default' => '1']);
    register_setting('vibealerts', 'vibealerts_enable_gravity', ['type' => 'string', 'default' => '1']);
});

function vibealerts_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1>VibeAlerts Connector</h1>
        <p>Copy your <strong>Webhook URL</strong> and <strong>API Key</strong> from your VibeAlerts dashboard.</p>
        <form method="post" action="options.php">
            <?php settings_fields('vibealerts'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="vibealerts_webhook_url">Webhook URL</label></th>
                    <td><input type="url" id="vibealerts_webhook_url" name="vibealerts_webhook_url"
                        value="<?php echo esc_attr(get_option('vibealerts_webhook_url', '')); ?>"
                        class="regular-text" placeholder="https://your-app.com/api/v1/webhook/..." /></td>
                </tr>
                <tr>
                    <th><label for="vibealerts_api_key">API Key</label></th>
                    <td><input type="password" id="vibealerts_api_key" name="vibealerts_api_key"
                        value="<?php echo esc_attr(get_option('vibealerts_api_key', '')); ?>"
                        class="regular-text" /></td>
                </tr>
                <tr>
                    <th>Form plugins</th>
                    <td>
                        <label><input type="checkbox" name="vibealerts_enable_cf7" value="1"
                            <?php checked(get_option('vibealerts_enable_cf7', '1'), '1'); ?> /> Contact Form 7</label><br>
                        <label><input type="checkbox" name="vibealerts_enable_wpforms" value="1"
                            <?php checked(get_option('vibealerts_enable_wpforms', '1'), '1'); ?> /> WPForms</label><br>
                        <label><input type="checkbox" name="vibealerts_enable_gravity" value="1"
                            <?php checked(get_option('vibealerts_enable_gravity', '1'), '1'); ?> /> Gravity Forms</label>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
