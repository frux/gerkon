/**
 * Gerkon server module
 */
var http = require('http'),
	fs = require('fs');

/**
 * Starts listen for request
 * @param port {number}
 * @param requestHandler {function}
 */
function start(port, requestHandler){
	return new Promise((resolve, reject) => {

		//throw error if port is not specified
		if(isNaN(port)){
			return reject('Port is not specified');
		}

		//if handler is a function
		if(typeof requestHandler === 'function'){
			//create new server
			resolve(http.createServer((req, res) =>
					requestHandler(req, res))
				.listen(port));
		}else{
			return reject(`requestHandler must be a function instead of ${typeof requestHandler}`);
		}
	});
}

module.exports = {
	start
};