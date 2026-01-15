<?php
defined('ABSPATH') || exit;

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'wpstb-style',
        WPSTB_URL . 'assets/style.css',
        [],
        '1.0.0'
    );

    wp_enqueue_script(
        'wpstb-script',
        WPSTB_URL . 'assets/script.js',
        [],
        '1.0.0',
        true
    );
});

add_action('enqueue_block_assets', function () {
    wp_enqueue_style(
        'wpstb-style-admin',
        WPSTB_URL . 'assets/admin.css',
        [],
        '1.0.0'
    );
});
