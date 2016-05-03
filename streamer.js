var fs = require('fs');
var wav = require('wav');
var dgram = require('dgram');
var chalk = require('chalk');
var Speaker = require('speaker');
var udp = require('datagram-stream');

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



console.log( // Welcome Message
  '\n' +
  chalk.red(',d88b.d88b,                      ,d88b.d88b,   ') + '\n' +
  chalk.red('88888888888       STREAMER       88888888888   ') + '\n' +
  chalk.red('`Y8888888Y´                      `Y8888888Y´   ') + '\n' +
  chalk.red('  `Y888Y´                          `Y888Y´     ') + '\n' +
  chalk.red('    `Y´                              `Y´       ') + '\n');
console.log('  ' + chalk.underline('Status:'));

// TODO: Make selection of file to stream dynamic!
console.log(chalk.yellow('•')+' Fetching recording');
var recording = fs.createReadStream('recordings/example.wav');
var reader = new wav.Reader();

// Read wav to buffer
reader.on('format', function(format){
  console.log(`${chalk.yellow('•')} Streaming to partner...`);
  reader.pipe(new Speaker(format));
  reader.pipe(stream);

  // Start stream (should it run every 100ms or can it handle the entire chunk at once?)
//  server.send(audioBuffer, settings.UDPPort, settings.partnerIP, function(){
  //  server.close();
//  });

  // Tell Photon that the message is over, so we can set unreadMessage = false;

  // Give feedback to user
  console.log(chalk.green('•')+' Message sent');
});
recording.pipe(reader);