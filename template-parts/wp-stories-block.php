<?php

if (!function_exists('get_field')) {
    return;
}

$uniq_id        = uniqid('stories-', false);

$stories        = get_field('stories');
$title          = get_field('stories_title');
$mode           = get_field('stories_mode');
$stories_amount = (int) get_field('number_of_stories');
$stories_style  = get_field('stories_style_block') ?: 'style_1';

if (!function_exists('wpstb_starts_with')) {
    function wpstb_starts_with($haystack, $needle) {
        $haystack = (string) $haystack;
        $needle   = (string) $needle;
        return $needle === '' || strpos($haystack, $needle) === 0;
    }
}

$displayStory = function ($id, $title, $link, $date, $profile_image, $preview, $video, $style) {

    $id   = (string) $id;
    $date = (int) $date;

    $title_clean = wp_strip_all_tags((string) $title);
    $link_safe   = esc_url((string) $link);

    $profile_image_safe = esc_url((string) $profile_image);
    $preview_safe       = esc_url((string) $preview);
    $video_safe         = esc_url((string) $video);

    // Circle image (avatar/preview)
    $img_src = $profile_image_safe;
    if (!empty($preview_safe)) {
        $img_src = ($style !== 'style_1') ? $preview_safe : $profile_image_safe;
    }

    ob_start();
    ?>
    <li class="wpstb-story story"
        data-id="<?php echo esc_attr($id); ?>"
        data-last-updated="<?php echo esc_attr($date); ?>"
        data-photo="<?php echo esc_attr($profile_image_safe); ?>">

        <div class="wpstb-ring">
            <div class="wpstb-avatar-link item-link">
                <img class="wpstb-avatar no-lazy"
                     src="<?php echo esc_url($img_src); ?>"
                     alt="<?php echo esc_attr($title_clean); ?>">

                <!-- оставил info/time чтобы твой JS мог жить как раньше -->
                <span class="info" itemprop="author" style="display:none">
                    <strong class="name" itemprop="name"><?php echo esc_html($title_clean); ?></strong>
                    <span class="time"></span>
                </span>

                <?php if ($style !== 'style_1') : ?>
                    <img class="no-lazy profile"
                         src="<?php echo esc_url($profile_image_safe); ?>"
                         alt="<?php echo esc_attr($title_clean); ?>"
                         style="display:none">
                <?php endif; ?>
            </div>
        </div>

        <span class="wpstb-name name">
            <?php echo esc_html($title_clean); ?>
        </span>

        <!-- hidden items payload (js reads it) -->
        <?php
            $media_url = $video_safe ?: $profile_image_safe;

            $is_video = (bool) preg_match('~\.(mp4|webm|ogg)(\?.*)?$~i', $media_url);
            $type     = $is_video ? 'video' : 'image';

            $timeout  = 6000;
        ?>

        <ul class="items" style="display:none">
            <li data-id="<?php echo esc_attr($id); ?>"
                data-time="<?php echo esc_attr($date); ?>"
                data-timeout="<?php echo esc_attr($timeout); ?>">
                <a href="<?php echo esc_url($media_url); ?>"
                   data-type="<?php echo esc_attr($type); ?>"
                   data-link="<?php echo esc_url($link_safe); ?>"
                   data-linkText="<?php echo esc_attr($title_clean); ?>">
                    <img class="no-lazy"
                         src="<?php echo esc_url($profile_image_safe); ?>"
                         alt="<?php echo esc_attr($title_clean); ?>">
                </a>
            </li>
        </ul>

    </li>
    <?php
    return ob_get_clean();
};

