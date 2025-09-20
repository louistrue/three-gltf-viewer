import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { Viewer } from './viewer.js';
import { SimpleDropzone } from 'simple-dropzone';

window.THREE = THREE;

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        console.error('The File APIs are not fully supported in this browser.');
} else if (!WebGL.isWebGL2Available()) {
        console.error('WebGL2 is not supported in this browser.');
}

class MultiViewerApp {
        constructor(el) {
                this.el = el;
                this.dropEl = el.querySelector('.dropzone');
                this.inputEl = el.querySelector('#file-input');
                this.viewerListEl = el.querySelector('.viewer-list');
                this.spinnerEl = el.querySelector('.spinner');

                this.viewerEntries = [];
                this.viewerOptions = {
                        kiosk: true,
                        model: '',
                        preset: '',
                        cameraPosition: null,
                };

                this.createDropzone();
                this.updateEmptyState();
        }

        createDropzone() {
                const dropCtrl = new SimpleDropzone(this.dropEl, this.inputEl);
                dropCtrl.on('drop', ({ files }) => this.load(files));
                dropCtrl.on('dropstart', () => this.showSpinner());
                dropCtrl.on('droperror', () => this.hideSpinner());
        }

        load(fileMap) {
                this.showSpinner();

                if (!fileMap || fileMap.size === 0) {
                        this.onError('No files provided.');
                        this.hideSpinner();
                        return;
                }

                const entries = Array.from(fileMap.entries());
                const rootEntries = entries.filter(([, file]) => file.name.match(/\.(gltf|glb)$/i));

                if (!rootEntries.length) {
                        this.onError('No .gltf or .glb assets found in selection.');
                        this.hideSpinner();
                        return;
                }

                const loadPromises = rootEntries.map(([path, file]) => {
                        const rootPath = path.replace(file.name, '');
                        const scopedMap = this.createScopedMap(entries, rootPath);
                        return this.view(file, rootPath, scopedMap);
                });

                Promise.allSettled(loadPromises).finally(() => this.hideSpinner());
        }

        createScopedMap(entries, rootPath) {
                const scoped = new Map();
                for (const [candidatePath, file] of entries) {
                        if (!rootPath || candidatePath.startsWith(rootPath)) {
                                scoped.set(candidatePath, file);
                        }
                }
                return scoped;
        }

        view(rootFile, rootPath, fileMap) {
                const { panelEl, viewerEl, titleEl } = this.createViewerPanel(rootFile.name);
                const viewer = new Viewer(viewerEl, this.viewerOptions);

                const entry = { panelEl, viewer, titleEl };
                this.viewerEntries.push(entry);
                this.updateEmptyState();

                const fileURL = typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);

                const cleanup = () => {
                        if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
                };

                return viewer
                        .load(fileURL, rootPath, fileMap)
                        .then((gltf) => {
                                titleEl.textContent = rootFile.name || 'Model';
                                return gltf;
                        })
                        .catch((e) => {
                                this.onError(e);
                                panelEl.remove();
                                this.viewerEntries = this.viewerEntries.filter((item) => item !== entry);
                                throw e;
                        })
                        .finally(() => {
                                cleanup();
                                this.updateEmptyState();
                        });
        }

        createViewerPanel(filename) {
                const panelEl = document.createElement('article');
                panelEl.classList.add('viewer-panel');

                const headerEl = document.createElement('div');
                headerEl.classList.add('viewer-panel__header');

                const titleEl = document.createElement('h2');
                titleEl.classList.add('viewer-panel__title');
                titleEl.textContent = filename || 'Loading…';

                headerEl.appendChild(titleEl);
                panelEl.appendChild(headerEl);

                const canvasWrap = document.createElement('div');
                canvasWrap.classList.add('viewer-panel__canvas');

                const viewerEl = document.createElement('div');
                viewerEl.classList.add('viewer');

                canvasWrap.appendChild(viewerEl);
                panelEl.appendChild(canvasWrap);

                this.viewerListEl.appendChild(panelEl);

                return { panelEl, viewerEl, titleEl };
        }

        updateEmptyState() {
                const emptyEl = this.viewerListEl.querySelector('.viewer-list__empty');
                if (!emptyEl) return;

                const hasViewers = this.viewerEntries.length > 0;
                emptyEl.classList.toggle('hidden', hasViewers);
        }

        showSpinner() {
                if (!this.spinnerEl) return;
                this.spinnerEl.classList.remove('hidden');
                this.spinnerEl.classList.add('visible');
        }

        hideSpinner() {
                if (!this.spinnerEl) return;
                this.spinnerEl.classList.remove('visible');
                this.spinnerEl.classList.add('hidden');
        }

        onError(error) {
                let message = (error || {}).message || error.toString();

                if (message.match(/ProgressEvent/)) {
                        message = 'Unable to retrieve this file. Check JS console and browser network tab.';
                } else if (message.match(/Unexpected token/)) {
                        message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`;
                } else if (error && error.target && error.target instanceof Image) {
                        message = 'Missing texture: ' + error.target.src.split('/').pop();
                }

                window.alert(message);
                console.error(error);
        }
}

window.addEventListener('DOMContentLoaded', () => {
        const app = new MultiViewerApp(document.body);
        window.MULTI_VIEWER = { app };
        console.info('[Multi glTF Viewer] Instance exported as `window.MULTI_VIEWER`.');
});
