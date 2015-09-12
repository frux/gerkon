var assert = require('assert'),
    Gerkon = require('../index'),
    got = require('got');

describe('General tests', function(){
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
});

describe('Server', function(){
    describe('Initialization', function(){
        it('Gerkon.init should start server and render "ok" on url /test1', function(done){

            //define port
            Gerkon.param('port', 31631)

                //define test route
                .route('/test1', function(req, res){

                    //just send "ok"
                    res.send('ok');
                });

            //start server
            Gerkon.init(function(){

                //send request to our server
                got('localhost:31631/test1', function(err, data, res){

                    //if server answers "ok"
                    if(data === 'ok'){
                        done();
                    }
                });
            });
        });
    });
});