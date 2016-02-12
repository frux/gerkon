const Gerkon = require('gerkon');
const app = new Gerkon();

app.get('/', (req, res) => {
		res.writeHead({ 'Content-type': 'text/html' });
		res.write('Hello world!');
		res.end();	
	});

app.listen(8080);
