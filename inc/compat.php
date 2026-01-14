<?php


defined('ABSPATH') || exit;

/**
 * PHP 7.0 compatibility for str_starts_with
 */
if (!function_exists('wpstb_starts_with')) {
    function wpstb_starts_with($haystack, $needle)
    {
        $haystack = (string)$haystack;
        $needle = (string)$needle;
        return $needle === '' || strpos($haystack, $needle) === 0;
    }
}
