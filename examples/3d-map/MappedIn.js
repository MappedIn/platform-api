MappedIn = MappedIn || {}

// We will be using MappedIn API V1
MappedIn.host = {
	auth: 'https://auth.mappedin.com',
	api: 'https://api.mappedin.com/1/'
}

// Auth
/**
* Our authentication function for requesting an OAuth token from the MappedIn server.
* We will need this token for requesting any data from our API. 
*
* Note: A MappedIn token expires after 24 hours. You should setup your code in your production 
* environment to be able to renew or request a new token before it expires
**/
MappedIn.authenticate = function (grant, cb) {
	$.ajax({ 
		url: MappedIn.host.auth + '/oauth2/token', 
		data: grant, 
		type: 'POST',
		success: function (result) {
			token = result;
			cb();
		},
		error: function (result) {
			console.log("Error Authenticating.")
		}
	});
};

// Our main API object for requesting data from MappedIn
MappedIn.api = {
	/**
	* A simple jQuery AJAX call to request the various type of data that the MappedIn web API is able to provide
	* Please consult the MappedIn API Reference doc at https://github.com/MappedIn/platform-api/blob/master/v1.md
	* for more information on the different parameters and calls you are allowed to make using the MappedIn API
	**/
	Get: function (asset, data, cb) {
		var objects;
		function getObjects(url, cb) {
			$.ajax({
				url: url,
				type: 'GET',
				// Remember to include the OAuth token with every API request with MappedIn servers
				beforeSend: function (xhr) {
					xhr.setRequestHeader("Authorization", token.token_type + ' ' + token.access_token);
				},
				success: cb
			});
		}
		// Note: this function is for illustration purposes only. It is not robust
		// and it assumes absolute URLs.
		function getNextLink(headerValue) {
			var links = headerValue.split(',');
			for (var i = 0, len = links.length; i < len; ++i) {
				var link = links[i];
				if (link.indexOf('rel="next"') !== -1) {
					return link.slice(link.indexOf('<') + 1, link.indexOf('>'));
				}
			}
		}
		function handleResponse(data, statusText, xhr) {
			if (Array.isArray(data) && Array.isArray(objects)) {
				for (var i = 0, len = data.length; i < len; ++i) {
					objects.push(data[i]);
				}
			} else {
				objects = data;
			}
			var linkHeader = xhr.getResponseHeader('Link');
			if (linkHeader) {
				var nextLink = getNextLink(linkHeader);
				if (nextLink) {
					return getObjects(nextLink, handleResponse);
				}
			}
			cb(objects, statusText, xhr);
		}
		var url = MappedIn.host.api + asset;
		if (data) {
			url += '?' + $.param(data);
		}
		getObjects(url, handleResponse);
	}
};