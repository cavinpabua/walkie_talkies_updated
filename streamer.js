var fs = require('fs');
var wav = require('wav');
var dgram = require('dgram');
var chalk = require('chalk');
var Stream = require('stream');  
var Speaker = require('speaker');
var udp = require('datagram-stream');
var toArray = require('stream-to-array');

var server = dgram.createSocket('udp4');
var settings = {
  UDPPort: '3444',
  partnerIP: '192.168.1.46'
};

var stream = udp({
    address     : '0.0.0.0'          //address to bind to
    , broadcast : settings.partnerIP //broadcast ip address to send to
    , port      : settings.UDPPort   //udp port to send to
//  , bindingPort : 5556             //udp port to listen on. Default: port
    , reuseAddr : true               //boolean: allow multiple processes to bind to the
                                     //         same address and port. Default: true
 });



var recording = fs.createReadStream('recordings/example.wav');
var reader = new wav.Reader();
var bufferArray = [];
var i = 0;

// Read wav to buffer
reader.on('format', function(format){
  console.log(`${chalk.yellow('•')} Streaming to partner...`);
    reader.pipe(new Speaker(format));
  reader.on('readable', () => {
    var totalBuf = reader.read();
    streamLoop(totalBuf, 1024);
  });

//  reader.on('end')
  // Start stream (should it run every 100ms or can it handle the entire chunk at once?)
//  server.send(Buffer.from('test'), settings.UDPPort, settings.partnerIP, function(){
//    server.close();
//  });

  // Tell Photon that the message is over, so we can set unreadMessage = false;

  // Give feedback to user
  console.log(chalk.green('•')+' Message sent');
});

function streamLoop (fullBuffer, maxChunkSize) {
  if(fullBuffer === null) { return false }
  setTimeout(function(){
      server.send(fullBuffer.slice(i, i+maxChunkSize), settings.UDPPort, settings.partnerIP, function(){
        console.log(fullBuffer.slice(i, i+maxChunkSize));
      });
    i = i + maxChunkSize;
    if (i <= Buffer.byteLength(fullBuffer) ) {
      streamLoop(fullBuffer, maxChunkSize);
    }
   }, 30);
}


//stream.pipe(process.stdout);
//pipe whatever is received on stdin over udp
//process.stdin.pipe(stream);

recording.pipe(reader);