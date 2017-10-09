/* global wp, Request */

(function( api ) {
	'use strict';
	var originalFetch;

	if ( 'function' !== typeof window.fetch ) {
		return;
	}

	originalFetch = window.fetch;

	/**
	 * Fetch.
	 *
	 * @param {string} input - URL.
	 * @param {object} [init] - Options.
	 * @return {Promise}
	 */
	window.fetch = function fetch( input, init ) {
		var initOptions, urlParser, queryParams, requestMethod, dirtyValues = {};
		if ( input instanceof Request ) {
			throw new Error( 'Passing Request as input is not yet supported.' );
		}

		urlParser = document.createElement( 'a' );
		urlParser.href = input;

		// Abort if the request is not for this site.
		if ( ! api.isLinkPreviewable( urlParser, { allowAdminAjax: true } ) ) {
			return originalFetch.call( this, input, init );
		}

		initOptions = Object.assign(
			{
				headers: {}
			},
			init,
			{
				credentials: 'include'
			}
		);
		queryParams = api.utils.parseQueryString( urlParser.search.substring( 1 ) );

		if ( 0 === urlParser.href.indexOf( api.settings.restApi.root ) ) {
			queryParams._wpnonce = api.settings.restApi.nonce;
		}

		// Note that _dirty flag will be cleared with changeset updates.
		api.each( function( setting ) {
			if ( setting._dirty ) {
				dirtyValues[ setting.id ] = setting.get();
			}
		} );

		if ( ! _.isEmpty( dirtyValues ) ) {
			if ( initOptions.method ) {
				requestMethod = initOptions.method.toUpperCase();
			}

			// Override underlying request method to ensure unsaved changes to changeset can be included (force Backbone.emulateHTTP).
			if ( 'POST' !== requestMethod ) {
				queryParams._method = requestMethod || 'GET';
				initOptions.headers['X-HTTP-Method-Override'] = queryParams._method; // @todo What if headers is a Headers object?
				initOptions.method = 'POST';
			}

			// @todo What if body is URLSearchParams or USVString?
			if ( ! initOptions.body ) {
				initOptions.body = new FormData();
			}

			initOptions.body.set( 'nonce', api.settings.nonce.preview );
			initOptions.body.set( 'customized', JSON.stringify( dirtyValues ) );
		}

		// Include customized state query params in URL.
		queryParams.customize_changeset_uuid = api.settings.changeset.uuid;
		if ( api.settings.changeset.autosaved ) {
			queryParams.customize_autosaved = 'on';
		}
		if ( ! api.settings.theme.active ) {
			queryParams.customize_theme = api.settings.theme.stylesheet;
		}
		urlParser.search = Object.keys( queryParams ).map( function( key ) {
			return [ key, queryParams[ key ] ].map( encodeURIComponent ).join( '=' );
		}).join( '&' );

		return originalFetch.call( this, urlParser.href, initOptions );
	};
})( wp.customize );
