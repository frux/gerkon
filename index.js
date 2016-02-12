const Gerkon = require('gerkon');
const app = new Gerkon();
console.log('Up!');
app.get('/', (req, res) => { console.log(res);
		res.end('Hello World!');	
	});

app.listen(process.env.PORT || 3163);
