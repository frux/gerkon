'use strict';

const assert = require('assert'),
	should = require('should'),
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
			(new Gerkon).listen();
		});
	});
});

describe('Use cases', () => {
	it('should answers to ping', done => {
		const port = getPort();
		const url = `${HOST}:${port}/ping`;
		const app = new Gerkon;
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
			(new Gerkon).route('get');
		});
	});

	it('should throws if rule is not a string', () => {
		assert.throws(() => {
			(new Gerkon).route('get', []);
		});
	});

	it('should throws if controllers was not specified', () => {
		assert.throws(() => {
			(new Gerkon).route('get', '/');
		});
	});

	it('should throws if controllers neither function nor array', () => {
		assert.throws(() => {
			(new Gerkon).route('get');
		});
	});

	it('should throws if method neither string nor array', () => {
		assert.throws(() => {
			(new Gerkon).route({}, '/', () => {});
		});
	});

	it('should throws if method is not a vaild request method', () => {
		assert.throws(() => {
			(new Gerkon).route('foo', '/', () => {});
		});
	});

	it('should throws if route already exists', () => {
		assert.throws(() => {
			(new Gerkon)
			.route('get', '/', () => {})
			.route('get', '/', () => {});
		});
	});

	it('should adds route GET method', () => {
		const app = new Gerkon;

		app.get('/', () => {});
		app.getRoutes('get').length.should.eql(1);
		app.getRoutes('post').length.should.eql(0);
		app.getRoutes('put').length.should.eql(0);
		app.getRoutes('delete').length.should.eql(0);
		app.getRoutes('head').length.should.eql(0);
	});

	it('should adds route POST method', () => {
		const app = new Gerkon;

		app.post('/', () => {});
		app.getRoutes('get').length.should.eql(0);
		app.getRoutes('post').length.should.eql(1);
		app.getRoutes('put').length.should.eql(0);
		app.getRoutes('delete').length.should.eql(0);
		app.getRoutes('head').length.should.eql(0);
	});

	it('should adds routes for all request methods if not specified', () => {
		const app = new Gerkon;

		app.route('/', () => {});
		app.getRoutes('get').length.should.eql(1);
		app.getRoutes('post').length.should.eql(1);
		app.getRoutes('put').length.should.eql(1);
		app.getRoutes('delete').length.should.eql(1);
		app.getRoutes('head').length.should.eql(1);
	});

	it('should adds a route for each specified request method', () => {
		const app = new Gerkon;

		app.route(['get', 'post', 'put'], '/', (req, res, next) => {});
		app.getRoutes('get').length.should.eql(1);
		app.getRoutes('post').length.should.eql(1);
		app.getRoutes('put').length.should.eql(1);
		app.getRoutes('delete').length.should.eql(0);
		app.getRoutes('head').length.should.eql(0);
	});

	it('should returns empty array if requested invalid method', () => {
		(new Gerkon).getRoutes('foo').should.eql([]);
	});

	it('should parse params from url', done => {
		const port = getPort();
		const url = `${HOST}:${port}/bar/1234`;
		const app = new Gerkon;
		app
			.get('/<foo>/<id>', (req, res) => {
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
		const port = getPort();
		const url = `${HOST}:${port}/not`;
		const app = new Gerkon;
		app.listen(port);
		got(url).catch(err => {
				app.stop();
				err.statusCode.should.eql(404);
				done();
			});
	});

	it('should answer 502 if controller invoke error', done => {
		const port = getPort();
		const url = `${HOST}:${port}/error`;
		const app = new Gerkon;
		app
			.get('/error', (req, res) => { res.send(notExistedVariable); })
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
		const port = getPort();
		const url = `${HOST}:${port}`;
		const app = new Gerkon;
		app.get('/async', [
				function(req, res, next){
					got(`${HOST}:${port}/data`)
						.then(response => {
							req.testData = JSON.parse(response.body);
							setTimeout(() => next(), 500);
						})
						.catch(err => { console.log(err); });
				},
				function(req, res){
					req.testData.foo.should.eql('bar');
					app.stop();
					done();
				}
			])
			.get('/data', (req, res) => res.end(JSON.stringify({foo: 'bar'})))
			.listen(port);

		got(`${HOST}:${port}/async`).catch(err => { console.log(err); });
	});
});

describe('General', () => {
	it('shouldn\'t throws if user tries to stop not running app', () => {
		(new Gerkon).stop();
	});
});
