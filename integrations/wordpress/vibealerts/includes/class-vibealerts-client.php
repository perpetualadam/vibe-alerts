<?php
/**
 * HTTP client for the VibeAlerts Cloud webhook API.
 */

if (!defined('ABSPATH')) {
    exit;
}

class VibeAlerts_Client
{
    /**
     * Map plugin bridge source tags to first-class platform header ids.
     *
     * @param string $source
     */
    public static function platform_for_source(string $source): string
    {
        $normalized = strtolower($source);
        $map = [
            'contact-form-7'  => 'contact_form_7',
            'contact_form_7'  => 'contact_form_7',
            'cf7'             => 'contact_form_7',
            'wpforms'         => 'wpforms',
            'gravity-forms'   => 'gravity_forms',
            'gravity_forms'   => 'gravity_forms',
            'gravityforms'    => 'gravity_forms',
            'fluent-forms'    => 'fluent_forms',
            'fluent_forms'    => 'fluent_forms',
            'fluentforms'     => 'fluent_forms',
            'elementor-forms' => 'elementor_forms',
            'elementor_forms' => 'elementor_forms',
            'elementor'       => 'elementor_forms',
        ];

        return $map[$normalized] ?? VIBEALERTS_PLATFORM;
    }

    /**
     * Whether connection settings are present.
     */
    public static function is_configured(): bool
    {
        $url = (string) get_option('vibealerts_webhook_url', '');
        $key = (string) get_option('vibealerts_api_key', '');
        return $url !== '' && $key !== '' && (bool) filter_var($url, FILTER_VALIDATE_URL);
    }

    /**
     * Send a payload to VibeAlerts.
     *
     * @param array<string, mixed> $payload
     * @param array{source?: string, async?: bool} $args
     * @return array{ok: bool, status: int, body: array<string, mixed>|null, error: string|null, raw: string}
     */
    public static function send(array $payload, array $args = []): array
    {
        $webhook_url = (string) get_option('vibealerts_webhook_url', '');
        $api_key     = (string) get_option('vibealerts_api_key', '');

        if ($webhook_url === '' || $api_key === '') {
            return [
                'ok'     => false,
                'status' => 0,
                'body'   => null,
                'error'  => 'VibeAlerts is not configured. Add your Webhook URL and API Key.',
                'raw'    => '',
            ];
        }

        $source   = isset($args['source']) ? (string) $args['source'] : 'wordpress-plugin';
        $platform = self::platform_for_source($source);
        $payload['_platform'] = $platform;
        $payload['_vibealerts_source'] = $source;

        $response = wp_remote_post($webhook_url, [
            'timeout' => 20,
            'headers' => [
                'Content-Type'             => 'application/json',
                'Accept'                   => 'application/json',
                VIBEALERTS_PLATFORM_HEADER => $platform,
                VIBEALERTS_KEY_HEADER      => $api_key,
            ],
            'body' => wp_json_encode($payload),
        ]);

        if (is_wp_error($response)) {
            $result = [
                'ok'     => false,
                'status' => 0,
                'body'   => null,
                'error'  => $response->get_error_message(),
                'raw'    => '',
            ];
            self::store_last_result($result, $source);
            return $result;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        $raw    = (string) wp_remote_retrieve_body($response);
        $body   = json_decode($raw, true);
        if (!is_array($body)) {
            $body = null;
        }

        $ok = $status >= 200 && $status < 300 && (!isset($body['success']) || $body['success'] === true);
        $error = null;
        if (!$ok) {
            $error = is_array($body) && !empty($body['error'])
                ? (string) $body['error']
                : sprintf('HTTP %d', $status);
        }

        $result = [
            'ok'     => $ok,
            'status' => $status,
            'body'   => $body,
            'error'  => $error,
            'raw'    => $raw,
        ];
        self::store_last_result($result, $source);
        return $result;
    }

    /**
     * Fire-and-forget send for form bridges (does not block the form UX).
     *
     * @param array<string, mixed> $payload
     */
    public static function send_async(array $payload, string $source = 'wordpress-plugin'): void
    {
        $webhook_url = (string) get_option('vibealerts_webhook_url', '');
        $api_key     = (string) get_option('vibealerts_api_key', '');
        if ($webhook_url === '' || $api_key === '') {
            return;
        }

        $platform = self::platform_for_source($source);
        $payload['_platform'] = $platform;
        $payload['_vibealerts_source'] = $source;

        $response = wp_remote_post($webhook_url, [
            'timeout'  => 12,
            'blocking' => false,
            'headers'  => [
                'Content-Type'             => 'application/json',
                'Accept'                   => 'application/json',
                VIBEALERTS_PLATFORM_HEADER => $platform,
                VIBEALERTS_KEY_HEADER      => $api_key,
            ],
            'body' => wp_json_encode($payload),
        ]);

        if (is_wp_error($response)) {
            self::store_last_result([
                'ok'     => false,
                'status' => 0,
                'body'   => null,
                'error'  => $response->get_error_message(),
                'raw'    => '',
            ], $source);
        } else {
            self::store_last_result([
                'ok'     => true,
                'status' => 202,
                'body'   => null,
                'error'  => null,
                'raw'    => '',
            ], $source);
        }
    }

    /**
     * @param array{ok: bool, status: int, body: mixed, error: string|null, raw: string} $result
     */
    private static function store_last_result(array $result, string $source): void
    {
        update_option('vibealerts_last_result', [
            'ok'        => (bool) $result['ok'],
            'status'    => (int) $result['status'],
            'error'     => $result['error'],
            'source'    => $source,
            'event_id'  => is_array($result['body']) && isset($result['body']['eventId'])
                ? (string) $result['body']['eventId']
                : null,
            'timestamp' => time(),
        ], false);
    }
}
