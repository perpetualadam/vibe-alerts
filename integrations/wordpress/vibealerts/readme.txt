=== VibeAlerts ===
Contributors: vibealerts
Tags: forms, alerts, telegram, webhook, contact form 7, wpforms, gravity forms, fluent forms, elementor
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Send WordPress form submissions to VibeAlerts automatically — no per-form webhook setup.

== Description ==

VibeAlerts connects your WordPress site to the VibeAlerts notification platform.

* Install from WordPress admin (upload the plugin zip)
* Connect with your VibeAlerts Webhook URL + API Key
* Auto-detects popular form plugins
* Forwards submissions without configuring webhooks inside each form plugin
* Send a test alert from Settings → VibeAlerts

= Supported form plugins =

* Contact Form 7
* WPForms
* Gravity Forms
* Fluent Forms
* Elementor Pro Forms

== Installation ==

1. Download / zip the `vibealerts` folder from this repository (`integrations/wordpress/vibealerts`).
2. In WordPress admin go to **Plugins → Add New → Upload Plugin**.
3. Activate **VibeAlerts**.
4. Open **Settings → VibeAlerts**.
5. Paste your Webhook URL and API Key from the VibeAlerts dashboard.
6. Confirm detected form plugins and click **Send Test Alert**.

== Frequently Asked Questions ==

= Do I need to add a webhook inside Contact Form 7 / WPForms? =

No. The plugin hooks into each form plugin automatically after you connect your API credentials.

= Which credentials do I need? =

Your VibeAlerts **Webhook URL** and **API Key** from the VibeAlerts dashboard Overview page.

== Changelog ==

= 2.0.0 =
* Native plugin structure for WordPress admin install
* Auto-detect Contact Form 7, WPForms, Gravity Forms, Fluent Forms, Elementor Forms
* Connection status, detected plugins UI, and Send Test Alert
* Non-blocking dispatch for form submissions
