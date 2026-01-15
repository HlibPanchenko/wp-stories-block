<?php
/**
 * Plugin Name: WP Stories Block
 * Description: ACF Gutenberg block that renders stories block.
 * Version: 1.0.3
 * Author: PetrWP
 */

defined('ABSPATH') || exit;

define('WPSTB_PATH', plugin_dir_path(__FILE__));
define('WPSTB_URL', plugin_dir_url(__FILE__));


add_action('plugins_loaded', function () {

    if (!function_exists('get_field') || !function_exists('acf_register_block_type')) {
        add_action('admin_notices', 'wpstb_acf_missing_notice');
        return;
    }

    require_once WPSTB_PATH . 'inc/bootstrap.php';
});

function wpstb_acf_missing_notice() {
    if (!current_user_can('manage_options')) return;

    echo '<div class="notice notice-error"><p>'
        . '<b>WP Stories Block:</b> Advanced Custom Fields (ACF) is required. Please install and activate ACF to use this plugin.'
        . '</p></div>';
}
