var assert = require('assert'),
    Gerkon = require('../index'),
    got = require('got');


describe('Configuring', function(){
    it('Gerkon.setConfig should overwrite new configs and return Gerkon', function(){
        assert.equal(Gerkon.setConfig({ param1: 'value1', param2: 2 }), Gerkon);
        assert.equal(Gerkon.param('param1'), 'value1');
        assert.equal(Gerkon.param('param2'), 2);
    });

    it('Gerkon.param should set param "foo" to "bar" and return Gerkon', function(){
        assert.equal(Gerkon.param('foo', 'bar'), Gerkon);
        assert.equal(Gerkon.param('foo'), 'bar');
    });

    it('Gerkon.param should return undefined if param was not set', function(){
        assert.equal(Gerkon.param('the.parameter.which.was.never.set'), undefined);
    });
});



describe('Initialization', function(){
    it('Gerkon.init should start server and render "ok" on url /test1', function(done){

        //define port
        Gerkon.param('port', 31631)
            .param('logs.disabled', true)

            //define test route
            .route('/test1', function(req, res){

                //just send "ok"
                res.send('ok');
            });

        //start server
        Gerkon.init(function(){

            //send request to our server
            got('localhost:31631/test1', function(err, data, res){

                //if server respond "ok"
                if(data === 'ok'){
                    done();
                }
            });
        });
    });
});

describe('Routing', function(){
    it('Routing should support chaining', function(){
        assert.equal(Gerkon.route('/routingtest/simple', function(req, res){
            res.send('ok');
        })
            .route('/routingtest/optional{/part}', function(req, res){
                res.send('ok');
            })
            .route(['POST'], '/routingtest/method', function(req, res){
                res.send('ok');
            })
            .route('/routingtest/params/<param1>/<param2>', function(req, res){
                res.send('ok' + req.params.param1 + req.params.param2);
            })
            .route('*', function(req, res){
                res.sendCode(404, 'Not found');
            }), Gerkon);
    });

    it('Simple route should respond', function(done){
        got('localhost:31631/routingtest/simple', function(err, data, res){
            if(data === 'ok'){
                done();
            }
        });
    });

    it('Optional part route should respond on both url', function(done){
        got('localhost:31631/routingtest/optional', function(err, data, res){
            if(data === 'ok'){
                done();
            }
        });
    });

    it('Optional part route should respond on both url', function(done){
        got('localhost:31631/routingtest/optional/part', function(err, data, res){
            if(data === 'ok'){
                done();
            }
        });
    });

    it('Method route should accept post request', function(done){
        got('localhost:31631/routingtest/method', { method: 'POST' }, function(err, data, res){
            if(data === 'ok'){
                done();
            }
        });
    });

    it('Method route shouldn\'t accept get request', function(done){
        got('localhost:31631/routingtest/method', function(err, data, res){
            if(data === 'Not found'){
                done();
            }
        });
    });

    it('Params route should parse params', function(done){
        got('localhost:31631/routingtest/params/value1/2', function(err, data, res){
            if(data === 'okvalue12'){
                done();
            }
        });
    });
});

describe('Multiple routing', function(){
    Gerkon.route('/multiple-routing', [
        function(req, res, next){
            res._dataToSend = '1';
            next();
        },
        function(req, res, next){
            res._dataToSend += '2';
            next();
        },
        function(req, res, next){
            res._dataToSend += '3';
            next();
        },
        function(req, res, next){
            res._dataToSend += '4';
            res.send(res._dataToSend);
        }
    ]);
    it('Should run all the provided handlers', function(done){
        got('localhost:31631/multiple-routing', function(err, data, res){
            if(data === '1234'){
                done();
            }
        });
    });
});

describe('Static files', function(){
    it('Should read file /staticFileReading.test', function(done){
        Gerkon.param('static.path', __dirname);
        got('localhost:31631/staticFileReading.test', function(err, data, res){
            if(data === 'ok'){
                done();
            }
        });
    })
});

describe('Mediators', function(){
    Gerkon
        .mediator(function(req, res){
            req.mediator1 = 'ok';
        })
        .mediator(function(req, res, next){
            setTimeout(function(){
                req.mediator2 = 'ok';
                next();
            }, 0);
        })
        .route('/mediators', function(req, res){
            res.send(req.mediator1 + req.mediator2);
        });

    it('Should output result of mediators', function(done){
        got('localhost:31631/mediators', function(err, data, res){
            if(data === 'okok'){
                done();
            }
        })
    });
});