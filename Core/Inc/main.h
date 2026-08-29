
#ifndef MAIN_H
#define MAIN_H

#include "stm32h7xx_hal.h"

void MX_GPIO_Init(void);
void MX_DMA_Init(void);
void MX_DAC1_Init(void);
void MX_TIM6_Init(void);
void MX_ADC1_Init(void);
void Error_Handler(void);

#endif