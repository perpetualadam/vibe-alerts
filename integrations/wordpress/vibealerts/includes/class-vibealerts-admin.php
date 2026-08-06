<?php
/**
 * WordPress admin settings UI for VibeAlerts.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Admin
{
    public static function register(): void
    {
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_assets']);
        add_action('wp_ajax_vibealerts_send_test', [__CLASS__, 'ajax_send_test']);
        add_action('admin_notices', [__CLASS__, 'maybe_show_setup_notice']);
    }

    public static function add_menu(): void
    {
        add_options_page(
            __('VibeAlerts', 'vibealerts'),
            __('VibeAlerts', 'vibealerts'),
            'manage_options',
            'vibealerts',
            [__CLASS__, 'render_settings_page']
        );
    }

    public static function register_settings(): void
    {
        register_setting('vibealerts', 'vibealerts_webhook_url', [
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => '',
        ]);
        register_setting('vibealerts', 'vibealerts_api_key', [
            'type'              => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default'           => '',
        ]);

        foreach (VibeAlerts_Detector::bridges() as $bridge) {
            register_setting('vibealerts', $bridge['option'], [
                'type'              => 'string',
                'sanitize_callback' => static function ($value) {
                    return $value === '1' ? '1' : '0';
                },
                'default'           => '1',
            ]);
        }
    }

    public static function enqueue_assets(string $hook): void
    {
        if ($hook !== 'settings_page_vibealerts') {
            return;
        }
        wp_enqueue_style(
            'vibealerts-admin',
            VIBEALERTS_PLUGIN_URL . 'assets/admin.css',
            [],
            VIBEALERTS_VERSION
        );
        wp_enqueue_script(
            'vibealerts-admin',
            VIBEALERTS_PLUGIN_URL . 'assets/admin.js',
            [],
            VIBEALERTS_VERSION,
            true
        );
        wp_localize_script('vibealerts-admin', 'vibeAlertsAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('vibealerts_test'),
            'i18n'    => [
                'sending' => __('Sending test alert…', 'vibealerts'),
                'success' => __('Test alert sent successfully.', 'vibealerts'),
                'failed'  => __('Test alert failed.', 'vibealerts'),
            ],
        ]);
    }

    public static function maybe_show_setup_notice(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        if (VibeAlerts_Client::is_configured()) {
            return;
        }
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if ($screen && $screen->id === 'settings_page_vibealerts') {
            return;
        }
        echo '<div class="notice notice-warning"><p>';
        echo esc_html__('VibeAlerts is installed but not connected.', 'vibealerts') . ' ';
        echo '<a href="' . esc_url(admin_url('options-general.php?page=vibealerts')) . '">';
        echo esc_html__('Add your API key to start receiving form alerts.', 'vibealerts');
        echo '</a></p></div>';
    }

    public static function ajax_send_test(): void
    {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }
        check_ajax_referer('vibealerts_test', 'nonce');

        if (!VibeAlerts_Client::is_configured()) {
            wp_send_json_error([
                'message' => __('Configure your Webhook URL and API Key first.', 'vibealerts'),
            ], 400);
        }

        $site = wp_parse_url(home_url(), PHP_URL_HOST);
        $result = VibeAlerts_Client::send([
            'Name'       => 'WordPress Test',
            'Email'      => get_option('admin_email'),
            'Message'    => 'System Test Working! Sent from the VibeAlerts WordPress plugin.',
            'site'       => $site ? (string) $site : home_url(),
            'form_title' => 'VibeAlerts Plugin Test',
        ], ['source' => 'wordpress-plugin-test']);

        if ($result['ok']) {
            wp_send_json_success([
                'message' => __('Test alert sent. Check your VibeAlerts notification channels.', 'vibealerts'),
                'eventId' => is_array($result['body']) ? ($result['body']['eventId'] ?? null) : null,
                'status'  => $result['status'],
            ]);
        }

        wp_send_json_error([
            'message' => $result['error'] ?: __('Test alert failed.', 'vibealerts'),
            'status'  => $result['status'],
        ], $result['status'] >= 400 ? $result['status'] : 502);
    }

    public static function render_settings_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $configured = VibeAlerts_Client::is_configured();
        $bridges = VibeAlerts_Detector::bridges();
        $detected = VibeAlerts_Detector::detected_labels();
        $last = get_option('vibealerts_last_result', null);
        ?>
        <div class="wrap vibealerts-wrap">
            <h1><?php esc_html_e('VibeAlerts', 'vibealerts'); ?></h1>
            <p class="description">
                <?php esc_html_e('Connect once with your VibeAlerts API credentials. Form submissions are forwarded automatically — no per-form webhook configuration required.', 'vibealerts'); ?>
            </p>

            <div class="vibealerts-status-row">
                <div class="vibealerts-card">
                    <h2><?php esc_html_e('Connection', 'vibealerts'); ?></h2>
                    <p>
                        <span class="vibealerts-badge <?php echo $configured ? 'is-ok' : 'is-warn'; ?>">
                            <?php echo $configured
                                ? esc_html__('Connected', 'vibealerts')
                                : esc_html__('Not connected', 'vibealerts'); ?>
                        </span>
                    </p>
                    <p class="description">
                        <?php esc_html_e('Copy the Webhook URL and API Key from your VibeAlerts dashboard (Overview).', 'vibealerts'); ?>
                    </p>
                </div>
                <div class="vibealerts-card">
                    <h2><?php esc_html_e('Detected form plugins', 'vibealerts'); ?></h2>
                    <?php if (!$detected) : ?>
                        <p class="description"><?php esc_html_e('No supported form plugins detected yet. Install Contact Form 7, WPForms, Gravity Forms, Fluent Forms, or Elementor Pro Forms.', 'vibealerts'); ?></p>
                    <?php else : ?>
                        <ul class="vibealerts-detected-list">
                            <?php foreach ($detected as $label) : ?>
                                <li><span class="vibealerts-badge is-ok"><?php echo esc_html($label); ?></span></li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>
                </div>
            </div>

            <form method="post" action="options.php" class="vibealerts-card vibealerts-settings-form">
                <?php settings_fields('vibealerts'); ?>
                <h2><?php esc_html_e('API credentials', 'vibealerts'); ?></h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="vibealerts_webhook_url"><?php esc_html_e('Webhook URL', 'vibealerts'); ?></label>
                        </th>
                        <td>
                            <input type="url" class="regular-text code" id="vibealerts_webhook_url"
                                name="vibealerts_webhook_url"
                                value="<?php echo esc_attr((string) get_option('vibealerts_webhook_url', '')); ?>"
                                placeholder="https://your-app.com/api/v1/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                required />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="vibealerts_api_key"><?php esc_html_e('API Key', 'vibealerts'); ?></label>
                        </th>
                        <td>
                            <input type="password" class="regular-text code" id="vibealerts_api_key"
                                name="vibealerts_api_key" autocomplete="off"
                                value="<?php echo esc_attr((string) get_option('vibealerts_api_key', '')); ?>"
                                required />
                            <p class="description"><?php esc_html_e('Sent as X-VibeAlerts-Key on every request.', 'vibealerts'); ?></p>
                        </td>
                    </tr>
                </table>

                <h2><?php esc_html_e('Auto-detected form bridges', 'vibealerts'); ?></h2>
                <p class="description">
                    <?php esc_html_e('Enable the form plugins you use. Submissions are captured automatically — you do not need to add webhooks inside each form plugin.', 'vibealerts'); ?>
                </p>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><?php esc_html_e('Form plugins', 'vibealerts'); ?></th>
                        <td>
                            <?php foreach ($bridges as $id => $bridge) : ?>
                                <?php
                                $default = $bridge['active'] ? '1' : '0';
                                $enabled = get_option($bridge['option'], $default) === '1';
                                ?>
                                <label class="vibealerts-bridge-row">
                                    <input type="checkbox"
                                        name="<?php echo esc_attr($bridge['option']); ?>"
                                        value="1"
                                        <?php checked($enabled); ?> />
                                    <strong><?php echo esc_html($bridge['label']); ?></strong>
                                    <?php if ($bridge['active']) : ?>
                                        <span class="vibealerts-badge is-ok"><?php esc_html_e('Detected', 'vibealerts'); ?></span>
                                    <?php else : ?>
                                        <span class="vibealerts-badge is-muted"><?php esc_html_e('Not installed', 'vibealerts'); ?></span>
                                    <?php endif; ?>
                                </label>
                            <?php endforeach; ?>
                        </td>
                    </tr>
                </table>
                <?php submit_button(__('Save connection', 'vibealerts')); ?>
            </form>

            <div class="vibealerts-card">
                <h2><?php esc_html_e('Send test alert', 'vibealerts'); ?></h2>
                <p class="description">
                    <?php esc_html_e('Sends a sample submission through your connected VibeAlerts account so you can verify Telegram, Email, Discord, and other channels.', 'vibealerts'); ?>
                </p>
                <p>
                    <button type="button" class="button button-primary" id="vibealerts-send-test"
                        <?php disabled(!$configured); ?>>
                        <?php esc_html_e('Send Test Alert', 'vibealerts'); ?>
                    </button>
                    <span id="vibealerts-test-status" class="vibealerts-test-status" aria-live="polite"></span>
                </p>
                <?php if (is_array($last)) : ?>
                    <p class="description">
                        <?php
                        $when = !empty($last['timestamp'])
                            ? wp_date(get_option('date_format') . ' ' . get_option('time_format'), (int) $last['timestamp'])
                            : '';
                        printf(
                            /* translators: 1: ok/failed, 2: source, 3: datetime */
                            esc_html__('Last dispatch: %1$s via %2$s%3$s', 'vibealerts'),
                            !empty($last['ok']) ? esc_html__('success', 'vibealerts') : esc_html__('error', 'vibealerts'),
                            esc_html((string) ($last['source'] ?? 'unknown')),
                            $when ? ' · ' . esc_html($when) : ''
                        );
                        if (!empty($last['error'])) {
                            echo '<br><code>' . esc_html((string) $last['error']) . '</code>';
                        }
                        ?>
                    </p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}
