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

		//if handler is a function
		if(typeof requestHandler === 'function'){
			//create new server
			this.server = http.createServer((req, res) =>
					requestHandler(req, res))
				.listen(port);

			resolve(this.server);
		}
	});
}

/**
 * Stops listening server
 */
function stop(){
	this.server && this.server.close();
}

module.exports = {
	start,
	stop
};