#ifndef DAC_DMA_STREAMER_H
#define DAC_DMA_STREAMER_H

#include <stdint.h>
#include "sonar_config.h"

extern uint32_t Sonar_Buffer_A[SONAR_LUT_SAMPLES];
extern uint32_t Sonar_Buffer_B[SONAR_LUT_SAMPLES];

void BSP_DAC_DMA_Init(void);
void BSP_DAC_DMA_Start(void);
void BSP_DAC_DMA_Stop(void);
void BSP_DAC_Swap_Buffer(void);

#endif 