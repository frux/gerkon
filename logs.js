'use strict';
/**
 * Logs output module for Gerkon
 */

const chalk = require('chalk');
const logLevels = {
	INFO: { color: 'blue', prefix: '', suffix: ' ' },
	WARN: { color: 'yellow', prefix: '', suffix: ' ' },
	ERROR: { color: 'red', prefix: '', suffix: '' },
	NONE: { color: 'gray', prefix: '', suffix: ' '}
};
let logsMode = false, //'string' or 'json' === enabled, false === disabled
    profilingStartTime;

/**
 * Returns current time for timestamp displaying
 * @returns {string}
 * @private
 */
function _getTime(){

	if(logsMode === 'json'){
		return (new Date).toJSON();
	}else if(logsMode === 'string'){

		//get current date
		const currentDate = new Date();

		//get hours
		const hours = currentDate.getHours();

		//get minutes
		const minutes = currentDate.getMinutes();

		//get seconds
		const seconds = currentDate.getSeconds();

		//build time string
		return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
	}
}

/**
 * Outputs text to the console
 * @param levelName {string} Name of log level
 * @param text {string} Text to output to the console
 */
function print(levelName, text){
	if(logsMode === 'json'){
		console.log(JSON.stringify({name: 'LOG', time: _getTime(), level: levelName, text: text}));
	}else if(logsMode === 'string'){
		if(!logLevels.hasOwnProperty(levelName)){
			levelName = 'NONE';
		}

		const level = logLevels[levelName];

		console.log(`${_getTime()} ${level.prefix}${chalk[level.color](levelName)}${level.suffix} ${text}`);
	}
}

/**
 * Output log of request
 * @param statusCode {number} Request status code
 * @param method {string} Request method
 * @param url {string} Request URL
 * @private
 */
function logRequest(statusCode, method, url){
	const responseTime = stopProfiling();
	let logColor,
	    sign;

	if(logsMode === 'json'){
		console.log(JSON.stringify({name: 'REQUEST', time: _getTime(), statusCode, responseTime, method, url}));
	}else if(logsMode === 'string'){

		//choose color in order to status code
		if(statusCode >= 500){
			logColor = 'red';
			sign = '✘ ';
		}else if(statusCode >= 300){
			logColor = 'yellow';
			sign = '● ';
		}else{
			logColor = 'green';
			sign = '✓ ';
		}

		//output log
		print('NONE', `${chalk[logColor](sign + statusCode)} ${method} ${url} ${responseTime}ms`);
	}
}

/* Profiling */
/**
 * Remembers time of profiling start
 * @private
 */
function startProfiling(){
	profilingStartTime = +new Date;
}

/**
 * Compare current and start time and return the differing
 * @private
 */
function stopProfiling(){
	return +new Date - profilingStartTime;
}

/**
 * Enables logging
 * @param mode {string} Logs format 'string' or 'json'. Default: 'string'
 */
function enable(mode){

	//no comments
	logsMode = (mode === 'json' ? 'json' : 'string');
}

/**
 * Disables logging
 */
function disable(){

	//no comments
	logsMode = false;
}

module.exports = {
	print,
	logRequest,
	startProfiling,
	stopProfiling,
	enable,
	disable,
	info: function(text){
		print('INFO', text);
	},
	warn: function(text){
		print('WARN', text);
	},
	log: function(text){
		print('NONE', text);
	},
	error: function(text){
		print('ERROR', text);
		return Error(text);
	}
};