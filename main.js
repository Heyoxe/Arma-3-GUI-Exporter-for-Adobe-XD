// const application = require("application");
// const fs = require("uxp").storage.localFileSystem;

// async function exportRendition(selection) {
//     assets = require("assets");
//     let colors = assets.colors.get().map(color => [
//         `XD_Color${(!color.name) ? `Auto_${color.color.toHex(true).slice(-6)}` : `User_${color.name}` }`, 
//         color.color.toRgba()
//     ]);
//     console.log(colors)
//     let data = ``;
//     let content = {
//         artboards: []
//     };
//     if (selection.items.length > 0) {
//         selection.items.forEach(item => {
//             content.artboards.push(navigateItem(item));
//         });
//         const dialogs = content.artboards.map(a => drawArtboard(a)).join('\n\n');
//         const data = `/*
//     Generated with A3GE (https://xd2a3.heyoxe.ch/)

//     Plugin: https://adobe.com/
//     Discord: https://discord.gg/QDGatN2/
//     Website: https://xd2a3.heyoxe.ch/
//     Licence: CC/BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)
// */
// ${(colors.length === 0) ? '' : `
// /* Colors */
// ${colors.map(color => `#define ${color[0]} { ${color[1].r} / 255, ${color[1].g} / 255, ${color[1].b} / 255, ${color[1].a} / 255 }`).join('\n')}
// `}
// /* Dialogs */
// ${dialogs}
// `
        
//         const folder = await fs.getFolder();
//         const file = await folder.createFile("render.hpp", { overwrite: true });
//         file.write(data);
//     };
// };

// module.exports = {
//     commands: {
//         exportRendition
//     }
// };

let count = Math.floor(Math.random() * 10000) + 10000;
let assets;
let colors = {};
let application = require("application");
let ids = [];

const os = require("os")
const fs = require("uxp").storage.localFileSystem;

async function main(selection) {
    ids = [];
    assets = require("assets");
    assets.colors.get().forEach(color => {
        let rgba = color.color.toRgba();
        colors[color.color.value] = {
            name: `XD_Color${(!color.name) ? `Auto_${color.color.toHex(true).slice(-6)}` : `User_${color.name}` }`, 
            value: [rgba.r,rgba.g,rgba.b,rgba.a].map(v => (v / 255).toFixed(3))
        };
    });
    count = Math.floor(Math.random() * 10000) + 10000;
    const tree = selection.items.map(display => parseItem(display));
    let credits = `/*
    Generate with Arma 3 GUI Exporter (A3GE) for Adobe XD

    Discord: https://discord.gg/QDGatN2/
    Website: https://a3ge.heyoxe.ch/xd/

    Application Version: ${application.version}
    Application Language: ${application.appLanguage}

    Document Name: ${application.activeDocument.name}

    System Platform: ${os.platform()}
    System Version: ${os.release()}
    System Language: ${application.systemLocale}
*/

// The generated files are not allowed to be used on a monetized platform unless you own a valid licence (see https://a3ge.heyoxe.ch/licence/).`;
let header = `/* Positions */
#define XD_Position_X(X) #((((X * (getResolution select 0)) / 1920) * safeZoneW) / (getResolution select 0) + safeZoneX)
#define XD_Position_Y(Y) #((((Y * (getResolution select 1)) / 1080) * safeZoneH) / (getResolution select 1) + safeZoneY)
#define XD_Position_W(W) #((((W * (getResolution select 0)) / 1920) * safeZoneW) / (getResolution select 0))
#define XD_Position_H(H) #((((H * (getResolution select 1)) / 1080) * safeZoneH) / (getResolution select 1))
#define XD_Position_XGroup(X) #((((X * (getResolution select 0)) / 1920) * safeZoneW) / (getResolution select 0))
#define XD_Position_YGroup(Y) #((((Y * (getResolution select 1)) / 1080) * safeZoneH) / (getResolution select 1))    
`;
    if (Object.values(colors).length > 0) { header += `\n/* Colors */\n`};
    header += Object.values(colors).map(color => `#define ${color.name} { ${color.value.toString().replace(/,/gm, ", ")} }`).join('\n');
    
    if (ids.length > 0) { header += `\n\n/* IDXs */\n`};
    header += ids.map(id => `#define ${id[0]} ${id[1]}`).join('\n')
    const body = tree.map(display => drawItem(display, {}, 0, false)).join(`\n\n`);
    return ([credits, header, body].join('\n\n'));
}

