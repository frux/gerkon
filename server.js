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
    return req;
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

    return res;
}

/**
 * Starts listen for request
 * @param requestHandler
 */
function startListen(requestHandler){

    //if handler is a function
    if(typeof requestHandler === 'function'){

        //create new server
        http.createServer(function(req, res){

            //augment req and res objects
            req = augmentResponseObject(req);
            res = augmentResponseObject(res);

            //handle request
            requestHandler(req, res);
        }).listen(8080);
    }
}

Server = {
    start: startListen
};

module.exports = Server;