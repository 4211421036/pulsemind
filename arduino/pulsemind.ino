#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <base64.h>

// Konfigurasi WiFi
const char* ssid = "Galaxy";
const char* password = "78901234567890";

// Konfigurasi GitHub
const char* githubToken = "";
const char* repo = "4211421036/pulsemind";
const char* branch = "main";
const char* path = "data/gsr.json";

// Parameter GSR berdasarkan literatur
#define SCL_MIN 1.0    // μS (Boucsein, 2012)
#define SCL_MAX 20.0
#define SCR_THRESHOLD 0.05
#define NS_SCR_LIMIT 3 // events/min (Dawson, 2011)

float baselineSCL = 0;
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);
  connectWiFi();
  calibrateGSR();
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
}

void calibrateGSR() {
  // Kalibrasi 30 detik sesuai protokol Lykken & Venables
  float sum = 0;
  for(int i=0; i<300; i ++) {
    sum += analogRead(34);
    delay(100);
  }
  baselineSCL = (sum/300 * 3.3) / 4095 * 1000000 / 1000000; // Konversi ke μS
}

float readGSR() {
  int raw = analogRead(34);
  float voltage = (raw * 3.3) / 4095.0;
  float conductance = (voltage / 1000000.0) * 1000000; // μS
  return conductance - baselineSCL;
}

void loop() {
  if(millis() - lastUpdate >= 30000) { // Update setiap 30 detik
    if(WiFi.status() == WL_CONNECTED) {
      DynamicJsonDocument doc(512);
      
      float conductance = readGSR();
      float stressLevel = calculateStress(conductance);
      
      doc["timestamp"] = millis();
      doc["conductance"] = round(conductance * 100) / 100;
      doc["stress_level"] = round(stressLevel * 10) / 10;
      doc["baseline"] = baselineSCL;
      doc["scl_status"] = getSCLStatus(conductance);
      doc["scr_events"] = countSCREvents();
      
      String payload;
      serializeJson(doc, payload);
      
      updateGitHub(payload);
    }
    lastUpdate = millis();
  }
}

float calculateStress(float conductance) {
  // Formula komposit berdasarkan Healey & Picard (2005)
  float sclComponent = constrain(map(conductance, SCL_MIN, SCL_MAX, 0, 70), 0, 70);
  float scrComponent = countSCREvents() * 10;
  return sclComponent + scrComponent;
}

int countSCREvents() {
  static float lastValue = 0;
  int events = 0;
  
  for(int i=0; i<300; i++) { // 30 detik
    float current = readGSR();
    if(current - lastValue > SCR_THRESHOLD) events++;
    lastValue = current;
    delay(100);
  }
  return events;
}

String getSCLStatus(float conductance) {
  if(conductance < 2) return "Relaxed";
  if(conductance < 5) return "Normal";
  if(conductance < 10) return "Stressed";
  return "High Stress";
}

void updateGitHub(String content) {
  HTTPClient http;
  String url = "https://api.github.com/repos/" + String(repo) + "/contents/" + String(path);
  
  http.begin(url);
  http.addHeader("Authorization", "token " + String(githubToken));
  http.addHeader("Content-Type", "application/json");
  
  String sha;
  String data = "{\"message\":\"Update GSR data\",\"content\":\"" + base64::encode(content) + "\",\"branch\":\"" + branch + "\"}";
  
  int httpCode = http.PUT(data);
  http.end();
}
