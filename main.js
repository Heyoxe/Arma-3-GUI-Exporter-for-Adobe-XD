module.exports = {
    commands: {
        exportContent,
        resetSettings
    }
};

const FS = require("uxp").storage.localFileSystem;
const { SettingsHelper } = require('./helpers');

function align(tabs) {
    let result = new Array()
    for (let i = 0; i < tabs; i++) {
        result.push("\t");
    };
    return result.join('');
};

function normalize(string) {
    return string.replace(/[^a-zA-Z0-9_-]/gm, "_");
};

// https://codeburst.io/javascript-array-distinct-5edc93501dc4
function distinct(value, index, self) {
    return self.indexOf(value) === index;
};

let attributes = {};
function addAttribute(name, value, category, condition) {
    if (condition) {
        if (attributes[category] === undefined) {
            attributes[category] = { name: category, children: [] };
        };
        attributes[category].children.push(`${name} = ${value};`)
    };
};

function drawAttributes(attributes, tabs) {
    let draw = "";
    for (let [key, value] of Object.entries(attributes)) {
        if (value.children.length !== 0) {
            if (settings.addComments) {
                draw += `\n${align(tabs)}/* ${key} */\n`;
            };
            draw += value.children.map(child => `${align(tabs)}${child}\n`).join('');
        };
    };
    return draw;
};

const nodrivepath = "\\ESE\\ESE_Main_E";
function drawItem(node, tabs) {
    attributes = {};
    let draw = `${align(tabs)}class ${node.arma.name}: ${node.arma.from} {${settings.addComments ? '' : '\n'}`;
    addAttribute(node.parser.idType, node.arma[node.parser.idType], "Meta", true);
    addAttribute("guid",`"${node.guid}"`, "Meta", settings.exportMeta);
    // draw += `${align(tabs + 1)}${node.parser.idType} = ${node.arma[node.parser.idType]};\n`;
    if (node.parser.idType === 'idc') {
        addAttribute("x", node.arma.x, "Position", true);
        addAttribute("y", node.arma.y, "Position", true);
        addAttribute("w", node.arma.w, "Position", true);
        addAttribute("h", node.arma.h, "Position", true);

        const styles = node.arma.styles.filter(distinct).filter(value => value !== 'ST_LEFT');
        addAttribute("style", (styles.join(' + ')), "Design", (styles.length > 0));
        addAttribute("sizeEx", node.arma.sizeEx, "Design", (node.arma.sizeEx !== undefined));

        if ((node.parser.imageName !== undefined) && settings.exportImages) {
            addAttribute("text", `"${nodrivepath}\\data\\images\\${node.parser.imageName}"`, "Design", (node.arma.text !== undefined));
        } else {
            addAttribute("text", `"${node.arma.text}"`, "Design", (node.arma.text !== undefined));
        };

        addAttribute("onLoad", `"uiNamespace setVariable ['#XdControl${node.arma.name}', (_this#0)]"`, "Events", !node.node.hasDefaultName);

        if (node.parser.events.onMouseButtonDown !== "") {
            const guid = node.parser.events.onMouseButtonDown.data;
            let command = "";
            if (guid === '') {
                command = node.parser.events.onMouseButtonDown.value;
            } else {
                const index = allNodes.map(node => node.guid).indexOf(guid);
                if (index > -1) {
                    const name = allNodes[index].parser.name;
                    command = node.parser.events.onMouseButtonDown.value.replace('%1', `"${name}"`);
                };
            };
            addAttribute("onMouseButtonDown", `"${command}"`, "Events", (command !== "") && settings.exportInteractions);
        };
    } else {
        addAttribute("onLoad", `"uiNamespace setVariable ['#${node.arma.name}', (_this#0)]"`, "Events", true);
    };
    draw += drawAttributes(attributes, tabs + 1);

    if (node.parser.children.length > 0) {
        draw += `\n${align(tabs + 1)}class Controls {\n`;
        draw += node.parser.children.map(child => drawItem(child, tabs + 2)).join('\n');
        draw += `${align(tabs + 1)}};\n`;
    };
    draw += `${align(tabs)}};\n`;
    return draw;
};

