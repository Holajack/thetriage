#!/usr/bin/env python3
"""
Generate ambient sound files for each trail environment using ElevenLabs Sound Effects API.
Outputs loopable MP3 files to assets/ambient/{trail}/{layer}.mp3

Each trail has 3 layers:
  - environment: Primary atmosphere of the place (wind, water, terrain)
  - whitenoise:  Constant background drone unique to that environment
  - critters:    Bugs, creatures, or objects native to that environment

Usage:
    python execution/generate_ambient_sounds.py          # Generate missing files only
    python execution/generate_ambient_sounds.py --force   # Regenerate all files
    python execution/generate_ambient_sounds.py --trail forest  # Generate for one trail only
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env.local")

API_KEY = os.getenv("ELEVENLABS_API_KEY")
API_URL = "https://api.elevenlabs.io/v1/sound-generation"
OUTPUT_DIR = Path(__file__).parent.parent / "assets" / "ambient"

# ─── Sound Design Per Trail ───────────────────────────────────────────────────
# Each prompt is carefully crafted to produce a DISTINCT sound per environment.
# Environment = primary atmosphere, WhiteNoise = steady background specific to
# that place, Critters = bugs/creatures/objects native to that world.

SOUND_PROMPTS = {
    "forest": {
        "environment": (
            "Peaceful pine forest atmosphere, gentle breeze rustling through oak and "
            "pine branches, distant babbling brook flowing over smooth rocks, occasional "
            "old tree branch creaking softly, dappled sunlight woodland ambiance"
        ),
        "whitenoise": (
            "Soft continuous rain falling gently on a forest floor, light pattering of "
            "raindrops on leaves and fern fronds overhead, steady calming woodland rain, "
            "no thunder, just gentle persistent rainfall in a quiet forest"
        ),
        "critters": (
            "Forest floor insects at dusk: crickets chirping rhythmically in the "
            "undergrowth, soft cicada drone in the background, tiny beetles rustling "
            "through dry leaf litter, a moth fluttering near a lantern, subtle buzzing "
            "of small forest flies, quiet and gentle insect chorus"
        ),
    },
    "beach": {
        "environment": (
            "Tropical beach at golden hour, waves rolling gently onto warm sand and "
            "receding with a soft fizz of bubbles, wet sand gurgling as water drains, "
            "distant palm fronds swaying in a warm ocean breeze, relaxing coastal sunset"
        ),
        "whitenoise": (
            "Continuous steady ocean surf from a distance, rhythmic ebb and flow of "
            "tidal waves on a sandy shore, constant calming sea breeze blending with "
            "wave wash, peaceful and unbroken shoreline white noise"
        ),
        "critters": (
            "Beach creatures at twilight: small hermit crabs clicking and scuttling "
            "across wet sand, sand fleas hopping softly, a ghost crab digging with "
            "scratchy legs, tiny shore beetles crawling on driftwood, subtle seashore "
            "insect activity, gentle and quiet"
        ),
    },
    "jungle": {
        "environment": (
            "Dense tropical rainforest canopy, thick humid air, water dripping steadily "
            "from giant broad leaves, distant waterfall echoing through the valley, "
            "bamboo stalks creaking in the wind, lush layered vegetation atmosphere"
        ),
        "whitenoise": (
            "Heavy tropical rainfall on broad banana leaves and dense jungle canopy, "
            "continuous steady downpour dripping through multiple vegetation layers, "
            "thick humid mist, immersive unbroken jungle rain ambiance"
        ),
        "critters": (
            "Loud tropical jungle insects at night: cicadas buzzing intensely in waves, "
            "large rhinoceros beetles clicking on tree bark, army ants marching through "
            "leaves, katydids calling loudly, giant centipede rustling through leaf "
            "litter, mosquitoes humming softly nearby, rich tropical insect chorus"
        ),
    },
    "volcano": {
        "environment": (
            "Active volcanic landscape, deep low rumbling of the earth, lava bubbling "
            "and popping in distant pools, thermal steam vents hissing rhythmically, "
            "hot dry wind sweeping over dark basalt rock, dramatic and primal atmosphere"
        ),
        "whitenoise": (
            "Deep continuous geothermal drone, low frequency volcanic earth vibration, "
            "hot air currents rising from lava fields, steady subterranean rumble, "
            "constant and ominous volcanic ambient hum, no sharp sounds"
        ),
        "critters": (
            "Volcanic terrain creatures: large fire beetles clicking on hot obsidian "
            "rock, heat-resistant insects buzzing near steaming vents, lava crickets "
            "chirping with a metallic tone, small lizards darting across warm stone "
            "surfaces with quick scratchy feet, sparse and eerie"
        ),
    },
    "desert": {
        "environment": (
            "Vast open desert at dusk, hot dry wind sweeping slowly across sand dunes, "
            "sand grains shifting and sliding down a dune face, expansive arid silence "
            "with occasional distant dust devil, warm parched atmosphere, solitude"
        ),
        "whitenoise": (
            "Steady relentless desert wind blowing across flat sandy terrain, continuous "
            "dry breeze carrying fine sand particles, constant arid atmospheric hum, "
            "unbroken desert wind white noise, warm and dry"
        ),
        "critters": (
            "Desert creatures at night: scorpions scuttling across hard packed sand "
            "with scratchy legs, desert beetles clicking rhythmically on stone, a "
            "sidewinder rattlesnake gently rattling in the distance, centipedes "
            "crawling on sun-baked rock, desert crickets chirping sparsely, quiet and "
            "tense nocturnal desert life"
        ),
    },
    "canyon": {
        "environment": (
            "Deep red rock canyon at sunset, wind echoing and reverberating off tall "
            "sandstone walls, distant water dripping into a hidden pool far below, "
            "small rocks settling and clicking, vast expansive reverberant canyon "
            "atmosphere, ancient and majestic"
        ),
        "whitenoise": (
            "Wind channeling steadily through narrow canyon passages creating a low "
            "continuous howl, constant natural echo and reverberation off rock walls, "
            "steady canyon drafts, unbroken atmospheric canyon wind tunnel"
        ),
        "critters": (
            "Canyon creatures at twilight: small bats fluttering their wings in a "
            "rocky alcove, canyon cave crickets chirping with echo, tiny desert spiders "
            "skittering on vertical rock faces, a small lizard darting quickly across "
            "a sandstone ledge, sparse echoing canyon wildlife"
        ),
    },
    "galaxy": {
        "environment": (
            "Deep space ambient soundscape, vast cosmic void with a low ethereal drone, "
            "distant electromagnetic pulsar waves pulsing slowly, nebula resonance hum, "
            "quiet space station interior atmosphere with gentle air circulation, "
            "infinite and serene cosmic ambiance"
        ),
        "whitenoise": (
            "Continuous deep space background radiation static, gentle cosmic hiss, "
            "steady stellar wind noise, quiet and constant space ambient drone, "
            "like being inside a spaceship with soft life support systems humming, "
            "calm and infinite void"
        ),
        "critters": (
            "Space station mechanical sounds: a satellite passing overhead with subtle "
            "Doppler whir, quiet communication signal beeps pinging at intervals, "
            "small meteor debris tinking softly against a hull, gentle robotic servo "
            "movements, distant radar sweep pulse, technological and otherworldly"
        ),
    },
    "northern": {
        "environment": (
            "Arctic tundra under aurora borealis, cold polar wind blowing over vast "
            "frozen landscape, ice sheets crackling and expanding with deep groans, "
            "distant glacier calving with a low boom, electromagnetic aurora hum "
            "shimmering overhead, ethereal and frigid"
        ),
        "whitenoise": (
            "Steady cold Arctic wind blowing across an open ice field, continuous frozen "
            "landscape atmosphere, constant polar breeze with a biting edge, unbroken "
            "tundra wind, crisp and clear cold air rushing past, no warmth"
        ),
        "critters": (
            "Arctic wildlife sounds: a snowy owl hooting softly and distantly, arctic "
            "fox padding quietly on crunchy snow, lemmings scurrying beneath the snow "
            "crust with muffled rustling, cold-hardy insects buzzing faintly under "
            "ice, sparse and isolated polar creatures"
        ),
    },
    "snow": {
        "environment": (
            "Peaceful snowy mountain forest, gentle snowfall muffling all sounds, fresh "
            "snow crunching softly under its own weight, icicles dripping slowly in "
            "weak sunlight, pine branches bowing under heavy snow then springing back, "
            "quiet cozy winter wonderland"
        ),
        "whitenoise": (
            "Steady gentle winter wind blowing through bare branches and snow-covered "
            "pines, continuous soft blizzard from a distance, steady snowfall creating "
            "a muffled blanket of quiet white noise, calm winter atmosphere"
        ),
        "critters": (
            "Winter forest creatures: a woodpecker tapping slowly on a distant tree, "
            "small chickadees chirping sparsely, a squirrel chattering and rustling "
            "through snow-covered branches, tiny winter insects clicking beneath bark, "
            "a distant wolf howling once, quiet and sparse winter wildlife"
        ),
    },
}

LAYERS = ["environment", "whitenoise", "critters"]


def generate_sound(prompt: str, output_path: Path, retries: int = 3) -> bool:
    """Generate a sound effect using ElevenLabs API and save to file."""
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "text": prompt,
        "model_id": "eleven_text_to_sound_v2",
        "duration_seconds": 22,
        "prompt_influence": 0.5,
        "loop": True,
    }

    for attempt in range(1, retries + 1):
        try:
            print(f"  Attempt {attempt}/{retries}: Generating...")
            response = requests.post(
                API_URL,
                json=payload,
                headers=headers,
                params={"output_format": "mp3_44100_128"},
                timeout=90,
            )

            if response.status_code == 200:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(response.content)
                size_kb = len(response.content) / 1024
                print(f"  Saved: {output_path.name} ({size_kb:.1f} KB)")
                return True
            elif response.status_code == 429:
                wait = 15 * attempt
                print(f"  Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  Error {response.status_code}: {response.text[:200]}")
                if attempt < retries:
                    time.sleep(5)

        except requests.exceptions.Timeout:
            print(f"  Timeout on attempt {attempt}")
            if attempt < retries:
                time.sleep(5)
        except Exception as e:
            print(f"  Error: {e}")
            if attempt < retries:
                time.sleep(3)

    print(f"  FAILED after {retries} attempts")
    return False


def main():
    parser = argparse.ArgumentParser(description="Generate ambient sounds via ElevenLabs")
    parser.add_argument("--force", action="store_true", help="Regenerate existing files")
    parser.add_argument("--trail", choices=list(SOUND_PROMPTS.keys()), help="Generate for one trail only")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not found in .env.local")
        print("Add it: ELEVENLABS_API_KEY=your_key_here")
        sys.exit(1)

    trails = [args.trail] if args.trail else list(SOUND_PROMPTS.keys())
    total = len(trails) * len(LAYERS)
    generated = 0
    skipped = 0
    failed = 0

    print(f"Generating ambient sounds for {len(trails)} trail(s) ({total} files)")
    print(f"Output: {OUTPUT_DIR}")
    print()

    for trail in trails:
        print(f"=== {trail.upper()} ===")
        for layer in LAYERS:
            output_path = OUTPUT_DIR / trail / f"{layer}.mp3"
            prompt = SOUND_PROMPTS[trail][layer]

            # Check if file already exists and is not a placeholder (<10 KB)
            if output_path.exists() and not args.force:
                size = output_path.stat().st_size
                if size > 10_000:  # >10 KB means it's a real file
                    print(f"  [{layer}] Already exists ({size // 1024} KB), skipping")
                    skipped += 1
                    continue
                else:
                    print(f"  [{layer}] Placeholder detected ({size} bytes), regenerating...")

            print(f"  [{layer}] {prompt[:60]}...")
            if generate_sound(prompt, output_path):
                generated += 1
            else:
                failed += 1

            # Rate limit delay between requests
            time.sleep(2)

        print()

    print("=== SUMMARY ===")
    print(f"Generated: {generated}")
    print(f"Skipped:   {skipped}")
    print(f"Failed:    {failed}")
    print(f"Total:     {total}")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
