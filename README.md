# ESKV

ESKV is an experimental JavaScript widget library for the browser inspired by Kivy. It lets you compose mouse- and touch-friendly interfaces on top of an HTML5 canvas while keeping the declarative feel of Kivy. The framework is built with modern ECMAScript modules so it can be dropped directly into a web page or bundled with your favorite build tool.

## Key Features

- **Canvas-first UI system** – render complex interfaces on a single `<canvas>` element for consistency across devices.
- **Widget hierarchy** – compose interfaces with labels, buttons, sliders, notebooks, layouts, and more.
- **Input handling** – unify mouse, keyboard, and touch events with gesture helpers similar to Kivy.
- **Rich text utilities** – leverage markup, font metrics, and text layout helpers for high-quality typography.
- **Sprite and tilemap helpers** – draw animated scenes with sprite batching utilities.
- **Utility modules** – geometry, math, randomness, timers, and color helpers reduce boilerplate in interactive apps.

## Live Demos

Try the hosted samples on [GitHub Pages](https://spillz.github.io/eskv). The `samples/` directory in this repository mirrors those demos and can be used as a starting point for your own experiments.

## Installation

### Use in a project

```bash
npm install
```

This installs the Vite dev dependency used for building the bundled examples. The core library itself lives in the `lib/` directory and can be imported directly from source or copied into another project if you prefer a non-Node toolchain.

### Clone and run locally

```bash
git clone https://github.com/spillz/eskv
cd eskv
npm install
npm run dev
```

Vite will start a development server and print the URL (typically `http://localhost:5173`). Open the address in your browser to explore the sample gallery. For a lightweight alternative, you can also serve the repository with Python:

```bash
python3 -m http.server
```

Then open `http://localhost:8000/index.html` and manually refresh when you change source files.

## Quick Start

Embed the library in a page and instantiate the root `App` to create widgets on a canvas:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ESKV Quick Start</title>
    <script type="module">
      import {App, Label, BoxLayout} from './lib/eskv.js';

      window.addEventListener('DOMContentLoaded', () => {
        const canvas = document.querySelector('canvas');
        const app = new App(canvas);
        const layout = new BoxLayout();
        layout.addWidget(new Label({text: 'Hello from ESKV'}));
        app.setRoot(layout);
        app.run();
      });
    </script>
  </head>
  <body>
    <canvas width="800" height="600"></canvas>
  </body>
</html>
```

Use the modules exported from `lib/eskv.js` to access geometry helpers, input routing, sprites, and more.

## Library Modules

- **Core app and widgets**: `lib/eskv.js`, `lib/modules/widgets.js`
- **Geometry & math**: `lib/modules/geometry.js`, `lib/modules/math.js`
- **Color & theming**: `lib/modules/colors.js`
- **Text & markup**: `lib/modules/text.js`, `lib/modules/richtext.js`, `lib/modules/markup.js`
- **Input**: `lib/modules/input.js`
- **Sprites & graphics**: `lib/modules/sprites.js`, `lib/modules/webgl.js`
- **Utilities**: `lib/modules/random.js`, `lib/modules/timer.js`, `lib/modules/geometry.js`

See the [User Guide](doc/user-guide.md) for an overview of the documentation set and topic-specific guides.

## Development

- `npm run dev` – launch the Vite development server for interactive samples.
- `npm run build` – bundle the sample gallery for production output in `dist/`.
- `npm run preview` – preview the production build locally.

## Contributing

Bug reports, ideas, and pull requests are welcome! Please open an issue to discuss significant changes.

## License

ESKV is distributed under the [MIT License](LICENSE).
