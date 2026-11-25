import numpy as np
from typing import Dict, Any, Optional, Tuple


class AcousticFeatureExtractor:
    """
    Extracts raw acoustic features (pitch F0, energy RMS, spectral centroid,
    zero crossing rate, and pause duration) from raw audio arrays.
    Operates strictly on audio data independently of any speech transcripts.
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def extract_features(self, audio_data: np.ndarray) -> Dict[str, Any]:
        """
        Extracts foundational acoustic parameters.
        audio_data: 1D float32 array in range [-1.0, 1.0].
        """
        if len(audio_data) == 0:
            return {
                "energy_rms": 0.0,
                "pitch_mean": 0.0,
                "pitch_std": 0.0,
                "spectral_centroid": 0.0,
                "zcr": 0.0,
                "snr_db": 0.0,
                "is_clipped": False
            }

        # 1. Energy RMS
        rms = float(np.sqrt(np.mean(audio_data ** 2)))

        # 2. Clipping check (samples close to [-1.0, 1.0])
        is_clipped = bool(np.sum(np.abs(audio_data) >= 0.98) > (0.01 * len(audio_data)))

        # 3. Zero Crossing Rate (correlates with unvoiced/fricative noise or agitation)
        zcr = float(np.mean(np.abs(np.diff(np.sign(audio_data)))) / 2.0)

        # 4. Fundamental Frequency (F0) estimate via normalized autocorrelation
        pitch_mean, pitch_std = self._estimate_pitch_autocorr(audio_data)

        # 5. Spectral Centroid approximation via FFT
        spectral_centroid = self._estimate_spectral_centroid(audio_data)

        # 6. Signal-to-Noise Ratio (SNR) estimate
        snr_db = self._estimate_snr(audio_data, rms)

        return {
            "energy_rms": round(rms, 4),
            "pitch_mean": round(pitch_mean, 2),
            "pitch_std": round(pitch_std, 2),
            "spectral_centroid": round(spectral_centroid, 2),
            "zcr": round(zcr, 4),
            "snr_db": round(snr_db, 2),
            "is_clipped": is_clipped
        }

    def _estimate_pitch_autocorr(self, audio_data: np.ndarray) -> Tuple[float, float]:
        """Simple, fast autocorrelation pitch tracker (human speech range 75Hz - 400Hz)."""
        if len(audio_data) < self.sample_rate // 75:
            return 0.0, 0.0

        min_lag = int(self.sample_rate / 400) # 400 Hz
        max_lag = int(self.sample_rate / 75)  # 75 Hz

        corr = np.correlate(audio_data, audio_data, mode='full')
        corr = corr[len(audio_data) - 1:]

        if max_lag >= len(corr) or min_lag >= len(corr):
            return 0.0, 0.0

        peak_lag = np.argmax(corr[min_lag:max_lag]) + min_lag
        if corr[peak_lag] > 0.25 * corr[0]:
            f0 = float(self.sample_rate / peak_lag)
            return f0, f0 * 0.1 # estimated std
        return 0.0, 0.0

    def _estimate_spectral_centroid(self, audio_data: np.ndarray) -> float:
        """Calculates the center of mass of the power spectrum."""
        spectrum = np.abs(np.fft.rfft(audio_data))
        freqs = np.fft.rfftfreq(len(audio_data), 1.0 / self.sample_rate)
        sum_spectrum = np.sum(spectrum)
        if sum_spectrum > 1e-6:
            return float(np.sum(freqs * spectrum) / sum_spectrum)
        return 0.0

    def _estimate_snr(self, audio_data: np.ndarray, rms: float) -> float:
        """Approximates SNR assuming lowest 10% energy frames represent background floor."""
        frame_len = int(0.025 * self.sample_rate) # 25ms
        if len(audio_data) < frame_len:
            return 20.0
        
        num_frames = len(audio_data) // frame_len
        frame_energies = [
            np.mean(audio_data[i * frame_len:(i + 1) * frame_len] ** 2)
            for i in range(num_frames)
        ]
        if not frame_energies:
            return 20.0
            
        noise_floor = float(np.percentile(frame_energies, 10))
        if noise_floor < 1e-8:
            return 40.0
        return float(10.0 * np.log10(max(1e-8, (rms ** 2) / noise_floor)))
