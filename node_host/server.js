const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    fs.createReadStream('../index.html').pipe(res);
	console.log('connection by ' + res.socket.remoteAddress);
})

server.listen(8080);