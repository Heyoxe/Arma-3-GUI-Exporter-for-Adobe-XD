# Arma-3-GUI-Exporter-for-Adobe-XD

## How to use?

1. Select your artboards
2. Press "Ctrl+Q"
3. Export :)

## How does inheritance works?
- Groups + Repeat Grids --> `RscControlsGroup`
- Text --> `RscText` / `RscStructuredText`
- ... --> `IGUIBack`

to override, simply name your control with the following format `NAME: FROM` (e.g: `Title: RscTitle`)

