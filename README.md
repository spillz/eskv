# ESKV

ESKV is an experimental JavaScript widget library for the browser inspired by Kivy
(and to some extent intended to inspire Kivy itself). 
It is built on EcmaScript 6 and the Html5 Canvas. Like Kivy, ESKV lets you rapidly 
build apps with rich user experiences that consolidate mouse and touch friendly 
controls into one simple interface and, unlike Kivy, run directly in the browser on 
most modern devices.

The goal of the ESKV project is to provide a glimpse of the potential of the Kivy 
framework on the web and to scratch my personal itch of converting old Kivy desktop 
and phone apps to equivalent webapps. If you're looking to quickly prototype
a simple canvas-based User Interfaces, give it a try. But if you're looking to
build real world webapps for paying clients you will want React, Svelte or dozens
of other battle-tested web frameworks.

Try the samples on my [GitHub pages](https://spillz.github.io/eskv).

To test the samples locally, open a terminal and type:

```
git clone https://github.com/spillz/eskv
cd eskv
python3 -m http.server
```

Open `localhost:8000/index.html` in your browser of choice. If you make changes to module code, 
you may need to clear the browser's cache to see the updates.
