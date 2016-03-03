const path = require('path'),
	Gerkon = require('gerkon'),
	config = require('config-helper')({
		path: './config'
	}),
	texts = require('./texts'),
	app = new Gerkon();

app.use(require('gerkon-jade'));
app.use((req, res, next) => {
	return next()
		.then(() => {
			console.log(`${req.url} ${res.statusCode}`);
		})
		.catch(err => {
			console.log(err);
		});
});
app.get('/', (req, res) => {
	const data = {
		texts
	};
	res.renderTemplate(path.resolve(__dirname, './templates/pages/index.jade'), data);
});

app.static(config.static);

app.listen(config.port);
console.log(`Application has started on http://localhost:${config.port}`);
