# 🌊 Adaptive Software-Defined Sonar Transmitter Payload (SIH PS 26058)

[![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen.svg)]()
[![Hardware](https://img.shields.io/badge/Hardware-STM32H7-blue.svg)]()
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

## 🏗️ Architecture & Core Hardware Components

Our design specifically avoids heavy FPGA-based complexity, opting instead for a powerful microcontroller paired with a high-speed analog front-end integration to minimize power consumption.

### Bill of Materials (BOM) Highlights:
*   **Core Microcontroller:** **STM32H743VIT6** – Optimized for fast DMA transfers and precise hardware timer execution.
*   **Reconstruction Filter:** **AD8032 Dual Op-Amp** – Used for a 4th-order Sallen-Key Bessel filtering stage to smooth the DAC output.
*   **Amplitude Control:** **AD8330 Variable Gain Amplifier (VGA)** – Handles dynamic amplitude scaling of the waveform based on environmental factors.
*   **Output Driver:** **THS3091 Current-Feedback Driver** – Ensures signal integrity over the transmission line with strict 50-ohm back-termination.
*   **Transient Suppression:** **ADG701 Analog Switch** – Prevents startup pops and glitches via transient muting.
*   **Simulation Inputs:** **10k Linear Potentiometers** (with C0G RC anti-jitter filters) – Used on the bench to physically dial in simulated environmental changes.
*   **Power Subsystem:** **TPS7A20-3.3 Ultra-Low-Noise LDO Regulators** and **LMZM23601 Buck Converters** – Providing clean, stable power rails for both the analog and digital sections.

### Firmware Architecture
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
*   **Toolchain:** GCC for ARM (STM32 CubeIDE recommended).
*   **Flashing Tool:** ST-Link v2 / v3 debugger.
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

1.  **Flash the MCU:** Flash the compiled firmware onto the STM32H743VIT6 development board.
2.  **Connect the Stimulator:** Connect the MCU's sensor ADC pins to the 10k potentiometers. 
3.  **Run Environmental Stimulation:** Use the potentiometers to simulate changing water density/depth, or use the provided Python script to inject digital mock data via UART.
    ```bash
    cd sim/
    python env_stimulator.py --port COM3 --scenario deep_dive
    ```
4.  **Observe the Output:** Connect an oscilloscope to the DAC output and post-THS3091 driver stages. You will observe the waveform frequency and amplitude adapting dynamically to the stimulator's data stream while the CPU remains in its low-power sleep state.

---

## 🔮 Next Steps & Roadmap
*   **Phase 1:** Complete. System foundation, BOM, and hardware architecture mapped.
*   **Phase 2:** Current. Finalizing physical design components and flashing the Zero-CPU firmware for bench testing.
*   **Phase 3:** Integration of the signal conditioning block with the raw DMA output.
*   **Phase 4:** Wet testing and payload integration with standard AUV form factors.

---
*Built for Smart India Hackathon 2025-26 | Problem Statement 26058*
