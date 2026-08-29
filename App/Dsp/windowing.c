#include "windowing.h"
#include "sonar_config.h"
#include <math.h>

#define PI 3.14159265358979323846f

uint16_t Blackman_LUT[SONAR_LUT_SAMPLES];

void Sonar_Init_Window_LUT(void) {
    for (uint32_t n = 0; n < SONAR_LUT_SAMPLES; n++) {
        if (SONAR_LUT_SAMPLES <= 1U) {
            Blackman_LUT[n] = 32768U; 
            continue;
        }
        
        float ratio = (float)n / (float)(SONAR_LUT_SAMPLES - 1U);
        
        float coeff = 0.42f 
                    - 0.5f * cosf(2.0f * PI * ratio) 
                    + 0.08f * cosf(4.0f * PI * ratio);

        Blackman_LUT[n] = (uint16_t)(coeff * 32768.0f);
    }
}