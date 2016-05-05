

#include "SparkIntervalTimer.h"
#include "SimpleRingBuffer.h"
#include <math.h>

//WiFi.selectAntenna(ANT_EXTERNAL);

#define MICROPHONE_PIN DAC1
#define SPEAKER_PIN DAC2
#define BUTTON_PIN A0
#define LIGHT_PIN D0
#define BROADCAST_PORT 3443
#define UDP_BROADCAST_PORT 3444
#define AUDIO_BUFFER_MAX 8192
//#define AUDIO_BUFFER_MAX 16384

 #define SERIAL_DEBUG_ON true

#define AUDIO_TIMING_VAL 125 /* 8,000 hz */
//#define AUDIO_TIMING_VAL 62 /* 16,000 hz */
//#define AUDIO_TIMING_VAL 50  /* 20,000 hz */

UDP Udp;
//IPAddress broadcastAddress(255,255,255,255);
IPAddress broadcastAddress(192,168,1,37);

int audioStartIdx = 0, audioEndIdx = 0;
int rxBufferLen = 0, rxBufferIdx = 0;

//uint16_t audioBuffer[AUDIO_BUFFER_MAX];
uint8_t txBuffer[AUDIO_BUFFER_MAX];
//uint8_t rxBuffer[AUDIO_BUFFER_MAX];


SimpleRingBuffer audio_buffer;
SimpleRingBuffer recv_buffer;


// IntervalTimer readMicTimer;
// IntervalTimer sendAudioTimer;

// version without timers
unsigned long lastRead = micros();
unsigned long lastSend = millis();
char myIpAddress[24];


// TCPClient audioClient;
// TCPClient checkClient;
// TCPServer audioServer = TCPServer(BROADCAST_PORT);

IntervalTimer readMicTimer;
//int led_state = 0;
float _volumeRatio = 0.25;
int _sendBufferLength = 0;
unsigned int lastPublished = 0;
bool _messageIsUnread = false;
bool _requestedMessage = true;
bool _readyToReceive = true;

void setup() {
    #if SERIAL_DEBUG_ON
        Serial.begin(115200);
    #endif

    pinMode(MICROPHONE_PIN, INPUT);
    pinMode(SPEAKER_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLDOWN);
    pinMode(LIGHT_PIN, OUTPUT);
    pinMode(D7, OUTPUT);

    Particle.function("setVolume", onSetVolume);
    Particle.function("readMessage", onReadMessage);
    Particle.function("playMessage", onPlayMessage);


    Particle.variable("ipAddress", myIpAddress, STRING);
    IPAddress myIp = WiFi.localIP();
    sprintf(myIpAddress, "%d.%d.%d.%d", myIp[0], myIp[1], myIp[2], myIp[3]);

    recv_buffer.init(AUDIO_BUFFER_MAX);
    audio_buffer.init(AUDIO_BUFFER_MAX);
    
    Udp.setBuffer(1024);
    Udp.begin(UDP_BROADCAST_PORT);

//    Udp.beginPacket(broadcastAddress, UDP_BROADCAST_PORT);
//    Udp.write(rxBuffer, 10);
//    Udp.endPacket();


    // 1/16,000th of a second is ~62 mcsec
    //readMicTimer.begin(readMic, 62, uSec);


    // // send a chunk of audio every 1/2 second
    // sendAudioTimer.begin(sendAudio, 1000, hmSec);

//    audioServer.begin();

    lastRead = micros();
}

bool _isRecording = false;
void startRecording() {
    if (!_isRecording) {
        Udp.sendPacket("start", 5, broadcastAddress, UDP_BROADCAST_PORT);
        // 1/8000th of a second is 125 microseconds
        readMicTimer.begin(readMic, AUDIO_TIMING_VAL, uSec);
    }

    _isRecording = true;
}

void stopRecording() {
    if (_isRecording) {
        readMicTimer.end();
        Udp.sendPacket("end", 3, broadcastAddress, UDP_BROADCAST_PORT);
    }
    _isRecording = false;
}

int onSetVolume(String cmd) {
    _volumeRatio = cmd.toFloat() / 100;
    return true;
}

int onReadMessage(String cmd) {
    _messageIsUnread = false;
    analogWrite(LIGHT_PIN, 0);
}

int onPlayMessage(String cmd) {
    onReadMessage("true");
    _readyToReceive = true;
}


void showNewMessage() {
    if (_messageIsUnread) {
        float val = (exp(sin(millis()/2000.0*M_PI)) - 0.36787944)*108.0;
        analogWrite(LIGHT_PIN, val);
    }
}

/* TODO: doneListeningToMessage()
    _requestedMessage = false;
    _readyToReceive = false;
*/


