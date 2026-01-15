<?php
defined('ABSPATH') || exit;

add_action('admin_menu', function () {

    add_menu_page(
        __('WP Stories Block', 'wp-stories-block'),
        __('WP Stories', 'wp-stories-block'),
        'manage_options',
        'wpstb-about',
        'wpstb_render_admin_page',
        'dashicons-format-video',
        58
    );

});

function wpstb_render_admin_page() {
    ?>
    <div class="wrap">
        <h1>WP Stories Block</h1>

        <p style="max-width: 900px; font-size: 14px;">
            This plugin adds an ACF Gutenberg block called “Stories”. It displays a horizontal stories feed on the frontend and opens stories in a fullscreen modal with autoplay, swipe navigation, and pause-on-hold behavior.
        </p>

        <hr>

        <h2>How to use</h2>

        <ol style="max-width: 900px; font-size: 14px; line-height: 1.6;">
            <li>Open a page in the Gutenberg editor.</li>

            <li>
                Add the <b>WP Stories Block</b> (Widgets category).
                <div style="margin: 12px 0;">
                    <img
                            src="<?php echo esc_url(WPSTB_URL . 'assets/media/acf-block.jpg'); ?>"
                            alt="WP Stories Block in Gutenberg"
                            style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:4px;">
                </div>
            </li>

            <li>
                Configure the block fields:
                <ul>
                    <li><b>Stories Title</b> – optional heading displayed above the stories feed.</li>
                    <li><b>Switch Stories Mode</b>:
                        <ul>
                            <li><b>Manually</b> – add stories manually using the repeater field.</li>
                            <li><b>Random</b> – stories are loaded automatically from models that have video (ACF field).</li>
                        </ul>
                    </li>
                    <li><b>Stories</b> (manual mode) – add preview image, media (image or video), title, and post link.</li>
                    <li><b>Number of stories</b> (random mode) – how many stories to display.</li>
                </ul>

                <div style="margin: 12px 0;">
                    <img
                            src="<?php echo esc_url(WPSTB_URL . 'assets/media/acf-block-fields.jpg'); ?>"
                            alt="WP Stories Block ACF Fields"
                            style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:4px;">
                </div>
            </li>

            <li>
                Save the page – the stories feed will appear on the frontend.
                <div style="margin: 12px 0;">
                    <img
                            src="<?php echo esc_url(WPSTB_URL . 'assets/media/stories-feed.jpg'); ?>"
                            alt="WP Stories feed on frontend"
                            style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:4px;">
                </div>
            </li>
        </ol>

        <hr>

        <h2>Story view example</h2>

        <p style="max-width: 900px; font-size: 14px;">
            Clicking a story opens it in a fullscreen modal with autoplay, progress bars, and swipe navigation.
        </p>

        <div style="max-width: 900px; margin: 12px 0;">
            <img
                    src="<?php echo esc_url(WPSTB_URL . 'assets/media/story-view.jpg'); ?>"
                    alt="WP Stories fullscreen view"
                    style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:4px;">
        </div>

        <hr>

        <h2>Notes</h2>
        <ul style="max-width: 900px; font-size: 14px; line-height: 1.6;">
            <li>Videos are played for their actual duration, but no longer than 15 seconds.</li>
            <li>On iOS, autoplay with sound is usually blocked by the browser. Sound can only be enabled after a direct user interaction.</li>
        </ul>
    </div>
    <?php
}
