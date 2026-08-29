#include "dac_dma_streamer.h"
#include "stm32h7xx_hal.h"

extern DAC_HandleTypeDef hdac1;
extern TIM_HandleTypeDef htim6;

__attribute__((section(".sram1_bss"))) uint32_t Sonar_Buffer_A[SONAR_LUT_SAMPLES];
__attribute__((section(".sram1_bss"))) uint32_t Sonar_Buffer_B[SONAR_LUT_SAMPLES];

static uint8_t active_buffer = 0;

void BSP_DAC_DMA_Init(void) {
    active_buffer = 0;
}

void BSP_DAC_DMA_Start(void) {
    HAL_DAC_Start_DMA(&hdac1, DAC_CHANNEL_1, (uint32_t*)Sonar_Buffer_A, SONAR_LUT_SAMPLES, DAC_ALIGN_12B_R);
    HAL_TIM_Base_Start(&htim6);
}

void BSP_DAC_DMA_Stop(void) {
    HAL_TIM_Base_Stop(&htim6);
    HAL_DAC_Stop_DMA(&hdac1, DAC_CHANNEL_1);
}

void BSP_DAC_Swap_Buffer(void) {
    BSP_DAC_DMA_Stop();
    
    if (active_buffer == 0) {
        HAL_DAC_Start_DMA(&hdac1, DAC_CHANNEL_1, (uint32_t*)Sonar_Buffer_B, SONAR_LUT_SAMPLES, DAC_ALIGN_12B_R);
        active_buffer = 1;
    } else {
        HAL_DAC_Start_DMA(&hdac1, DAC_CHANNEL_1, (uint32_t*)Sonar_Buffer_A, SONAR_LUT_SAMPLES, DAC_ALIGN_12B_R);
        active_buffer = 0;
    }
    
    HAL_TIM_Base_Start(&htim6);
}