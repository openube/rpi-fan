/*
* Author @ Rocco Musolino - Hackerstribe.com
*/

//var fs = require('fs');
var Gpio = require('onoff').Gpio;
//var exec = require('child_process').exec;
var functions = require('./functions.js'); // functions
var config = require('./config.json'); // Configuration file
var argv = require('./arguments-handler.js');
var moment = require('moment');

var pin = new Gpio(argv.pin || config.PIN_NUMBER, 'out'); // Check out RPi2 Pinout map

// Start Loop
(
function loop(){
	var iter = setInterval(function(){
		functions.execute('/opt/vc/bin/vcgencmd measure_temp', function(data){
			if (functions.parse_temp(data) >= (argv.temperature || config.TEMPERATURE_THRESHOLD)){
			     if (functions.allowedInterval(moment())){
				pin.read(function(err, value){
					if (value == 0){ 
						pin.writeSync(1); // ON
						console.log(new Date().toString(), ' - Fan ON! - ', data);
					}
				});		
				clearInterval(iter);
				setTimeout(loop, 300 * 1000); // Fan on at least for 5 minutes
			     }
			}else{
				pin.read(function(err, value){
					if (value == 1){
						pin.writeSync(0); // OFF
						console.log(new Date().toString(), ' - Fan OFF! - ', data);
					}
				});
			}
		});
	}, (argv.refreshtime || config.REFRESH_TIME) * 1000);
}()
);

// Web Server

if (config.WEB_SERVER){
	var http = require('http');

	var server = http.createServer(function (req, res) {
	  res.writeHead(200, {'Content-Type': 'text/html'});
	  
	  functions.execute('/opt/vc/bin/vcgencmd measure_temp', function(data){
	  	 pin.read(function(err, val){
	  	 	if (err) console.log('Error: '+ err);
	  	 	var logs = functions.replaceAll(functions.getLogs(), '\n', '<br/>');
		  	res.end('<u>Current temperature</u>: <b>'+functions.parse_temp(data)+'</b> - <u>Fan status</u>: <b>'+((val == 1) ? 'on' : 'off')+'</b><br/><br/><u>Logs</u>:<br/><br/>'+logs);
		  });
	  });
	  
	})

	server.listen(argv.port || config.SERVER_PORT, '0.0.0.0');

	console.log(new Date().toString(), ' - Fan web server running at http://0.0.0.0:'+config.SERVER_PORT+'/');
}


function exit() {
  pin.unexport(); // OFF and release the GPIO
  process.exit();
}

process.on('SIGINT', exit);
