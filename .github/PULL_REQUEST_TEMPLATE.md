<!--
Mark with (x) in the appropriate boxes - [x]
-->

## Type of Change
- [ ] Bug fix (non-breaking change addressing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Major change (fix or feature causing breaking changes)
- [ ] Documentation improvement

## Technical Description
Provide a detailed scientific explanation of your changes following these guidelines:

1. **Objective**: 
   - Clearly state the physiological/technical problem being addressed
   - Example: "This modification improves GSR signal stability by implementing a 5-point moving average filter to reduce motion artifacts (Boucsein, 2012)."

2. **Methodology**:
   - Describe the technical implementation
   - Example: "The firmware now samples at 10Hz with IIR filtering (cutoff: 1Hz) to comply with EDA measurement standards (Dawson et al., 2011)."

3. **Validation**:
   - Specify testing protocols
   - Example: "Tested against BioPac MP150 EDA module (gold standard) with r=0.92 correlation coefficient."

## Validation Checklist
This contribution has been:
- [ ] Verified against all GitHub Actions tests
- [ ] Hardware-tested on ESP32-WROOM (for firmware changes)
- [ ] Cross-browser tested (Chrome 121+, Firefox 115+ for web changes)
- [ ] Documentation updated (where applicable)

## Evidence
### Screenshot Guidelines

### Figure 1: Real-time Psychophysiological Metrics
![Real-time GSR Monitoring](https://4211421036.github.io/pulsemind/img/181849.png)

*Caption 1: Real-time galvanic skin response (GSR) dashboard displaying:*
- **Current Stress Index**: 36% (Normal range per Dawson et al., 2011)
- **State Classification**: Normal arousal (2-5 μS range)
- **Forecast Model**: 12-hour prediction using autoregressive integrated moving average (ARIMA) 
*Key Observations:* 
- Diurnal pattern shows peak arousal at 20:00 (60% stress index)
- Physiological recovery begins post-midnight (42-48% range)

### Figure 2: Quantitative Electrodermal Metrics
![Quantitative EDA Metrics](https://4211421036.github.io/pulsemind/img/181904.png)

*Caption 2: Key psychophysiological parameters over 24-hour period:*
| Metric | Value | Clinical Interpretation |
|--------|-------|-------------------------|
| Avg. SCL | 2.6 μS | Within normal tonic range (1-5 μS) |
| Stress Duration | 0 mins | No significant sympathetic activation |
| Peak SCR | 3.3 μS | Subthreshold phasic response (<0.5 μS change) |
| Recovery Rate | 35% | Moderate parasympathetic rebound |

*Note:* All trends show increasing slope (Δ > 0.2 μS/hr), suggesting cumulative stress load (Boucsein, 2012)

### Figure 3: Weekly Stress Profile
![Weekly Stress Trends](https://4211421036.github.io/pulsemind/img/181913.png)

*Caption 3: Seven-day stress profile with 95% confidence intervals:*
- **Peak Stress**: Tuesday (68 ± 10%) 
- **Trough Stress**: Friday (31 ± 10%)
- **Pattern Analysis**: Mid-week stress accumulation (p<0.05, ANOVA) 
*Methodology:* Values represent normalized SCL (% of individual range)

### Figure 4: Evidence-Based Interventions
![Stress Mitigation Recommendations](https://4211421036.github.io/pulsemind/img/181928.png)

*Caption 4: Physiological stress interventions with demonstrated efficacy:*
1. **Ambulation Therapy** (5-min walk reduces cortisol 14.8% - Thayer et al., 2009)
2. **Hydration Protocol** (≥8 glasses maintains optimal electrolyte balance)
3. **Respiratory Biofeedback** (4-7-8 technique increases HRV by 22%)
4. **Auditory Entrainment** (60 BPM matches theta brainwave frequency)

## Technical Specifications
- **Sampling Rate**: 10Hz (meets EDA measurement standards)
- **Signal Processing**: 
  - 5-point moving average filter (0.5Hz cutoff)
  - Artifact correction using Ledalab algorithms
- **Normalization**: 
  ```math
  Stress\ Index = \frac{SCL - SCL_{min}}{SCL_{max} - SCL_{min}} \times 100\%

  
### Data Samples
Include test data when applicable:
```json
{
  "baseline_μS": 2.3,
  "peak_μS": 8.7,
  "signal_noise_ratio": 24.5
}
