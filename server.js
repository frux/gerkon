/**
 * Gerkon server module
 */
module.exports = function(Gerkon){
    var http = require('http'),
        fs = require('fs'),
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
                if(typeof data === 'string'){
                    this.write(data);
                }

                //close connection
                this.end();
            }
        };

        /**
         * Sends file content
         * @param path {string} Absolute file path
         * @param mime {string|undefined} File mime-type
         * @param callback
         */
        res.sendFile = function(path, mime, callback){

            if(typeof path === 'string'){
                //if all arguments provided
                if(arguments.length === 3){

                    //default mime-type is plain/text
                    mime = mime || 'plain/text';

                    //if one parameter skipped
                }else if(arguments.length === 2){

                    //if second argument is function
                    if(typeof mime === 'function'){

                        //set mime-type to default
                        callback = mime;
                        mime = 'plain/text';
                    }
                }

                //try to read file
                fs.readFile(path, (function(err, data){

                    //if no errors
                    if(!err){

                        //add header
                        this.writeHead(200, { 'Content-type': mime });

                        //write file content
                        this.write(data);

                        //close connection
                        this.end();
                    }

                    (callback || function(){})(err, data);
                }).bind(this));
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
    function startListen(requestHandler){
        var port = Gerkon.param('port');

        //throw error if port is not specified
        if(isNaN(port)){
            throw Logs.error('Port is not specified');
        }

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

    return Server;
};