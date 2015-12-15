const assert = require('assert');
const Gerkon = require('../');
const got = require('got');

describe('Initialization', () => {

	it('should init w/o specified port number', done => {
		Gerkon.reset();

		return Gerkon
			.param('logo', true)
			.init()
			.then(() => {
				assert.equal(Gerkon.param('port'), 8080);
				done();
			});
	});

	it('should init with specified port number', done => {
		Gerkon.reset();

		return Gerkon
			.param('port', 3163)
			.init()
			.then(() => {
				assert.equal(Gerkon.param('port'), 3163);
				done();
			});
	});

	it('should set config', () => {
		Gerkon.reset();

		Gerkon.setConfig({
			foo: 'bar',
			test: true
		});

		return assert.equal(Gerkon.param('foo'), 'bar');
	});
});

describe('Routing', () => {
	it('should add a route (2 args)', done => {
		Gerkon.reset();

		return Gerkon
			.route('/test1', () => {})
			.init()
			.then(() => {
				assert.equal(Gerkon.getRoutes()[0], '/test1');
				done();
			});
	});

	it('should add a route (3 args, methods as array)', done => {
		Gerkon.reset();

		return Gerkon
			.route([ 'GET', 'POST' ], '/test1', () => {})
			.init()
			.then(() => {
				assert.equal(Gerkon.getRoutes()[0], '/test1');
				done();
			});
	});

	it('should add a route (3 args, method as string)', done => {
		Gerkon.reset();

		return Gerkon
			.route('GET', '/test1', () => {})
			.init()
			.then(() => {
				assert.equal(Gerkon.getRoutes()[0], '/test1');
				done();
			});
	});

	it('should throw error (rule is not a string)', done => {
		Gerkon.reset();

		assert.throws(() => Gerkon.route(true, () => {}), Error);
		done();
	});

	it('should accept array of controllers', done => {
		Gerkon.reset();

		return Gerkon
			.route('GET', '/test1', [ function(){}, function(){} ])
			.init()
			.then(() => {
				assert.equal(Gerkon.getRoutes()[0], '/test1');
				done();
			});
	});

	it('should throw error (try to add existing rule)', done => {
		Gerkon.reset();

		Gerkon.route('/test1', () => {});

		assert.throws(() => Gerkon.route('/test1', () => {}), Error);
		done();
	});

	it('should throw error (wrong controller)', done => {
		Gerkon.reset();

		assert.throws(() => Gerkon.route('/test1', 'rerhrherh'), Error);
		done();
	});


	it('should support sync controller', done => {
		Gerkon.reset();

		return Gerkon
			.route('/test1', function(req, res){})
			.init()
			.then(() => {
				assert.equal(Gerkon.getRoutes()[0], '/test1');
				done();
			});
	});

	it('should support async controller', done => {
		Gerkon.reset();

		return Gerkon
			.route('/test1', function(req, res, next){})
			.init()
			.then(() => {
				assert.equal(Gerkon.getRoutes()[0], '/test1');
				done();
			});
	});
});

describe('Route rules', () => {
	const testRule = function(rule, location, expected, callback){
		return function(done){
			Gerkon.reset();
			Gerkon.param('port', 3163)
				.route(rule, callback)
				.init()
				.then(() => {
					return got(`http://localhost:3163${location}`);
				})
				.then(res => {
					assert.equal(res.body, expected);
					done();
				})
		};
	};

	it('should handle `optional` rule w/o optional part', testRule(
			'/optional{/test}',
			'/optional',
			'optional',
			(req, res) => res.send('optional')
	));

	it('should handle `optional` rule with optional part', testRule(
			'/optional{/test}',
			'/optional/test',
			'optional',
			(req, res) => res.send('optional')
	));

	it('should handle `asterisk` rule', testRule(
			'/asterisk/*',
			'/asterisk/something',
			'asterisk',
			(req, res) => res.send('asterisk')
	));

	it('should handle `params` rule', testRule(
			'/params/<param1>/<param2>',
			'/params/foo/bar',
			'foobar',
			(req, res) => res.send(`${req.params.param1}${req.params.param2}`)
	));

	it('should handle `404` rule', testRule(
			'*',
			'/undefined_url',
			'404notfound',
			(req, res) => res.send('404notfound')
	));
});

describe('Static files', () => {
	it('should read static file', done => {
		Gerkon.reset();
		Gerkon.param('port', 3163)
			.param('static.path', __dirname)
			.init()
			.then(() => {
				return got('http://localhost:3163/staticFileReading.test');
			})
			.then(res => {
				assert.equal(res.body, 'ok');
				done();
			})
	});
});


describe('Error pages', () => {
	it('should send 404', done => {
		Gerkon.reset();
		Gerkon.param('port', 3163)
			.param('static.path', __dirname)
			.init()
			.then(() => {
				return got('http://localhost:3163/something');
			})
			.catch(err => {
				assert.equal(err.statusCode, 404);
				done();
			});
	});



	it('should send 502', done => {
		Gerkon.reset();
		Gerkon.param('port', 3163)
			.route('/error', (req, res) => { res.send(somethingWrong); })
			.init()
			.then(() => {
				return got('http://localhost:3163/error');
			})
			.catch(err => {
				assert.equal(err.statusCode, 502);
				done();
			});
	});
});

describe('Middlewares', () => {
	it('should run middleware', () => {
		Gerkon.reset();
		Gerkon.param('port', 3163)
			.mediator((req, res) => {
				req.foo = 'bar';
			})
			.route('/middleware', (req, res) => { res.send(req.foo); })
			.init()
			.then(() => {
				return got('http://localhost:3163/middleware');
			})
			.then(res => {
				assert.equal(res.body, 'bar');
				done();
			});
	});
});

describe('Logs', () => {
	const Logs = require('../logs.js');
	const consoleLogBackup = global.console.log;

	it('should output logs', () => {
		global.console.log = function(){};
		Logs.enable();
		Logs.info('test');
		Logs.error('test');
		Logs.warn('test');
		Logs.log('test');
		Logs.print('test');
		Logs.logRequest(200, 'POST', '/');
		Logs.logRequest(404, 'GET', '/');
		Logs.logRequest(302, 'DELETE', '/');
		Logs.logRequest(502, 'PUT', '/');
		global.console.log = consoleLogBackup.bind(global.console);
	});

	it('should output logs in JSON format', () => {
		global.console.log = function(){};
		Logs.enable('json');
		Logs.info('test');
		Logs.error('test');
		Logs.warn('test');
		Logs.log('test');
		Logs.print('test');
		Logs.logRequest(200, 'POST', '/');
		Logs.logRequest(404, 'GET', '/');
		Logs.logRequest(302, 'DELETE', '/');
		Logs.logRequest(502, 'PUT', '/');
		global.console.log = consoleLogBackup.bind(global.console);
	});
});

describe('Misc', () => {
	it('should redirect', done => {
		Gerkon.reset();
		Gerkon.param('port', 3163)
				.route('/redirect', (req, res) => { res.redirect('/redirected', 302); })
				.route('/redirected', (req, res) => { res.send('redirected'); })
				.init()
				.then(() => {
					return got('http://localhost:3163/redirect');
				})
				.then(res => {
					assert.equal(res.body, 'redirected');
					done();
				});
	});


	it('should send file', done => {
		Gerkon.reset();
		Gerkon.param('port', 3163)
				.route('/get-file', (req, res) => res.sendFile(`${__dirname}/./staticFileReading.test`))
				.init()
				.then(() => {
					return got('http://localhost:3163/get-file');
				})
				.then(res => {
					assert.equal(res.body, 'ok');
					done();
				});
	});
});