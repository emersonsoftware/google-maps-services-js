/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var https = require('https');
var http = require('http');
var parse = require('url').parse;
var version = require('../version');

/**
 * Makes a secure HTTP GET request for the given URL.
 *
 * Calls the callback with two parameters (err, response). If there was an
 * error, response should be null. If there was no error, err should be null,
 * and response should be an object with these properties
 * {
 *   status: number,
 *   headers: Object,
 *   json: Object
 * }
 *
 * Returns a function that cancels the request.
 *
 * @param {string} url
 * @param {function(Response)} onSuccess
 * @param {function(?)} onError
 * @return {function()}
 */
module.exports = function makeUrlRequest(url, onSuccess, onError) {
  var options = parse(url);
  options.headers = {
    'User-Agent': 'GoogleGeoApiClientJS/' + version
  };

  var transport = url.indexOf('https') >= 0 ? https : http
  var request = transport.get(options, function(response) {

    response.on('error', function(error) {
      onError(error)
    });

    if (response.statusCode === 302) {
      // Handle redirect.
      var url = response.headers['location'];
      makeUrlRequest(url, onSuccess, onError)
    } else if (response.headers['content-type'] == 'application/json; charset=UTF-8') {
      // Handle JSON.
      var data = '';
      response.on('data', function(chunk) {
        data += chunk;
      });
      response.on('end', function() {
        onSuccess({
          status: response.statusCode,
          headers: response.headers,
          json: JSON.parse(data)
        })
      });
    } else {
      // Fallback is for binary data, namely places photo download,
      // so just provide the response stream.
      onSuccess(response);
    }

  }).on('error', function(error) {
    onError(error)
  });

  return function cancel() { request.abort(); };
};
