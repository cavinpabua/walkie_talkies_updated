var fs = require('fs');
var wav = require('wav');
var dgram = require('dgram');
var chalk = require('chalk');
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
    var writer = new wav.FileWriter(`../recordings/recording ${currentTime}.wav`, {
      channels: 1,
      sampleRate: 8000,
      bitDepth: 8
    });
    writer.write(buff);
    writer.end();
    server.close();  
    console.log(chalk.green('•') + ' ' + chalk.green(`All done! See "recording ${currentTime}.wav"`));
  } else {
    try {
      bufferArray.push(message);
    } catch(e) {
      console.log(e);
    }
  }
});
server.bind(settings.UDPPort);