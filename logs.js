/**
 * Logs output module for Gerkon
 */
module.exports = function(Gerkon){
    var chalk = require('chalk'),
        Logs;

    /**
     * Outputs text to the console
     * @param text {string} Text to output to the console
     */
    function print(text){

        if(!Gerkon.param('logs.disabled')){

            //output time at the start of the console string
            text = chalk.gray(_getTime()) + ' ' + text;

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
            this.print(chalk.blue.inverse('INFO') + '    ' + text);
        },
        warn: function(text){
            this.print(chalk.yellow.inverse('WARN') + '    ' + text);
        },
        error: function(text){
            this.print(chalk.red.inverse('ERROR') + '   ' + text);
            return Error(text);
        },
        log: function(text){
            this.print(text);
        },
        verbose: function(text){
            this.print(chalk.magenta.inverse('VERBOSE') + ' ' + text);
        }
    };

    return Logs;
};