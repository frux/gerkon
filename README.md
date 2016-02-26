<img src="https://rawgit.com/gerkon/gerkon/gh-pages/media/logo_full.svg" height="100" alt="Logo" />

[![Build Status](http://travis-ci.org/frux/gerkon.svg?branch=master)](https://travis-ci.org/frux/gerkon)
[![Coverage Status](https://coveralls.io/repos/frux/gerkon/badge.svg?branch=master&service=github)](https://coveralls.io/github/frux/gerkon?branch=master)
[![Node version](https://img.shields.io/node/v/gerkon.svg)](https://www.npmjs.com/package/gerkon)

```js
const Gerkon = require('gerkon');
const app = new Gerkon();

app.route('/', (req, res) => {
		res.send('Index page');
	})
	.route('/hello{world}', (req, res) => {
		res.send('Hello world!');
	})
	.route('*', (req, res) => {
		res.sendCode(404, 'not found');
	})
	.listen(8080);
```
