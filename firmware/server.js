var fs = require('fs');
var wav = require('wav');
var dgram = require('dgram');
var chalk = require('chalk');
var Speaker = require('speaker');

var server = dgram.createSocket('udp4');
var d = new Date();
var currentTime = `${d.getDate()}-${d.getMonth()}-${d.getFullYear()}--${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
var bufferArray = [];

var settings = {
  UDPPort: 3444
};

console.log( '\n' +
chalk.red(',d88b.d88b,     ,d88b.d88b,      ,d88b.d88b,   ') + '\n' +
chalk.red('88888888888     88888888888      88888888888   ') + '\n' +
chalk.red('`Y8888888Y´     `Y8888888Y´      `Y8888888Y´   ') + '\n' +
chalk.red('  `Y888Y´         `Y888Y´          `Y888Y´     ') + '\n' +
chalk.red('    `Y´             `Y´              `Y´       ') + '\n\n');
console.log(
  '  ' + chalk.red.bold('Welcome to the intimacy_device prototype') + '\n' + 
  '  ' + '========================================\n' +
  '  Once this server is running, the device \n' +
  '  can be used to record messages and they \n' +
  '  will be saved to the recordings folder.\n' + '\n' +
  '  ' + chalk.underline('Status:')
  );

server.on('listening', function () {
  try {    
    console.log(chalk.yellow('•') + ' Connected, waiting for user to record...');
  } catch(e) {
    console.log(e);
  }
});

server.on('message', function (message, remote) {  
  if(Buffer.from('start').compare(message) === 0) {
    console.log(chalk.yellow('•') +' Now recording...');
  } else if(Buffer.from('end').compare(message) === 0) {
    console.log(chalk.yellow('•')+' Recording ended, now converting...');
    var buff = Buffer.concat(bufferArray);
    var filename = `recording ${currentTime}.wav`;
    var writer = new wav.FileWriter(`recordings/${filename}`, {
      channels: 1,
      sampleRate: 8000,
      bitDepth: 8
    });
    writer.write(buff);
    writer.end();
    console.log(chalk.green('•') + ' ' + chalk.green(`Recording done!`));
    playRecording(`recordings/${filename}`);
    notifyPartner(remote);
  } else {
    try {
      bufferArray.push(message);
    } catch(e) {
      console.log(e);
    }
  }
});
server.bind(settings.UDPPort);

function playRecording (filename) {
  console.log(chalk.green('•') + ` Playing '${filename}' 🔈`);
  var recording = fs.createReadStream(`recordings/${filename}`);
  var reader = new wav.Reader();
  reader.on('format', function(format){
    reader.pipe(new Speaker(format));
  });
recording.pipe(reader);
}

function notifyPartner(remote) {
  console.log(chalk.yellow('•')+' Preparing to notify partner about new message...');
  setTimeout(function(){
    server.send(Buffer.from('new-msg'), remote.port, remote.address, function(){
      console.log(chalk.green('•')+' Notification sent...');
      server.close();
    });
  }, 2000);
}