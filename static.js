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
var logpath = '/Users/gescandon/sfdcLogParser';
global.logfiles;
function getLogFiles() {
  var result;
  fs.readdir(logpath + '/logs', function(err, files) {
    if (err) {
      return console.log(err);
    }
    global.logfiles = files;
    result = files;
  });  
  return result;
}


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
      //response.end("" + loglist);
    } else if (request.url.indexOf('/logs_') > -1) {
      var urlarr = request.url.split("_");
      var fpath = logpath + urlarr[0] + urlarr[1];

      fs.readFile(fpath, 'utf8', function(err, data) {
        if (err) {
          return console.log(err);
        }
        response.writeHead(200);
        response.end("" + data)
      });

    } else if (request.url.indexOf('/objmodelrelations') > -1) {
      var fpath = logpath + '/sfdc_objModel.csv'
      console.log(fpath);
      fs.readFile(fpath, 'utf8', function(err, data) {
        if (err) {
          return console.log(err);
        }
        response.writeHead(200);
        response.end("" + data)
      });

    } else {
      file.serve(request, response);
      var loglist = getLogFiles();
      console.log('loglist1');
      console.log(loglist);
    }

  }).resume();
}).listen(8080);

console.log("> node-static is listening on http://127.0.0.1:8080");