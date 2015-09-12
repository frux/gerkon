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

    /**
     * Sends an http code and optionally some data
     * @param code {number} Http code to send
     * @param data {*|undefined} Data to send with code. For example code explanation.
     */
    res.sendCode = function(code, data){

        //code nust be a number
        if(!isNaN(code)){

            //write code to the head
            this.writeHead(code);

            //if data is provided send it
            this.write(data);

            //close connection
            this.end();
        }
    };

    /**
     * Sends redirection header
     * @param location {string} Url server should redirects to
     * @param code {number} Http redirect status code
     */
    res.redirect = function(location, code){

        //if specified as string
        if(typeof location === 'string'){

            //if redirection code is wrong sends teporary redirect code (302)
            if(isNaN(code) || code < 300 || code >= 400){
                code = 302;
            }

            //write code and url to the header
            this.writeHead(code, { 'Location': location });

            //close connection
            this.end();
        }
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