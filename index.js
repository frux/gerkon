'use strict';
/**
 * Gerkon
 * @version 1.1.0
 */

const Gerkon = {
	init,
	stop,
	reset,
	route,
	getRoutes,
	mediator,
	setConfig,
	param
};

const Server = require('./server');
const Logs = require('./logs');
const Seenk = require('seenk');
const chalk = require('chalk');
const fs = require('fs');
const ASTERISK = new RegExp('^\\S{0,}$', 'i');

let config = {},
	routes = new Map(),
	mediators = [];

/**
 * Inititalize Gerkon
 * @returns {Promise}
 */
function init(){

	//show Gerkon logo
	_getParam('logo') && _printLogo();

	//connect mediators
	Gerkon.mediator(require('./mediators/main.js'));

	//if param `logs` was set to false diable logging
	_getParam('logs') && Logs.enable(_getParam('logs'));

	//check port and set default
	if(!_getParam('port')){
		_setParam('port', 8080);
		Logs.warn('Port was not specified. Gerkon is using default 8080.');
	}

	//start the server
	return Server.start(_getParam('port'), (req, res) => {
			_onRequest(req, res);
		})
		.then(() => {

			//notify about server starting
			Logs.info(`Gerkon has started to listen on ${chalk.blue('localhost:' + _getParam('port'))}`);
		});
}

/**
 * Stops Gerkon server
 */
function stop(){
	Server.stop();
}

/**
 * Stops Gerkon server and reset all configs, mediators and routes
 */
function reset(){
	stop();
	Logs.disable();
	config = {};
	routes = new Map();
	mediators = [];
}

/* Routing */

/**
 * Add route
 * @param method {string|Array|undefined} Available request method or methods
 * @param rule {string} Route`s rule
 * @param controllers {function|Array} Route controller or array of controllers
 * @returns {Gerkon}
 */
