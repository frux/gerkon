/**
 * Gerkon server module
 */

var http = require('http'),
    Server;

/**
 * Augment req object
 * @param req {object} Request object
 * @returns {object}
 */
function augmentRequestObject(req){
}

/**
 * Augment res object
 * @param res {object} Response object
 * @returns {object}
 */
function augmentResponseObject(res){

    /**
     * Send data
     * @param data {*} Data to send
     * @returns {object}
     */
    res.send = function(data){

        //send success code
        this.writeHead(200, { 'Content-type': 'text/plain' });

        //write data to response
        this.write(data);

        //send response
        this.end();

        return this;
    };
}

/**
 * Starts listen for request
 * @param requestHandler
 */
function startListen(port, requestHandler){

    //if handler is a function
    if(typeof requestHandler === 'function'){

        //create new server
        http.createServer(function(req, res){

            //augment req and res objects
            augmentRequestObject(req);
            augmentResponseObject(res);

            //handle request
            requestHandler(req, res);
        }).listen(port);
    }
}

Server = {
    start: startListen
};

module.exports = Server;