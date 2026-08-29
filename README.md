# Low-Power, Real-Time Adaptive Software-Defined Sonar Transmitter Payload

> **Smart India Hackathon (SIH) — Problem Statement 26058**  
> **Target Platform:** Autonomous Underwater Vehicles (AUVs)  
> **Core Architecture:** STM32H7 (ARM Cortex-M7) + Custom Analog Signal Conditioning Front-End

---

## 1. Executive Summary

Autonomous Underwater Vehicles (AUVs) operating in dynamic marine environments face a critical trade-off between image resolution and signal penetration. High-frequency acoustic chirps (500 kHz) deliver high-resolution mapping in clear waters but scatter rapidly in turbid or deep environments. Conversely, low-frequency chirps (100 kHz) penetrate sediment-heavy waters at the expense of resolution.

This repository contains the embedded firmware and hardware architecture for a **Software-Defined Sonar (SDS) Transmitter Payload**. The module continuously synthesizes windowed Linear Frequency Modulated (LFM) chirps and dynamically adapts center frequency, pulse duration, and output power in real time using Direct Digital Synthesis (DDS), Direct Memory Access (DMA), and analog front-end signal conditioning without stalling the host CPU.

---

