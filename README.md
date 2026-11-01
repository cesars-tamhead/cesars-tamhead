# Profile artwork

The profile README uses a GIF for the brain-to-neuron introduction because GitHub does not execute page scripts in READMEs. The GIF plays once and holds on the name and neuron; it has no slides or controls.

To rebuild it, install Node 20 or later and ffmpeg, then run from the repository root:

```sh
npm install
npm run render:intro
```

The renderer uses the reduced original brain/neuron geometry in `assets/intro-geometry.json` and the original title font. The PNG check frames it produces are ignored by Git.

The existing daily `Update contribution art` workflow fetches public contribution data and rebuilds `contrib-heatmap.svg` with the Michigan blue-and-maize palette. It can also be started manually in GitHub Actions. The calendar is static SVG so it does not depend on animation support to remain visible.
