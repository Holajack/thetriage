# Generate Ambient Sounds

## Goal
Generate loopable ambient sound files for each trail environment using the ElevenLabs Sound Effects API. These sounds layer on top of focus music during study sessions.

## Inputs
- `ELEVENLABS_API_KEY` from `.env.local`
- Trail environments: `forest`, `beach`, `jungle`, `volcano`, `desert`
- Sound layers: `environment`, `whitenoise`, `critters`

## Execution Script
`execution/generate_ambient_sounds.py`

## Process
1. For each trail + layer combination (15 total), generate a 22-second loopable sound effect
2. Use `loop=true` for seamless looping
3. Use `prompt_influence=0.5` for balanced quality
4. Save as MP3 to `assets/ambient/{trail}/{layer}.mp3`

## Sound Prompts

### Forest
- **environment**: Gentle forest ambiance with rustling leaves, light breeze through pine trees, distant birdsong
- **whitenoise**: Soft steady wind blowing through a dense forest canopy, continuous and calming
- **critters**: Forest wildlife: birds chirping, crickets, occasional owl hoot, gentle insect buzzing

### Beach
- **environment**: Tropical beach atmosphere with waves gently lapping the shore, distant seagulls, warm breeze
- **whitenoise**: Continuous ocean waves rolling onto sandy beach, steady and rhythmic white noise
- **critters**: Beach wildlife: seagulls calling, sandpipers, gentle surf with distant pelicans

### Jungle
- **environment**: Dense tropical jungle ambiance with thick humid air, distant waterfall, layered vegetation sounds
- **whitenoise**: Humid jungle air with light rainfall on broad leaves, continuous and immersive
- **critters**: Jungle wildlife: exotic birds, monkeys chattering, tropical insects buzzing, tree frogs

### Volcano
- **environment**: Volcanic landscape with deep low rumbling, crackling lava, hot thermal vents hissing
- **whitenoise**: Hot volcanic winds sweeping across barren rocky terrain, deep and continuous
- **critters**: Sparse volcanic wildlife: distant eagle cries, occasional insect clicks, wind-carried bird calls

### Desert
- **environment**: Vast desert atmosphere with shifting sand, distant dry winds, open arid landscape
- **whitenoise**: Desert wind blowing steadily across sand dunes, continuous and dry
- **critters**: Desert wildlife: crickets, cicadas, distant hawk cry, occasional lizard scurrying

## Output
15 MP3 files in `assets/ambient/{trail}/{layer}.mp3`, each ~22 seconds, loopable.

## Edge Cases
- API rate limits: Add 2-second delay between requests
- Failed generation: Retry up to 3 times per file
- Missing API key: Exit with clear error message
- Existing files: Skip if file already exists (use `--force` flag to regenerate)

## Learnings
- ElevenLabs v2 model supports up to 30 seconds and native looping
- `prompt_influence=0.5` balances accuracy with natural variation
- MP3 output format: `mp3_44100_128` for good quality at reasonable size
