'use strict';

const fs = require('fs');

module.exports = function(req, res, next){
	/**
	 * Sends content
	 * @param content {string} Content to send
	 */
	res.send = function(content){
		this.write(content);
		this.end();
	};

	/**
	 * Sends file content
	 * @param filePath {string} Path of file
	 * @returns {Promise}
	 */
	res.file = function(filePath){
		return new Promise((resolve, reject) => {
			let readable;

			if(typeof filePath === 'string'){
				readable = fs.createReadStream(filePath);
				readable.on('error', reject);
				readable.on('end', resolve);
				readable.pipe(this);
			}else{
				reject(Error('File path must be a string'));
			}
		});
	};

	/**
	 * Sends HTTP status code
	 * @param code {number|string} Valid HTTP status code
	 * @param message {string} Message to send
	 */
	res.sendCode = function(code, message){
		if(!isNaN(code)){
			res.statusCode = Number(code);
			res.end(message);
		}else{
			throw Error('Code must be a valid HTTP status code');
		}
	};

	/**
	 * Sends redirection header
	 * @param url {string} Url redirect to
	 * @param statusCode {number|undefined} Redirection status code. 302 by default.
	 */
	res.redirect = function(url, statusCode){
		if(typeof url === 'string'){
			if(isNaN(statusCode)){
				statusCode = 302;
			}
			res.setHeader('Location', url);
			res.sendCode(statusCode);
		}else{
			throw Error('Url must be a string');
		}
	};

	return next();
};
