#include "main.h"

extern DMA_HandleTypeDef hdma_dac1_ch1;

void SysTick_Handler(void) {
    HAL_IncTick();
}

void DMA1_Stream1_IRQHandler(void) {
    HAL_DMA_IRQHandler(&hdma_dac1_ch1);
}

