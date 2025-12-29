---
name: video-prompt-engineering
description: Design and optimize text-to-video prompts for AI models like Hailuo, Runway, Pika, and others. Use when creating video generation prompts, optimizing video outputs, or troubleshooting generation issues.
---

# Video Prompt Engineering

## Purpose
Craft high-quality text-to-video prompts that generate professional-looking AI videos with proper camera work, lighting, motion, and aesthetics.

## Video Generation Models

### Hailuo v2.3
- **Strengths**: Natural motion, Chinese & English, 6-second clips
- **Prompt Style**: Detailed scene descriptions with camera movements
- **Best For**: Realistic scenes, product shots, nature footage

### Runway Gen-3
- **Strengths**: Cinematic quality, longer clips
- **Prompt Style**: Cinematic language, shot types
- **Best For**: Film-style content, abstract visuals

### Pika 1.5
- **Strengths**: Creative effects, style versatility
- **Prompt Style**: Style-first descriptions
- **Best For**: Stylized content, transitions, effects

### Kling AI
- **Strengths**: Chinese scenes, cultural content
- **Prompt Style**: Detailed with cultural context
- **Best For**: Asian content, traditional scenes

## Video Prompt Structure

### Complete Prompt Template

```
[SHOT TYPE] of [SUBJECT] [ACTION] in [SETTING].
[CAMERA MOVEMENT]. [LIGHTING]. [STYLE/AESTHETIC].
[TECHNICAL DETAILS]. [MOOD/ATMOSPHERE].
```

### Example

```
Medium shot of a barista crafting latte art in a modern coffee shop.
Slow dolly forward. Warm golden hour lighting streaming through large windows.
Cinematic, shallow depth of field, bokeh background.
Professional color grading, 24fps feel. Calm, artisanal atmosphere.
```

## Key Components

### 1. Shot Types
- **Extreme Wide Shot (EWS)**: Establish environment
- **Wide Shot (WS)**: Full subject in context
- **Medium Shot (MS)**: Waist up, main working distance
- **Close-Up (CU)**: Face or detail
- **Extreme Close-Up (ECU)**: Eyes, hands, objects
- **Over-the-shoulder (OTS)**: POV perspective
- **Two-Shot**: Two subjects in frame

### 2. Camera Movements
- **Static**: No movement, stable composition
- **Pan**: Horizontal rotation (left/right)
- **Tilt**: Vertical rotation (up/down)
- **Dolly**: Camera moves forward/backward
- **Truck**: Camera moves left/right
- **Pedestal**: Camera moves up/down
- **Zoom**: Lens zoom in/out
- **Orbit**: Camera circles subject
- **Crane**: High sweeping movement
- **Handheld**: Natural shake, documentary feel

### 3. Lighting Styles
- **Golden Hour**: Warm, soft, flattering
- **Blue Hour**: Cool, mysterious, twilight
- **Hard Light**: Strong shadows, dramatic
- **Soft Light**: Diffused, even, flattering
- **Rembrandt**: Triangle of light on cheek
- **Backlighting**: Subject silhouetted
- **Side Lighting**: Texture and depth
- **Three-Point**: Studio standard setup

### 4. Visual Styles
- **Cinematic**: Film-like, color graded, shallow DOF
- **Documentary**: Natural, handheld, realistic
- **Commercial**: Polished, bright, professional
- **Music Video**: Creative, stylized, dynamic
- **Noir**: High contrast, moody, shadows
- **Anime**: Hand-drawn aesthetic, vibrant
- **Vintage**: Retro color, film grain, nostalgia

## Hailuo v2.3 Specific Guidelines

### Prompt Format

**System Message** (sets context):
```
You are a professional cinematographer and video director. Your expertise includes camera work, lighting design, and visual storytelling. You craft detailed video generation prompts that result in cinematic, professional-quality footage.
```

**User Message** (the actual prompt):
```
Create a 6-second video clip:

[Detailed scene description]

Camera: [Movement and positioning]
Lighting: [Lighting setup and quality]
Style: [Visual aesthetic]
Motion: [Subject and camera motion]
```

### Hailuo Best Practices

**DO**:
- Use specific camera movements (dolly, pan, orbit)
- Describe lighting conditions explicitly
- Include motion and action verbs
- Specify mood and atmosphere
- Use cinematic terminology
- Keep prompts 50-150 words

