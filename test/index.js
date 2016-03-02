'use strict';
/* globals describe, it */

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
				app.stop();
			}).listen(port);

			assert.equal((yield got(url)).body, 'ok');

			app.stop();
			done();
		});
	});
});

describe('Routing rules parsing', () => {
	it('simple rule', () => {
		assert(Gerkon.match('/simple/route', '/simple/route'));
		assert.equal(Gerkon.match('/simple/route', '/simple/route/'), false);
	});

	it('rule with optional parts', () => {
		assert(Gerkon.match('/simple{/route}', '/simple/route'));
		assert(Gerkon.match('/simple{/route}', '/simple'));
		assert.equal(Gerkon.match('/simple{/route}', '/simple/'), false);
	});

	it('rule with any symbols', () => {
		assert(Gerkon.match('/test*', '/testimonials'));
		assert(Gerkon.match('/test*', '/test'));
		assert(Gerkon.match('/test*', '/test123'));
		assert(Gerkon.match('/test*', '/test*'));
		assert.equal(Gerkon.match('/test*', '/tes'), false);
	});

	it('rule with params', () => {
		assert(Gerkon.match('/<param1>/<param2>', '/1/2'));
		assert(Gerkon.match('/<param1>/<param2>', '/foo/bar'));
		assert(Gerkon.match('/<param1>#<param2>', '/foo#bar'));
		assert.equal(Gerkon.match('/<param1>/<param2>', '/foo/_/bar'), false);
	});

	it('complex rule', () => {
		assert(Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux/1234'));
		assert(Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/optional/frux/1234'));
		assert(Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux/1234/'));
		assert(Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux/1234/some_more/url'));
		assert.equal(Gerkon.match('/test{/optional}/<userName>/<password>*', '/test/frux'), false);
		assert.equal(Gerkon.match('/test{/optional}/<userName>/<password>*', '/test'), false);
	});

	it('should check matching to regexp', () => {
		assert(Gerkon.match(/\/test/, '/test'));
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
		assert.equal(app.getRoutes('get').length, 1);
		assert.equal(app.getRoutes('post').length, 0);
		assert.equal(app.getRoutes('put').length, 0);
		assert.equal(app.getRoutes('delete').length, 0);
		assert.equal(app.getRoutes('head').length, 0);
		assert.equal(app.getRoutes('patch').length, 0);
		assert.equal(app.getRoutes('options').length, 0);
	});

	it('should adds route POST method', () => {
		const app = new Gerkon();

		app.post('/', () => {});
		assert.equal(app.getRoutes('get').length, 0);
		assert.equal(app.getRoutes('post').length, 1);
		assert.equal(app.getRoutes('put').length, 0);
		assert.equal(app.getRoutes('delete').length, 0);
		assert.equal(app.getRoutes('head').length, 0);
		assert.equal(app.getRoutes('patch').length, 0);
		assert.equal(app.getRoutes('options').length, 0);
	});

	it('should adds routes for all request methods if not specified', () => {
		const app = new Gerkon();

		app.route('/', () => {});
		assert.equal(app.getRoutes('get').length, 1);
		assert.equal(app.getRoutes('post').length, 1);
		assert.equal(app.getRoutes('put').length, 1);
		assert.equal(app.getRoutes('delete').length, 1);
		assert.equal(app.getRoutes('head').length, 1);
		assert.equal(app.getRoutes('patch').length, 1);
		assert.equal(app.getRoutes('options').length, 1);
	});

	it('should adds a route for each specified request method', () => {
		const app = new Gerkon();

		app.route(['get', 'post', 'put', 'patch'], '/', () => {});
		assert.equal(app.getRoutes('get').length, 1);
		assert.equal(app.getRoutes('post').length, 1);
		assert.equal(app.getRoutes('put').length, 1);
		assert.equal(app.getRoutes('delete').length, 0);
		assert.equal(app.getRoutes('head').length, 0);
		assert.equal(app.getRoutes('patch').length, 1);
		assert.equal(app.getRoutes('options').length, 0);
	});

	it('should returns empty array if requested invalid method', () => {
		assert.deepEqual((new Gerkon()).getRoutes('foo'), []);
	});

	it('should parse params from url', done => {
		const port = getPort(),
			url = `${HOST}:${port}/bar/1234`,
			app = new Gerkon();

		app
			.get('/<foo>/<id>', req => {
				assert.equal(req.params.foo, 'bar');
				assert.equal(req.params.id, '1234');
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
			assert.equal(err.statusCode, 404);
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
			assert.equal(err.statusCode, 502);
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
				assert.equal(req.testData.foo, 'bar');
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
			assert(req);
			assert(res);
		});
	});

	it('should adds async middleware', () => {
		(new Gerkon()).use((req, res, next) => {
			assert(req);
			assert(res);
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
				assert(next() instanceof Promise);
				app.stop();
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

describe('Steroids', () => {
	it('should sends content with status code 200', done => {
		seenk(function* (){
			const port = getPort(),
				path = '/res_send',
				url = `${HOST}:${port}${path}`,
				app = new Gerkon();
			let response;

			app
				.get(path, (req, res) => {
					res.send('ok');
					app.stop();
				})
				.listen(port);

			response = yield got(url);
			assert.equal(response.body, 'ok');
			assert.equal(response.statusCode, 200);
			done();
		});
	});

	it('should sends specified status code', done => {
		seenk(function* (){
			const port = getPort(),
				path = '/res_send_code',
				url = `${HOST}:${port}${path}`,
				app = new Gerkon();
			let response;

			app
				.get(path, (req, res) => {
					res.sendCode(202, 'ok');
					app.stop();
				})
				.listen(port);

			response = yield got(url);
			assert.equal(response.body, 'ok');
			assert.equal(response.statusCode, 202);
			done();
		});
	});

	it('should throws if status code is not valid', done => {
		const port = getPort(),
			path = '/res_send_code_invalid',
			url = `${HOST}:${port}${path}`,
			app = new Gerkon();

		app
			.get(path, (req, res) => {
				assert.throws(() => {
					res.sendCode({}, 'bang');
				});
				app.stop();
				done();
			})
			.listen(port);

		got(url);
	});

	it('should redirects with 302 status code by default', done => {
		seenk(function* (){
			const port = getPort(),
				path = '/res_redirect',
				url = `${HOST}:${port}${path}`,
				app = new Gerkon();

			app
				.get(path, (req, res) => {
					res.redirect('/res_redirect_target');
					app.stop();
				})
				.listen(port);

			require('http').get(url, res => {
				assert(res.statusCode, 302);
				done();
			});
		});
	});

	it('should redirects with 307 status code', done => {
		seenk(function* (){
			const port = getPort(),
				path = '/res_redirect_307',
				url = `${HOST}:${port}${path}`,
				app = new Gerkon();

			app
				.get(path, (req, res) => {
					res.redirect('/res_redirect_target', 307);
					app.stop();
				})
				.listen(port);

			require('http').get(url, res => {
				assert(res.statusCode, 307);
				done();
			});
		});
	});

	it('should throws if url is not a string', done => {
		const port = getPort(),
			path = '/res_redirect_invalid',
			url = `${HOST}:${port}${path}`,
			app = new Gerkon();

		app
			.get(path, (req, res) => {
				assert.throws(() => {
					res.redirect({});
				});
				app.stop();
				done();
			})
			.listen(port);

		got(url);
	});

	it('should throws if url is not a string', done => {
		const port = getPort(),
			path = '/res_redirect_invalid',
			url = `${HOST}:${port}${path}`,
			app = new Gerkon();

		app
			.get(path, (req, res) => {
				assert.throws(() => {
					res.redirect({});
				});
				app.stop();
				done();
			})
			.listen(port);

		got(url);
	});

	it('should sends content of file with status code 200', done => {
		seenk(function* (){
			const port = getPort(),
				path = '/res_file',
				url = `${HOST}:${port}${path}`,
				app = new Gerkon();
			let response;

			app
				.get(path, (req, res) => {
					res.file(`${__dirname}/test.txt`);
					app.stop();
				})
				.listen(port);

			response = yield got(url);
			assert.equal(response.body, 'ok');
			assert.equal(response.statusCode, 200);
			done();
		});
	});

	it('should catch error if file path is not a string', done => {
		seenk(function* (){
			const port = getPort(),
				path = '/res_file_wrong_name',
				url = `${HOST}:${port}${path}`,
				app = new Gerkon();

			app
				.get(path, (req, res) => {
					res.file([])
						.catch(() => {
							app.stop();
							done();
						});
				})
				.static(__dirname)
				.listen(port);

			got(url);
		});
	});
});

describe('Params', () => {
	const app = new Gerkon();

	it('should returns app instance after param setting', () => {
		assert(app.param('test1', 'test') instanceof Gerkon);
	});

	it('should returns param value', () => {
		assert.equal(app.param('test2', 'test').param('test2'), 'test');
	});

	it('should throws if paramName is not a string', () => {
		assert.throws(() => {
			app.param([], 'test');
		});
	});
});

describe('Static', () => {
	it('should returns app instance', () => {
		assert((new Gerkon()).static(__dirname) instanceof Gerkon);
	});

	it('should throws if static path is not a string', () => {
		assert.throws(() => {
			(new Gerkon()).static([]);
		});
	});

	it('should searches for routes first', done => {
		const port = getPort(),
			path = '/static/test.txt',
			url = `${HOST}:${port}${path}`,
			app = new Gerkon();

		app
			.get(path, () => {
				app.stop();
				done();
			})
			.static(__dirname)
			.listen(port);
		got(url);
	});

	it('should send file content if rule was not found', done => {
		seenk(function* (){
			const port = getPort(),
				filePath = '/test.txt',
				url = `${HOST}:${port}${filePath}`,
				app = new Gerkon();

			app
				.static(__dirname)
				.listen(port);
			assert.equal((yield got(url)).body, 'ok');
		})
			.then(() => {
				done();
			})
			.catch(err => {
				assert.fail(200, err.statusCode, err.statusMessage);
			});
	});

	it('should send 404 if neither routing rule or file were not found', done => {
		seenk(function* (){
			const port = getPort(),
				filePath = '/unexistingfile.txt',
				url = `${HOST}:${port}${filePath}`,
				app = new Gerkon();

			app
				.static(__dirname)
				.listen(port);
			assert.equal((yield got(url)).body, 'ok');
		})
			.then(() => {
				assert.fail(404, 200);
			})
			.catch(err => {
				assert.equal(err.statusCode, 404);
				done();
			});
	});
});
