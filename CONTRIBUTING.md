# How to Contribute to PulseMind

We welcome contributions from the community! Here's how you can help improve this GSR monitoring system.

## Contribution Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## Code Structure

```
pulsemind/
├── arduino/          # Arduino/ESP32 code
│   └── pulsemind.ino # Main firmware file
├── index.html/       # HTML/CSS/JS files
├── docs/              # Documentation
└── .github/           # GitHub configurations
```

## Coding Standards

### For Arduino (.ino) Files:
1. Follow Arduino Style Guide
2. Use descriptive variable names
3. Comment complex logic
4. Keep functions under 50 lines
5. Example template:

```arduino
/**
 * @brief Brief description of function
 * @param param1 Description of first parameter
 * @return Description of return value
 */
float exampleFunction(float param1) {
  // Input validation
  if (isnan(param1)) {
    return NAN;
  }

  // Main logic
  float result = param1 * 2.0;

  return result;
}
```

### For HTML/JS Files:
1. Use ES6+ syntax
2. Follow consistent indentation (2 spaces)
3. Document complex functions
4. Example template:

```javascript
/**
 * Calculates stress level from GSR reading
 * @param {number} conductance - Skin conductance in μS
 * @returns {number} Stress percentage (0-100)
 */
function calculateStress(conductance) {
  // Input validation
  if (typeof conductance !== 'number') {
    throw new Error('Invalid input type');
  }

  // Classification logic
  if (conductance < 2.0) {
    return (conductance / 2.0) * 25;
  }
  // ... additional logic
}
```

## Pull Request Requirements

1. **Description**:
   - Clearly explain the changes
   - Reference related issues (#123)
   - Include screenshots for UI changes

2. **Testing**:
   - For firmware: Include test results from serial monitor
   - For web: Include browser testing results

3. **Checklist**:
   - [ ] Code compiles/runs without errors
   - [ ] Documentation updated (if applicable)
   - [ ] No commented-out code
   - [ ] Follows existing style

## Development Setup

### Arduino Environment:
1. Required libraries:
   - WiFi.h
   - HTTPClient.h
   - ArduinoJson.h
   - base64.h

2. Board: ESP32 Dev Module

### Web Dashboard:
1. Serve via local web server
2. Test with Chrome/Firefox latest versions

## Issue Reporting

When creating issues:
1. Use the appropriate template
2. Include:
   - Expected vs actual behavior
   - Steps to reproduce
   - Environment details
   - Error logs (if applicable)

## Code Review Process

1. Initial automated checks (GitHub Actions)
2. Maintainer review within 3 business days
3. Possible request for changes
4. Approval and merge

---

Thank you for contributing to PulseMind! Your work helps advance psychophysiological monitoring technology.