**DON'T**:
- Use vague terms ("nice," "good," "pretty")
- Over-specify (leave room for AI creativity)
- Request impossible physics
- Ignore lighting (it's crucial)
- Forget to specify camera work

### Hailuo Examples

**Product Shot**:
```
Close-up shot of a luxury watch on a rotating display stand.
Slow 360-degree orbit around the watch. Studio lighting with key light from the left creating highlights on the metal surface, soft fill light eliminating harsh shadows.
Professional product photography style, shallow depth of field with blurred background, reflective surface clearly visible.
Smooth, controlled rotation showcasing intricate details and craftsmanship.
```

**Nature Scene**:
```
Wide shot of a misty forest at dawn with sunlight breaking through the canopy.
Slow forward dolly movement through the trees. Volumetric god rays streaming through fog, creating dramatic shafts of light.
Cinematic nature documentary style, rich green color palette with warm golden accents.
Ethereal, peaceful atmosphere with gentle mist movement.
```

**Human Action**:
```
Medium shot of a chef tossing vegetables in a flaming wok.
Slight slow-motion capture at 60fps slowed to 24fps. Dramatic side lighting highlighting the flames, warm ambient kitchen lighting in background.
Professional cooking show cinematography, shallow depth of field keeping focus on the action.
Dynamic, energetic motion with visible flames and steam.
```

## Subagent Workflow

When you ask for video prompts, I'll invoke specialized subagents:

### 1. **hailuo-video-prompter**
- Crafts Hailuo v2.3 specific prompts
- Optimizes for 6-second clips
- Ensures model compatibility

### 2. **camera-movement-specialist**
- Designs camera movements
- Suggests shot compositions
- Matches movement to mood

### 3. **visual-style-designer**
- Defines aesthetic style
- Specifies color grading
- Creates mood and atmosphere

### 4. **scene-descriptor**
- Writes detailed scene descriptions
- Describes subjects and actions
- Sets environmental context

### 5. **video-prompt-engineer** (general)
- Combines all elements
- Cross-model optimization
- Quality assurance

## Common Use Cases

### Product Demo
```
Create a 6-second product showcase for:
- [Product name and key features]
→ Uses: hailuo-video-prompter + visual-style-designer
```

### Establishing Shot
```
Create an environmental establishing shot for:
- [Location and mood]
→ Uses: camera-movement-specialist + scene-descriptor
```

### Action Sequence
```
Create a dynamic action shot of:
- [Subject performing action]
→ Uses: video-prompt-engineer + camera-movement-specialist
```

### Artistic/Abstract
```
Create a stylized visual of:
- [Concept or theme]
→ Uses: visual-style-designer + video-prompt-engineer
```

## Optimization Techniques

### Length Optimization
- **Hailuo**: 6 seconds - plan action accordingly
- **Runway**: Up to 10 seconds - allow for development
- **Pika**: 3-4 seconds - quick moments

### Motion Considerations
- Start with static or simple movements
- Complex motion requires clear description
- Specify speed (slow, normal, fast)
- Describe both camera and subject motion

### Iteration Strategy
1. Start with base prompt
2. Generate first version
3. Analyze output
4. Refine specific elements
5. Regenerate with improvements

## Troubleshooting

### Issue: Blurry or distorted output
**Fix**: Add "sharp focus," "high detail," "4K quality"

### Issue: Unnatural motion
**Fix**: Specify "smooth motion," "natural movement," describe speed

### Issue: Wrong lighting
**Fix**: Be more explicit about light direction, quality, color temperature

### Issue: Confusing composition
**Fix**: Simplify prompt, use one clear subject, specific shot type

### Issue: Style mismatch
**Fix**: Add reference styles, be more specific about aesthetic

## Advanced Techniques

### Aspect Ratio Specification
```
16:9 widescreen cinematic format
9:16 vertical for social media
1:1 square for Instagram
21:9 ultra-wide cinematic
```

### Temporal Progression
```
Beginning: [State A]
Middle: [Transition]
End: [State B]
```

### Multi-Element Scenes
```
Foreground: [Element with action]
Midground: [Supporting elements]
Background: [Environment and context]
```

## When to Use This Skill

- Creating text-to-video prompts
- Optimizing video generation results
- Designing camera movements
- Specifying lighting and mood
- Troubleshooting generation issues
- Learning video prompt best practices
- Converting ideas into video prompts
- Iterating on video outputs

## Examples by Category

### Cinematic
"Slow dolly shot through a neon-lit cyberpunk street at night, rain-slicked pavement reflecting colorful signs"

### Documentary
"Handheld medium shot following a craftsman's hands as they shape clay on a pottery wheel, natural window lighting"

### Commercial
"Smooth 360-degree orbit around a pristine sports car in a white studio, professional three-point lighting, reflections on glossy paint"

### Nature
"Aerial crane shot descending from above a waterfall into the misty canyon below, golden hour lighting, rainbow in the spray"

### Abstract
"Macro close-up of colorful ink diffusing through water, backlit translucent fluid dynamics, slow motion capture"

## Model Comparison Chart

| Model | Length | Strengths | Best For | Prompt Style |
|-------|--------|-----------|----------|--------------|
| Hailuo v2.3 | 6s | Natural motion | Realistic scenes | Detailed descriptive |
| Runway Gen-3 | 10s | Cinematic | Film-quality | Shot-focused |
| Pika 1.5 | 3-4s | Effects | Stylized | Style-first |
| Kling | Variable | Cultural | Asian content | Context-rich |

---

Ready to create stunning video prompts! Just tell me what you want to generate and I'll invoke the right specialists.
