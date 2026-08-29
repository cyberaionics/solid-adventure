#include "transient_mute.h"
#include "stm32h7xx_hal.h"

#define MUTE_PORT GPIOA
#define MUTE_PIN  GPIO_PIN_5

void BSP_Mute_Init(void) {
    BSP_Mute_Enable(); 
}

void BSP_Mute_Enable(void) {
    HAL_GPIO_WritePin(MUTE_PORT, MUTE_PIN, GPIO_PIN_RESET);
}

void BSP_Mute_Disable(void) {
    HAL_GPIO_WritePin(MUTE_PORT, MUTE_PIN, GPIO_PIN_SET);
}