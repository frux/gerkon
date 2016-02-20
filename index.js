const Gerkon = require('gerkon'),
	app = new Gerkon();

app.get('/', (req, res) => {
	res.end('Hello World!');
});

app.listen(process.env.PORT || 3163);
console.log(`Application has started on http://localhost:${process.env.PORT || 3163}`);
