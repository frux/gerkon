const Gerkon = require('gerkon'),
	path = require('path'),
	app = new Gerkon();

app.use(require('gerkon-jade'));
app.get('/', (req, res) => {
	const data = {};
	res.renderTemplate(path.resolve(__dirname, './templates/pages/index.jade'), data);
});

app.listen(process.env.PORT || 3163);
console.log(`Application has started on http://localhost:${process.env.PORT || 3163}`);
