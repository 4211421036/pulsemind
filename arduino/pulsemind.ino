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
const char* path = "data/gsr.json";
const int UPDATE_INTERVAL = 30000; // 30 detik

// Parameter GSR berdasarkan studi Boucsein (2012)
#define ADC_PIN 34
#define SCL_MIN 1.0    // μS (range normal)
#define SCL_MAX 20.0
#define WINDOW_SIZE 5  // Moving average filter

float edaBuffer[WINDOW_SIZE] = {0};
int bufferIndex = 0;
unsigned long lastUpdate = 0;
String fileSHA = "";

void setup() {
  Serial.begin(115200);
  connectWiFi();
  calibrateGSR();
  initializeGitHubFile();
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Menghubungkan ke WiFi");
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("\nTerhubung dengan IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nGagal terhubung WiFi");
    ESP.restart();
  }
}

void calibrateGSR() {
  // Kalibrasi 30 detik sesuai protokol Lykken & Venables (1971)
  float sum = 0;
  for(int i=0; i<300; i++) {
    sum += analogRead(ADC_PIN);
    delay(100);
  }
  float baselineVoltage = (sum/300 * 3.3) / 4095.0;
  float baselineConductance = (baselineVoltage / 1000000.0) * 1000000;
  Serial.printf("Baseline SCL: %.2f μS\n", baselineConductance);
}

float readGSR() {
  // Pembacaan dengan moving average filter
  float raw = analogRead(ADC_PIN);
  float voltage = (raw * 3.3) / 4095.0;
  float conductance = (voltage / 1000000.0) * 1000000; // Konversi ke μS
  
  edaBuffer[bufferIndex] = conductance;
  bufferIndex = (bufferIndex + 1) % WINDOW_SIZE;
  
  float filtered = 0;
  for(int i=0; i<WINDOW_SIZE; i++) filtered += edaBuffer[i];
  return filtered / WINDOW_SIZE;
}

String getCurrentSHA() {
  HTTPClient http;
  String url = "https://api.github.com/repos/" + String(repo) + "/contents/" + String(path);
  String sha = "";
  
  http.begin(url);
  http.addHeader("Authorization", "token " + String(githubToken));
  
  int httpCode = http.GET();
  if(httpCode == HTTP_CODE_OK) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    sha = doc["sha"].as<String>();
    Serial.println("SHA diterima: " + sha);
  } else {
    Serial.printf("Gagal mendapatkan SHA. Kode error: %d\n", httpCode);
  }
  
  http.end();
  return sha;
}

void uploadData(float conductance) {
  HTTPClient http;
  String url = "https://api.github.com/repos/" + String(repo) + "/contents/" + String(path);
  
  // Ambil SHA terbaru
  fileSHA = getCurrentSHA();
  
  // Format payload JSON
  DynamicJsonDocument doc(256);
  doc["timestamp"] = millis();
  doc["conductance"] = round(conductance * 100) / 100;
  doc["scl_status"] = getSCLStatus(conductance);
  
  String payload;
  serializeJson(doc, payload);
  
  http.begin(url);
  http.addHeader("Authorization", "token " + String(githubToken));
  http.addHeader("Content-Type", "application/json");
  
  String data = "{"
    "\"message\":\"Update GSR Data\","
    "\"content\":\"" + base64::encode(payload) + "\","
    "\"sha\":\"" + fileSHA + "\""
  "}";

  int httpCode = http.PUT(data);
  
  if(httpCode == HTTP_CODE_OK) {
    Serial.println("Data berhasil diupload");
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, http.getString());
    fileSHA = responseDoc["content"]["sha"].as<String>();
  } else {
    Serial.printf("Gagal upload. Kode error: %d\n", httpCode);
    Serial.println("Response: " + http.getString());
  }
  
  http.end();
}

String getSCLStatus(float conductance) {
  // Klasifikasi berdasarkan studi Dawson et al. (2011)
  if(conductance < 2.0) return "Relaxed";
  if(conductance < 5.0) return "Normal";
  if(conductance < 10.0) return "Stressed";
  return "High Stress";
}

void initializeGitHubFile() {
  if(getCurrentSHA() == "") {
    Serial.println("Membuat file awal...");
    uploadData(0.0); // Upload data dummy
  }
}

void loop() {
  if(millis() - lastUpdate >= UPDATE_INTERVAL) {
    if(WiFi.status() == WL_CONNECTED) {
      float conductance = readGSR();
      Serial.printf("Pembacaan GSR: %.2f μS\n", conductance);
      uploadData(conductance);
    } else {
      Serial.println("Koneksi WiFi terputus");
      connectWiFi();
    }
    lastUpdate = millis();
  }
}
