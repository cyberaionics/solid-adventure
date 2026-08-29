#include "chirp_generator.h"
#include "windowing.h"
#include "sonar_config.h"
#include <math.h>

#define SINE_LUT_SIZE 4096U

static uint16_t Sine_LUT[SINE_LUT_SIZE]; 

void Sonar_Init_DDS_Table(void) {
    for (uint32_t i = 0; i < SINE_LUT_SIZE; i++) {
        float phase = (float)i * (2.0f * 3.14159265f / (float)SINE_LUT_SIZE);
        Sine_LUT[i] = (uint16_t)((sinf(phase) + 1.0f) * (float)SONAR_DAC_MID_VAL);
    }
}

void Sonar_Generate_Chirp_DDS(uint32_t *target_buffer, uint32_t start_freq_hz, uint32_t end_freq_hz) {
    uint32_t phase_accumulator = 0;
    
    uint32_t phase_increment = (uint32_t)(((uint64_t)start_freq_hz << 32) / SONAR_BASE_SAMPLE_RATE_HZ);
    
    uint32_t freq_diff = end_freq_hz - start_freq_hz;
    uint32_t phase_step = (uint32_t)(((uint64_t)freq_diff << 32) / (SONAR_BASE_SAMPLE_RATE_HZ * SONAR_LUT_SAMPLES));

    for (uint32_t n = 0; n < SONAR_LUT_SAMPLES; n++) {
        uint32_t lut_index = phase_accumulator >> 20;
        
        uint16_t raw_val = Sine_LUT[lut_index];
        
        int32_t ac_val = (int32_t)raw_val - (int32_t)SONAR_DAC_MID_VAL;
        
        int32_t windowed_ac = (ac_val * (int32_t)Blackman_LUT[n]) >> 15;
        
        target_buffer[n] = (uint32_t)(windowed_ac + (int32_t)SONAR_DAC_MID_VAL);
        
        phase_accumulator += phase_increment;
        phase_increment += phase_step;
    }
}