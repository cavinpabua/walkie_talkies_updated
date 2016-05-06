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
  partnerIP: '192.168.1.46',
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
  // Start of recording
  if(Buffer.from('start').compare(message) === 0) {
    console.log(chalk.yellow('•') +' Now recording...');
    // End of recording
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
    console.log(chalk.green('•') + ' ' + chalk.green(`Recording done!\n`));
    //playRecording(filename);
    notifyPartner(remote);  
  } else if(Buffer.from('request-msg').compare(message) === 0) {
    console.log(chalk.green('• Message has been requested!'));
    sendMessage();
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
      console.log(chalk.green('•')+ chalk.green(' Notification sent!\n'));
      console.log(chalk.yellow('•')+' Now waiting for user to request message...');
    });
  }, 2000);
}

function sendMessage(){
  var recording = fs.createReadStream('recordings/440hz.wav');
  var reader = new wav.Reader();
  var bufferArray = [];

  reader.on('format', function(format){
    console.log(`${chalk.yellow('•')} Streaming to partner...`);
    reader.on('readable', () => {
      var totalBuf = reader.read();
      console.log(totalBuf);
      var index = 0;
      for (var i = 0; i < Buffer.byteLength(totalBuf); i = i+1024) {
        if(totalBuf == null) { break; }
        bufferArray[index] = totalBuf.slice(i, i+1024);
        sendChunk(totalBuf.slice(i, i+1024));
        //      stream.write(totalBuf.slice(i, i+1024));
        index++;
      }
    });
  });
  recording.pipe(reader);
  }

function sendChunk(buffer) {
  setTimeout(function(){
    server.send(buffer, settings.UDPPort, settings.partnerIP, function(){
    });
  }, 100);
}


//  reader.on('end')
  // Start stream (should it run every 100ms or can it handle the entire chunk at once?)
//  server.send(Buffer.from('test'), settings.UDPPort, settings.partnerIP, function(){
//    server.close();
//  });

  // Tell Photon that the message is over, so we can set unreadMessage = false;

  // Give feedback to user
