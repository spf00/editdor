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
/**
 * 
 * @param {*} firstAttribute 
 * @param {*} object 
 * @param {*} dontRender is a list of keys that shouldn't be packed into the attribute list.
 * 
 * @description
 * Parses all key-value pairs of an object into an object'. 
 * 
 */
export const buildAttributeListObject = (firstAttribute, object, dontRender) => {
    let attributeListObject = { ...firstAttribute }

    for (const [key, value] of Object.entries(object)) {
        if (!dontRender.includes(key)) {
            attributeListObject[key] = value
        }
    }

    return attributeListObject;
}

/**
 * 
 * @param {*} forms 
 * 
 * @description
 * Converts Forms that have an array as the "op" value into multiple separate Forms 
 * which only have a string as "op" value.
 */
export const separateForms = (forms) => {
    if (forms === undefined && !forms) {
        return []
    }

    const newForms = [];

    for (let i = 0; i < forms.length; i++) {
        const form = forms[i];

        if (!Array.isArray(form.op)) {
            newForms.push(form);
            continue;
        }

        for (let i = 0; i < form.op.length; i++) {
            const temp = { ...form };
            temp.op = form.op[i];
            newForms.push(temp);
        }
    }

    return newForms;
}




/**
 * 
 * @param {itemToCheck} itemToCheck 
 * 
 * Checks if item contains Forms
 * 
 */
export const hasForms = (itemToCheck) => {
    return itemToCheck.forms ? true : false;
}

/**   
  *Check if link exists in the links section of iteamToCheck  
*/
export const hasLinks = (itemToCheck) => {
    return itemToCheck.links ? true : false;
}

/**  
  *Check if link exists in the links section of iteamToCheck 
*/
export const checkIfLinkIsInItem = (link, itemToCheck) => {
    for (const element of itemToCheck.links) {
        if (element.href === link.href) {
            return true;
        }
    }
    return false;

}
export const checkIfFormIsInItem = (form, itemToCheck) => {
    for (const element of itemToCheck.forms) {
        if (typeof (form.op) === "string") {
            return checkIfFormIsInElement(form, element)
        } else {
            for (const x of form.op) {
                if (typeof (element.op) === 'string') {
                    if (element.op === x) {
                        return true;
                    }
                } else {
                    if (element.op.includes(x)) {
                        let deepCompare = true;
                        for (const y in form) {
                            if (y !== 'op') {
                                if (element[y] !== form[y]) {
                                    deepCompare = false;
                                }
                            }
                        }
                        if (deepCompare)
                            return true
                    }
                }
            }
        }
    }
    return false
}

const checkIfFormIsInElement = (form, element) => {
    if (typeof (element.op) === 'string') {
        if (element.op === form.op) {
            return true;
        }
    } else {
        if (element.op.includes(form.op)) {
            let deepCompare = true;
            for (const y in form) {
                if (y !== 'op') {
                    if (element[y] !== form[y]) {
                        deepCompare = false;
                    }
                }
            }
            if (deepCompare)
                return true
        }
    }
}

/**
    * Display the selected Thing description 
    * Save the current Thing Description if wanted
    * Method supports both fileHandler and jsonld file
*/
export const changeBetweenTd = async (context, href) => {
    var writable
    if (context.linkedTd[href]["kind"] === "file") {
        try {
            if (context.isModified && context.fileHandle) {
                writable = await context.fileHandle.createWritable();
                await writable.write(context.offlineTD);
                await writable.close();
            }
        } catch (e) {
            console.error(e.message);
        }
        let fileHandle = context.linkedTd[href];
        const file = await fileHandle.getFile();
        const td = JSON.parse(await file.text());
        let offlineTd = JSON.stringify(td, null, 2);
        context.setFileHandle(fileHandle);
        context.updateOfflineTD(offlineTd);
        context.updateIsModified(false);
        document.getElementById("linkedTd").value = href;
    }
    // If we create a TD using the New button then we don't have a file handler
    // In that case the entry in linkedTd is not a file handler but a Thing Description Json 
    else if (Object.keys(context.linkedTd[href]).length) {
        try {
            if (context.isModified && context.fileHandle) {
                writable = await context.fileHandle.createWritable();
                await writable.write(context.offlineTD);
                await writable.close();
            }
        } catch (e) {
            console.error(e.message);
        }
        context.setFileHandle(undefined);
        const td = context.linkedTd[href];
        let offlineTd = JSON.stringify(td, null, 2);
        context.updateOfflineTD(offlineTd);
        context.updateIsModified(false);
        document.getElementById("linkedTd").value = href;

    }
}

/**
   * File Handle from native filesystem api
   * Only JSON/JSON+LD Files are supported
*/
export const getFileHandle = () => {
    const opts = {
        types: [
            {
                description: "Thing Description",
                accept: { "application/ld+json": [".jsonld", ".json"] },
            },
        ],
    };
    if ("showOpenFilePicker" in window) {
        return window.showOpenFilePicker(opts).then((handles) => handles[0]);
    }
    return window.chooseFileSystemEntries();
};

/**
   * Reading files with HTML5 input
*/
export const getFileHTML5 = async () => {
    return new Promise((resolve, reject) => {
        const fileInput = document.getElementById("fileInput");
        fileInput.onchange = (e) => {
            const file = fileInput.files[0];
            if (file) {
                return resolve(file);
            }
            return reject(new Error("AbortError"));
        };
        fileInput.click();
    });
};

export const _readFileHTML5 = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener("loadend", (event) => {
            const text = event.srcElement.result;
            return resolve(text);
        });
        reader.readAsText(file);
    });
}