async function exportRendition(selection) {
    const core = main(selection)
    // console.log([credits, header, body].join('\n\n'));
    // const folder = await fs.getFolder();
    const file = await fs.getFileForSaving("dialog.hpp", { types: ["hpp"]});
    await file.write(await core);
};

function drawItem(item, parent, tabs, inGroup) {
    let data = ``;
    let attributes = [];
    let type = item.meta.type;
    let colorbh;
    if (item.design.hasColor) {
        if (colors[item.design.colorBackground.value] === undefined) {
            try {
                let rgba = item.design.colorBackground.toRgba();
                colorbh = [rgba.r,rgba.g,rgba.b,rgba.a].map(v => (v / 255).toFixed(3))
            } catch (err) {
                colorbh = [255, 255, 255, 255].map(v => (v / 255).toFixed(3))
                // console.log(item)
            }
        } else {
            colorbh = { value: colors[item.design.colorBackground.value].name };
        };
    } else {
        colorbh = [255, 255, 255, 0].map(v => (v / 255).toFixed(3))
    }
    if (type === "Artboard") {
        data += `${align(tabs)}class ${item.meta.id} {`
        attributes = [
            "Meta",
            ["idd", item.meta.idd],
            ["id", item.meta.id],
            ["guid", item.meta.guid],
            ["name", item.meta.name],
            ["normalizedName", item.meta.normalizedName],
            ["xtype", item.meta.type],
            "Interaction",
            ["onLoad", item.interaction.onLoad]
        ];
    } else if (type === "Text") {
        data += `${align(tabs)}class ${item.meta.id}: ${item.design.type} {`
        attributes = [
            "Meta",
            ["idc", item.meta.idd],
            ["id", item.meta.id],
            ["guid", item.meta.guid],
            ["name", item.meta.name],
            ["normalizedName", item.meta.normalizedName],
            ["xtype", item.meta.type],
            "Interaction",
            ["onLoad", item.interaction.onLoad],
            "Design",
            ["colorText[]", colorbh],
            ["text", item.design.text],
            "Position",
            ["x", { value: `XD_Position_X${(inGroup) ? 'Group' : ''}(${item.position.x - parent.position.x})` }],
            ["y", { value: `XD_Position_Y${(inGroup) ? 'Group' : ''}(${item.position.y - parent.position.y})` }],
            ["w", { value: `XD_Position_W(${item.position.w})` }],
            ["h", { value: `XD_Position_H(${item.position.h})` }]
        ];
    } else if ((type === "Group") || (type === "RepeatGrid")) {
        item.meta.inheritsFrom = "RscControlsGroupNoScrollbars";
        data += `${align(tabs)}class ${item.meta.id}: ${item.meta.inheritsFrom} {`
        attributes = [
            "Meta",
            ["idc", item.meta.idd],
            ["id", item.meta.id],
            ["guid", item.meta.guid],
            ["name", item.meta.name],
            ["normalizedName", item.meta.normalizedName],
            ["xtype", item.meta.type],
            "Interaction",
            ["onLoad", item.interaction.onLoad],
            "Position",
            ["x", { value: `XD_Position_X${(inGroup) ? 'Group' : ''}(${item.position.x - parent.position.x})` }],
            ["y", { value: `XD_Position_Y${(inGroup) ? 'Group' : ''}(${item.position.y - parent.position.y})` }],
            ["w", { value: `XD_Position_W(${item.position.w})` }],
            ["h", { value: `XD_Position_H(${item.position.h})` }]
        ];
    } else {
        /*
            guid: item.guid,
            name: item.name,
            normalizedName: item.name.replace(/ /gm, "_"),
            length: (item.children.length),
            type: item.constructor.name,
        */
        data += `${align(tabs)}class ${item.meta.id}: ${item.meta.inheritsFrom || "IGUIBack"} {`
        attributes = [
            "Meta",
            ["idc", item.meta.idd],
            ["id", item.meta.id],
            ["guid", item.meta.guid],
            ["name", item.meta.name],
            ["normalizedName", item.meta.normalizedName],
            ["xtype", item.meta.type],
            "Interaction",
            ["onLoad", item.interaction.onLoad],
            "Design",
            ["colorBackground[]", colorbh],
            "Position",
            ["x", { value: `XD_Position_X${(inGroup) ? 'Group' : ''}(${item.position.x - parent.position.x})` }],
            ["y", { value: `XD_Position_Y${(inGroup) ? 'Group' : ''}(${item.position.y - parent.position.y})` }],
            ["w", { value: `XD_Position_W(${item.position.w})` }],
            ["h", { value: `XD_Position_H(${item.position.h})` }]
        ];
    };

    let line = -1;
    attributes.forEach(attribute => {
        line++
        if (line !== 0) {
            data += `\n`;
        };
        if ((typeof attribute) === "object") {
            data += `${align(tabs + 1)}${parseAttribute(attribute[0], attribute[1])};`
        } else {
            data += `\n${align(tabs + 1)}/* ${attribute} */`
        };
    });

    if ((item.controls.length > 0) && (type !== "Artboard")) { inGroup = true };
    const controls = item.controls.map(control => drawItem(control, item, tabs + 2, inGroup)).join(`\n`);
    if (controls !== '') {
        data += `\n\n${align(tabs + 1)}class Controls {`
        data += `\n${controls}`;
        data += `\n${align(tabs + 1)}};`
    }
    data += `\n${align(tabs)}};`;
    return data;
};

