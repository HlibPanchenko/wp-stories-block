<?php
defined('ABSPATH') || exit;

/**
 * Register ACF block
 */
add_action('acf/init', function () {

    if (!function_exists('acf_register_block_type')) {
        return;
    }

    acf_register_block_type([
        'name'            => 'wp-stories-block',
        'title'           => __('WP Stories Block', 'wp-stories-block'),
        'render_template' => WPSTB_PATH . 'template-parts/wp-stories-block.php',
        'category'        => 'widgets',
        'icon'            => 'format-video',
        'keywords'        => ['stories', 'video', 'models'],
        'mode'            => 'edit',
        'supports'        => [
            'mode' => true,
            'align' => false,
            'jsx'   => false,
        ],
    ]);
});
