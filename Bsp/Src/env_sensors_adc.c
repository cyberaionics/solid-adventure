#include "env_sensors_adc.h"
#include "stm32h7xx_hal.h"

extern ADC_HandleTypeDef hadc1;

void BSP_Sensors_ADC_Init(void) {
    HAL_ADCEx_Calibration_Start(&hadc1, ADC_CALIB_OFFSET, ADC_SINGLE_ENDED);
}


void BSP_Sensors_ADC_ReadAll(EnvironmentData_t *sensor_data) {
    HAL_ADC_Start(&hadc1);
    
    if (HAL_ADC_PollForConversion(&hadc1, HAL_MAX_DELAY) == HAL_OK) {
        sensor_data->turbidity = HAL_ADC_GetValue(&hadc1);
    }
    if (HAL_ADC_PollForConversion(&hadc1, HAL_MAX_DELAY) == HAL_OK) {
        sensor_data->depth = HAL_ADC_GetValue(&hadc1);
    }
    if (HAL_ADC_PollForConversion(&hadc1, HAL_MAX_DELAY) == HAL_OK) {
        sensor_data->salinity = HAL_ADC_GetValue(&hadc1);
    }
    
    HAL_ADC_Stop(&hadc1);
}