function parseAttribute(key, attribute) {
    if ((typeof attribute) === "string") {
        return `${key} = "${attribute}"`;
    } else if (((typeof attribute) === "object") && (attribute.length !== undefined)) {
        return `${key} = { ${attribute.toString().replace(/,/gm, ", ")} }`;
    } else if ((typeof attribute) === "object") {
        return `${key} = ${attribute.value}`;
    } else if (attribute === undefined) {
        return `${key} = -1`;
    } else {
        return `${key} = ${attribute}`;
    };
};

function parseItem(item) {
    const type = item.constructor.name;
    count++;
    const { Color } = require("scenegraph");
    const data = {
        meta: {
            id: `XD_Control_${item.guid.replace(/\-/g, "")}`,
            guid: item.guid,
            name: item.name.replace(/[\t,\n]/gm, ""),
            normalizedName: item.name.replace(/ /gm, "_").replace(/\–/gm, "_").replace(/[\t,\n]/gm, ""),
            length: (item.children.length),
            type: item.constructor.name,
            idd: count,
            idc: count
        },
        position: {
            x: item.globalBounds.x,
            y: item.globalBounds.y,
            w: item.globalBounds.width,
            h: item.globalBounds.height
        },
        design: {
            colorBackground: item.fill,
            hasColor: item.fillEnabled
        },
        interaction: {
            onLoad: "",
        },
        controls: item.children
            .filter(child => (["Rectangle", "Artboard", "Group", "RepeatGrid", "Text"].indexOf(child.constructor.name) > -1) && ((child.fill instanceof Color) || child.fill === undefined))
            .map(control => parseItem(control))
    };

    if (type === "Text") {
        data.design.type = `${(item.areaBox === null) ? 'RscText' : 'RscStructuredText'}`;
        data.design.text = item.text.replace(/[\t,\n]/gm, "");
    };
    // console.log(type)

    if ((data.meta.normalizedName !== "") && !item.hasDefaultName) {
        let load = `uiNamespace setVariable ['#XD_${(type === "Artboard") ? 'Display' : 'Control'}_${data.meta.normalizedName}', (_this#0)];`
        if (data.interaction.onLoad !== "") {
            load += ` ${data.interaction.onLoad}`;
        };
        data.interaction.onLoad = load;
    };

    if (item.pluginData !== undefined) {
        data.meta.inheritsFrom = item.pluginData.from;
        data.interaction.onLoad = item.pluginData.onLoad;
        // data.meta.type = item.pluginData.type;
    };

    if (!item.hasDefaultName) {
        ids.push([`XD_ID${(type === "Artboard") ? 'Display' : 'Control'}_${data.meta.normalizedName}`, count])
    };

    if (type === "Artboard") {
        data.meta.id = `XD_Display_${item.guid.replace(/\-/g, "")}`
    };

    return data;
};

