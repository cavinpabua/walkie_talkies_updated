

#include "SparkIntervalTimer.h"
#include "SimpleRingBuffer.h"
#include <math.h>


#define MICROPHONE_PIN DAC1
#define SPEAKER_PIN DAC2 // A3 on board
#define BUTTON_PIN A0
#define LIGHT_PIN D0
#define UDP_BROADCAST_PORT 3444
#define AUDIO_BUFFER_MAX 8192

 #define SERIAL_DEBUG_ON false

//#define AUDIO_TIMING_VAL 125 /* 8,000 hz */
#define AUDIO_TIMING_VAL 62 /* 16,000 hz */
//#define AUDIO_TIMING_VAL 50  /* 20,000 hz */

UDP Udp;
IPAddress broadcastAddress(192,168,1,255);


int audioStartIdx = 0, audioEndIdx = 0;
int rxBufferLen = 0, rxBufferIdx = 0;

uint8_t txBuffer[AUDIO_BUFFER_MAX];


SimpleRingBuffer audio_buffer;
SimpleRingBuffer recv_buffer;

unsigned long lastRead = micros();
unsigned long lastSend = millis();
char myIpAddress[24];


IntervalTimer readMicTimer;
float _volumeRatio = 1.0; 
int _sendBufferLength = 0;
unsigned int lastPublished = 0;
bool _messageIsUnread = false;
bool _requestedMessage = false;
bool _readyToReceive = false;

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

    Particle.variable("ipAddress", myIpAddress, STRING);
    IPAddress myIp = WiFi.localIP();
    sprintf(myIpAddress, "%d.%d.%d.%d", myIp[0], myIp[1], myIp[2], myIp[3]);

    recv_buffer.init(AUDIO_BUFFER_MAX);
    audio_buffer.init(AUDIO_BUFFER_MAX);
    
    Udp.setBuffer(1024);
    Udp.begin(UDP_BROADCAST_PORT);

    lastRead = micros();
}

bool _isRecording = false;

void startRecording() {
    if (!_isRecording) {
        Udp.sendPacket("start", 5, broadcastAddress, UDP_BROADCAST_PORT);
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


void showNewMessage() {
    if (_messageIsUnread) {
        float val = (exp(sin(millis()/2000.0*M_PI)) - 0.36787944)*108.0;
        analogWrite(LIGHT_PIN, val);
        delay(50);
    }
}

// MAIN LOOP
void loop() {
  
    if (digitalRead(BUTTON_PIN) == HIGH) { //BUTTON IS PRESSED
        digitalWrite(D7, HIGH);
        startRecording();
        sendEvery(100);
    }
    else { //BUTTON IS RELEASED
        digitalWrite(D7, LOW);
        stopRecording();
    }


    if (Udp.parsePacket()) {
        _messageIsUnread = true;
    }
    showNewMessage();
    receiveMessages();
}

int onSetVolume(String cmd) {
    _volumeRatio = cmd.toFloat() / 100;
}


void receiveMessages() {
     while (Udp.parsePacket() > 0) {
        while (Udp.available() > 0) {
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


    while (recv_buffer.getSize() > 0) {
        
        value = recv_buffer.get();
        value = map(value, 0, 255, 0, 4095);
        value = value * _volumeRatio;

        now = micros();
        diff = (now - lastWrite);
        if (diff < AUDIO_TIMING_VAL) {
            delayMicroseconds(AUDIO_TIMING_VAL - diff);
        }

        analogWrite(SPEAKER_PIN, value);
        lastWrite = micros();
    }

}

void readMic(void) {
    //read audio
    uint16_t value = analogRead(MICROPHONE_PIN);
    value = map(value, 0, 4095, 0, 255);
    audio_buffer.put(value);

    
}

void copyAudio(uint8_t *bufferPtr) {
    int c = 0;
    while ((audio_buffer.getSize() > 0) && (c < AUDIO_BUFFER_MAX)) {
        bufferPtr[c++] = audio_buffer.get();
    }
    _sendBufferLength = c - 1;
}

void sendEvery(int delay) {
    // if it's been longer than 100ms since our last broadcast, then broadcast.
    if ((millis() - lastSend) >= delay) {
        sendAudio();
        lastSend = millis();
    }
}

void sendAudio(void) {
    copyAudio(txBuffer);
    write_UDP(txBuffer);
}

void write_UDP(uint8_t *buffer) {
    int stopIndex=_sendBufferLength;
    Udp.sendPacket(buffer, stopIndex, broadcastAddress, UDP_BROADCAST_PORT);
}