?>
<div id="<?php echo esc_attr($uniq_id); ?>"
     class="wp-stories-block <?php echo esc_attr($stories_style); ?>"
     data-wpstb="1">

    <?php if (!empty($title)) : ?>
        <h2 class="h3 stories-title"><?php echo esc_html($title); ?></h2>
    <?php endif; ?>

    <div class="wpstb-screen">
        <ul class="wpstb-stories stories-timeline" data-wpstb-timeline>
            <?php
            if (!empty($mode) && $mode === true) {

                if (!empty($stories) && is_array($stories)) {
                    foreach ($stories as $story) {

                        $story_id    = $story['preview']['ID'] ?? '';
                        $story_title = $story['title'] ?? '';
                        $story_link  = $story['model-link'] ?? '';
                        $story_date  = !empty($story['preview']['date']) ? strtotime($story['preview']['date']) : time();

                        $story_prev  = $story['preview']['url'] ?? '';
                        $story_media = $story['media'] ?? '';

                        echo $displayStory(
                                $story_id,
                                $story_title,
                                $story_link,
                                $story_date,
                                $story_prev,  // profile_image
                                $story_prev,  // preview
                                $story_media, // video
                                $stories_style
                        );
                    }
                }

            } else {
                // MODE = auto (models query)
                $args = [
                        'post_type'      => 'models',
                        'posts_per_page' => $stories_amount > 0 ? $stories_amount : 10,
                        'orderby'        => 'rand',
                        'post_status'    => 'publish',
                        'meta_query'     => [
                                [
                                        'key'     => 'model_has_video',
                                        'value'   => '1',
                                        'compare' => '=',
                                ],
                        ],
                ];

                $query = new WP_Query($args);

                if ($query->have_posts()) {
                    while ($query->have_posts()) {
                        $query->the_post();

                        $story_id    = get_the_ID();
                        $story_title = get_the_title();
                        $story_date  = (int) get_the_date('U');
                        $story_link  = get_permalink();

                        $model_photos = get_post_meta($story_id, 'model_photos', true);

                        $profile_image_url = '';
                        $preview_url       = '';
                        $video_url         = '';

                        if ($model_photos && is_array($model_photos)) {
                            foreach ($model_photos as $media_id) {
                                $mime = get_post_mime_type($media_id);
                                $url  = wp_get_attachment_url($media_id);

                                if ($mime && wpstb_starts_with($mime, 'image/') && !$profile_image_url) {
                                    $profile_image_url = $url;
                                }
                                if ($mime && wpstb_starts_with($mime, 'video/') && !$video_url) {
                                    $video_url = $url;
                                }

                                if ($profile_image_url && $video_url) {
                                    break;
                                }
                            }
                        }

                        if (!$profile_image_url) {
                            $profile_image_url = get_the_post_thumbnail_url($story_id, 'medium') ?: '';
                        }

                        // If you want preview from video (optional)
                        if ($stories_style !== 'style_1' && !empty($video_url) && class_exists('\\ESC\\Girlzz\\ThemeFunctions')) {
                            if (method_exists(ThemeFunctions::class, 'generateVideoPreviewFromUrl')) {
                                $preview_url = ThemeFunctions::generateVideoPreviewFromUrl($video_url);
                            }
                        }

                        echo $displayStory(
                                $story_id,
                                $story_title,
                                $story_link,
                                $story_date,
                                $profile_image_url,
                                $preview_url,
                                $video_url,
                                $stories_style
                        );
                    }
                    wp_reset_postdata();
                }
            }
            ?>
        </ul>
    </div>

    <div class="daily-stories" hidden data-wpstb-modal>
        <div class="daily-stories__backdrop" data-wpstb-close></div>

        <div class="daily-stories__outer">
            <div class="progress-bars" data-count="0" data-wpstb-bars></div>

            <div class="daily-stories__container" data-wpstb-slides></div>
        </div>


        <span id="prev-slide" data-wpstb-prev></span>
        <span id="next-slide" data-wpstb-next></span>

        <div class="central-area" data-state="playing" data-wpstb-toggle>
            <div class="button">Next</div>
        </div>

        <button type="button" class="daily-stories__close" data-wpstb-close aria-label="Close">
            <?php echo getInlineSvg('close'); ?>
        </button>
    </div>
</div>