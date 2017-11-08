/* global wp, Request, console */
/* eslint consistent-this: [ "error", "context" ] */

(function( api ) {
	'use strict';
	var originalFetch;

	if ( 'function' !== typeof window.fetch ) {
		return;
	}

	originalFetch = window.fetch;

	/**
	 * Encode query params as query string.
	 *
	 * @param {object} queryParams - Query params.
	 * @returns {string} Query string.
	 */
	function encodeQueryParams( queryParams ) {
		return Object.keys( queryParams ).map( function( key ) {
			return [ key, queryParams[ key ] ].map( encodeURIComponent ).join( '=' );
		}).join( '&' );
	}

	/**
	 * Warn to the console when the call is not going to be injected with the Customized state.
	 *
	 * @param {string} message - Message.
	 * @returns {void}
	 */
	function warn( message ) {
		if ( window.console && window.console.warn ) {
			console.warn( 'customize-preview-fetch-api:' + message );
		}
	}

	/**
	 * Fetch.
	 *
	 * @param {string} input - URL.
	 * @param {object} [init] - Options.
	 * @return {Promise} Response promise.
	 */
	window.fetch = function fetch( input, init ) {
		var context = this, initOptions, urlParser, queryParams, requestMethod, dirtyValues = {};

		/**
		 * Do the original fetch call.
		 *
		 * @return {Promise} Promise.
		 */
		function doOriginal() {
			return originalFetch.call( context, input, init );
		}

		if ( input instanceof Request ) {
			warn( 'Passing Request as input is not yet supported.' );
			return doOriginal();
		}

		urlParser = document.createElement( 'a' );
		urlParser.href = input;

		initOptions = Object.assign(
			{
				headers: {}
			},
			init,
			{
				credentials: 'include'
			}
		);

		// Abort if the request is not for this site, or if the body is not a string.
		if ( ! api.isLinkPreviewable( urlParser, { allowAdminAjax: true } ) ) {
			return doOriginal();
		}

		// Abort if request is not with url-encoded form data with plain object headers.
		if ( initOptions.headers ) {
			if ( window.Headers && initOptions.headers instanceof window.Headers ) {
				warn( 'Using Headers is not yet supported.' );
				return doOriginal();
			}
			if ( initOptions.headers['Content-Type'] && 0 !== initOptions.headers['Content-Type'].indexOf( 'application/x-www-form-urlencoded' ) ) {
				warn( 'Only Content-Type of application/x-www-form-urlencoded is supported.' );
				return doOriginal();
			}
		}
		if ( initOptions.body && 'string' !== typeof initOptions.body ) {
			warn( 'Only URL-encoded form data in body is supported.' );
			return doOriginal();
		}

		queryParams = api.utils.parseQueryString( urlParser.search.substring( 1 ) );

		if ( 0 === urlParser.href.indexOf( api.settings.restApi.root ) ) {
			queryParams._wpnonce = api.settings.restApi.nonce;
		}
		if ( api.settings.changeset.autosaved ) {
			queryParams.customize_autosaved = 'on';
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

			initOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=' + document.characterSet;

			if ( initOptions.body ) {
				initOptions.body += '&';
			} else {
				initOptions.body = '';
			}

			initOptions.body += encodeQueryParams( {
				customize_preview_nonce: api.settings.nonce.preview,
				customized: JSON.stringify( dirtyValues )
			} );
		}

		// Include customized state query params in URL.
		queryParams.customize_changeset_uuid = api.settings.changeset.uuid;
		if ( api.settings.changeset.autosaved ) {
			queryParams.customize_autosaved = 'on';
		}
		if ( ! api.settings.theme.active ) {
			queryParams.customize_theme = api.settings.theme.stylesheet;
		}
		urlParser.search = encodeQueryParams( queryParams );

		return originalFetch.call( context, urlParser.href, initOptions );
	};
})( wp.customize );
