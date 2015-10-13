/**
 * Gerkon
 * @version 0.0.1
 */

var Gerkon = {
        init: init,
        route: addRoute,
        setConfig: setConfig,
        param: param
    },
    Server = require('./server')(Gerkon),
    Events = require('./events')(Gerkon),
    Logs = require('./logs')(Gerkon),
    chalk = require('chalk'),
    fs = require('fs'),
    Seenk = require('seenk'),
    config = {},
    routes = {},
    profilingStartTime;

/**
 * Inititalize Gerkon
 * @returns {Gerkon}
 */
function init(callback){

    //if callback specified register it
    if(typeof callback === 'function'){
        Events.on('ready', callback);
    }

    //start the server
    Server.start(function(req, res){

        //handle request
        _onRequest(req, res);
    });

    //show Gerkon logo
    getParam('logo') && _printLogo();

    Logs.info('Gerkon starts to listen on ' + chalk.blue('localhost:' + getParam('port')));

    //fire server ready event
    Events.trigger('ready', {});

    return this;
}

/* Routing */

/**
 * Add route
 * @param method {string|Array|undefined} Available request method or methods
 * @param rule {string} Route`s rule
 * @param controllers {function|Array} Route controller or array of controllers
 * @returns {Gerkon}
 */
function addRoute(method, rule, controllers){
    var methods,
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

    //if rule is a string
    if(typeof rule === 'string'){

        if(typeof controllers === 'function'){
            controllers = [controllers];
        }

        if(controllers instanceof Array){

            controllers = controllers.map(function(controller){
                return (controller.length > 2 ? _wrapController(controller) : controller);
            });

            // escape "?" symbol
            rule = rule.replace('?', '\?');

            // handle optional symbols {}
            rule = rule.replace(/\{(.*)\}/g, '(?:$1){0,1}');

            //handle "Any" symbol "*"
            rule = rule.replace('*', '\\S{0,}');

            //find all params in url template
            paramsNames = rule.match(/\<([a-zA-Z0-9\_\-]{1,})\>/g) || [];

            //handle params "catching"
            rule = rule.replace(/\<([a-zA-Z0-9\_\-]{1,})\>/g, '([^\/]{1,})');

            //escape "/" symbol
            rule = rule.replace(/\//g, '\\/');

            //if the same route is not exists
            if(!routes[rule]){

                //construct it
                routes[rule] = {
                    controllers: controllers,
                    paramsNames: [],
                    methods: methods
                };

                //if there are params in template was found
                if(paramsNames){

                    //remember list of parameters names
                    routes[rule].paramsNames = paramsNames.map(function(param){

                        //RegExp found parameters names wrapped in <>. Remove brackets.
                        return param.substr(1, param.length - 2);
                    });
                }

                //if the same route is exists throw error
            }else throw Logs.error('Route already exists (' + rule + ')');
        }
    }

    return this;
}

/**
 * Wrap controller into async function returning Promise
 * @param controller {function} Controller function
 * @returns {function}
 * @private
 */
function _wrapController(controller){
    if(typeof controller !== 'function'){
        return;
    }

    return function(req, res){
        return new Promise(function(resolve, reject){
            controller(req, res, resolve);
        });
    };
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

    for(var rule in routes){
        if(routes.hasOwnProperty(rule)){

            //url match to the rule
            regExpPassed = (new RegExp('^' + rule + '$', 'ig').test(path));

            //request method accepted by this rule
            methodAccepted = (routes[rule].methods.indexOf(method.toUpperCase()) > -1);

            //rule is not a just asterisk (*)
            notAsterisk = (rule !== '\\S{0,}');

            //if this rule pass all conditions return it
            if(regExpPassed && methodAccepted && notAsterisk){
                return rule;
            }
        }
    }
}

/**
 * Extract params values from path by specified rule
 * @param path {string} Path
 * @param rule {string} Rule
 * @returns {object}
 * @private
 */
function _parseParams(path, rule){
    var params = {},

        //get route of this rule
        route = routes[rule],
        max = route.paramsNames.length,
        i,
        parsedParams;

    //if this rule have params
    if(max){

        //extract params from path
        parsedParams = (new RegExp('^' + rule + '$', 'ig')).exec(path);

        //if params extracted
        if(parsedParams){

            //delete first value
            parsedParams.shift();

            //assign each param value to its name
            for(i = 0; i < max; i++){
                params[route.paramsNames[i]] = parsedParams[i];
            }
        }
    }

    return params;
}

/**
 * Run route controller
 * @param rule {string} Route rule
 * @param req {object} Request object
 * @param res {object} Response object
 * @private
 */
function _handleRoute(rule, req, res){
    var controllers = routes[rule].controllers,
        max = controllers.length,
        i;
    //parse params from path
    req.params = _parseParams(req.url, rule);

    return Seenk(function*(){
        for(i = 0; i < max; i++){
            yield controllers[i](req, res);
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
 * @param req {object} Requset object
 * @param res {object} Response object
 * @returns {Promise}
 * @private
 */
function _404(req, res){
    return new Promise(function(resolve, reject){

        //if asterisk route defined
        if(routes['\\S{0,}']){

            //run handling asterisk
            _handleRoute('\\S{0,}', req, res)
                .then(function(){
                    resolve(404);
                });

            //if asterisk route is not defined send 404
        }else{
            res.sendCode(404, 'Error 404. The requested page is not found.');
            res.statusCode = 404;
            resolve(404);
        }
    });
}

/**
 * Output log of request
 * @param statusCode {number} Request status code
 * @param log {string} Log string
 * @private
 */
function _logRequest(statusCode, log){

    log += ' ' + _stopProfiling() + 'ms';

    //choose color in order to status code
    if(statusCode >= 400){
        logColor = 'red';
    }else if(statusCode >= 300){
        logColor = 'yellow';
    }else{
        logColor = 'green';
    }

    //output log
    Logs.log(chalk[logColor](statusCode) + ' ' + log);
}

/* END: Routing */

/**
 * Handles every request
 * @param req {object} Request object
 * @param res {object} Response object
 * @private
 */
function _onRequest(req, res){
    _startProfiling();

    //get a rule for path
    var rule = _getRuleForPath(req.url, req.method),
        log = req.method + ' ' + req.url,
        logColor;

    //if url matches to any rule
    if(rule){

        //run handling of this route
        _handleRoute(rule, req, res)
            .then(function(){
                //output log
                _logRequest(res.statusCode, log);
            });

    //if url is not matching to any rule
    }else if(getParam('static.path')){

        //try to find and output static file
        _outputFileData((getParam('static.path') + req.url), req, res)
            .then(function(fileData){
                res.send(fileData);
            })
            .catch(function(err){
                _404(req, res)
                    .then(function(){

                        //output log
                        _logRequest(res.statusCode, log);
                    });
            });
    }else{
        _404(req, res)
            .then(function(){

                //output log
                _logRequest(res.statusCode, log);
            });
    }
}

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
function setParam(paramName, paramValue){
    config[paramName] = paramValue;
}

/**
 * Get config param value
 * @param paramName {string} Param name
 * @returns {*}
 */
function getParam(paramName){
    return config[paramName];
}

/**
 * Param getter/setter
 * @param paramName {string} Param name you want to get/set
 * @param paramValue {*|undefined} Param value for using as setter
 * @returns {*}
 */
function param(paramName, paramValue){

    //param value provided
    if(paramValue){

        //set it
        setParam(paramName, paramValue);

        //return this for chaining
        return this;

    //if value is not provided
    }else{

        //just return param current value
        return getParam(paramName);
    }
}

/* END: Params */

/* Profiling */
/**
 * Remembers time of profiling start
 * @private
 */
function _startProfiling(){
    profilingStartTime = +new Date;
}

/**
 * Compare current and start time and return the differing
 * @private
 */
function _stopProfiling(){
    return +new Date - profilingStartTime;
}

/**
 * Prints Gerkon logo if config param showLogo is true
 * @private
 */
function _printLogo(){
    var logo =  '           _________________  __   ____________      __  \n' +
                '  ------- / _____/ ____/ _  \\/ / _/_/ ___  /   |    / / \n' +
                '    ---- / / ___/ /__ / /_/ / /_/_// /  / / /| |   / / \n' +
                ' ------ / / /  / ___//    _/  __ \\/ /  / / / | |  / /   \n' +
                '  ---- / /__/ / /___/  \\ \\/ /  / / /__/ / /  | | / /    \n' +
                '------ \\_____/_____/__/__/_/  /_/______/ /   | |/ /     \n'+
                '________________________________________/    |___/ \n';

    console.log(chalk.green(logo));
}

module.exports = Gerkon;