void loop() {
    if (digitalRead(BUTTON_PIN) == HIGH) {
        digitalWrite(D7, HIGH);
        startRecording();
        sendEvery(100);
    }
    else {
        digitalWrite(D7, LOW);
        stopRecording();
    }
    if (Udp.parsePacket()) {
        _messageIsUnread = true;
    }
    showNewMessage();

    if ( _readyToReceive ) {
        if (!_requestedMessage) {
           #if SERIAL_DEBUG_ON
               Serial.println("Requesting message.");
            #endif 
            Udp.sendPacket("request-msg", 11, broadcastAddress, UDP_BROADCAST_PORT);        
            _requestedMessage = true;
        }
        receiveMessages();
    }




// TODO: Enable when button is soldered on. Consider if BUTTON_PIN could somehow be utilised (short press/long press?)
//    if(digitalRead(PLAY_BUTTON_PIN == HIGH) && (_messageIsUnread)) {
    //    onReadMessage("true");
    //    _readyToReceive = true;
//    }

}



void receiveMessages() {
     while (Udp.parsePacket() > 0) {
        while (Udp.available() > 0) {
            #if SERIAL_DEBUG_ON
                Serial.print("Recieving packet");
            #endif

            recv_buffer.put(Udp.read());
        }
        if (recv_buffer.getSize() == 0) {
            analogWrite(SPEAKER_PIN, 0);
        }
    }
 playRxAudio();
}

void playRxAudio() {
    unsigned long lastWrite = micros();
	unsigned long now, diff;
	int value;

	//noInterrupts();

    //while (rxBufferIdx < rxBufferLen) {
    while (recv_buffer.getSize() > 0) {
        #if SERIAL_DEBUG_ON
            Serial.print("buffer: ");
            Serial.print(recv_buffer.getSize());
        #endif

        // ---
        //map it back from 1 byte to 2 bytes
        //map(value, fromLow, fromHigh, toLow, toHigh);
        //value = map(rxBuffer[rxBufferIdx++], 0, 255, 0, 4095);

        //play audio
        value = recv_buffer.get();
        value = map(value, 0, 255, 0, 4095);
        value = value * _volumeRatio;

        #if SERIAL_DEBUG_ON
            Serial.print("Playing (value:" + String(value) + ")");
        #endif


        now = micros();
        diff = (now - lastWrite);
        if (diff < AUDIO_TIMING_VAL) {
            delayMicroseconds(AUDIO_TIMING_VAL - diff);
        }

        //analogWrite(SPEAKER_PIN, rxBuffer[rxBufferIdx++]);
        analogWrite(SPEAKER_PIN, value);
        lastWrite = micros();
    }

    //interrupts();
}


void listenAndSend(int delay) {
    unsigned long startedListening = millis();

    while ((millis() - startedListening) < delay) {
        unsigned long time = micros();

        if (lastRead > time) {
            // time wrapped?
            //lets just skip a beat for now, whatever.
            lastRead = time;
        }

        //125 microseconds is 1/8000th of a second
        if ((time - lastRead) > 125) {
            lastRead = time;
            readMic();
        }
    }
    sendAudio();
}

void sendEvery(int delay) {
    // if it's been longer than 100ms since our last broadcast, then broadcast.
    if ((millis() - lastSend) >= delay) {
        sendAudio();
        lastSend = millis();
    }
}

// Callback for Timer 1
void readMic(void) {
    //read audio
    uint16_t value = analogRead(MICROPHONE_PIN);
    value = map(value, 0, 4095, 0, 255);
    audio_buffer.put(value);

    //old
    //    if (audioEndIdx >= AUDIO_BUFFER_MAX) {
    //        audioEndIdx = 0;
    //    }
    //    audioBuffer[audioEndIdx++] = value;


    //    //play audio
    //    value = map(recv_buffer.get(), 0, 255, 0, 4095);
    //    if (value >= 0) {
    //        analogWrite(SPEAKER_PIN, value);
    //    }


    //    //play audio
    //    if (rxBufferIdx < rxBufferLen) {
    //
    ////        uint8_t lsb = rxBuffer[rxBufferIdx];
    ////        uint8_t msb = rxBuffer[rxBufferIdx+1];
    ////        rxBufferIdx +=2;
    ////        uint16_t value = ((msb << 8) | (lsb & 0xFF));
    ////        value = (value / 65536.0) * 4095.0;
    ////        analogWrite(SPEAKER_PIN, value);
    //
    //        //tcpBuffer[tcpIdx] = map(val, 0, 4095, 0, 255);
    //        analogWrite(SPEAKER_PIN, rxBuffer[rxBufferIdx++]);
    //    }
        //digitalWrite(D7, (led_state) ? HIGH : LOW);

    //    if (rxBufferIdx < rxBufferLen) {
    //        int value = map(rxBuffer[rxBufferIdx++], 0, 255, 0, 4095);
    //        analogWrite(SPEAKER_PIN, value);
    //    }
}

void copyAudio(uint8_t *bufferPtr) {
    int c = 0;
    while ((audio_buffer.getSize() > 0) && (c < AUDIO_BUFFER_MAX)) {
        bufferPtr[c++] = audio_buffer.get();
    }
    _sendBufferLength = c - 1;
}

void sendAudio(void) {
    copyAudio(txBuffer);
    write_UDP(txBuffer);
}


void write_UDP(uint8_t *buffer) {
    int stopIndex=_sendBufferLength;
    #if SERIAL_DEBUG_ON
        Serial.println("SENDING (UDP) " + String(stopIndex));
    #endif
    Udp.sendPacket(buffer, stopIndex, broadcastAddress, UDP_BROADCAST_PORT);
}
