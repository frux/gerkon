'use strict';
/* glogal describe */

require('should');

const assert = require('assert'),
	got = require('got'),
	seenk = require('seenk'),
	Gerkon = require('../index'),
	HOST = 'http://localhost',
	portGenerator = (function* (startPort){
		while(true){
			yield startPort++;
		}
	})(3163),
	getPort = function(){
		return portGenerator.next().value;
	};

describe('Initialization', () => {
	it('should throws if port was not specified', () => {
		assert.throws(() => {
			(new Gerkon()).listen();
		});
	});
});

describe('Use cases', () => {
	it('should answers to ping', done => {
		const port = getPort(),
			url = `${HOST}:${port}/ping`,
			app = new Gerkon();

		seenk(function*(){
			app.route('get', '/ping', (req, res) => {
				res.end('ok');
			}).listen(port);

			(yield got(url)).body.should.eql('ok');

			app.stop();
			done();
		});
	});
});

describe('Routing rules parsing', () => {
	it('simple rule', () => {
		Gerkon.match('/simple/route', '/simple/route').should.be.ok();
		Gerkon.match('/simple/route', '/simple/route/').should.not.be.ok();
	});

	it('rule with optional parts', () => {
		Gerkon.match('/simple{/route}', '/simple/route').should.be.ok();
		Gerkon.match('/simple{/route}', '/simple').should.be.ok();
		Gerkon.match('/simple{/route}', '/simple/').should.not.be.ok();
	});

	it('rule with any symbols', () => {
		Gerkon.match('/test*', '/testimonials').should.be.ok();
		Gerkon.match('/test*', '/test').should.be.ok();
		Gerkon.match('/test*', '/test123').should.be.ok();
		Gerkon.match('/test*', '/test*').should.be.ok();
		Gerkon.match('/test*', '/tes').should.not.be.ok();
	});

	it('rule with params', () => {
		Gerkon.match('/<param1>/<param2>', '/1/2').should.be.ok();
		Gerkon.match('/<param1>/<param2>', '/foo/bar').should.be.ok();
		Gerkon.match('/<param1>#<param2>', '/foo#bar').should.be.ok();
		Gerkon.match('/<param1>/<param2>', '/foo/_/bar').should.not.be.ok();
	});

	it('complex rule', () => {
		Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux/1234').should.be.ok();
		Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/optional/frux/1234').should.be.ok();
		Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux/1234/').should.be.ok();
		Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux/1234/some_more/url').should.be.ok();
		Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux').should.not.be.ok();
		Gerkon.match('/test{/optional}/<userName>/<password>*', '/test').should.not.be.ok();
	});

	it('should check matching to regexp', () => {
		Gerkon.match(/\/test/, '/test').should.be.ok();
	});

	it('should throws if rule is neither string nor regexp', () => {
		assert.throws(() => Gerkon.match([], '/test'));
	});
});

