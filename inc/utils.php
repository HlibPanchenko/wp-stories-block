<?php

function getInlineSvg($name): false|string
{
    if ($name) {
        $file_path = WPSTB_PATH . '/assets/icons/' . $name . '.svg';

        if (file_exists($file_path)) {
            return file_get_contents($file_path);
        }
    }
    return '';
}