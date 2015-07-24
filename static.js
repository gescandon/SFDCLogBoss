var static = require('node-static');
fs = require("fs");

function reduce(input, func) {
  var result = ''
  for (var i = 0; i <= input.length; i++) {
    result += func(input[i]);
  }
  return result;
}


// logpath is your local directory of logfiles
var logpath = '/Users/gescandon/sfdcLogParser/logs';

fs.readdir(logpath, function(err, files) {
  if (err) {
    return console.log(err);
  }
  global.logfiles = files;
});


//
// Create a node-static server instance to serve the './public' folder
//
var file = new static.Server('./public');

require('http').createServer(function(request, response) {
  request.addListener('end', function() {
    //
    // Serve files!
    //
    console.log("> " + request.url);
    if (request.url === '/loglisting') {
      // return logs listing
      response.writeHead(200);
      response.end("" + global.logfiles);
    } else if (request.url.indexOf('/logs_') > -1) {
      var urlarr = request.url.split("_");
      var fpath = logpath + urlarr[1];

      fs.readFile(fpath, 'utf8', function(err, data) {
        if (err) {
          return console.log(err);
        }
        response.writeHead(200);
        response.end("" + data)
      });

    } else {
      file.serve(request, response);
    }

  }).resume();
}).listen(8080);

console.log("> node-static is listening on http://127.0.0.1:8080");