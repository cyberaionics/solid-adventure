#include "aux_dac_vga.h"
#include "stm32h7xx_hal.h"

extern DAC_HandleTypeDef hdac1; 

void BSP_AuxDAC_Init(void) {
    HAL_DAC_Start(&hdac1, DAC_CHANNEL_2);
    BSP_AuxDAC_SetGain(2048U);
}

void BSP_AuxDAC_SetGain(uint16_t dac_value) {
    if (dac_value > 4095U) {
        dac_value = 4095U;
    }
    HAL_DAC_SetValue(&hdac1, DAC_CHANNEL_2, DAC_ALIGN_12B_R, (uint32_t)dac_value);
}