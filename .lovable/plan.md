# Fix StreetRail project image cropping

## Problem
The project image used in the hackathon submission is being cropped by the Encode Club form container, cutting off the left side of the "StreetRail" wordmark (visible as "treetRail"). The current composition places the logo too close to the left edge for the displayed aspect ratio.

## Goal
Generate a replacement project image where the full "StreetRail" wordmark remains visible after the form's rounded-corner crop, while keeping the Midnight Indigo street-dance aesthetic and the stablecoin iconography.

## Plan
1. Generate a new primary project image with the StreetRail wordmark centered horizontally and placed inside a safe margin (not flush against any edge).
2. Keep the dancers + USDC/EURC/cirBTC glow icons as the hero visual, but compose so critical text sits in the lower-center safe zone.
3. Produce two formats:
   - 1200×630 (wide, for OpenGraph / submission banner)
   - 1024×1024 (square, if the form uses a 1:1 thumbnail crop)
4. Inspect each output to confirm the full "StreetRail" wordmark is legible and not clipped.
5. Replace the existing `/mnt/documents/streetrail-project-image.png` with the corrected version and update `README.md` / submission copy references if the filename changes.

## Out of scope
- No website code changes unless the new image needs to be referenced in a meta tag.
- No redesign of the brand palette or logo mark.
