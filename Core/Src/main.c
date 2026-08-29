#include "main.h"
#include "sonar_config.h"
#include "transient_mute.h"
#include "env_sensors_adc.h"
#include "aux_dac_vga.h"
#include "dac_dma_streamer.h"
#include "windowing.h"
#include "chirp_generator.h"
#include "env_adaptation.h"

void SystemClock_Config(void);

int main(void) {
    HAL_Init();
    SystemClock_Config();
    
    MX_GPIO_Init();
    MX_DMA_Init();
    MX_DAC1_Init();
    MX_TIM6_Init();
    MX_ADC1_Init();

    BSP_Mute_Init();        
    BSP_Sensors_ADC_Init(); 
    BSP_AuxDAC_Init();      
    BSP_DAC_DMA_Init();     
    Sonar_Init_Window_LUT();
    Sonar_Init_DDS_Table();
    Sonar_Generate_Chirp_DDS(Sonar_Buffer_A, SONAR_DEFAULT_START_HZ, SONAR_DEFAULT_END_HZ);
    BSP_DAC_DMA_Start();    
    BSP_Mute_Disable();     
    while (1) {
        Sonar_Adaptation_Process();
        HAL_Delay(10);
    }
}