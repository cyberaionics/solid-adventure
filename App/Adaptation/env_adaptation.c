#include "env_adaptation.h"
#include "env_sensors_adc.h"
#include "aux_dac_vga.h"
#include "chirp_generator.h"
#include "dac_dma_streamer.h"
#include "sonar_config.h"
#include <stdlib.h> 

#define ADC_JITTER_THRESHOLD 50U 

static uint16_t last_turbidity = 0U;
static uint16_t last_depth = 0U;

void Sonar_Adaptation_Process(void) {
    EnvironmentData_t env_data;
    
    BSP_Sensors_ADC_ReadAll(&env_data);
    
    if (abs((int32_t)env_data.depth - (int32_t)last_depth) > (int32_t)ADC_JITTER_THRESHOLD) {
        BSP_AuxDAC_SetGain(env_data.depth);
        last_depth = env_data.depth;
    }
    
    if (abs((int32_t)env_data.turbidity - (int32_t)last_turbidity) > (int32_t)ADC_JITTER_THRESHOLD) {
        
        uint32_t max_start_freq = SONAR_FREQ_MAX_HZ - SONAR_CHIRP_BANDWIDTH_HZ;
        
        uint32_t freq_span = max_start_freq - SONAR_FREQ_MIN_HZ;
        
        uint32_t freq_offset = ((uint32_t)env_data.turbidity * freq_span) / ADC_12BIT_MAX;
        
        uint32_t current_start_freq = max_start_freq - freq_offset;
        uint32_t current_end_freq = current_start_freq + SONAR_CHIRP_BANDWIDTH_HZ;

        Sonar_Generate_Chirp_DDS(Sonar_Buffer_B, current_start_freq, current_end_freq);
        
        BSP_DAC_Swap_Buffer();
        
        last_turbidity = env_data.turbidity;
    }
}