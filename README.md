# Low-Power, Real-Time Adaptive Software-Defined Sonar Transmitter Payload

> **Smart India Hackathon (SIH) — Problem Statement 26058**  
> **Target Platform:** Autonomous Underwater Vehicles (AUVs)  
> **Core Architecture:** STM32H7 (ARM Cortex-M7) + Custom Analog Signal Conditioning Front-End

---

## 1. Executive Summary

Autonomous Underwater Vehicles (AUVs) operating in dynamic marine environments face a critical trade-off between image resolution and signal penetration. High-frequency acoustic chirps (500 kHz) deliver high-resolution mapping in clear waters but scatter rapidly in turbid or deep environments. Conversely, low-frequency chirps (100 kHz) penetrate sediment-heavy waters at the expense of resolution.

This repository contains the embedded firmware and hardware architecture for a **Software-Defined Sonar (SDS) Transmitter Payload**. The module continuously synthesizes windowed Linear Frequency Modulated (LFM) chirps and dynamically adapts center frequency, pulse duration, and output power in real time using Direct Digital Synthesis (DDS), Direct Memory Access (DMA), and analog front-end signal conditioning without stalling the host CPU.

---

## 2. Key Architecture & Features
*   **Zero-CPU Waveform Streaming:** 12-bit DAC conversions are clocked strictly by hardware timer triggers (`TIM6_TRGO`) and fed via circular DMA from internal SRAM buffers (`D1 AXI`), keeping CPU utilization below 1% during transmission.
*   **Direct Digital Synthesis (DDS):** Operates at a fixed sample rate ($F_s = 2.0\text{ MSPS}$) with a 32-bit phase accumulator, allowing instant frequency shifts without altering reconstruction filter behavior or Nyquist thresholds.
*   **Integer Q15 Windowing Engine:** Pre-computes static Blackman window envelope tables in Q15 fixed-point arithmetic, completely eliminating floating-point math during runtime adaptation loops.
*   **Ping-Pong Buffer Management:** Alternates active transmission between dual SRAM lookup tables (`Buffer_A` and `Buffer_B`) to allow background recalculation and seamless waveform swapping without acoustic phase discontinuities.
*   **Analog Front-End Conditioning:** Integrates a 4th-order Sallen-Key Bessel reconstruction filter (AD8032), an analog-controlled Variable Gain Amplifier (AD8330), an edge-smoothing transient mute switch (ADG701), and a high-slew-rate output driver (THS3091).

---

## 3. Repository Structure

```text
            ├── Core/
            │   ├── Inc/                    # Core configuration and HAL headers
            │   └── Src/
            │       ├── main.c              # System setup & low-rate adaptation superloop
            │       └── stm32h7xx_it.c      # Interrupt handlers (DMA/ADC)
            │
            ├── App/
            │   ├── Dsp/
            │   │   ├── chirp_generator.c   # Integer DDS LFM synthesis engine
            │   │   ├── chirp_generator.h
            │   │   ├── windowing.c         # Q15 Blackman windowing LUT generation
            │   │   └── windowing.h
            │   │
            │   └── Adaptation/
            │       ├── env_adaptation.c    # Transfer functions mapping ADC to DDS/VGA parameters
            │       └── env_adaptation.h
            │
            ├── Bsp/
            │   ├── Inc/
            │   │   ├── dac_dma_streamer.h  # DMA circular streaming & buffer swap controller
            │   │   ├── env_sensors_adc.h   # Multi-channel ADC reading for sensor emulation
            │   │   ├── aux_dac_vga.h       # Auxiliary DAC DC voltage driver for AD8330 gain
            │   │   └── transient_mute.h    # GPIO driver for ADG701 transient mute switch
            │   └── Src/
            │       ├── dac_dma_streamer.c
            │       ├── env_sensors_adc.c
            │       ├── aux_dac_vga.c
            │       └── transient_mute.c
            │
            ├── Config/
            │   └── sonar_config.h          # System constants, frequency limits, and buffer sizes
            │
            └── Docs/
                ├── SIH_Component_List.csv  # Bill of Materials & hardware specs
                └── Architecture_Flow.png   # Complete subsystem block diagram
```

# 🌊 Adaptive Software-Defined Sonar Transmitter Payload (SIH PS 26058)