function align(tabs) {
    let result = new Array()
    for (let i = 0; i < tabs; i++) {
        result.push("\t");
    };
    return result.join('');
};

/* Panel */
let panel;

function create() {
    const HTML = `<style>
            .break {
                flex-wrap: wrap;
            }
            .row {
                align-items: center;
            }
            label.row > * {
                margin: 3px 0;
            }
            label.row > span {
                color: #8E8E8E;
                width: 20px;
                text-align: right;
                font-size: 9px;
                margin-right: 2rem;
            }
            label.row input .select {
                flex: 1 1 auto;
            }
            .select {
                flex: 1 1 auto; 
            }
            div input[type=checkbox] {
                flex: 0 0 20px;
            }
            form footer > * {
                flex: 1 1 auto;
                position: relative;
                left: 8px;
            }

            .show {
                display: block;
            }
            .hide {
                display: none;
            }

        </style>
        <form method="dialog" id="main">
            <label class="row" id="fldButtonText">
                <span>From</span>
                <input type="text" id="from" value="" placeholder="Control Name" uxp-quiet="true"/>
            </label>
            <label class="row" id="fldButtonText">
                <span>onLoad</span>
                <input type="text" id="onLoad" value="" placeholder="OnLoad SQF Code" uxp-quiet="true"/>
            </label>
            <!-- <label class="row" id="fldButtonText">
                <span>Type</span>
                <input type="text" id="type" value="" placeholder="Control Type" uxp-quiet="true"/>
            </label> -->
            <!-- <label class="row">
                <span>Type</span>
                <select class="select" id="type">
                    <option value="artboard-1">Icon</option>
                    <option value="artboard-2">Thumbnail</option>
                    <option value="artboard-3">Preview</option>
                </select>
            </label> -->
            <footer><button id="ok" type="submit" uxp-variant="cta">Apply</button></footer>
        </form>

        <p id="warning">This plugin requires you to select a rectangle in the document. Please select a rectangle.</p>
        `;

    function apply() {
        const { editDocument } = require("application");
        const from = document.querySelector("#from").value;
        const onload = document.querySelector("#onLoad").value;
        // const type = document.querySelector("#type").value;


        editDocument({ editLabel: "Set Plugin Data" }, function(selection) {
            const selectedRectangle = selection.items[0];
            // console.log(selection.items[0])
            selectedRectangle.pluginData = {
                from: from,
                onLoad: onload
                // type: type
            };
        });
        
    };
    panel = document.createElement("div");
    panel.innerHTML = HTML;
    panel.querySelector("form").addEventListener("submit", apply);

    return panel;
};

function show(event) {
    if (!panel) event.node.appendChild(create());
}

let currentSelection;

function update(selection) {
    const { Rectangle } = require("scenegraph");
    const form = document.querySelector("form");
    const warning = document.querySelector("#warning");
  
    if (!selection || !(selection.items[0] instanceof Rectangle)) {
      form.className = "hide";
      warning.className = "show";
    } else {
      form.className = "show";
      warning.className = "hide";

      let curFrom = "IGUIBack";
      let curLoad = "";
    //   let curType = "-1";
      if (selection !== undefined && (selection.items[0] instanceof Rectangle)) {
          if (selection.items[0].pluginData !== undefined) {
              curFrom = selection.items[0].pluginData.from || "";
              curLoad = selection.items[0].pluginData.onLoad || "";
            //   curType = selection.items[0].pluginData.type || "";
          }
      };
      document.querySelector("#from").value = curFrom;
      document.querySelector("#onLoad").value = curLoad;
    //   document.querySelector("#type").value = curType;
    }
}

module.exports = {
    commands: {
        exportRendition
    },
    panels: {
        controlPanel: {
            show,
            update
        }
    }
};