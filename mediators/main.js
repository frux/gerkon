const fs = require('fs');
const path = require('path');

module.exports = function (req, res, next) {
	cookies(req, res)
		.then(() => responseOutput(res))
		.then(() => next());
};

function cookies(req) {
	return new Promise((resolve, reject) => {
		var cookies = {},
			cookiePairs = (req.headers.cookie || '').split(/;\s*/);

		cookiePairs.forEach((cookiePair) => {
			var cookie = cookiePair.split('=');
			cookies[cookie[0]] = cookie[1];
		});

		req.cookies = cookies;
		resolve();
	});
}

function responseOutput(res){
	return new Promise((resolve, reject) => {

		/**
		 * Send data
		 * @param data {*} Data to send
		 * @returns {object}
		 */
		res.send = function(data){

			this.writeHead(200, {'Content-Type':'text/html'});

			//write data to response
			this.write(data);

			//send response
			this.end();

			return this;
		};

		/**
		 * Sends an http code and optionally some data
		 * @param code {number} Http code to send
		 * @param data {*|undefined} Data to send with code. For example code explanation.
		 */
		res.sendCode = function(code, data){

			//code nust be a number
			if(!isNaN(code)){

				//write code to the head
				this.writeHead(code);

				//if data is provided send it
				if(typeof data === 'string'){
					this.write(data);
				}

				//close connection
				this.end();
			}
		};

		/**
		 * Sends file content
		 * @param filePath {string} Absolute file path
		 * @param mime {string|undefined} File mime-type
		 * @param callback
		 */
		res.sendFile = function(filePath, mime, callback){
			if(typeof filePath === 'string'){

				//if all arguments provided
				if(arguments.length === 3){

					//default mime-type is plain/text
					mime = mime || 'plain/text';

					//if one parameter skipped
				}else if(arguments.length === 2){

					//if second argument is function
					if(typeof mime === 'function'){

						//set mime-type to default
						callback = mime;
						mime = 'plain/text';
					}
				}

				if(!path.isAbsolute(filePath)){
					filePath = path.resolve(require.main.filename, filePath);
				}

				//try to read file
				fs.readFile(filePath, (err, data) => {

					//if no errors
					if(!err){

						//add header
						this.writeHead(200, {'Content-type': mime});

						//write file content
						this.write(data);

						//close connection
						this.end();
					}

					(callback || function(){
					})(err, data);
				});
			}
		};

		/**
		 * Sends redirection header
		 * @param location {string} Url server should redirects to
		 * @param code {number} Http redirect status code
		 */
		res.redirect = function(location, code){

			//if specified as string
			if(typeof location === 'string'){

				//if redirection code is wrong sends temporary redirect code (302)
				if(isNaN(code) || code < 300 || code >= 400){
					code = 302;
				}

				//write code and url to the header
				this.writeHead(code, { 'Location': location });

				//close connection
				this.end();
			}
		};

		resolve();
	});
}