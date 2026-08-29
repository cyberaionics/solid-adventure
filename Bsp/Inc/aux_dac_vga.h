#ifndef AUX_DAC_VGA_H
#define AUX_DAC_VGA_H

#include <stdint.h>

void BSP_AuxDAC_Init(void);
void BSP_AuxDAC_SetGain(uint16_t dac_value);

#endif 