"""V37 · OUTMOVE bildirim sesi: 8-bit kare dalga arpej, yüksek (-0,5 dBFS).
Çıktı: android/app/src/main/res/raw/outmove_ping.wav (22050 Hz, 16 bit, mono).
Çalıştır: python3 scripts/pixel-sound.py"""
import math, struct, wave, os

RATE = 22050
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)  # MIDI → Hz
# (nota, süre ms, görev oranı): yukarı koşan arpej + iki vuruşlu "seviye" kapanışı
SEQ = [(84, 55, .5), (88, 55, .5), (91, 55, .5), (96, 70, .25), (0, 35, 0),
       (91, 60, .25), (96, 170, .125)]
PEAK = 0.94

def square(freq, ms, duty):
    n = int(RATE * ms / 1000)
    out = []
    for i in range(n):
        if freq == 0:
            out.append(0.0); continue
        ph = (i * freq / RATE) % 1.0
        v = 1.0 if ph < duty else -1.0
        # 8-bit his: 16 basamaklı genlik zarfı (kısa atak, sonda hafif düşüş)
        env = min(1.0, i / (RATE * 0.002)) * (1.0 - 0.35 * (i / n) ** 2)
        env = math.floor(env * 15) / 15
        out.append(v * env)
    return out

samples = []
for note, ms, duty in SEQ:
    samples += square(NOTE(note) if note else 0, ms, duty)
fade = int(RATE * 0.004)
for k in range(fade):
    samples[-1 - k] *= k / fade
path = os.path.join(os.path.dirname(__file__), '..', 'android/app/src/main/res/raw/outmove_ping.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s)) * PEAK * 32767)) for s in samples))
print(path, len(samples) / RATE, 's')
