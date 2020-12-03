/********************************************************************************
 * Copyright (c) 2018 - 2020 Contributors to the Eclipse Foundation
 * 
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 * 
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * 
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
import React, { useCallback, useContext, useEffect } from 'react';
import logo from "../../../assets/editdor.png"
import wot from "../../../assets/WoT.png"
import ediTDorContext from '../../../context/ediTDorContext';
import '../../../assets/main.css'
import './Button.js'
import Button from './Button.js';
import CreateNewTD from './CreateNewTD.js';

export default function AppHeader() {
    const context = useContext(ediTDorContext);

    /**
    * Check if the Browser Supports the new Native File System Api (Chromium 86.0)
    */
    const hasNativeFS = useCallback(() => {
        return 'chooseFileSystemEntries' in window || 'showOpenFilePicker' in window
    }, []);

    const verifyDiscard = useCallback(async () => {
        if (!context.isModified) {
            return true;
        }

        console.log('verifyDiscard', context.isModified)
        const msg = 'Discard changes? All changes you made to your TD will be lost.';
        return await window.confirm(msg);
    }, [context.isModified]);


    /**
     * 
     * @param {*} file 
     * 
     * Read file content
     */
    const read = useCallback((file) => {
        return file.text ? file.text() : _readFileHTML5(file);
    }, [])

    const readFile = useCallback(async (file, fileHandle) => {
        try {
            context.updateOfflineTD(await read(file));
            context.setFileHandle(fileHandle || file.name);
        } catch (ex) {
            const msg = `An error occured reading ${context.offlineTD}`;
            console.error(msg, ex);
            //TODO: Replace with SweetAlert2
            alert(msg);
        }
    }, [context, read]);

    /**
     * 
     * @param {*} _ 
     * 
     * Open File from Filesystem
     */
    const openFile = useCallback(async (_) => {
        if (!await verifyDiscard()) {
            return;
        }

        if (!hasNativeFS()) {
            const file = await getFileHTML5();
            if (file) {
                await readFile(file);
            }
            return;
        }

        let fileHandle;
        try {
            fileHandle = await getFileHandle();
            const file = await fileHandle.getFile();
            await readFile(file, fileHandle);
        } catch (ex) {
            const msg = 'We ran into an error trying to open your TD.';
            console.error(msg, ex);
            alert(msg);
        }
    }, [readFile, verifyDiscard, hasNativeFS]);

    const writeFile = useCallback(async (fileHandle, contents) => {
        if (fileHandle.createWriter) {
            const writer = await fileHandle.createWriter();
            await writer.write(0, contents);
            await writer.close();
            return;
        }

        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();

        // refresh td for rendered view
        setTimeout(() => {
            context.updateOfflineTD(contents);
            context.updateIsModified(false);
        }, 500);
    }, [context])

    const saveAsHTML5 = useCallback((filename, contents) => {
        const aDownload = document.getElementById('aDownload');
        filename = filename || 'untitled.txt';
        const opts = { type: 'text/plain' };
        const file = new File([contents], '', opts);
        aDownload.href = window.URL.createObjectURL(file);
        aDownload.setAttribute('download', filename);
        aDownload.click();
    }, []);

    const saveFileAs = useCallback(async () => {
        if (!hasNativeFS()) {
            saveAsHTML5(context.name, context.offlineTD);
            return;
        }

        let fileHandle;
        try {
            fileHandle = await getNewFileHandle();
        } catch (ex) {
            const msg = 'We ran into an error trying to save your TD.';
            console.error(msg, ex);
            return alert(msg);
        }

        try {
            await writeFile(fileHandle, context.offlineTD);
            context.setFileHandle(fileHandle);
            context.updateIsModified(false);
        } catch (ex) {
            const msg = 'Unfortunately we were unable to save your TD.';
            console.error(msg, ex);
            alert(msg);
        }
    }, [saveAsHTML5, hasNativeFS, context, writeFile]);

    const newFile = useCallback(async () => {
        const thing = await CreateNewTD();
        if (thing) {
            context.updateOfflineTD(JSON.stringify(thing, null, "\t"));
        }
    }, [context]);

    const saveFile = useCallback(async () => {
        try {
            if (!context.fileHandle) {
                return await saveFileAs();
            }
            await writeFile(context.fileHandle, context.offlineTD);

        } catch (ex) {
            const msg = 'Unfortunately we were unable to save your TD.';
            console.error(msg, ex);
            alert(msg);
        }
    }, [context, saveFileAs, writeFile])

    /**
     * Reading files with HTML5 input
     */
    const getFileHTML5 = async () => {
        return new Promise((resolve, reject) => {
            const fileInput = document.getElementById('fileInput');
            fileInput.onchange = (e) => {
                const file = fileInput.files[0];
                if (file) {
                    return resolve(file);
                }
                return reject(new Error('AbortError'));
            };
            fileInput.click();
        });
    };

    /**
     * File Handle from native filesystem api
     * Only JSON/JSON+LD Files are supported
     */
    const getFileHandle = () => {
        const opts = {
            types: [{
                description: 'Thing Description',
                accept: { 'application/ld+json': ['.jsonld', '.json'] },
            }],
        };
        if ('showOpenFilePicker' in window) {
            return window.showOpenFilePicker(opts).then((handles) => handles[0]);
        }
        return window.chooseFileSystemEntries();
    }

    const getNewFileHandle = async () => {
        // new file system api
        if ('showSaveFilePicker' in window) {
            const opts = {
                types: [{
                    description: 'Thing Description',
                    accept: { 'application/ld+json': ['.jsonld', '.json'] },
                }],
            };

            return await window.showSaveFilePicker(opts);
        }

        // old html file input
        const opts = {
            type: 'save-file',
            accepts: [{
                description: 'Thing Description',
                extensions: ['.jsonld', '.json'],
                mimeTypes: ['application/ld+json'],
            }],
        };

        return await window.chooseFileSystemEntries(opts);
    }

    const _readFileHTML5 = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('loadend', (event) => {
                const text = event.srcElement.result;
                return resolve(text);
            });
            reader.readAsText(file);
        });
    }

    useEffect(() => {
        const shortcutHandler = (e) => {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();
                saveFile();
            }
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.key === 'o') {
                e.preventDefault();
                e.stopPropagation();
                openFile();
            }
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                e.stopPropagation();
                newFile();
            }
        }

        // Adding Eventlistener for shortcuts
        document.addEventListener("keydown", shortcutHandler, false);
        window.onbeforeunload = function (event) {
            var message = 'Important: Please click on \'Save\' button to leave this page.';
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = message;
            }
            return message;
        };
        return () => {
            //Remove Eventlistener for shortcuts before unmounting component
            document.removeEventListener("keydown", shortcutHandler, false);
        }
    }, [openFile, saveFile, newFile])

    return (
        <>
            <header className="flex justify-between items-center h-16 bg-blue-500">
                <div className="flex items-center">
                    <img className="pl-2 h-12" src={wot} alt="WOT" />
                    <div className="w-2"></div>
                    <img className="pl-2 h-8" src={logo} alt="LOGO" />
                </div>
                <div className="flex space-x-2 pr-2">
                    <Button onClick={newFile}>New TD/TM</Button>
                    <Button onClick={openFile}>Open TD/TM</Button>
                    <Button onClick={saveFile}>Save</Button>
                    <Button onClick={saveFileAs}>Save As</Button>
                </div >
            </header>
            <input className="h-0" type="file" id="fileInput" style={{ display: "none" }}></input>
            <a className="h-0" id="aDownload" href="/" style={{ display: "none" }}>download</a>
        </>
    );
}

