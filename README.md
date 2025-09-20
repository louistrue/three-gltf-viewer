# glTF Viewer

Preview glTF 2.0 models in WebGL using three.js and a drag-and-drop interface.

Viewer: [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/)

![screenshot](https://user-images.githubusercontent.com/1848368/31580352-b7354096-b101-11e7-86d7-f07677835812.png)

## Quickstart

```
npm install
npm run dev
```

### Multi-model prototype

A lightweight prototype of a multi-model viewer is available at [`multi.html`](./multi.html). Run the dev server and open [`http://localhost:3000/multi.html`](http://localhost:3000/multi.html) to try it. Drag and drop, or use the file picker to select multiple `.gltf`/`.glb` assets (individual files or folders). Each selection is loaded into its own panel so you can inspect several models at once.

## glTF 2.0 Resources

-   [THREE.GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
-   [glTF 2.0 Specification](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md)
-   [glTF 2.0 Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/)

## Known Issues

-   [ ] Limited drag-and-drop support in Safari.
