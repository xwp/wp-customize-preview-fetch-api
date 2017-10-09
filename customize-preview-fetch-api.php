<?php
/**
 * Plugin Name: Customize Preview Fetch API
 * Description: Applying the customized state to the responses for calls to fetch() in the same way that jQuery Ajax prefilter is implemented in the Customizer preview today.
 * Author: Weston Ruter, XWP
 * Plugin URI: https://wordpress.stackexchange.com/questions/282139/how-to-make-get-theme-mod-work-with-ajax-in-the-customizer-preview
 * Version: 0.1.0
 * Author URI: https://make.xwp.co/
 * License: GPLv2+
 *
 * Copyright (c) 2016 XWP (https://xwp.co/)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 *
 * @package WordPress
 * @subpackage Customize
 */

add_action( 'wp_enqueue_scripts', function() {
	if ( ! is_customize_preview() ) {
		return;
	}
	wp_enqueue_script(
		'customize-preview-fetch-api',
		plugin_dir_url( __FILE__ ) . 'customize-preview-fetch-api.js',
		array( 'customize-preview' )
	);
} );

add_action( 'wp_footer', function() {
	if ( ! is_customize_preview() ) {
		return;
	}
	printf(
		'<script>_wpCustomizeSettings.restApi = %s;</script>',
		wp_json_encode( array(
			'root'          => esc_url_raw( get_rest_url() ),
			'nonce'         => ( wp_installing() && ! is_multisite() ) ? '' : wp_create_nonce( 'wp_rest' ),
			'versionString' => 'wp/v2/',
		) )
	);
}, 21 );
