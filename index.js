'use strict';

const seenk = require('seenk'),
	  http = require('http');

/**
 * Gerkon class
 * @constructor
 */
function Gerkon(){
	const routes = {
		get: new Map(),
		post: new Map(),
		put: new Map(),
		head: new Map(),
		delete: new Map()
	};
	let server;

	/**
	 * Request handler
	 * @param req {object} Request object
	 * @param res {object} Response object
	 * @private
	 */
	function _onRequest(req, res){
		const method = req.method.toLowerCase(),
			  url = req.url,
			  rule = _findRoute(routes[method], url),
			  route = routes[method].get(rule);

		if(route){
			if(route.params.length){
				req.params = _parseParams(route, url);
			}else{
				req.params = {};
			}

			_execRoute(route, req, res)
				.then(() => {})
				.catch(() => _on502(req, res));
		}else{
			_on404(req, res);
		}
	}

	/**
	 * Starts to listen specified port
	 * @param port {number} Port number
	 * @return {Gerkon}
	 * @method
	 */
	this.listen = function(port){
		server = _startServer(port, _onRequest);
		return this;
	};

	/**
	 * Stops Gerkon server
	 * @return {Gerkon}
	 * @method
	 */
	this.stop = function(){
		_stopServer(server);
		return this;
	};

	/**
	 * Adds a route
	 * @param method {string|Array} Request method or an array of methods
	 * @param rule {string} Route rule
	 * @param controllers {function|Array} Controller or array of controllers
	 * @returns {Gerkon}
	 * @method
	 */
	this.route = function(method, rule, controllers){
		let newRoute = {};

		if(arguments.length === 2 && typeof arguments[1] === 'function'){
			controllers = rule;
			rule = method;
			method = ['GET', 'POST', 'PUT', 'HEAD', 'DELETE'];
		}

		if(method instanceof Array){
			method.forEach(singleMethod => {
				this.route(singleMethod, rule, controllers);
			});
			return this;
		}

		if(typeof controllers === 'function'){
			controllers = [controllers];
		}

		if(typeof method !== 'string'){
			throw Error('Request method must be a string');
		}
		if(typeof rule !== 'string'){
			throw Error('Route rule must be a string');
		}
		if(!(controllers instanceof Array)){
			throw Error('Controller must be a function or an array of functions');
		}

		method = method.toLowerCase();

		if(method in routes){
			if(!routes[method].has(rule)){
				newRoute.method = method;
				newRoute.params = _fetchParamNames(rule);
				newRoute.rule = _ruleToRegExp(rule);

				// wrap async controllers into Promise
				newRoute.controllers = controllers.map(controller => {
					if(controller.length > 2){
						return function(req, res){
							return new Promise(resolve => {
								controller(req, res, resolve);
							});
						};
					}
					return controller;
				});

				routes[method].set(rule, newRoute);
			}else{
				throw Error('Route already exists');
			}
		}else{
			throw Error(`Invalid request method: ${method}`);
		}
		return this;
	};

	/**
	 * Returns list of routes for specified request method
	 * @param method {string} Request method
	 * @return {Array}
	 */
	this.getRoutes = function(method){
		let result = [];

		if(method in routes){
			routes[method].forEach((route, rule) => {
				result.push(rule);
			});
		}

		return result;
	};
}

/**
 * Adds a GET route
 * @param rule {string} Route rule
 * @param controllers {function|Array} Controller or array of controllers
 * @returns {Gerkon}
 */
Gerkon.prototype.get = function(rule, controllers){
	return this.route('get', rule, controllers);
};

/**
 * Adds a GET route
 * @param rule {string} Route rule
 * @param controllers {function|Array} Controller or array of controllers
 * @returns {Gerkon}
 */
Gerkon.prototype.post = function(rule, controllers){
	return this.route('post', rule, controllers);
};

/**
 * Checks if url matchs to the rule
 * @param rule {string|RegExp} Gerkon routing rule
 * @param url {string} Url to check
 * @returns {Boolean}
 * @static
 */
Gerkon.match = function(rule, url){
	if(typeof rule === 'string'){
		rule = _ruleToRegExp(rule);
	}
	if(!(rule instanceof RegExp && typeof url === 'string')){
		throw Error('Rule must be a string or RegExp. Url must be a string.');
	}

	return rule.test(url);
};

/**
 * Starts http server
 * @param  port {number} Port number
 * @param  requestHandler {function} Request handler
 * @returns {http.Server} Server instance
 * @this {Gerkon}
 * @private
 */
function _startServer(port, requestHandler){
	if(isNaN(port)){
		throw Error('Port must be a number');
	}

	return http
		.createServer(requestHandler)
		.listen(port);
}

/**
 * Stops server
 * @returns {Gerkon}
 * @private
 * @this {Gerkon}
 */
function _stopServer(serverInstance){
	if(serverInstance instanceof http.Server){
		serverInstance.close();
	}
}

/**
 * Fetches names of parameters from rule
 * @param rule
 * @returns {Array}
 * @private
 */
function _fetchParamNames(rule){
	let paramNames = [],
		paramRegExp = /<([^\s\/]+?)>/ig,
		name;

	while((name = paramRegExp.exec(rule)) !== null){
		paramNames.push(name[1]);
	}

	return paramNames;
}

/**
 * Parse params from rule in order to route rule
 * @param route {object} Route
 * @param url {string} Url to parse params from
 * @returns {object}
 */
function _parseParams(route, url){
	let params = url.match(route.rule),
		result = {};

	params.shift();
	for(let paramName of route.params){
		result[paramName] = params.shift();
	}

	return result;
}

/**
 * Converts Gerkon rule to regular expression
 * @param rule {string} Source rule
 * @return {RegExp}
 * @private
 */
function _ruleToRegExp(rule){
	return new RegExp(`^${rule

		// escape regexp special symbols
		.replace(/([\/\.\\\?\*\+\(\)\{\}\[\]\^\$])/ig, '\\$1')

		// optional rule /foo{/bar}
		.replace(/\\\{(.*)\\\}/ig, '(?:$1)?')

		// any rule /test*
		.replace(/\\\*/ig, '.*')

		// params rule
		.replace(/<([^\s\/]*)>/ig, '([^\/]+)')}$`, 'i');
}

/**
 * Finds route matching specified method and url
 * @param routes {Map} Map of available routes
 * @param url {string} requested url
 * @returns {string}
 */
function _findRoute(routes, url){
	for(let rule of routes.keys()){
		let route = routes.get(rule);
		if(route.rule.test(url)){
			return rule;
		}
	}
}

/**
 * Handle route
 * @param
 */
function _execRoute(route, req, res){
	return seenk(function* (){
		for(let controller of route.controllers){
			yield controller(req, res);
		}
	});
}

/**
 * Handle 404 error
 * @param req {object} Request object
 * @param res {object} Response object
 */
function _on404(req, res){
	// TODO:404
	res.writeHead(404, {
		'Content-Type': 'text/plain'
	});
	res.write('Not found');
	res.end();
}

/**
 * Handle 502 error
 * @param req {object} Request object
 * @param res {object} Response object
 */
function _on502(req, res){
	// TODO:502
	res.writeHead(502, {
		'Content-Type': 'text/plain'
	});
	res.write('Internal error');
	res.end();
}

module.exports = Gerkon;
