<?php
defined('ABSPATH') || exit;

/**
 * Register assets
 */
add_action('init', function () {

    wp_register_style(
        'wpstb-style',
        WPSTB_URL . 'assets/style.css',
        [],
        '1.0.0'
    );

    wp_register_script(
        'wpstb-script',
        WPSTB_URL . 'assets/script.js',
        [],
        '1.0.0',
        true
    );
});

/**
 * Enqueue assets
 */
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('wpstb-style');
    wp_enqueue_script('wpstb-script');
});
