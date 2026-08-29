/* ═══════════════════════════════════════════════════════
   Adaptive Sonar Transmitter — DSP Engine & Renderer
   Direct port of STM32H7 firmware to JavaScript
   ═══════════════════════════════════════════════════════ */

// ── Config (from sonar_config.h) ──
const SONAR_LUT_SAMPLES        = 1024;
const SONAR_DAC_MAX_VAL         = 4095;
const SONAR_DAC_MID_VAL         = 2048;
const SONAR_FREQ_MIN_HZ         = 100000;
const SONAR_FREQ_MAX_HZ         = 500000;
const SONAR_CHIRP_BANDWIDTH_HZ  = 100000;
const SONAR_DEFAULT_START_HZ    = 100000;
const SONAR_DEFAULT_END_HZ      = SONAR_DEFAULT_START_HZ + SONAR_CHIRP_BANDWIDTH_HZ;
const SONAR_BASE_SAMPLE_RATE_HZ = 2000000;
const ADC_12BIT_MAX             = 4095;
const ADC_JITTER_THRESHOLD      = 50;
const SINE_LUT_SIZE             = 4096;

// ── DDS Lookup Tables ──
const Sine_LUT    = new Uint16Array(SINE_LUT_SIZE);
const Blackman_LUT = new Uint16Array(SONAR_LUT_SAMPLES);

// ── Ping-Pong Buffers ──
const Sonar_Buffer_A = new Uint32Array(SONAR_LUT_SAMPLES);
const Sonar_Buffer_B = new Uint32Array(SONAR_LUT_SAMPLES);

// ── Adaptation State ──
let last_turbidity = 0;
let last_depth = 0;
let active_buffer = 0;   // 0 = A, 1 = B
let swap_count = 0;
let gain_count = 0;
let current_start_freq = SONAR_DEFAULT_START_HZ;
let current_end_freq   = SONAR_DEFAULT_END_HZ;
let current_gain       = 2048;

// ═══════════════════════════
//  DSP CORE — Ported from C
// ═══════════════════════════

/** Port of Sonar_Init_DDS_Table() from chirp_generator.c */
function Sonar_Init_DDS_Table() {
  for (let i = 0; i < SINE_LUT_SIZE; i++) {
    const phase = i * (2.0 * Math.PI / SINE_LUT_SIZE);
    Sine_LUT[i] = Math.round((Math.sin(phase) + 1.0) * SONAR_DAC_MID_VAL);
  }
}

/** Port of Sonar_Init_Window_LUT() from windowing.c */
function Sonar_Init_Window_LUT() {
  for (let n = 0; n < SONAR_LUT_SAMPLES; n++) {
    if (SONAR_LUT_SAMPLES <= 1) {
      Blackman_LUT[n] = 32768;
      continue;
    }
    const ratio = n / (SONAR_LUT_SAMPLES - 1);
    const coeff = 0.42 - 0.5 * Math.cos(2.0 * Math.PI * ratio)
                       + 0.08 * Math.cos(4.0 * Math.PI * ratio);
    Blackman_LUT[n] = Math.round(coeff * 32768.0);
  }
}

/**
 * Port of Sonar_Generate_Chirp_DDS() from chirp_generator.c
 * Uses integer DDS with 32-bit phase accumulator (simulated with JS numbers).
 * JS numbers are 64-bit floats, safe for integers up to 2^53.
 */
function Sonar_Generate_Chirp_DDS(target_buffer, start_freq_hz, end_freq_hz) {
  let phase_accumulator = 0;
  let phase_increment = Math.floor((start_freq_hz * 4294967296) / SONAR_BASE_SAMPLE_RATE_HZ);
  const freq_diff = end_freq_hz - start_freq_hz;
  const phase_step = Math.floor((freq_diff * 4294967296) / (SONAR_BASE_SAMPLE_RATE_HZ * SONAR_LUT_SAMPLES));

  for (let n = 0; n < SONAR_LUT_SAMPLES; n++) {
    // Mask to 32-bit unsigned
    phase_accumulator = phase_accumulator & 0xFFFFFFFF;
    const lut_index = (phase_accumulator >>> 20) & 0xFFF;
    const raw_val = Sine_LUT[lut_index];
    const ac_val = raw_val - SONAR_DAC_MID_VAL;
    const windowed_ac = (ac_val * Blackman_LUT[n]) >> 15;
    target_buffer[n] = (windowed_ac + SONAR_DAC_MID_VAL) & 0xFFFFFFFF;

    phase_accumulator += phase_increment;
    phase_increment += phase_step;
  }
}