let id = -1;
let duplicates = [];
let IDs = [];
function indexItem(node, parent = { indexer: { type: 'Root' }, parser: { path: [], x:0, y:0, w:0, h:0, offsetX:0, offsetY:0 } }, firstSibling) {
    id++;
    let data = {
        node: node,
        guid: node.guid,
        indexer: {
            type: node.constructor.name,
            name: normalize(node.name),
            named: node.hasDefaultName
        },
        original: node,
        parser: {
            id: id,
            idType: `id${(node.constructor.name === 'Artboard') ? 'd' : 'c'}`,
            path: parent.parser.path.concat([normalize(node.name)]),
            name: normalize(node.name),
            x: node.globalBounds.x,
            y: node.globalBounds.y,
            w: node.globalBounds.width,
            h: node.globalBounds.height,
            offsetX: 0,
            offsetY: 0,
            children: [],
            events: {
                onMouseButtonDown: "",
                // onKeyDown: node.triggeredInteractions.filter(interaction => (interaction.trigger.type === 'tap')),
            }    
        },
        arma: {
            from: 'IGUIBack',
            name: normalize(node.name),
            type: 'CT_STATIC',
            disabled: node.locked,
            styles: [],
            attributes: {},
            classes: {},
            events: {
                onMouseButtonDown: "",
            }
        }
    };

    if (data.indexer.type === 'Artboard') {
        data.parser.name = `XdDisplay${data.parser.name}`;
        data.arma.name = `XdDisplay${data.arma.name}`;
    };

    // SymbolInstance | RepeatGrid
    // if (data.indexer.type === 'SymbolInstance') {
    //     const guid = node.symbolId;
    //     const symbolNode = scenegraph.getNodeByGUID(guid);
    //     console.log(node.guid, guid, node.isMaster, symbolNode);
    // };
    
    let siblingsInherits = "";
    if (data.indexer.type === 'RepeatGrid') {
        let child = node.children.map(child => child)[0];
        if (child.hasDefaultName) {
            siblingsInherits  = `Xd_${child.guid.replace(/-/gm, '_')}`;
        } else {
            let name = normalize(child.name);
            let paath = data.parser.path.concat([name]);
            duplicates.push(paath);
            const duplicateAmount = duplicates.map(path => path.join('_')).filter(path => path === paath).length;
            if (duplicateAmount > 1) {
                name += `_${duplicateAmount}`;
            };
            duplicates.pop();
            siblingsInherits = name;
        };
    };
    
    
    
    /* Interaction Handling */
    node.triggeredInteractions.filter(i => (i.trigger.type === 'tap')).map(i => i.action).forEach(e => {
        let command = "";
        if (e.type === 'goBack') {
            command = { value: `closeDialog 2;`, data: '' };
        } else if (e.type === 'overlay') {
            command = { value: `createDialog "%1";`, data: e.overlay.guid };
        } else if (e.type === 'goToArtboard') {
            command = { value: `closeDialog 2; createDialog "%1";`, data: e.destination.guid };
        };
        data.parser.events.onMouseButtonDown = command;
    });
    
    /* Duplicates Handling */
    duplicates.push(data.parser.path);
    const duplicateAmount = duplicates.map(path => path.join('_')).filter(path => path === data.parser.path.join('_')).length;
    if (duplicateAmount > 1) {
        data.parser.path = data.parser.path.concat([duplicateAmount]);
        data.parser.name += `_${duplicateAmount}`;
    };
    
    data.parser.children = node.children.filter(child => child.visible).map(child => indexItem(child, data, siblingsInherits));
    if (data.parser.children.length > 0) data.arma.from = "RscControlsGroup";

    /* Arma Handling */
    data.arma[`id${(data.indexer.type === 'Artboard') ? 'd' : 'c'}`] = `${(!data.indexer.named) ? `Xd_Id${(data.indexer.type === 'Artboard') ? 'Display' : 'Control'}_${data.parser.path.join('_')}` : `${settings.IdBaseline + data.parser.id}`}`
    if (!data.indexer.named) {
        IDs.push(`#define Xd_Id${(data.indexer.type === 'Artboard') ? 'Display' : 'Control'}_${data.parser.path.join('_')} Xd_IdBaseline + ${id}`);
    };

    /* Coordinates and Position Handling */
    // ToDo: Add position anchors
    if (parent.indexer.type === 'Artboard') {
        if (parent.parser.w !== 1920) data.parser.offsetX = -((parent.parser.w - 1920) / 2);
        if (parent.parser.h !== 1080) data.parser.offsetY = -((parent.parser.h - 1080) / 2);
    };
    if (data.indexer.type !== 'Artboard') {
        data.arma.x = `Xd_PositionX${(data.parser.path.length > 2) ? 'Group' : ''}(${data.parser.x - parent.parser.x + data.parser.offsetX})`;
        data.arma.y = `Xd_PositionY${(data.parser.path.length > 2) ? 'Group' : ''}(${data.parser.y - parent.parser.y + data.parser.offsetY})`;
        data.arma.w = `Xd_PositionW(${data.parser.w})`;
        data.arma.h = `Xd_PositionH(${data.parser.h})`;
    };

    /* Name Handling (I guess?) */
    if (node.hasDefaultName) {
        data.arma.name = `Xd_${node.guid.replace(/-/gm, '_')}`;
    } else {
    };

    // if (parent.indexer.type === 'RepeatGrid') {
    //     if (firstSibling !== data.arma.name) {
    //         data.arma.from = firstSibling;
    //     };
    // };

    /* Attributes parsing */
    data = parseText(node, data);
    data = parseColors(node, data);
    const split = node.name.split(':');
    if (split.length > 1) {
        data.arma.from = split[1].trim();
    };

    return data;
};

