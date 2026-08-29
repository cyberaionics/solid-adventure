#ifndef SONAR_CONFIG_H
#define SONAR_CONFIG_H

#include <stdint.h>

#define SONAR_LUT_SAMPLES            1024U

#define SONAR_DAC_MAX_VAL            4095U
#define SONAR_DAC_MID_VAL            2048U

#define SONAR_FREQ_MIN_HZ            100000U
#define SONAR_FREQ_MAX_HZ            500000U
#define SONAR_CHIRP_BANDWIDTH_HZ     100000U

#define SONAR_DEFAULT_START_HZ       100000U
#define SONAR_DEFAULT_END_HZ         (SONAR_DEFAULT_START_HZ + SONAR_CHIRP_BANDWIDTH_HZ)

#define SONAR_BASE_SAMPLE_RATE_HZ    2000000U

#define ADC_CHANNEL_COUNT            3U
#define ADC_IDX_TURBIDITY            0U
#define ADC_IDX_DEPTH                1U
#define ADC_IDX_SALINITY             2U

#define ADC_12BIT_MAX                4095U

#endif 