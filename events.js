/**
 * Gerkon universal events handling module
 */

var handlers = {},
    Events;

/**
 * Registers event handler
 * @param eventName {string} Event name
 * @param handler {function} Event handler
 */
function addListener(eventName, handler){

    //if event name is a string and handler is a funtion
    if(typeof eventName === 'string' && typeof handler === 'function'){

        //if another handlers of that event was added
        if(handlers[eventName] instanceof Array){

            //just add new handler to others
            handlers[eventName].push(handler);

        //if it's the first handler of that event
        }else{

            //register new event type and add handler
            handlers[eventName] = [ handler ];
        }
    }
}

/**
 * Fires event handlers
 * @param eventName {string} Event name
 * @param data {*} Data for handlers
 */
function trigger(eventName, data){

    //if this event is registered
    if(handlers[eventName]){

        //fire each handler
        handlers[eventName].forEach(function(handler){
            handler(eventName, data);
        });
    }
}

/**
 * Delete all event handlers
 * @param eventName {string} Event name
 */
function clearEvent(eventName){

    //if this event is registered
    if(handlers[eventName]){
        delete handlers[eventName];
    }
}

Events = {
    on: addListener,
    trigger: trigger,
    clear: clearEvent
};

module.exports = Events;