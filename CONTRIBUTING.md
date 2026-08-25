# Contributing to Mars Explorer

Thanks for helping improve Mars Explorer. Focused bug fixes, accessibility work, performance improvements, and carefully sourced mission content are all welcome.

## Development setup

Use Node.js 22.13 or newer, then install dependencies and start the local server:

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Pull requests

- Keep each pull request focused on one change or a closely related set of changes.
- Describe the visible behavior before and after the change.
- Include screenshots or a short recording for visual and interaction changes.
- Check both desktop and mobile layouts when changing controls, overlays, or typography.
- Do not commit generated build output, local environment files, or unrelated formatting changes.

## Mission data and imagery

Scientific and historical traceability is part of the product experience.

- Prefer primary sources such as NASA, JPL, USGS, ESA, or CNSA mission archives.
- Record the source URL, mission, instrument or camera, date or sol, and any processing performed.
- Never use one rover's image as a substitute for another rover or landing site.
- Preserve the source aspect ratio and photographed field of view. Do not invent missing sky or ground.
- Clearly label deterministic upscaling, sharpening, color correction, or other enhancements.
- Add new provenance notes to `public/mars-data/README.md` in the same pull request as the asset.

## Reporting a bug

Please include the browser and device, the selected rover or location, exact reproduction steps, and what you expected to happen. A screenshot is especially useful for camera framing, horizon, panorama seams, and responsive-layout issues.
