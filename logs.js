var chalk = require('chalk'),
    Logs;

function print(level, text){
    level = level || 'info';

    if(this.enableLogs && (!(this.logLevel instanceof Array) || (this.logLevels.indexOf(level) > -1))){
        if(this.timestamp){
            text = chalk.gray(_getTime()) + ' ' + text;
        }
        console.log(text);
    }
}

function _getTime(){
    var currentDate = new Date(),
        hours = currentDate.getHours(),
        minutes = currentDate.getMinutes(),
        seconds = currentDate.getSeconds();

    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

Logs = {
    enableLogs: true,
    logLevels: [
        'info',
        'warn',
        'error',
        'log',
        'verbose'
    ],
    timestamp: true,
    print: print,
    info: function(text){ this.print('info', chalk.blue.inverse('INFO') + '    ' + text); },
    warn: function(text){ this.print('warn', chalk.yellow.inverse('WARN') + '    ' + text); },
    log: function(text){ this.print('log', text); },
    verbose: function(text){ this.print('verbose', chalk.magenta.inverse('VERBOSE') + ' ' + text); }
};

module.exports = Logs;