/**
 * @param {*} source Source object
 * @param {string} key Source key
 * @param {*} atContext Respective @context value
 * 
 * @returns {string} String value of source[key] with prepended LRI or RLI symbol
 *
 * @description
 * Returns the value of source[key] with the direction information (rtl/ltr).
 */
export const getDirectedValue = (source, key, atContext) => {
    const LRI = '\u2066';
    const RLI = '\u2067';
    const TABLE = {
      ar: 'rtl',
      fa: 'rtl',
      ps: 'rtl',
      ur: 'rtl',
      hy: 'ltr',
      as: 'ltr',
      bn: 'ltr',
      zb: 'ltr',
      ab: 'ltr',
      be: 'ltr',
      bg: 'ltr',
      kk: 'ltr',
      mk: 'ltr',
      ru: 'ltr',
      uk: 'ltr',
      hi: 'ltr',
      mr: 'ltr',
      ne: 'ltr',
      ko: 'ltr',
      ma: 'ltr',
      am: 'ltr',
      ti: 'ltr',
      ka: 'ltr',
      el: 'ltr',
      gu: 'ltr',
      pa: 'ltr',
      he: 'rtl',
      iw: 'rtl',
      yi: 'rtl',
      ja: 'ltr',
      km: 'ltr',
      kn: 'ltr',
      lo: 'ltr',
      af: 'ltr',
      ay: 'ltr',
      bs: 'ltr',
      ca: 'ltr',
      ch: 'ltr',
      cs: 'ltr',
      cy: 'ltr',
      da: 'ltr',
      de: 'ltr',
      en: 'ltr',
      eo: 'ltr',
      es: 'ltr',
      et: 'ltr',
      eu: 'ltr',
      fi: 'ltr',
      fj: 'ltr',
      fo: 'ltr',
      fr: 'ltr',
      fy: 'ltr',
      ga: 'ltr',
      gl: 'ltr',
      gn: 'ltr',
      gv: 'ltr',
      hr: 'ltr',
      ht: 'ltr',
      hu: 'ltr',
      id: 'ltr',
      in: 'ltr',
      is: 'ltr',
      it: 'ltr',
      kl: 'ltr',
      la: 'ltr',
      lb: 'ltr',
      ln: 'ltr',
      lt: 'ltr',
      lv: 'ltr',
      mg: 'ltr',
      mh: 'ltr',
      mo: 'ltr',
      ms: 'ltr',
      mt: 'ltr',
      na: 'ltr',
      nb: 'ltr',
      nd: 'ltr',
      nl: 'ltr',
      nn: 'ltr',
      no: 'ltr',
      nr: 'ltr',
      ny: 'ltr',
      om: 'ltr',
      pl: 'ltr',
      pt: 'ltr',
      qu: 'ltr',
      rm: 'ltr',
      rn: 'ltr',
      ro: 'ltr',
      rw: 'ltr',
      sg: 'ltr',
      sk: 'ltr',
      sl: 'ltr',
      sm: 'ltr',
      so: 'ltr',
      sq: 'ltr',
      ss: 'ltr',
      st: 'ltr',
      sv: 'ltr',
      sw: 'ltr',
      tl: 'ltr',
      tn: 'ltr',
      to: 'ltr',
      tr: 'ltr',
      ts: 'ltr',
      ve: 'ltr',
      vi: 'ltr',
      xh: 'ltr',
      zu: 'ltr',
      ds: 'ltr',
      gs: 'ltr',
      hs: 'ltr',
      me: 'ltr',
      ni: 'ltr',
      ns: 'ltr',
      te: 'ltr',
      tk: 'ltr',
      tm: 'ltr',
      tp: 'ltr',
      tv: 'ltr',
      ml: 'ltr',
      my: 'ltr',
      nq: 'ltr',
      or: 'ltr',
      si: 'ltr',
      ta: 'ltr',
      dv: 'rtl',
      th: 'ltr',
      dz: 'ltr'
    };

    const getDirectionSymbol = dir => (dir === 'ltr') ? LRI : RLI;

    // title, description and language tags (like "en" or "en-US") are treated differently
    if (!['title', 'description'].includes(key) && !/^[A-Za-z]{2}(-[A-Za-z]{2})?$/.test(key)) {
      return getDirectionSymbol(source[key].toString().getDirection()) + source[key];
    }

    if (/^[A-Za-z]{2}(-[A-Za-z]{2})?$/.test(key)) {
      // Language tags can be compound like ar-EG or en-US, split when needed
      // Also, we ignore the case for language tags
      const lookupKey = (key.includes('-')) ? key.split('-')[0] : key.toLowerCase();
      const dir = TABLE[lookupKey];
      if (dir) return getDirectionSymbol(dir) + source[key];
      return getDirectionSymbol('ltr') + source[key];
    }

    let direction;
    let lang;

    if (!Array.isArray(atContext)) {
      atContext = [atContext];
    }

    atContext.forEach(e => {
      if (typeof e === 'object') {
        if (e['@direction']) direction = e['@direction'];
        if (e['@language']) lang = e['@language'];
      }
    });

    if (key === 'title' || key === 'description') {
      if (direction) return getDirectionSymbol(direction) + source[key];
      if (lang) {
        const lookupKey = (lang.includes('-')) ? lang.split('-')[0] : lang.toLowerCase();
        const dir = TABLE[lookupKey];
        if (dir) return getDirectionSymbol(dir) + source[key];
        return getDirectionSymbol('ltr') + source[key];
      }
    }

    return getDirectionSymbol(source[key].toString().getDirection()) + source[key];
}