function parseText(item, data) {
    const { Text } = require("scenegraph");
    if (item instanceof Text) {
        const hasBreaks = item.text.includes("\n");
        const hasStyles = item.styleRanges.length > 1;
        data.arma.styles = data.arma.styles.concat([`ST_${item.textAlign.toUpperCase()}`]);
        data.arma.sizeEx = `Xd_FontSize(${item.fontSize})`;
        if (hasStyles || hasBreaks) {
            data.arma.type = "CT_STRUCTURED_TEXT";
            data.arma.from = "RscStructuredText";
            data.arma.text = item.text;
            const urlMatcher = /(([a-z0-9]+:\/\/))(.*(@|\.))?([a-z]+\.)([a-z]+)(\/)?/gm;
            let lastLength = 0;
            let lastColor = '';
            let lastUnderline = false;
            data.arma.text = item.styleRanges.map(style => {
                let start = lastLength;
                lastLength += style.length;
                let text = '<t';
                const snippet = data.arma.text.slice(start, start + style.length);
                     
                if (lastColor !== style.fill.toHex(true)) text += ` color='${style.fill.toHex(true)}'`;
                if (lastUnderline !== style.underline) text += ` underline='${(style.underline) ? '1' : '0' }'`;
                lastColor = style.fill.toHex(true);
                lastUnderline = style.underline;
                
                text += `>${snippet}</t>`;
                const urls = snippet.match(urlMatcher);
                if (urls !== null) {
                    urls.forEach(url => {
                        let str = '<t';
                        if (lastColor === style.fill.toHex(true)) { str += ` color='#0000FF'` } else { str += ` color='${style.fill.toHex(true)}'` };
                        str += ` underline='1'`;
                        str += ` href='${url}'>${url}</t>`;
                        text = text.replace(url, str);
                    });
                };
                return text;
            }).join('');
            data.arma.text = data.arma.text.replace(/\n/gm, '<br/>');
        } else {
            data.arma.type = "CT_STATIC";
            data.arma.from = "RscText";
            data.arma.text = item.text;
            if (item.areaBox !== undefined) {
                data.arma.styles = data.arma.styles.concat(["ST_MULTI"]);
            };
        };
    };
    return data;
};