function route(method, rule, controllers){
	let _rule,
		route,
		methods,
		paramsNames;

	//if method is not specified
	if(arguments.length === 2){

		//set all available methods
		methods = [ 'GET', 'POST', 'PUT', 'DELETE', 'HEAD' ];

		//and shift arguments
		controllers = rule;
		rule = method;

		//if method specified as array
	}else if(method instanceof Array){

		//just assign it
		methods = method;

		//if specified one method only
	}else{

		//wrap it in array
		methods = [ method.toUpperCase() ];
	}

	_rule = rule;

	//if rule is a string
	if(typeof _rule === 'string'){

		if(typeof controllers === 'function'){
			controllers = [ controllers ];
		}

		if(_rule === '*'){
			_rule = ASTERISK;
		}else{

			// escape "?" symbol
			_rule = _rule.replace('?', '\?');

			// handle optional symbols {}
			_rule = _rule.replace(/\{(.*)\}/g, '(?:$1){0,1}');

			//handle "Any" symbol "*"
			_rule = _rule.replace('*', '\\S{0,}');

			//find all params in url template
			paramsNames = _rule.match(/\<([a-zA-Z0-9\_\-]{1,})\>/g) || [];

			//handle params "catching"
			_rule = _rule.replace(/\<([a-zA-Z0-9\_\-]{1,})\>/g, '([^\/]{1,})');

			//escape "/" symbol
			_rule = _rule.replace(/\//g, '\\/');

			_rule = new RegExp('^' + _rule + '$', 'i');
		}

		//if the same route is not exists
		if(!routes.has(rule)){

			if(controllers instanceof Array){

				//wrap each asynchronous controller into Promise
				controllers = controllers.map((controller) =>
					(controller.length > 2 ? _wrapAsync(controller) : controller));

				//make a route object
				route = {
					controllers: controllers,
					methods: methods,
					rule: _rule
				};

				//if there are params in a rule was found
				if(paramsNames){

					//remember list of parameters names
					route.paramsNames = paramsNames.map((param) =>

						//RegExp found parameters names wrapped in <>. Remove brackets.
						param.substr(1, param.length - 2)
					);
				}else{
					route.paramsNames = [];
				}

				//add this route to other routes
				routes.set(rule, route);

			}else{
				throw Logs.error('controllers must be a function or an array of functions');
			}

			//if the same route is exists throw error
		}else{
			throw Logs.error(`Route already exists (${rule})`);
		}
	}else{
		throw Logs.error(`Rule must be a string not a ${typeof rule}`);
	}

	return this;
}

/**
 * Returns array of rules
 * @returns {Array}
 */
function getRoutes(){
	let routesList = [];

	for(let routeName of routes.keys()){
		routesList.push(routeName);
	}

	return routesList;
}

/**
 * Wrap controller into async function returning Promise
 * @param syncFunction {function} Some synchronous function
 * @returns {function}
 * @private
 */
function _wrapAsync(syncFunction){

	//wrap it
	return (req, res) => new Promise(function(resolve, reject){
		syncFunction(req, res, resolve);
	});
}

/**
 * Looks for rule matching the path
 * @param path {string} Path a rule should matches to
 * @param method {string} Request method
 * @returns {string}
 * @private
 */
function _getRuleForPath(path, method){
	var regExpPassed,
		methodAccepted,
		notAsterisk;

	for(let routeName of routes.keys()){
		let route = routes.get(routeName);

		//url match to the rule
		regExpPassed = route.rule.test(path);

		//request method accepted by this rule
		methodAccepted = (route.methods.indexOf(method.toUpperCase()) > -1);

		//rule is not a just asterisk (*)
		notAsterisk = (route.rule !== ASTERISK);

		//if this rule pass all conditions return it
		if(regExpPassed && methodAccepted && notAsterisk){
			return routeName;
		}
	}
}

/**
 * Extract params values from path by specified rule
 * @param path {string} Path
 * @param routeName {string} Route name
 * @returns {object}
 * @private
 */
function _parseParams(path, routeName){
	var params = {},

		//get route of this rule
		route = routes.get(routeName),
		max = route.paramsNames.length,
		parsedParams;

	//if this rule have params
	if(max){

		//if params extracted successfully
		if(parsedParams = route.rule.exec(path)){

			//delete first value
			parsedParams.shift();

			//assign each param value to its name
			for(let i = 0; i < max; i++){
				params[ route.paramsNames[ i ] ] = parsedParams[ i ];
			}
		}
	}

	return params;
}

/**
 * Run route controller
 * @param routeName {string} Route name
 * @param req {object} Request object
 * @param res {object} Response object
 * @private
 */
function _handleRoute(routeName, req, res){
	var controllers = routes.get(routeName).controllers,
		max = controllers.length,
		i;

	//parse params from path
	req.params = _parseParams(req.url, routeName);

	//exec each controller
	return Seenk(function*(){
		for(i = 0; i < max; i++){
			yield controllers[ i ](req, res);
		}
	});
}

/**
 * Finds and outputs file
 * @param path {string} File path
 * @param req {object} Requset object
 * @param res {object} Response object
 * @returns {Promise}
 * @private
 */
function _outputFileData(path, req, res){

	return new Promise(function(resolve, reject){

		//try to read file
		fs.readFile(path, function(err, data){

			//reject if failed
			if(err){
				return reject(err);
			}

			//if reading is success send file content
			resolve(data);
		});
	});

}

/**
 * Tries to handle asterisk route else just sends 404 status code
 * @param req {object} Request object
 * @param res {object} Response object
 * @returns {Promise}
 * @private
 */
function _404(req, res){
	return new Promise(function(resolve, reject){
		var asteriskRoute = routes.get('*');

		//if asterisk route defined
		if(asteriskRoute){

			//run handling asterisk
			_handleRoute('*', req, res)
				.then(() => resolve(404));

		//if asterisk route is not defined send 404
		}else{

			//send response
			res.sendCode(404, 'Error 404. The requested page is not found.');

			//set status code
			res.statusCode = 404;

			//output log
			Logs.logRequest(404, req.method, req.url);

			resolve(404);
		}
	});
}

/**
 * Sends 502 status code
 * @param req {object} Requset object
 * @param res {object} Response object
 * @param err {object} Error object
 * @returns {Promise}
 * @private
 */
function _502(req, res, err){
	return new Promise(function(resolve, reject){

		//send response
		res.sendCode(502, 'Error 502. Server error.');

		//set status code
		res.statusCode = 502;

		//output log
		Logs.logRequest(502, req.method, req.url);

		//output error
		Logs.error(err.stack);

		//reject promise
		return resolve(502);
	});
}

/* END: Routing */

/**
 * Handles every request
 * @param req {object} Request object
 * @param res {object} Response object
 * @private
 */
function _onRequest(req, res){
	let log;

	//start profiling
	Logs.startProfiling();

	//get a rule for path
	const routeName = _getRuleForPath(req.url, req.method);

	_runMediators(req, res)
		.then(() =>{
			//if url matches to any rule
			if(routeName){

				//run handling of this route
				_handleRoute(routeName, req, res)
					.then((statusCode) => {
						Logs.logRequest(statusCode, req.method, req.url)
					})
					.catch((err) => _502(req, res, err));

				//if url is not matching to any rule
			}else if(_getParam('static.path')){

				//try to find and output static file
				_outputFileData((_getParam('static.path') + req.url), req, res)
					.then((fileData) => res.send(fileData))
					.catch((err) => _404(req, res));
			}else{
				_404(req, res);
			}
		});
}

/* Mediators */

/**
 * Add mediator
 * @param mediator {function} Mediator function
 * @returns {Gerkon}
 */
function mediator(mediator){
	if(typeof mediator === 'function'){
		if(mediator.length > 2){
			mediator = _wrapAsync(mediator);
		}

		mediators.push(mediator);
	}

	return this;
}

/**
 * Run all connected mediators
 * @param req {object} Req object
 * @param res {object} Res object
 * @returns {*}
 * @private
 */
function _runMediators(req, res){
	var max = mediators.length,
		i;

	return Seenk(function*(){
		for(i = 0; i < max; i++){
			yield mediators[ i ](req, res);
		}
	});
}

/* END: Mediators */


/* Params */

/**
 * Overwrite config
 * @param newConfig {object} New config
 * @returns {Gerkon}
 */
function setConfig(newConfig){
	(typeof newConfig === 'object') && (config = newConfig);

	return this;
}

/**
 * Set config param
 * @param paramName {string} Param name
 * @param paramValue {*} Param value
 */
function _setParam(paramName, paramValue){
	config[ paramName ] = paramValue;
}

/**
 * Get config param value
 * @param paramName {string} Param name
 * @returns {*}
 */
function _getParam(paramName){
	return config[ paramName ];
}

/**
 * Param getter/setter
 * @param paramName {string} Param name you want to get/set
 * @param paramValue {*|undefined} Param value for using as setter
 * @returns {*}
 */
function param(paramName, paramValue){

	//param value provided
	if(typeof paramValue !== 'undefined'){

		//set it
		_setParam(paramName, paramValue);

		//return this for chaining
		return this;
	}

	//if value is not provided just return param current value
	return _getParam(paramName);
}

/* END: Params */

/**
 * Prints Gerkon logo if config param showLogo is true
 * @private
 */
function _printLogo(){
	var logo =
`           \_________________  __   ____________      __
  ------- \/ _____/ ____/ _  \\/ / _/_/ ___  /   |    / /
    ---- \/ \/ ___/ /__ / /_/ / /_/_// /  / / /| |   / /
 ------ \/ / /  / ___//    _/  __ \\/ /  / / / | |  / /
  ---- / /__/ / /___/  \\ \\/ /  / / /__/ / /  | | / /
------ \\\_____/_____/__/__/_/  /_/______/ /   | |/ /
\_\_______________________________________/    |___/
`;
	console.log(chalk.green(logo));
}

module.exports = Gerkon;