/** Port of Sonar_Adaptation_Process() from env_adaptation.c */
function Sonar_Adaptation_Process(turbidity, depth, salinity) {
  let swapped = false;
  let gainUpdated = false;

  // Depth → VGA gain
  if (Math.abs(depth - last_depth) > ADC_JITTER_THRESHOLD) {
    current_gain = depth;
    last_depth = depth;
    gain_count++;
    gainUpdated = true;
  }

  // Turbidity → chirp frequency
  if (Math.abs(turbidity - last_turbidity) > ADC_JITTER_THRESHOLD) {
    const max_start_freq = SONAR_FREQ_MAX_HZ - SONAR_CHIRP_BANDWIDTH_HZ;
    const freq_span = max_start_freq - SONAR_FREQ_MIN_HZ;
    const freq_offset = Math.floor((turbidity * freq_span) / ADC_12BIT_MAX);
    current_start_freq = max_start_freq - freq_offset;
    current_end_freq = current_start_freq + SONAR_CHIRP_BANDWIDTH_HZ;

    // Write to inactive buffer, then swap
    const target = active_buffer === 0 ? Sonar_Buffer_B : Sonar_Buffer_A;
    Sonar_Generate_Chirp_DDS(target, current_start_freq, current_end_freq);
    active_buffer = active_buffer === 0 ? 1 : 0;
    swap_count++;
    swapped = true;

    last_turbidity = turbidity;
  }

  return { swapped, gainUpdated };
}

/** Get the currently active buffer */
function getActiveBuffer() {
  return active_buffer === 0 ? Sonar_Buffer_A : Sonar_Buffer_B;
}


// ═══════════════
//  FFT (Radix-2)
// ═══════════════

function fft(re, im) {
  const N = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) { j ^= bit; }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // Cooley-Tukey
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2.0 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const tRe = curRe * re[i + j + len / 2] - curIm * im[i + j + len / 2];
        const tIm = curRe * im[i + j + len / 2] + curIm * re[i + j + len / 2];
        re[i + j + len / 2] = re[i + j] - tRe;
        im[i + j + len / 2] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

function computeMagnitudeSpectrum(buffer) {
  const N = buffer.length;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    re[i] = buffer[i] - SONAR_DAC_MID_VAL;
  }
  fft(re, im);
  const mag = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return mag;
}


// ═══════════════════════
//  CANVAS RENDERING
// ═══════════════════════

const cvWaveform = document.getElementById('canvas-waveform');
const cvSpectrum = document.getElementById('canvas-spectrum');
const cvWindow   = document.getElementById('canvas-window');

function setupCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width - 32;  // padding
  const h = canvas.height;    // use default
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

// ── Colors ──
const COL_BG       = '#0a0e17';
const COL_GRID     = '#1e293b';
const COL_GRID_T   = 'rgba(30,41,59,0.5)';
const COL_WAVE     = '#22d3ee';
const COL_WAVE_G   = 'rgba(34,211,238,0.12)';
const COL_FFT_S    = '#a78bfa';
const COL_FFT_F    = 'rgba(167,139,250,0.25)';
const COL_WIN_S    = '#2dd4bf';
const COL_WIN_F    = 'rgba(45,212,191,0.15)';
const COL_TEXT     = '#64748b';