function parseColors(item, data) {
    const { GraphicNode } = require("scenegraph");
    if (item instanceof GraphicNode) {
        const fillType = data.original.fill.constructor.name;
        let fill = undefined;
        switch (fillType) {
            case "Color":
                fill = item.fill.toRgba();
                break;
            case "ImageFill":
                    fill = { r: 1, g:0, b:1, a:1 };
                break;
                case "LinearGradientFill":
                    fill = item.fill.colorStops[0].color.toRgba();
                break;
            default:
                break;
        };
        if (fillType === "ImageFill") {
            if (!item.fill.isLinkedContent) {
                let path = item.fill.toString().slice(10, -1);
                let decomposed = path.split('\\');
                let name = decomposed[decomposed.length - 1];
                data.parser.imageName = name;
                data.parser.imagePath = path;
            };
            data.arma.from = "RscPicture";
            data.arma.styles = data.arma.styles.concat(["ST_PICTURE"]);
            data.arma.text = `#(rgb,8,8,3)color(1,1,1,1)`;
            data.arma.colorText = `Xd_ColorA({${fill.r},${fill.g},${fill.b},${fill.a}})`;
        } else {
            if (data.arma.text !== undefined) {
                data.arma.colorBackground = fill;
            } else if (data.type === "CT_STATIC") {
                data.colorText = fill;
            };
        };
    };
    return data;
};

let allNodes = [];
let scenegraph;

function generateContent(selection) {
    let application = require("application");
    let os = require("os")
    scenegraph = require("scenegraph");
    id = -1;
    duplicates = [];
    IDs = [];
    let nodes = selection.itemsIncludingLocked.map(node => indexItem(node));
    allNodes = nodes;
    let draw = nodes.map(node => drawItem(node, 0));
    const timeOptions = { 
        year: 'numeric', 
        month: '2-digit', 
        day: 'numeric', 
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short"
    }
    return `/*
    Generate with Arma 3 GUI Exporter (A3GE) for Adobe XD on ${new Date().toLocaleDateString('en-GB', timeOptions)}
 
    Discord: https://discord.gg/QDGatN2/
    GitHub: https://github.com/Heyoxe/Arma-3-GUI-Exporter-for-Adobe-XD

    Application Version: ${application.version}
    Application Language: ${application.appLanguage}

    Document Name: ${application.activeDocument.name}

    System Platform: ${os.platform()}
    System Version: ${os.release()}
    System Language: ${application.systemLocale}
*/

// The generated files are not allowed to be used on a monetized platform. If you want to do so, please contact Heyoxe#0557 on Discord.

/* Positions */
#define Xd_PositionX(X) #((((X * (getResolution select 0)) / 1920) * safeZoneW) / (getResolution select 0) + safeZoneX)
#define Xd_PositionY(Y) #((((Y * (getResolution select 1)) / 1080) * safeZoneH) / (getResolution select 1) + safeZoneY)
#define Xd_PositionW(W) #((((W * (getResolution select 0)) / 1920) * safeZoneW) / (getResolution select 0))
#define Xd_PositionH(H) #((((H * (getResolution select 1)) / 1080) * safeZoneH) / (getResolution select 1))
#define Xd_PositionXGroup(X) #((((X * (getResolution select 0)) / 1920) * safeZoneW) / (getResolution select 0))
#define Xd_PositionYGroup(Y) #((((Y * (getResolution select 1)) / 1080) * safeZoneH) / (getResolution select 1))
#define Xd_FontSize(H) #(((H * 0.00222222) * (getResolution select 1)) / 1080)

/* IDXs */
#define Xd_IdBaseline ${settings.IdBaseline}
${IDs.join('\n')}

` + draw.join('\n');
};

function resetSettings() {
    require("scenegraph").root.pluginData = undefined;
};

async function exportContent(selection) {
    try {
        if (!selection.hasArtboards) throw { name: 'No Artboards Detected', message: 'You must select atleast one Artboard to be able to export your GUI' };
        settings = await SettingsHelper.getAll(settings);
        let state = await showSettings();
        let main = settingsDialog.querySelector("#a3gesettings");
        settings = {
            licensekey: main.querySelector("#key").value,
            IdBaseline: main.querySelector("#id").value,
            exportMeta: main.querySelector("#meta").checked,
            addComments: main.querySelector("#comments").checked,
            exportInteractions: main.querySelector("#interactions").checked,
        };
        SettingsHelper.setAll(settings);
        if (state !== "reasonCanceled") {
            let content = await generateContent(selection);
            let file = exportFile;
            if (file === null || file === undefined || file.write === undefined) {
                throw { name: "No Folder Selected!", message: "You must select a folder before exporting!"};
            } else {
                await file.write(content);
                showSuccess("Hooray!", "Your GUI was successfully exported into an Arma 3 compatible GUI format :)")
            };
        };
    } catch (error) {
        if (error.stack !== undefined) console.log(error.stack);
        showError(error.name, error.message, error.stack);
    };
};

