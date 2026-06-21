#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define LDR_PIN 34
#define BUZZER_PIN 25
#define LED_PIN 26

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

const int MOVEMENT_THRESHOLD = 50;
const unsigned long ALERT_TIME_MS = 45UL * 60UL * 1000UL;

BLECharacteristic *pCharacteristic;
int lastLdrValue = 0;
unsigned long lastMovementTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // luz constante para el LDR
  digitalWrite(BUZZER_PIN, LOW);

  BLEDevice::init("FlexOptic ESP32");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();

  lastLdrValue = analogRead(LDR_PIN);
  lastMovementTime = millis();
}

void loop() {
  int ldrValue = analogRead(LDR_PIN);
  int diff = abs(ldrValue - lastLdrValue);

  if (diff > MOVEMENT_THRESHOLD) {
    lastMovementTime = millis();
    digitalWrite(BUZZER_PIN, LOW);
  }

  if (millis() - lastMovementTime >= ALERT_TIME_MS) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(250);
    digitalWrite(BUZZER_PIN, LOW);
    delay(250);
  } else {
    delay(500); // 2 Hz, según el documento
  }

  String value = String(ldrValue);
  pCharacteristic->setValue(value.c_str());
  pCharacteristic->notify();
  Serial.println(value);
  lastLdrValue = ldrValue;
}