function drawGrid(ctx, w, h, xDivs, yDivs) {
  ctx.strokeStyle = COL_GRID;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= xDivs; i++) {
    const x = (i / xDivs) * w;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let i = 0; i <= yDivs; i++) {
    const y = (i / yDivs) * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function renderWaveform() {
  const { ctx, w, h } = setupCanvas(cvWaveform);
  const buffer = getActiveBuffer();
  const pad = { top: 20, bottom: 30, left: 50, right: 15 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Background
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.save();
  ctx.translate(pad.left, pad.top);
  drawGrid(ctx, plotW, plotH, 10, 8);

  // Center line
  ctx.strokeStyle = 'rgba(34,211,238,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, plotH / 2);
  ctx.lineTo(plotW, plotH / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Waveform glow
  ctx.shadowColor = COL_WAVE;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = COL_WAVE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < SONAR_LUT_SAMPLES; i++) {
    const x = (i / (SONAR_LUT_SAMPLES - 1)) * plotW;
    const y = (1 - buffer[i] / SONAR_DAC_MAX_VAL) * plotH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill under waveform
  ctx.lineTo(plotW, plotH);
  ctx.lineTo(0, plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, plotH);
  grad.addColorStop(0, COL_WAVE_G);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();

  // Y-axis labels
  ctx.fillStyle = COL_TEXT;
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(SONAR_DAC_MAX_VAL * (1 - i / 4));
    const y = pad.top + (i / 4) * plotH;
    ctx.fillText(val.toString(), pad.left - 6, y + 3);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  const labels = [0, 256, 512, 768, 1023];
  for (const l of labels) {
    const x = pad.left + (l / 1023) * plotW;
    ctx.fillText(l.toString(), x, h - 8);
  }
}

function renderSpectrum() {
  const { ctx, w, h } = setupCanvas(cvSpectrum);
  const buffer = getActiveBuffer();
  const mag = computeMagnitudeSpectrum(buffer);
  const pad = { top: 15, bottom: 28, left: 45, right: 10 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(pad.left, pad.top);
  drawGrid(ctx, plotW, plotH, 8, 6);

  // Normalize
  let maxMag = 1;
  for (let i = 1; i < mag.length; i++) { if (mag[i] > maxMag) maxMag = mag[i]; }

  // Find peak
  let peakIdx = 0;
  for (let i = 1; i < mag.length; i++) { if (mag[i] > mag[peakIdx]) peakIdx = i; }
  const peakFreq = (peakIdx * SONAR_BASE_SAMPLE_RATE_HZ) / SONAR_LUT_SAMPLES;

  // Draw bars + line
  ctx.strokeStyle = COL_FFT_S;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = COL_FFT_S;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  for (let i = 0; i < mag.length; i++) {
    const x = (i / (mag.length - 1)) * plotW;
    const barH = (mag[i] / maxMag) * plotH;
    const y = plotH - barH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill
  ctx.lineTo(plotW, plotH);
  ctx.lineTo(0, plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, plotH);
  grad.addColorStop(0, COL_FFT_F);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();

  // X-axis frequency labels
  ctx.fillStyle = COL_TEXT;
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  const maxFreqDisplay = SONAR_BASE_SAMPLE_RATE_HZ / 2;
  for (let i = 0; i <= 4; i++) {
    const f = (i / 4) * maxFreqDisplay;
    const x = pad.left + (i / 4) * plotW;
    ctx.fillText((f / 1000).toFixed(0) + 'k', x, h - 6);
  }

  // Update peak badge
  document.getElementById('vb-peak').textContent = 'Peak: ' + (peakFreq / 1000).toFixed(1) + ' kHz';
}

function renderWindow() {
  const { ctx, w, h } = setupCanvas(cvWindow);
  const pad = { top: 15, bottom: 28, left: 40, right: 10 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(pad.left, pad.top);
  drawGrid(ctx, plotW, plotH, 8, 6);

  // Normalize: max value is 32768 * 1.0 = ~32768 for Blackman at center
  const maxVal = 32768;

  ctx.strokeStyle = COL_WIN_S;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = COL_WIN_S;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  for (let i = 0; i < SONAR_LUT_SAMPLES; i++) {
    const x = (i / (SONAR_LUT_SAMPLES - 1)) * plotW;
    const y = plotH - (Blackman_LUT[i] / maxVal) * plotH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill
  ctx.lineTo(plotW, plotH);
  ctx.lineTo(0, plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, plotH);
  grad.addColorStop(0, COL_WIN_F);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();

  // Labels
  ctx.fillStyle = COL_TEXT;
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('0', pad.left, h - 6);
  ctx.fillText('512', pad.left + plotW / 2, h - 6);
  ctx.fillText('1023', pad.left + plotW, h - 6);
  ctx.textAlign = 'right';
  ctx.fillText('1.0', pad.left - 5, pad.top + 4);
  ctx.fillText('0.0', pad.left - 5, pad.top + plotH + 3);
}


// ═══════════════════════
//  UI WIRING
// ═══════════════════════

const slTurbidity = document.getElementById('sl-turbidity');
const slDepth     = document.getElementById('sl-depth');
const slSalinity  = document.getElementById('sl-salinity');
const svTurbidity = document.getElementById('sv-turbidity');
const svDepth     = document.getElementById('sv-depth');
const svSalinity  = document.getElementById('sv-salinity');

function updateUI() {
  // Param bar
  document.getElementById('pv-startf').textContent = (current_start_freq / 1000).toFixed(1) + ' kHz';
  document.getElementById('pv-endf').textContent   = (current_end_freq / 1000).toFixed(1) + ' kHz';
  document.getElementById('pv-gain').textContent    = current_gain;

  // Buffer chip
  const chipBuf = document.getElementById('chip-buffer');
  chipBuf.innerHTML = `<span class="dot dot-cyan"></span>BUF ${active_buffer === 0 ? 'A' : 'B'}`;

  // Adaptation info
  document.getElementById('ai-swaps').textContent = swap_count;
  document.getElementById('ai-gains').textContent = gain_count;
}

function flashAdaptation() {
  const el = document.getElementById('adapt-flash');
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetHeight; // trigger reflow
  el.style.animation = 'flashPulse .6s ease-out';
  setTimeout(() => el.classList.add('hidden'), 1200);
}

function highlightChainNode(id) {
  const node = document.getElementById(id);
  node.classList.add('highlight');
  setTimeout(() => node.classList.remove('highlight'), 600);
}

function onSliderInput() {
  const turbidity = parseInt(slTurbidity.value);
  const depth     = parseInt(slDepth.value);
  const salinity  = parseInt(slSalinity.value);

  svTurbidity.textContent = turbidity;
  svDepth.textContent     = depth;
  svSalinity.textContent  = salinity;

  // Run adaptation
  const result = Sonar_Adaptation_Process(turbidity, depth, salinity);

  // Update deltas
  document.getElementById('ai-turb-delta').textContent = Math.abs(turbidity - last_turbidity);
  document.getElementById('ai-depth-delta').textContent = Math.abs(depth - last_depth);

  if (result.swapped) {
    flashAdaptation();
    highlightChainNode('cn-dds');
    highlightChainNode('cn-dma');
  }
  if (result.gainUpdated) {
    highlightChainNode('cn-adapt');
  }

  updateUI();
  renderAll();
}

function renderAll() {
  renderWaveform();
  renderSpectrum();
}

// Event listeners
slTurbidity.addEventListener('input', onSliderInput);
slDepth.addEventListener('input', onSliderInput);
slSalinity.addEventListener('input', onSliderInput);

// Handle resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { renderAll(); renderWindow(); }, 150);
});


// ═══════════════════════
//  INITIALIZATION
// ═══════════════════════

function init() {
  // 1. Initialize LUTs (exactly as firmware boot sequence)
  Sonar_Init_Window_LUT();
  Sonar_Init_DDS_Table();

  // 2. Generate initial chirp into Buffer A
  Sonar_Generate_Chirp_DDS(Sonar_Buffer_A, SONAR_DEFAULT_START_HZ, SONAR_DEFAULT_END_HZ);

  // 3. Render all visualizations
  renderAll();
  renderWindow();
  updateUI();

  console.log('[Sonar Sim] DSP engine initialized');
  console.log(`  Sine LUT: ${SINE_LUT_SIZE} entries`);
  console.log(`  Blackman Window: ${SONAR_LUT_SAMPLES} entries`);
  console.log(`  Default chirp: ${SONAR_DEFAULT_START_HZ / 1000}–${SONAR_DEFAULT_END_HZ / 1000} kHz`);
  console.log(`  Sample rate: ${SONAR_BASE_SAMPLE_RATE_HZ / 1e6} MHz`);
}

init();
