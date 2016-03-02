'use strict';

const seenk = require('seenk'),
	  http = require('http'),
	  path = require('path'),
	  steroids = require('./gerkon-reqres-steroids');

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
			delete: new Map(),
			patch: new Map(),
			options: new Map()
		},
		middlewares = new Set(),
		params = new Map(),
		app = this;

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

			// try to find matching route
			rule = _findRoute(routes[method], url),

			// try to get found route (if not found we get undefined here)
			route = routes[method].get(rule),

			// promise resolving on response sent
			responsePromise = new Promise((resolve, reject) => {
				res.on('finish', resolve);
				res.on('error', reject);
			});

		// use standard gerkon middleware
		app.use(steroids);

		// run middlewares before controllers start
		_runMiddlewares(middlewares, responsePromise, req, res)
			.then(() => {
				// if route were found
				if(route){
					// set reference to the app
					req.app = app;

					// if route must have params
					if(route.params.length){
						// parse params from url
						req.params = _parseParams(route, url);
					}else{
						req.params = {};
					}

					// run controllers of this route
					_execRoute(route, req, res)
						.then(() => {})
						.catch(() => {
							_on502(req, res);
						});

				// if route was not found and static param is defined try to open file
				}else if(app.param('static')){
					res.file(path.resolve(app.param('static'), `.${req.url}`))
						.catch(() => {
							_on404(req, res);
						});
				}else{
					_on404(req, res);
				}
			});
	}

	/**
	 * Starts to listen specified port
	 * @param port {number} Port number
	 * @return {Gerkon}
	 * @method
	 */
	this.listen = function(port){
		// create new server instance
		server = _startServer(port, _onRequest);
		return this;
	};

	/**
	 * Stops Gerkon server
	 * @return {Gerkon}
	 * @method
	 */
	this.stop = function(){
		// stop runing server instance
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
		// add route
		_addRoute.call(routes, method, rule, controllers);
		return this;
	};

	/**
	 * Returns list of routes for specified request method
	 * @param method {string} Request method
	 * @return {Array}
	 */
	this.getRoutes = function(method){
		let result = [];

		// if requet method is a valid request method
		if(method in routes){
			// add each route rule to the result array
			routes[method].forEach((route, rule) => {
				result.push(rule);
			});
		}

		return result;
	};

	/**
	 * Adds middleware
	 * @param middleware {function} Middleware function
	 * @returns {Gerkon}
	 */
	this.use = function(middleware){
		// add middleware
		_addMiddleware.call(middlewares, middleware);
		return this;
	};

	/**
	 * Sets/returns param value
	 * @param paramName {string} Param name
	 * @param paramVal {*|undefined} Param value
	 * @returns {*}
	 */
	this.param = function(paramName, paramVal){
		if(typeof paramName !== 'string'){
			throw Error('Param name must be a string');
		}

		if(typeof paramVal !== 'undefined'){
			params.set(paramName, paramVal);
			return this;
		}

		return params.get(paramName);
	};

	/**
	 * Defines path of static files
	 * @param path {string} Path of static files
	 * @returns {Gerkon}
	 */
	this.static = function(path){
		if(typeof path === 'string'){
			this.param('static', path);
		}else{
			throw Error('Path must be a string');
		}
		return this;
	};
}

/**
 * Adds middleware
 * @param middleware {function} Middleware function
 */
function _addMiddleware(middleware){
	if(typeof middleware === 'function'){
		// if middleware have more then 2 params it is asyncronous
		if(middleware.length > 2){
			// wrap middleware function by the function returning promise
			this.add(function(req, res, responsePromise){
				return new Promise(resolve => {
					// the 3rd argument is a function resolving
					// current middleware promise
					// and returns promise of the whole request
					// to allow user to do something after response will be sent
					middleware(req, res, () => {
						resolve();
						return responsePromise;
					});
				});
			});
		}else{
			this.add(middleware);
		}
	}else{
		throw Error('Middleware must be a function');
	}
}

/**
 * Runs middlewares
 * @param middlewares {Set} Set of middlewares to run
 * @param responsePromise {function} Response promise
 * @param req {object} Request object
 * @param res {object} Response object
 **/
function _runMiddlewares(middlewares, responsePromise, req, res){
	// synchronously run each middleware
	return seenk(function* (){
		for(let middleware of middlewares){
			yield middleware(req, res, responsePromise);
		}
	});
}

/**
 * Adds a route
 * @param method {string|Array} Request method or an array of methods
 * @param rule {string} Route rule
 * @param controllers {function|Array} Controller or array of controllers
 * @returns {Gerkon}
 * @this {routes}
 * @method
 */
function _addRoute(method, rule, controllers){
	let newRoute = {};

	// if two arguments provided and second argument is controller
	if(typeof arguments[2] === 'undefined' && typeof arguments[1] === 'function'){
		// shift arguments
		controllers = rule;
		rule = method;

		// default value for method
		method = Object.keys(this);
	}

	// if multiple request methods provided
	if(method instanceof Array){
		// add this route for each of the specified methods
		method.forEach(singleMethod => {
			_addRoute.call(this, singleMethod, rule, controllers);
		});
		return;
	}

	// if comtroller is a single function wrap it by array
	if(typeof controllers === 'function'){
		controllers = [controllers];
	}

	// check that all arguments is valid
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

	// if method is a valid request method
	if(method in this){
		// if the same method were not added yet
		if(!this[method].has(rule)){
			newRoute.method = method;

			// get list of params url must contains
			newRoute.params = _fetchParamNames(rule);

			// convert Gerkon rule to regular expression
			newRoute.rule = _ruleToRegExp(rule);

			// wrap async controllers into Promise
			newRoute.controllers = controllers.map(controller => {
				// if controller expects more then 2 arguments it is asynchronous
				if(controller.length > 2){
					// wrap controller by function returning promise
					return function(req, res){
						return new Promise(resolve => {
							controller(req, res, resolve);
						});
					};
				}
				return controller;
			});

			// add route
			this[method].set(rule, newRoute);
		}else{
			throw Error('Route already exists');
		}
	}else{
		throw Error(`Invalid request method: ${method}`);
	}
}

/**
 * Adds a GET route
 * @param rule {string} Route rule
 * @param controllers {function|Array} Controller or array of controllers
 * @returns {Gerkon}
 */
Gerkon.prototype.get = function(rule, controllers){
	// add route for GET request method
	return this.route('get', rule, controllers);
};

/**
 * Adds a GET route
 * @param rule {string} Route rule
 * @param controllers {function|Array} Controller or array of controllers
 * @returns {Gerkon}
 */
Gerkon.prototype.post = function(rule, controllers){
	// add route for POST request method
	return this.route('post', rule, controllers);
};

/**
 * Checks if rule matchs to the url
 * @param rule {string|RegExp} Gerkon routing rule
 * @param url {string} Url to check
 * @returns {Boolean}
 * @static
 */
Gerkon.match = function(rule, url){
	// if rule is a string convert it to regexp
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
	// if server was running
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
	// test each rules of all routes to matches
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
	// synchronously run each controller
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
	res.sendCode(404, 'Internal error');
}

/**
 * Handle 502 error
 * @param req {object} Request object
 * @param res {object} Response object
 */
function _on502(req, res){
	// TODO:502
	res.sendCode(502, 'Internal error');
}

module.exports = Gerkon;
