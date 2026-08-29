#ifndef CHIRP_GENERATOR_H
#define CHIRP_GENERATOR_H

#include <stdint.h>

void Sonar_Init_DDS_Table(void);

void Sonar_Generate_Chirp_DDS(uint32_t *target_buffer, uint32_t start_freq_hz, uint32_t end_freq_hz);

#endif 