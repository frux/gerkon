/**
 * Logs output module for Gerkon
 */
module.exports = function(Gerkon){
    var chalk = require('chalk'),
        Logs;

    /**
     * Outputs text to the console
     * @param level {string|undefined} Level of logs to output. Default is a log
     * @param text {string} Text to output to the console
     */
    function print(level, text){
        level = level || 'log';

        //if config param enableLogs is true and logLevel is a registered level of logs
        if(Gerkon.param('logs.enabled') && Gerkon.param('logs.levels').indexOf(level) > -1){

            //if timestamp parameter is true
            if(Gerkon.param('logs.timestamp')){

                //output time at the start of the console string
                text = chalk.gray(_getTime()) + ' ' + text;
            }

            //output it
            console.log(text);
        }
    }

    /**
     * Returns current time for timestamp displaying
     * @returns {string}
     * @private
     */
    function _getTime(){
        var currentDate = new Date(),
            hours       = currentDate.getHours(),
            minutes     = currentDate.getMinutes(),
            seconds     = currentDate.getSeconds();

        return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    Logs = {
        print: print,
        info: function(text){
            this.print('info', chalk.blue.inverse('INFO') + '    ' + text);
        },
        warn: function(text){
            this.print('warn', chalk.yellow.inverse('WARN') + '    ' + text);
        },
        error: function(text){
            this.print('error', chalk.red.inverse('ERROR') + '   ' + text);
            return Error(text);
        },
        log: function(text){
            this.print('log', text);
        },
        verbose: function(text){
            this.print('verbose', chalk.magenta.inverse('VERBOSE') + ' ' + text);
        }
    };

    return Logs;
};