describe('Routing', () => {
	it('should throws if rule was not specified', () => {
		assert.throws(() => {
			(new Gerkon()).route('get');
		});
	});

	it('should throws if rule is not a string', () => {
		assert.throws(() => {
			(new Gerkon()).route('get', []);
		});
	});

	it('should throws if controllers was not specified', () => {
		assert.throws(() => {
			(new Gerkon()).route('get', '/');
		});
	});

	it('should throws if controllers neither function nor array', () => {
		assert.throws(() => {
			(new Gerkon()).route('get', '/', true);
		});
	});

	it('should throws if method neither string nor array', () => {
		assert.throws(() => {
			(new Gerkon()).route({}, '/', () => {});
		});
	});

	it('should throws if method is not a vaild request method', () => {
		assert.throws(() => {
			(new Gerkon()).route('foo', '/', () => {});
		});
	});

	it('should throws if route already exists', () => {
		assert.throws(() => {
			(new Gerkon())
			.route('get', '/', () => {})
			.route('get', '/', () => {});
		});
	});

	it('should adds route GET method', () => {
		const app = new Gerkon();

		app.get('/', () => {});
		app.getRoutes('get').length.should.eql(1);
		app.getRoutes('post').length.should.eql(0);
		app.getRoutes('put').length.should.eql(0);
		app.getRoutes('delete').length.should.eql(0);
		app.getRoutes('head').length.should.eql(0);
		app.getRoutes('patch').length.should.eql(0);
		app.getRoutes('options').length.should.eql(0);
	});

	it('should adds route POST method', () => {
		const app = new Gerkon();

		app.post('/', () => {});
		app.getRoutes('get').length.should.eql(0);
		app.getRoutes('post').length.should.eql(1);
		app.getRoutes('put').length.should.eql(0);
		app.getRoutes('delete').length.should.eql(0);
		app.getRoutes('head').length.should.eql(0);
		app.getRoutes('patch').length.should.eql(0);
		app.getRoutes('options').length.should.eql(0);
	});

	it('should adds routes for all request methods if not specified', () => {
		const app = new Gerkon();

		app.route('/', () => {});
		app.getRoutes('get').length.should.eql(1);
		app.getRoutes('post').length.should.eql(1);
		app.getRoutes('put').length.should.eql(1);
		app.getRoutes('delete').length.should.eql(1);
		app.getRoutes('head').length.should.eql(1);
		app.getRoutes('patch').length.should.eql(1);
		app.getRoutes('options').length.should.eql(1);
	});

	it('should adds a route for each specified request method', () => {
		const app = new Gerkon();

		app.route(['get', 'post', 'put', 'patch'], '/', () => {});
		app.getRoutes('get').length.should.eql(1);
		app.getRoutes('post').length.should.eql(1);
		app.getRoutes('put').length.should.eql(1);
		app.getRoutes('delete').length.should.eql(0);
		app.getRoutes('head').length.should.eql(0);
		app.getRoutes('patch').length.should.eql(1);
		app.getRoutes('options').length.should.eql(0);
	});

	it('should returns empty array if requested invalid method', () => {
		(new Gerkon()).getRoutes('foo').should.eql([]);
	});

	it('should parse params from url', done => {
		const port = getPort(),
			url = `${HOST}:${port}/bar/1234`,
			app = new Gerkon();

		app
			.get('/<foo>/<id>', req => {
				req.params.foo.should.eql('bar');
				req.params.id.should.eql('1234');
				app.stop();
				done();
			})
			.listen(port);
		got(url);
	});
});

describe('Requests', () => {
	it('should answer 404 if route was not found', done => {
		const port = getPort(),
			url = `${HOST}:${port}/not`,
			app = new Gerkon();

		app.listen(port);
		got(url).catch(err => {
			app.stop();
			err.statusCode.should.eql(404);
			done();
		});
	});

	it('should answer 502 if controller invoke error', done => {
		const port = getPort(),
			url = `${HOST}:${port}/error`,
			app = new Gerkon();

		app
			.get('/error', () => {
				throw Error('Error imitation');
			})
			.listen(port);
		got(url).catch(err => {
			app.stop();
			err.statusCode.should.eql(502);
			done();
		});
	});
});

describe('Controllers', () => {
	it('should be running syncronously', done => {
		const port = getPort(),
			url = `${HOST}:${port}/data`,
			app = new Gerkon();

		app.get('/async', [
			function(req, res, next){
				got(url)
					.then(response => {
						req.testData = JSON.parse(response.body);
						setTimeout(() => next(), 500);
					})
					.catch(err => console.log(err));
			},
			function(req){
				req.testData.foo.should.eql('bar');
				app.stop();
				return done();
			}
		])
		.get('/data', (req, res) => res.end(JSON.stringify({foo: 'bar'})))
		.listen(port);

		got(`${HOST}:${port}/async`).catch(err => console.log(err));
	});
});

describe('Middleware', () => {
	it('should adds sync middleware', () => {
		(new Gerkon()).use((req, res) => {
			req.should.be.ok();
			res.should.be.ok();
		});
	});

	it('should adds async middleware', () => {
		(new Gerkon()).use((req, res, next) => {
			req.should.be.ok();
			res.should.be.ok();
			return next();
		});
	});

	it('next should resolves middleware', done => {
		const port = getPort(),
			path = '/async_mw',
			url = `${HOST}:${port}${path}`,
			app = new Gerkon();

		app
			.use((req, res, next) => {
				next().should.be.instanceof(Promise);
				done();
			})
			.listen(port);
		got(url);
	});

	it('should throws if middleware is not a function', () => {
		assert.throws(() => {
			(new Gerkon()).use('not a function');
		});
	});
});

describe('General', () => {
	it('shouldn\'t throws if user tries to stop not running app', () => {
		(new Gerkon()).stop();
	});
});
