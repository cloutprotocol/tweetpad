# Exports the tweetpad bubbly lowercase wordmark as transparent PNGs into public/brand/.
# Reuses the generator in /workspace/tweetpad/banner/banner.py (which pulls glyphs from /workspace/tweetpad/tp/pico.py + tp.py).
# Only the code above "# A sky" is executed, so no banner files are rewritten.
import os, sys
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "brand"))
src = open("/workspace/tweetpad/banner/banner.py").read().split("# A sky")[0]
g = {"__name__": "wordmark_export"}
exec(src, g)
wordmark = g["wordmark"]
os.makedirs(OUT, exist_ok=True)
for w in (1600, 800):
    # cyan gradient fill + white outline + soft drop shadow (the banner A/C version)
    wordmark(w).save(os.path.join(OUT, f"wordmark-cyan-{w}.png"))
    # flat white, no outline (the banner B version, for blue grounds)
    wordmark(w, fill=(255, 255, 255), outline=False).save(os.path.join(OUT, f"wordmark-white-{w}.png"))
print("wrote", sorted(os.listdir(OUT)))
