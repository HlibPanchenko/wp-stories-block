<?php

defined('ABSPATH') || exit;

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
                        'key' => 'field_wpstb_story_post_link',
                        'label' => 'Post Link',
                        'name' => 'post-link',
                        'type' => 'page_link',
                        'post_type' => ['models', 'post', 'page'],
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
