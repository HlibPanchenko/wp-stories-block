<?php
/**
 * Plugin Name: WP Stories Block
 * Description: ACF Gutenberg block that renders stories block.
 * Version: 1.0.0
 * Author: Petr
 */

defined('ABSPATH') || exit;

define('WPSTB_PATH', plugin_dir_path(__FILE__));
define('WPSTB_URL', plugin_dir_url(__FILE__));

require_once WPSTB_PATH . '/inc/utils.php';

/**
 * PHP 7.0 compatibility for str_starts_with
 */
if (!function_exists('wpstb_starts_with')) {
    function wpstb_starts_with($haystack, $needle) {
        $haystack = (string) $haystack;
        $needle   = (string) $needle;
        return $needle === '' || strpos($haystack, $needle) === 0;
    }
}


/**
 * Register assets
 */
add_action('init', function () {
    wp_register_style(
        'wpstb-style',
        WPSTB_URL . 'assets/style.css',
        [],
        '1.0.0',
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
 * Enqueue assets globally on FRONT
 */
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('wpstb-style');
    wp_enqueue_script('wpstb-script');
});

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
        'mode'            => 'preview',
        'supports'        => [
            'align' => false,
            'jsx'   => false,
        ],
    ]);
});

add_action('acf/init', function () {
    if (!function_exists('acf_add_local_field_group')) {
        return;
    }

    acf_add_local_field_group([
        'key' => 'group_wpstb_stories_block',
        'title' => 'WP Stories Block',
        'fields' => [
            [
                'key' => 'field_wpstb_stories_title',
                'label' => 'Stories Title',
                'name' => 'stories_title',
                'type' => 'text',
                'required' => 0,
            ],
            [
                'key' => 'field_wpstb_stories_mode',
                'label' => 'Switch Stories Mode',
                'name' => 'stories_mode',
                'type' => 'true_false',
                'ui' => 1,
                'ui_on_text' => 'Manually',
                'ui_off_text' => 'Random',
                'default_value' => 0,
            ],
            [
                'key' => 'field_wpstb_stories',
                'label' => 'Stories',
                'name' => 'stories',
                'type' => 'repeater',
                'layout' => 'table',
                'button_label' => 'Добавить',
                'conditional_logic' => [
                    [
                        [
                            'field' => 'field_wpstb_stories_mode',
                            'operator' => '==',
                            'value' => '1',
                        ]
                    ]
                ],
                'sub_fields' => [
                    [
                        'key' => 'field_wpstb_story_preview',
                        'label' => 'Preview',
                        'name' => 'preview',
                        'type' => 'image',
                        'return_format' => 'array',
                        'preview_size' => 'medium',
                        'library' => 'all',
                    ],
                    [
                        'key' => 'field_wpstb_story_media',
                        'label' => 'Media',
                        'name' => 'media',
                        'type' => 'file',
                        'return_format' => 'url',
                        'library' => 'all',
                    ],
                    [
                        'key' => 'field_wpstb_story_title',
                        'label' => 'Title',
                        'name' => 'title',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'field_wpstb_story_model_link',
                        'label' => 'Model Link',
                        'name' => 'model-link',
                        'type' => 'page_link',
                        'post_type' => ['models', 'page'],
                        'post_status' => ['publish'],
                        'allow_archives' => 1,
                        'multiple' => 0,
                        'allow_null' => 0,
                    ],
                ],
            ],
            [
                'key' => 'field_wpstb_number_of_stories',
                'label' => 'Number of stories',
                'name' => 'number_of_stories',
                'type' => 'number',
                'default_value' => 5,
                'min' => 1,
                'max' => 50,
                'step' => 1,
                'conditional_logic' => [
                    [
                        [
                            'field' => 'field_wpstb_stories_mode',
                            'operator' => '!=',
                            'value' => '1',
                        ]
                    ]
                ],
            ],
        ],
        'location' => [
            [
                [
                    'param' => 'block',
                    'operator' => '==',
                    'value' => 'acf/wp-stories-block',
                ],
            ],
        ],
        'position' => 'normal',
        'style' => 'default',
        'label_placement' => 'left',
        'instruction_placement' => 'label',
        'active' => true,
    ]);
});

