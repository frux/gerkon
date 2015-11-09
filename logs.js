'use strict';
/**
 * Logs output module for Gerkon
 */

const chalk = require('chalk');
let logsEnabled = true,
    profilingStartTime;

/**
 * Returns current time for timestamp displaying
 * @returns {string}
 * @private
 */
function _getTime(){

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

/**
 * Outputs text to the console
 * @param text {string} Text to output to the console
 */
function print(text){
	if(logsEnabled){
		//output time at the start of the console string
		text = chalk.gray(_getTime()) + ' ' + text;

		//output it
		console.log(text);
	}
}

/**
 * Output log of request
 * @param statusCode {number} Request status code
 * @param log {string} Log string
 * @private
 */
function logRequest(statusCode, log){
	let logColor,
	    sign;

	log += `${stopProfiling()}ms`;

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
	this.log(`${chalk[ logColor ](sign + statusCode)} ${log}`);
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
 */
function enable(){

	//no comments
	logsEnabled = true;
}

/**
 * Disables logging
 */
function disable(){

	//no comments
	logsEnabled = false;
}

module.exports = {
	print,
	logRequest,
	startProfiling,
	stopProfiling,
	enable,
	disable,
	info: function(text){
		this.print(`${chalk.blue.inverse('INFO')}    ${text}`);
	},
	warn: function(text){
		this.print(`${chalk.yellow.inverse('WARN')}    ${text}`);
	},
	verbose: function(text){
		this.print(`${chalk.magenta.inverse('ERROR')}   ${text}`);
	},
	log: function(text){
		this.print(text);
	},
	error: function(text){
		console.log(`${chalk.red.inverse('ERROR')}   ${text}`);
		return Error(text);
	}
};