let settings = {
    licensekey: '',
    IdBaseline: Math.floor(Math.random() * 10000) + 10000,
    exportMeta: false,
    addComments: true,
    exportInteractions: true,
    exportImages: false,
    useIDXsMacros: true,
    positions: 'pixel',
};
// a3gesettings
let settingsDialog;
let exportFile = {};
function showSettings() {
    if (!settingsDialog) {
        settingsDialog = document.createElement("dialog");
    };
    settingsDialog.innerHTML = `
        <style>
            form {
                width: 600px;
            }
            .h1 {
                align-items: center;
                justify-content: space-between;
                display: flex;
                flex-direction: row;
            }
            .icon {
                border-radius: 4px;
                width: 24px;
                height: 24px;
                overflow: hidden;
            }
            .iconsmall {
                border-radius: 4px;
                width: 16px;
                height: 16px;
                overflow: hidden;
            }
            input[type="checkbox"] {
                width: 30px;
            }
            #dialog {
                display: flex;
                flex-direction: column;
            }
            select {
                width: 150px;
            }
            span {
                width: 150px;
                text-align: left;
            }
            .large {
                width: 400px;
            }
            .hidden {
                visible: false;
                width: 0px;
                height: 0px;
            }
        </style>
        <form method="dialog" id="a3gesettings" name="a3gesettings">
            <h1 class="h1">
                <span>Export GUI</span>
                <img class="icon" src="./assets/icon.png" />
            </h1>
            <hr/>
            <div id="dialog">
                <label>
                    <input class="hidden" type="text" uxp-quiet="true" value="" />
                </label>
                <label>
                    <span>Licence Key</span>
                    <input id="key" class="large" type="text" uxp-quiet="true" value="${settings.licensekey}" />
                </label>
                <label>
                    <span>Base ID</span>
                    <input id="id" type="number" required="true" uxp-quiet="true" value="${settings.IdBaseline}" />
                </label>
                <label>
                    <span>Export Meta</span>
                    <input id="meta" type="checkbox" ${(settings.exportMeta) ? 'checked' : ''} />
                </label>
                <label>
                    <span>Add Comments</span>
                    <input id="comments" type="checkbox" ${(settings.addComments) ? 'checked' : ''} />
                </label>
                <label>
                    <span>Export Interactions</span>
                    <input id="interactions" type="checkbox" ${(settings.exportInteractions) ? 'checked' : ''} />
                </label>
                <!-- <label>
                    <span>Export Images</span>
                    <input disabled id="images" type="checkbox" ${(settings.exportImages) ? 'checked' : ''} />
                </label>
                <label>
                    <span>Use IDXs Macros</span>
                    <input disabled id="idxsmacros" type="checkbox" ${(settings.useIDXsMacros) ? 'checked' : ''} />
                </label>
                <label>
                    <span>Positions Macros</span>
                    <select disabled id="positionsmacros" name="positions">
                        <option ${(settings.positions === 'none') ? 'selected' : ''} value="none">None</option>
                        <option ${(settings.positions === 'pixel') ? 'selected' : ''} value="pixel">Pixels</option>
                        <option ${(settings.positions === 'safezone') ? 'selected' : ''} value="safezone">SafeZones</option>
                    </select>
                </label> -->
                <label>
                    <span>Export to</span>
                    <img class="iconsmall" src="./assets/folder.svg" />
                    <p id="path">${exportFile.nativePath || "Please select a file..."}</p>
                    <button id="change" uxp-variant="primary" uxp-quiet="true">Change</button>
                </label>
            </div>
            <footer>
                <button id="cancel" uxp-variant="primary">Cancel</button>
                <button type="submit" uxp-variant="cta" autofocus>Export</button>
            </footer>
        </form>
    `;
    const cancelButton = settingsDialog.querySelector("#cancel");
    cancelButton.addEventListener("click", () => { settingsDialog.close("reasonCanceled"); });
    
    const changeButton = settingsDialog.querySelector("#change");
    changeButton.addEventListener("click", async () => {
        const pathtext = settingsDialog.querySelector("#path");
        const file = await FS.getFileForSaving("dialog.hpp", { types: ["hpp"]});
        exportFile = file;
        pathtext.innerHTML = file.nativePath;
    });

    document.appendChild(settingsDialog);
    return settingsDialog.showModal();
};

