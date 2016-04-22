// make sure you have Node.js Installed!
// Get the IP address of your photon, and put it here:

// CLI command to get your photon's IP address
//
// particle get MY_DEVICE_NAME ipAddress

// Put your IP here!
var settings = {
  IP: "172.20.10.2",
  selfIP: "172.20.10.13",
  UDPPort: 3444,
  TCPPort: 3443,
  method: 'TCP'
};

/**
 * Created by middleca on 7/18/15.
 */

//based on a sample from here
//  http://stackoverflow.com/questions/19548755/nodejs-write-binary-data-into-writablestream-with-buffer

var fs = require("fs");

var samplesLength = 1000;
var sampleRate = 8000;

var outStream = fs.createWriteStream("test2.wav");

var writeHeader = function() {
  var b = new Buffer(1024);
  b.write('RIFF', 0);
  /* file length */
  b.writeUInt32LE(32 + samplesLength * 2, 4);
  //b.writeUint32LE(0, 4);

  b.write('WAVE', 8);
  /* format chunk identifier */
  b.write('fmt ', 12);

  /* format chunk length */
  b.writeUInt32LE(16, 16);

  /* sample format (raw) */
  b.writeUInt16LE(1, 20);

  /* channel count */
  b.writeUInt16LE(1, 22);

  /* sample rate */
  b.writeUInt32LE(sampleRate, 24);

  /* byte rate (sample rate * block align) */
  b.writeUInt32LE(sampleRate * 2, 28);

  /* block align (channel count * bytes per sample) */
  b.writeUInt16LE(2, 32);

  /* bits per sample */
  b.writeUInt16LE(16, 34);

  /* data chunk identifier */
  b.write('data', 36);

  /* data chunk length */
  //b.writeUInt32LE(40, samplesLength * 2);
  b.writeUInt32LE(0, 40);


  outStream.write(b.slice(0, 50));
};





writeHeader(outStream);


console.log('Connecting via '+ settings.method +':');

if (settings.method == 'UDP') {
  var dgram = require('dgram');
  var server = dgram.createSocket('udp4');

  server.on('listening', function () {
    try {
      console.log('listening');
      var address = server.address();
      console.log('UDP Server listening on ' + address.address + ":" + address.port);
    } catch(e) {
      console.log(e);
    }
  });

  server.on('message', function (message, remote) {
    try {
       outStream.write(message);
    } catch(e) {
      console.log(e);
    }
  });
  server.bind(settings.UDPPort, settings.selfIP);

} else if (settings.method = 'TCP') {
  var net = require('net');

  client = net.connect(settings.TCPPort, settings.IP, function () {
    console.log('Connected, now sampling.');
    client.setNoDelay(true);

      client.on("message", function (message) {
        console.log("GOT DATA");
          try {
            outStream.write(data);
            //outStream.flush();
            console.log("got chunk of " + data.toString('hex'));
          }
          catch (ex) {
              console.error("Er!" + ex);
          }
      });
  });

}








setTimeout(function() {
  console.log('recorded for 10 seconds');
  if (settings.method == 'UDP') {
    server.close();  
  } else {
    client.end();   
  }

  outStream.end();
  process.exit(0);
}, 20 * 1000);