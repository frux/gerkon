const path = require('path');

module.exports = {
	static: path.resolve(__dirname, '../www'),
	port: process.env.PORT || 8080
};
