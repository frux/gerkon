const Gerkon = require('gerkon');
const app = new Gerkon();
console.log('Up!');
app.get('/', (req, res) => { console.log(req);
		res.writeHead({ 'Content-type': 'text/html' });
		res.write('Hello world!');
		res.end();	
	});

app.listen(process.env.PORT || 3163);
