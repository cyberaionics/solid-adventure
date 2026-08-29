# System Architecture: Software-Defined Sonar Transmitter

## 1. Data & Control Flow (Schematic Map)

```text
        Environmental Sensors / Dials 
                     │ 
            (RC Filtered Analog Inputs)
                     ▼
        [ STM32 ADC + DMA (16-bit) ]
                     │
                     ▼
       [ Environmental State Estimator ]
                     │
                     ▼
      [ CPU: Adaptive Parameter Engine ] ───────────────────────────────┐
                     │                                                  |
            (Phase Increment)                                   (Aux DC / GPIO Mute)
                     ▼                                                  ▼ 
         [ DDS / Waveform Engine ]                       [ AD8330 VGA & ADG701 Mute ]
                     │                                                  |
            (Calculates Samples)                                        │
                     ▼                                                  │
        [ SRAM: Ping-Pong Buffers ]                                     │
                     │                                                  |
                (DMA Stream)                                            │
                     ▼                                                  │
        [ Internal 12-bit DAC1 ] ◄── [ TIMx: TRGO Trigger ]             │
                     │                                                  │
                     ▼                                                  ▼
        [ 4th-Order Bessel LPF ] ──────────► [ Gain & High-Current Driver Stage ] ──► [ 50Ω Matched Output ]

```

# Filesystem Architecture

The firmware codebase follows a strict, modular layered pattern designed for the STM32 ecosystem. It separates low-level hardware drivers (BSP) from the high-level math and adaptation logic (App), ensuring the core DSP engine remains platform-agnostic.

```text
sonar-transmitter-firmware/
│
├── Core/                               # Layer 5: System Execution
│   ├── Inc/
│   │   └── main.h                      # Global includes and pin definitions
│   └── Src/
│       ├── main.c                      # App entry point, main polling & control loop
│       └── stm32h7xx_it.c              # Interrupt service routines (DMA transfer complete)
│
├── App/                                # Layer 3 & 4: Application & DSP Core
│   ├── Dsp/
│   │   ├── chirp_generator.c           # Integer DDS LFM synthesis engine
│   │   ├── chirp_generator.h
│   │   ├── windowing.c                 # Q15 Blackman windowing LUT generation
│   │   └── windowing.h
│   │
│   └── Adaptation/
│       ├── env_adaptation.c            # Transfer functions mapping ADC to DDS/VGA parameters
│       └── env_adaptation.h
│
├── Bsp/                                # Layer 2: Board Support Package (Hardware Drivers)
│   ├── Inc/
│   │   ├── dac_dma_streamer.h          # DMA circular streaming & buffer swap controller
│   │   ├── env_sensors_adc.h           # Multi-channel ADC reading for sensor emulation
│   │   ├── aux_dac_vga.h               # Auxiliary DAC DC voltage driver for AD8330 gain
│   │   └── transient_mute.h            # GPIO driver for ADG701 transient mute switch
│   └── Src/
│       ├── dac_dma_streamer.c
│       ├── env_sensors_adc.c
│       ├── aux_dac_vga.c
│       └── transient_mute.c
│
└── Config/                             # Layer 1: Configuration
    └── sonar_config.h                  # System constants, frequency limits, and buffer sizes
```