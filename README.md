# Flo's Kosmos 🌌

An interactive, animated team model rendered entirely in the browser — no dependencies, pure Canvas & Vanilla JS.

## What it is

A living cosmic visualization where each celestial body represents a role or person in a team. The scene features:

- **Planet A** — the stable center of the team, glowing at the heart of the system
- **Moon B** — orbiting loyally around the center
- **Disc C** — a rotating platform disk connected to the center, with its own star field
- **Sphere D & E** — two bodies pendulating around the disk, each on their own elliptical path
- **Outer Galaxy Ring** — the Milky Way boundary enclosing the whole system
- **Starfield** — a twinkling background with a diffuse Milky Way band

## Features

- Fully responsive — scales to any screen size
- Smooth 60 fps Canvas animation
- Hover over any object to pause its motion and see its label & description
- Labels and descriptions are easily customizable in `script.js`

## Usage

Just open `index.html` in any modern browser. No build step, no dependencies.

```
index.html   ← entry point
script.js    ← all animation logic
style.css    ← layout & tooltip styling
```

## Customization

Edit the `objects` map in `script.js` to change labels, descriptions, colors and glow colors for each body:

```js
A: { label: "Your Name", desc: "Your role description.", color: "#ffd27f", glow: "#ff9d3c", ... }
```

## License

MIT
