const Gerkon = require('gerkon');
const app = new Gerkon();

app.get('/', (req, res) => {
		res.end('Hello World!');	
	});

app.listen(process.env.PORT || 3163);
console.log(`Application has started on localhost:${process.env.PORT || 3163}`);
