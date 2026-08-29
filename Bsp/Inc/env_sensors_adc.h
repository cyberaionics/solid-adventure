#ifndef ENV_SENSORS_ADC_H
#define ENV_SENSORS_ADC_H

#include <stdint.h>

typedef struct {
    uint16_t turbidity;
    uint16_t depth;
    uint16_t salinity;
} EnvironmentData_t;

void BSP_Sensors_ADC_Init(void);
void BSP_Sensors_ADC_ReadAll(EnvironmentData_t *sensor_data);

#endif