let errorDialog;
function showError(title = "Something went wrong", details = "We were unable to perfom the requested action...", stack = "") {
    if (!errorDialog) {
        errorDialog = document.createElement("dialog");
    };
    errorDialog.innerHTML = `
        <style>
            form {
                width: 660px;
            }
            span {
                width: 300px;
            }
            .h1 {
                align-items: center;
                justify-content: space-between;
                display: flex;
                flex-direction: row;
            }
            .icon {
                border-radius: 4px;
                width: 24px;
                height: 24px;
                overflow: hidden;
            }
            .hidden {
                visible: false;
                width: 0px;
                height: 0px;
            }

            #sent {
                padding-top: 12px;
                font-size: 1rem;
            }
            code {
                vertical-align: baseline;
                font-family: Consolas,Andale Mono WT,Andale Mono,Lucida Console,Lucida Sans Typewriter,DejaVu Sans Mono,Bitstream Vera Sans Mono,Liberation Mono,Nimbus Mono L,Monaco,Courier New,Courier,monospace;
                display: block;
                overflow-x: auto;
                padding: .5em;
                border-radius: 4px;
                font-size: 0.875rem;
                line-height: 1.125rem;
                text-indent: 0;
                background-color: black;
                color: #A0A0A0;
                user-select: text;
            }
        </style>
        <form method="dialog">
            <h1 class="h1 color-red">
                <span>${title}</span>
                <img class="icon" src="./assets/icon.png" />
            </h1>
            <hr/>
            <p>${details}</p>
            ${(stack !== "") ? `
            <code>
            ${stack.split('at ').join('<br/>>    at ')}
            </code>
            ` : ''}
            <footer>
                <span id="sent" class="color-green">Error report sent!</span>
                <button ${(stack === "") ? "class='hidden'" : ""} id="copy" uxp-variant="primary">Send Error Report</button>
                <button type="submit" uxp-variant="cta">Close</button>
            </footer>
        </form>
    `;

    const copyButton = errorDialog.querySelector("#copy");
    copyButton.addEventListener("click", async () => {
        let content = `**${title}**
> ${details}
\`\`\`js
${stack}
\`\`\``;

        errorDialog.querySelector("#sent").style.visibility = "visible";
        errorDialog.querySelector("#copy").style.visibility = "hidden";
        let url = ""; /* Discord Webhook */
        if (url !== "") {
            var data = `content=${encodeURI(content)}`;
    
            var xhr = new XMLHttpRequest();
            xhr.withCredentials = true;
            
            xhr.open("POST", url);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    
            xhr.send(data);
        };
    });
    errorDialog.querySelector("#sent").style.visibility = "hidden";
    errorDialog.querySelector("#copy").style.visibility = "visible";
    document.appendChild(errorDialog);
    return errorDialog.showModal();
};

let successDialog;
function showSuccess(title = "Something went wrong", details = "We were unable to perfom the requested action...") {
    if (!successDialog) {
        successDialog = document.createElement("dialog");
    };
    successDialog.innerHTML = `
        <style>
            form {
                width: 360px;
            }
            .h1 {
                align-items: center;
                justify-content: space-between;
                display: flex;
                flex-direction: row;
            }
            .icon {
                border-radius: 4px;
                width: 24px;
                height: 24px;
                overflow: hidden;
            }
        </style>
        <form method="dialog">
            <h1 class="h1 color-green">
                <span>${title}</span>
                <img class="icon" src="./assets/icon.png" />
            </h1>
            <hr/>
            <p>${details}</p>
            <footer>
                <button type="submit" uxp-variant="cta">Close</button>
            </footer>
        </form>
    `;
    document.appendChild(successDialog);
    return successDialog.showModal();
};