[![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen.svg)]()
[![Hardware](https://img.shields.io/badge/Hardware-MCU%2FFPGA-blue.svg)]()
[![Firmware](https://img.shields.io/badge/Firmware-Zero--CPU%20%7C%20DMA-orange.svg)]()

## 📌 Overview
This repository contains the firmware, hardware schematics, and simulation models for a **Low-Power, Real-Time Adaptive Software-Defined Sonar Transmitter Payload** designed for Autonomous Underwater Vehicles (AUVs). 

Traditional AUV sonar systems rely on static acoustic pulses that waste battery life and degrade in changing water conditions. Our solution replaces rigid hardware and slow software simulations with a dynamic, highly efficient physical prototype that synthesizes waveforms in real-time based on environmental sensor data.

---

## 🚀 The Differentiating Factor: "Zero-CPU" Execution Model
The core innovation of this payload is its extreme power efficiency, achieved through a **Zero-CPU firmware architecture**. 

Instead of bottlenecking the main processor to generate continuous waveforms:
1. The CPU briefly reads environmental data (depth, temperature, salinity).
2. It calculates optimal acoustic parameters and configures the **Direct Memory Access (DMA)** pointers and **Hardware Timers**.
3. The CPU enters a low-power sleep state.
4. The DMA and hardware timers take over, continuously synthesizing and pushing the adapted waveform to the signal conditioning hardware with **zero ongoing CPU overhead**.

---

## 🏗️ Architecture

### 1. Hardware Architecture
*   **Core Controller:** High-efficiency Microcontroller / FPGA tailored for fast DMA transfers and precise timer generation.
*   **Environmental Sensor Array:** Interfaces for capturing real-time water conditions to inform acoustic adaptation.
*   **Signal Conditioning Block:** Amplification and filtering circuits designed to translate the digital DMA stream into pristine analog acoustic pulses.
*   *(See `hardware/BOM.csv` for the fully finalized Bill of Materials).*

### 2. Firmware Architecture
*   **Sensor Polling & Compute:** Interrupt-driven sensor polling that triggers parameter recalculation only when significant environmental deltas occur.
*   **DMA Controller:** Manages the memory-to-peripheral data transfer of waveform lookup tables (LUTs).
*   **Timer Modules:** Synchronized with the DMA to ensure exact frequency and phase of the output signal.

---

## 📂 Filesystem Architecture

```text
├── src/                    # Source code for the microcontroller/FPGA
│   ├── main.c              # Application entry point & sleep loop
│   ├── dma_config.c        # Zero-CPU DMA initialization and handlers
│   ├── timer_setup.c       # Hardware timer configurations
│   └── sensor_interface.c  # Environmental data acquisition routines
├── inc/                    # Header files and waveform LUTs
│   ├── system_config.h     # Global definitions and pin mappings
│   └── waveform_lut.h      # Pre-computed base waveforms for DMA transfer
├── hardware/               # PCB designs and component details
│   ├── schematics/         # Circuit diagrams for signal conditioning
│   └── BOM.csv             # Finalized Bill of Materials
├── sim/                    # Simulation and stimulation scripts
│   ├── env_stimulator.py   # Python script to feed mock sensor data
│   └── waveform_plot.m     # MATLAB/Octave script to visualize output
├── docs/                   # Additional documentation and pitch materials
└── README.md
```

---

## 🛠️ Usage Components

### Prerequisites
*   **Toolchain:** GCC for ARM / Vendor-specific FPGA toolchain (depending on final selected core).
*   **Flashing Tool:** J-Link or ST-Link v2 debugger.
*   **Testing:** Logic Analyzer (e.g., Saleae) and an Oscilloscope for verifying signal conditioning output.

### Building the Firmware
```bash
mkdir build
cd build
cmake ..
make
```

---

## 🧪 How to Simulate / Stimulate

Since physical underwater testing requires deployment, the repository includes a stimulation framework to test the Zero-CPU adaptation logic on the bench.

1.  **Flash the MCU:** Flash the compiled firmware onto the development board.
2.  **Connect the Stimulator:** Connect the MCU's sensor UART/I2C pins to your PC via a USB-to-Serial adapter.
3.  **Run Environmental Stimulation:** Use the provided Python script to inject changing environmental conditions, simulating a diving AUV.
    ```bash
    cd sim/
    python env_stimulator.py --port COM3 --scenario deep_dive
    ```
4.  **Observe the Output:** Connect an oscilloscope to the DAC/Timer output pins. You will observe the waveform frequency and amplitude adapting dynamically to the stimulator's data stream while the CPU remains in its low-power state.

---

## 🔮 Next Steps & Roadmap
*   **Phase 1:** Complete. System foundation, BOM, and hardware architecture mapped.
*   **Phase 2:** Current. Finalizing physical design components and flashing the Zero-CPU firmware for bench testing.
*   **Phase 3:** Integration of the signal conditioning block with the raw DMA output.
*   **Phase 4:** Wet testing and payload integration with standard AUV form factors.

---
*Built for Smart India Hackathon 2025-26 | Problem Statement 26058*
