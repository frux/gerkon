/**
 * Gerkon
 * @version 0.0.1
 */
var Server = require('./server'),
    Events = require('./events'),
    routes = {},
    Gerkon;

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

    //fire server ready event
    Events.trigger('ready', {});

    return this;
}

/**
 * Add route
 * @param method {string|Array|undefined} Available request method or methods
 * @param rule {string} Route`s rule
 * @param controller {function} Route controller
 * @returns {Gerkon}
 * @private
 */
function addRoute(method, rule, controller){
    var methods;

    //if method is not specified
    if(arguments.length === 2){

        //set all available methods
        methods = [ 'GET', 'POST', 'PUT', 'DELETE', 'HEAD' ];

        //and shift arguments
        controller = rule;
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

        if(typeof controller === 'function'){

            // escape "?" symbol
            rule = rule.replace('?', '\?');

            // handle optional symbols {}
            rule = rule.replace(/\{(.*)\}/g, '(?:$1){0,1}');

            //handle "Any" symbol "*"
            rule = rule.replace('*', '\\S{0,}');

            //find all params in url template
            paramsNames = rule.match(/\<([a-zA-Z]{1,})\>/g) || [];

            //handle params "catching"
            rule = rule.replace(/\<([a-zA-Z]{1,})\>/g, '([^\/]{1,})');

            //escape "/" symbol
            rule = rule.replace(/\//g, '\\/');

            //if the same route is not exists
            if(!routes[rule]){

                //construct it
                routes[rule] = {
                    controller: controller,
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
            }else throw Error('Route already exists (' + rule + ')');
        }
    }

    return this;
}

/**
 * Looks for rule matching the path
 * @param path {string} Path a rule should matches to
 * @returns {string}
 * @private
 */
function _getRuleForPath(path){

    //look every rule
    for(var rule in routes){

        //if this rule matches to our path return it
        if(routes.hasOwnProperty(rule) && (new RegExp('^' + rule + '$', 'ig').test(path))){
            return rule;
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
 * Handles every request
 * @param req {object} Request object
 * @param res {object} Response object
 * @private
 */
function _onRequest(req, res){

    //get a rule for path
    var rule = _getRuleForPath(req.url),
        route;

    //if rule is found
    if(rule){

        //get route of this rule
        route = routes[rule];

        //parse params from path
        req.params = _parseParams(req.url, rule);

        //void controller
        route.controller(req, res);
    }
}

Gerkon = {
    init: init,
    route: addRoute
};

module.exports = Gerkon;