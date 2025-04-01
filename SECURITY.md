# Security Policy for PulseMind GSR Monitoring System

## Supported Versions

The following versions of PulseMind are currently supported with security updates:

| Version | Supported          | Maintenance Status               |
| ------- | ------------------ | -------------------------------- |
| 2.1.x   | :white_check_mark: | Active development               |
| 2.0.x   | :white_check_mark: | Security patches only            |
| 1.2.x   | :x:                | End-of-life (no longer supported)|
| < 1.2   | :x:                | End-of-life                      |

## Security Considerations

### System Components

1. **ESP32 Firmware**:
   - Secure WiFi connection (WPA2)
   - GitHub API token encryption
   - Data transmission via HTTPS

2. **Web Dashboard**:
   - Content Security Policy (CSP) implemented
   - Data sanitization for all user inputs
   - Secure HTTP headers (HSTS, XSS Protection)

3. **Data Storage**:
   - GitHub repository with private visibility option
   - Base64-encoded data payloads
   - Access control via personal access tokens

## Reporting a Vulnerability

### Vulnerability Disclosure Process

We take security vulnerabilities seriously. If you discover a security issue in PulseMind, please follow this responsible disclosure process:

1. **Initial Report**:
   - Email security concerns to: [hanifahseptiani45@gmail.com](hanifahseptiani45@gmail.com)
   - Subject line: "PulseMind Security Vulnerability"
   - Include:
     * Detailed description of the vulnerability
     * Steps to reproduce
     * Any proof-of-concept code
     * Suggested fixes (if available)

2. **Response Timeline**:
   - Acknowledgement within 48 hours
   - Initial assessment within 5 business days
   - Patch development timeline communicated within 10 business days

3. **Public Disclosure**:
   - Vulnerabilities will be disclosed publicly after being addressed
   - Credit will be given to reporters (unless requested otherwise)

### Security Update Policy

1. **Critical Vulnerabilities**:
   - Patches released within 72 hours of confirmation
   - Automatic version bump and notification

2. **High Severity**:
   - Patches within 14 days
   - Version update in next scheduled release

3. **Medium/Low Severity**:
   - Addressed in next scheduled release cycle

## Best Practices for Users

1. **Hardware Security**:
   - Change default WiFi credentials before deployment
   - Rotate GitHub tokens quarterly
   - Use hardware encryption modules for production deployments

2. **Software Security**:
   ```arduino
   // Always validate sensor readings
   float readGSR() {
     float raw = analogRead(ADC_PIN);
     if(raw < 0 || raw > 4095) {
       logError("Invalid sensor reading");
       return NAN;
     }
     // ... rest of processing
   }
   ```

3. **Dashboard Security**:
   - Implement authentication for the web interface
   - Use HTTPS for all connections
   - Regularly audit third-party dependencies

## Known Vulnerabilities

| Vulnerability | Affected Versions | Patched In | Severity |
|--------------|-------------------|------------|----------|
| Plaintext token storage | < 2.0.0 | 2.0.1 | High |
| Missing data validation | < 1.2.3 | 1.2.4 | Medium |
| XSS in dashboard | 2.0.0-2.0.3 | 2.0.4 | Critical |

## Security Updates

Subscribe to our security announcements by watching the GitHub repository. All security releases will be tagged with `[SECURITY]` in the release notes.

For additional security guidance specific to your deployment scenario, please contact our security team at [hanifahseptiani45@gmail.com](hanifahseptiani45@gmail.com).
