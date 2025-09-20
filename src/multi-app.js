import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { Viewer } from './viewer.js';
import { SimpleDropzone } from 'simple-dropzone';
import { Validator } from './validator.js';
import { Footer } from './components/footer';
import queryString from 'query-string';

window.THREE = THREE;
window.MULTI_VIEWER = {};

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        console.error('The File APIs are not fully supported in this browser.');
} else if (!WebGL.isWebGL2Available()) {
        console.error('WebGL is not supported in this browser.');
}

class MultiViewerApp {
        /**
         * @param  {Element} el
         * @param  {Location} location
         */
        constructor(el, location) {
                const hash = location.hash ? queryString.parse(location.hash) : {};
                this.options = {
                        kiosk: Boolean(hash.kiosk),
                        model: hash.model || '',
                        preset: hash.preset || '',
                        cameraPosition: hash.cameraPosition ? hash.cameraPosition.split(',').map(Number) : null,
                };

                this.el = el;
                this.viewerCards = [];
                this.dropEl = el.querySelector('.dropzone');
                this.collectionEl = el.querySelector('.viewer-collection');
                this.spinnerEl = el.querySelector('.spinner');
                this.inputEl = el.querySelector('#file-input');
                this.validator = new Validator(el);

                this.createDropzone();
                this.hideSpinner();

                const options = this.options;

                if (options.kiosk) {
                        const headerEl = document.querySelector('header');
                        headerEl.style.display = 'none';
                }

                if (options.model) {
                        this.view(options.model, '', new Map());
                }
        }

        /**
         * Sets up the drag-and-drop controller.
         */
        createDropzone() {
                const dropCtrl = new SimpleDropzone(this.dropEl, this.inputEl);
                dropCtrl.on('drop', ({ files }) => this.load(files));
                dropCtrl.on('dropstart', () => this.showSpinner());
                dropCtrl.on('droperror', () => this.hideSpinner());
        }

        /**
         * Loads a fileset provided by user action.
         * @param  {Map<string, File>} fileMap
         */
        load(fileMap) {
                const rootFiles = [];

                Array.from(fileMap).forEach(([path, file]) => {
                        if (file.name.match(/\.(gltf|glb)$/i)) {
                                rootFiles.push({
                                        file,
                                        rootPath: path.replace(file.name, ''),
                                });
                        }
                });

                if (!rootFiles.length) {
                        this.onError('No .gltf or .glb asset found.');
                        this.hideSpinner();
                        return;
                }

                const results = rootFiles.map(({ file, rootPath }) => this.view(file, rootPath, fileMap));

                Promise.allSettled(results).finally(() => this.hideSpinner());
        }

        /**
         * Creates a viewer card and returns its instance.
         * @param  {string} title
         */
        createViewerCard(title) {
                const cardEl = document.createElement('section');
                cardEl.classList.add('viewer-card');

                const headerEl = document.createElement('header');
                headerEl.classList.add('viewer-card__header');
                headerEl.textContent = title || 'Model';

                const viewerEl = document.createElement('div');
                viewerEl.classList.add('viewer');

                cardEl.appendChild(headerEl);
                cardEl.appendChild(viewerEl);
                this.collectionEl.appendChild(cardEl);

                const viewer = new Viewer(viewerEl, this.options);

                this.viewerCards.push({ cardEl, viewer, title });
                this.dropEl.classList.add('has-viewers');

                return viewer;
        }

        /**
         * Passes a model to a new viewer card.
         * @param  {File|string} rootFile
         * @param  {string} rootPath
         * @param  {Map<string, File>} fileMap
         */
        view(rootFile, rootPath, fileMap) {
                const viewer = this.createViewerCard(typeof rootFile === 'string' ? rootFile.split('/').pop() : rootFile.name);
                const fileURL = typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);

                const cleanup = () => {
                        if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
                };

                return viewer
                        .load(fileURL, rootPath, fileMap)
                        .then((gltf) => {
                                if (!this.options.kiosk) {
                                        this.validator.validate(fileURL, rootPath, fileMap, gltf);
                                }
                                return gltf;
                        })
                        .catch((e) => {
                                this.onError(e, rootFile.name || rootFile);
                                throw e;
                        })
                        .finally(() => {
                                cleanup();
                        });
        }

        /**
         * @param  {Error|string} error
         * @param  {string} [context]
         */
        onError(error, context = '') {
                let message = (error || {}).message || error.toString();
                if (message.match(/ProgressEvent/)) {
                        message = 'Unable to retrieve this file. Check JS console and browser network tab.';
                } else if (message.match(/Unexpected token/)) {
                        message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
                } else if (error && error.target && error.target instanceof Image) {
                        message = 'Missing texture: ' + error.target.src.split('/').pop();
                }

                if (context) {
                        message = `${context}: ${message}`;
                }

                window.alert(message);
                console.error(error);
        }

        showSpinner() {
                this.spinnerEl.style.display = '';
        }

        hideSpinner() {
                this.spinnerEl.style.display = 'none';
        }
}

document.body.innerHTML += Footer();

document.addEventListener('DOMContentLoaded', () => {
        const app = new MultiViewerApp(document.body, location);

        window.MULTI_VIEWER.app = app;

        console.info('[glTF Multi-Viewer] Debugging data exported as `window.MULTI_VIEWER`.');
});
