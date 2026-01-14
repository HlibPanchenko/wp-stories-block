<?php
/**
 * Plugin Name: WP Stories Block
 * Description: ACF Gutenberg block that renders stories block.
 * Version: 1.0.2
 * Author: Petr
 */

defined('ABSPATH') || exit;

define('WPSTB_PATH', plugin_dir_path(__FILE__));
define('WPSTB_URL', plugin_dir_url(__FILE__));

require_once WPSTB_PATH . 'inc/bootstrap.php';
