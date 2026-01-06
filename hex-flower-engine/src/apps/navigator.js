import { getRegistry, getStates, saveStates, FLAG_SCOPE, FLAG_STATE } from '../helpers/flags.js';
import { HEX_SIZE, cubeToPixel, hexCorners } from '../helpers/hex-math.js';

// Standard Fallback Table
const DEFAULT_DIRECTION_TABLE = [
    { min: 12, max: 12, dir: "N" },
    { min: 10, max: 11, dir: "NE" },
    { min: 8, max: 9, dir: "SE" },
    { min: 7, max: 7, dir: "SAME" },
    { min: 5, max: 6, dir: "S" },
    { min: 3, max: 4, dir: "SW" },
    { min: 2, max: 2, dir: "NW" }
];

const HEX_DIRS = {
    "N": { q: 0, r: -1 },
    "NE": { q: 1, r: -1 },
    "SE": { q: 1, r: 0 },
    "S": { q: 0, r: 1 },
    "SW": { q: -1, r: 1 },
    "NW": { q: -1, r: 0 },
    "SAME": { q: 0, r: 0 }
};

const DIR_ORDER = ["N", "NE", "SE", "S", "SW", "NW"];

// Helper: Get Display Name
function getCellName(cell) {
    return cell.bioma || cell.stage || cell.title || cell.name || cell.encounter_type || "Hex";
}

// Helper: Get Description / Details
function getCellDescription(cell) {
    return cell.description || cell.summary || "";
}

// Helper: Render Object to HTML
function renderProperties(obj, excludeKeys = []) {
    let html = "";
    const formatValue = (v) => {
        if (v && typeof v === 'object') {
            if (v.banda) return v.banda;
            if (v.banda_terrestre || v.banda_marinha) {
                return [v.banda_terrestre, v.banda_marinha].filter(b => b).join("/");
            }
            if (v.name) return v.name;
            if (v.title) return v.title;
            const values = Object.values(v);
            if (values.every(val => typeof val !== 'object')) {
                return values.join(", ");
            }
            return "[Detail]";
        }
        return v;
    };

    for (const [key, value] of Object.entries(obj)) {
        if (excludeKeys.includes(key)) continue;
        let displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

        if (typeof value === 'object' && value !== null) {
            const subProps = Object.entries(value).map(([k, v]) => {
                return `${k}: ${formatValue(v)}`;
            }).join(" | ");
            html += `<b>${displayKey}:</b> <span style="font-size: 0.9em; color: #ccc;">${subProps}</span><br/>`;
        } else {
            html += `<b>${displayKey}:</b> ${value}<br/>`;
        }
    }
    return html;
}

function generateHexSVG(data, currentCoord) {
    const cells = data.cells || [];
    if (!cells.length) return "<p>No Data (Check Manager)</p>";

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    cells.forEach(cell => {
        const { x, y } = cubeToPixel(cell.coord.q, cell.coord.r, HEX_SIZE);
        minX = Math.min(minX, x - HEX_SIZE);
        maxX = Math.max(maxX, x + HEX_SIZE);
        minY = Math.min(minY, y - HEX_SIZE);
        maxY = Math.max(maxY, y + HEX_SIZE);
    });

    const width = maxX - minX + 20;
    const height = maxY - minY + 20;

    let svg = `<svg width="100%" height="100%" viewBox="${minX - 10} ${minY - 10} ${width} ${height}" 
               preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" 
               style="max-height: 85vh;">`;

    cells.forEach(cell => {
        const { x, y } = cubeToPixel(cell.coord.q, cell.coord.r, HEX_SIZE);

        let name = getCellName(cell);
        if (name.length > 15) name = name.substring(0, 13) + "…";

        let isCurrent = false;
        if (currentCoord) {
            if (cell.coord.q === currentCoord.q && cell.coord.r === currentCoord.r) {
                isCurrent = true;
            }
        }

        const border = isCurrent ? "#00FFFF" : "#333";
        const width = isCurrent ? 4 : 1.5;
        const zIndexStyle = isCurrent ? "z-index: 10;" : "";
        const dataJson = JSON.stringify(cell).replace(/"/g, '&quot;');

        svg += `
        <g class="hex-flower-cell" data-cell="${dataJson}" style="cursor: pointer; opacity: 1; ${zIndexStyle}">
            <polygon points="${hexCorners(x, y, HEX_SIZE)}" 
                     fill="${cell.color || '#cccccc'}" 
                     stroke="${border}" stroke-width="${width}" />
            <text x="${x}" y="${y - 5}" text-anchor="middle" dominant-baseline="central" 
                  font-size="14" style="pointer-events:none;">${cell.emoji || ''}</text>
            <text x="${x}" y="${y + 12}" text-anchor="middle" dominant-baseline="middle" 
                  font-size="8" fill="black" font-weight="bold" style="pointer-events:none;">${name}</text>
        </g>`;
    });

    svg += `</svg>`;
    return svg;
}

async function handleHexClick(startCell, allCells, dialogApp, hexData, flowerId) {
    const settings = hexData.settings || {};
    const navRules = settings.navigation || DEFAULT_DIRECTION_TABLE;
    const borderBehavior = settings.borderBehavior || "stay";

    let maxVal = 0;
    navRules.forEach(r => { if (r.max > maxVal) maxVal = r.max; });

    let diceFormula = "2d6";
    if (maxVal <= 6) diceFormula = "1d6";
    else if (maxVal <= 8) diceFormula = "1d8";
    else if (maxVal <= 12 && maxVal > 10) diceFormula = "2d6";
    else if (maxVal <= 20) diceFormula = "1d20";
    else diceFormula = `1d${maxVal}`;

    const roll = new Roll(diceFormula);
    await roll.evaluate();
    const total = roll.total;

    let entry = navRules.find(d => total >= d.min && total <= d.max);
    if (!entry) {
        entry = { dir: "SAME" };
    }
    const dirKey = entry.dir;

    const getNextCoord = (coord, direction) => {
        const delta = HEX_DIRS[direction] || { q: 0, r: 0 };
        return { q: coord.q + delta.q, r: coord.r + delta.r };
    };

    const findCell = (q, r) => allCells.find(c => c.coord.q === q && c.coord.r === r);

    let nextQ = startCell.coord.q;
    let nextR = startCell.coord.r;

    if (dirKey !== "SAME") {
        const temp = getNextCoord(startCell.coord, dirKey);
        nextQ = temp.q;
        nextR = temp.r;
    }

    let targetCell = findCell(nextQ, nextR);
    let finalNote = "";

    if (!targetCell && dirKey !== "SAME") {
        finalNote = `(Border: ${borderBehavior})`;

        switch (borderBehavior) {
            case "wrap": {
                const oppIndex = (DIR_ORDER.indexOf(dirKey) + 3) % 6;
                const oppDir = DIR_ORDER[oppIndex];
                let current = startCell;
                let sanity = 0;
                while (true && sanity < 50) {
                    const checkCoord = getNextCoord(current.coord, oppDir);
                    const checkCell = findCell(checkCoord.q, checkCoord.r);
                    if (checkCell) {
                        current = checkCell;
                        sanity++;
                    } else {
                        targetCell = current;
                        finalNote += " - Wrapped";
                        break;
                    }
                }
                break;
            }
            case "reflect": {
                const oppIndex = (DIR_ORDER.indexOf(dirKey) + 3) % 6;
                const oppDir = DIR_ORDER[oppIndex];
                const reflectCoord = getNextCoord(startCell.coord, oppDir);
                const reflectCell = findCell(reflectCoord.q, reflectCoord.r);
                if (reflectCell) {
                    targetCell = reflectCell;
                    finalNote += " - Reflected";
                } else {
                    targetCell = startCell;
                    finalNote += " - Stuck";
                }
                break;
            }
            case "clockwise": {
                const currIndex = DIR_ORDER.indexOf(dirKey);
                const newDir = DIR_ORDER[(currIndex + 1) % 6];
                const spinCoord = getNextCoord(startCell.coord, newDir);
                targetCell = findCell(spinCoord.q, spinCoord.r);
                if (!targetCell) {
                    targetCell = startCell;
                    finalNote += " - Corner";
                } else {
                    finalNote += " - Slid CW";
                }
                break;
            }
            case "anticlockwise": {
                const currIndex = DIR_ORDER.indexOf(dirKey);
                const newDir = DIR_ORDER[(currIndex - 1 + 6) % 6];
                const spinCoord = getNextCoord(startCell.coord, newDir);
                targetCell = findCell(spinCoord.q, spinCoord.r);
                if (!targetCell) {
                    targetCell = startCell;
                    finalNote += " - Corner";
                } else {
                    finalNote += " - Slid CCW";
                }
                break;
            }
            case "stay":
            default:
                targetCell = startCell;
                finalNote += " - Blocked";
                break;
        }
    } else if (!targetCell) {
        targetCell = startCell;
    }

    const moved = targetCell !== startCell;

    const startName = getCellName(startCell);
    const targetName = getCellName(targetCell);

    let msg = `<h3>Hex Flower Navigation</h3>`;
    msg += `<b>Start:</b> ${startCell.emoji} ${startName}<br/>`;
    msg += `<b>Roll:</b> ${total} (${dirKey})<br/>`;
    msg += `<b>Result:</b> ${targetCell.emoji} ${targetName} ${moved ? "" : "(Stayed)"} ${finalNote}`;

    ChatMessage.create({
        content: msg,
        whisper: ChatMessage.getWhisperRecipients("GM")
    });

    await logToJournal(startCell, total, dirKey, targetCell, flowerId);

    // Save State
    const allStates = await getStates();
    allStates[flowerId] = targetCell.coord;
    await saveStates(allStates);

    if (dialogApp && dialogApp.element) {
        const newSVG = generateHexSVG(hexData, targetCell.coord);
        const $container = dialogApp.element.find("#hex-flower-container");
        $container.html(newSVG);

        // Rebuild tooltip/click listeners via attached function
        // (For simplicity in this refactor, we are not extracting the `attachListeners` fully but it would be cleaner)
        // We rely on the `handleHexClick` being recursively called, so we need to ensure the click listener knows what to do.
        // But wait, the `dialogApp` logic in `runViewer` attaches the listeners. 
        // Here we just updated HTML. We need to re-bind events to the new HTML elements.

        // Quick hack: The View function should attach listeners. 
        // Better: `runViewer` has logic to attach. We can expose it? 
        // Or in this file, we just re-run the attach logic.

        const attach = () => {
            const $tooltip = dialogApp.element.find("#hex-flower-info");
            $container.find(".hex-flower-cell").hover(
                function () {
                    const dataStr = $(this).attr("data-cell");
                    const cell = JSON.parse(dataStr);
                    const name = getCellName(cell);
                    const desc = getCellDescription(cell);
                    let info = `<h4>${cell.emoji} ${name}</h4>`;
                    info += `<b>Coord:</b> (${cell.coord.q}, ${cell.coord.r}, ${cell.coord.s})<br/>`;
                    if (desc) info += `<i>${desc}</i><br/><hr style="margin:4px 0; border-color:#555;"/>`;

                    const exclude = ["bioma", "stage", "title", "name", "encounter_type", "description", "summary", "emoji", "color", "coord", "x", "y", "settings"];
                    info += renderProperties(cell, exclude);
                    $tooltip.html(info).show();
                },
                function () { $tooltip.hide(); }
            );

            $container.find(".hex-flower-cell").click(async function () {
                const dataStr = $(this).attr("data-cell");
                const nextStartCell = JSON.parse(dataStr);
                await handleHexClick(nextStartCell, hexData.cells, dialogApp, hexData, flowerId);
            });
        }
        attach();
    }

    ui.notifications.info(`Rolled ${total} (${dirKey}) -> ${getCellName(targetCell)}`);
}

async function logToJournal(startCell, rollVal, direction, endCell, flowerId) {
    const JOURNAL_NAME = "Hex Flower History";
    let journal = game.journal.getName(JOURNAL_NAME);

    if (!journal) {
        journal = await JournalEntry.create({ name: JOURNAL_NAME });
    }

    const targetName = getCellName(endCell);
    const exclude = ["bioma", "stage", "title", "name", "encounter_type", "emoji", "color", "coord", "x", "y"];
    const propertiesHtml = renderProperties(endCell, exclude);

    const timestamp = new Date().toLocaleString();
    const newContent = `
    <p>
    <strong>[${timestamp}] Move (${flowerId}):</strong><br/>
    ${startCell.emoji} ${getCellName(startCell)} 
    --> <strong>[${rollVal}: ${direction}]</strong> --> 
    ${endCell.emoji} ${targetName}<br/>
    <div style="font-size: 0.9em; border-left: 2px solid #ccc; padding-left: 5px; margin-top: 5px;">
        ${propertiesHtml}
    </div>
    </p>
    <hr/>
    `;

    let page = journal.pages.contents[0];
    if (!page) {
        await journal.createEmbeddedDocuments("JournalEntryPage", [{
            name: "Log",
            type: "text",
            text: { content: newContent }
        }]);
    } else {
        const currentText = page.text.content;
        await page.update({ "text.content": newContent + currentText });
    }
}

export async function showNavigatorDialog() {
    const registry = await getRegistry();
    const ids = Object.keys(registry);

    if (ids.length === 0) {
        return ui.notifications.warn("No Hex Flowers found. Run 'Hex Flower Manager' to create one!");
    }

    const pickFlower = async () => {
        let selectedId = ids[0];
        if (ids.length > 1) {
            let options = "";
            ids.forEach(id => {
                options += `<option value="${id}">${registry[id].name}</option>`;
            });

            const selected = await Dialog.prompt({
                title: "Select Hex Flower",
                content: `<div class="form-group"><label>Choose:</label><select id="flower-select">${options}</select></div>`,
                callback: (html) => html.find("#flower-select").val()
            });
            if (!selected) return null;
            selectedId = selected;
        }
        return selectedId;
    };

    const runViewer = async (selectedId) => {
        if (!selectedId) return;

        const flowerData = registry[selectedId].data;
        const flowerName = registry[selectedId].name;
        const allStates = await getStates();
        const savedCoord = allStates[selectedId] || null;

        const backBtn = ids.length > 1 ? `<button id="hex-flower-back" class="hex-btn" style="flex: 0 0 auto; width: auto; margin-right: 10px;" title="Switch Flower"><i class="fas fa-arrow-left"></i></button>` : "";

        const content = `
        <div class="hex-header">
            ${backBtn}
            <h3>${flowerName}</h3>
        </div>
        
        <div style="width: 100%; height: 600px; position: relative; background: #222; overflow: hidden;" id="hex-flower-container">
            ${generateHexSVG(flowerData, savedCoord)}
            <div id="hex-flower-info" class="hex-flower-tooltip" style="display:none;"></div>
        </div>
        `;

        const d = new Dialog({
            title: `Hex Flower Viewer`,
            content: content,
            buttons: {},
            render: (html) => {
                html.closest(".app").addClass("hex-flower-dialog");

                html.find("#hex-flower-back").click(async () => {
                    d.close();
                    const newId = await pickFlower();
                    if (newId) runViewer(newId);
                });

                const $tooltip = html.find("#hex-flower-info");

                html.find(".hex-flower-cell").hover(
                    function () {
                        const dataStr = $(this).attr("data-cell");
                        const cell = JSON.parse(dataStr);
                        const name = getCellName(cell);
                        const desc = getCellDescription(cell);

                        let info = `<h4>${cell.emoji} ${name}</h4>`;
                        info += `<b>Coord:</b> (${cell.coord.q}, ${cell.coord.r}, ${cell.coord.s})<br/>`;

                        if (desc) info += `<i>${desc}</i><br/><hr style="margin:4px 0; border-color:#555;"/>`;

                        const exclude = ["bioma", "stage", "title", "name", "encounter_type", "description", "summary", "emoji", "color", "coord", "x", "y", "settings"];
                        info += renderProperties(cell, exclude);

                        $tooltip.html(info).show();
                    },
                    function () { $tooltip.hide(); }
                );

                html.find(".hex-flower-cell").click(async function () {
                    const dataStr = $(this).attr("data-cell");
                    const startCell = JSON.parse(dataStr);
                    await handleHexClick(startCell, flowerData.cells, d, flowerData, selectedId);
                });
            }
        }, {
            width: 800,
            height: 700,
            resizable: true
        });

        d.render(true);
    };

    const startId = await pickFlower();
    if (startId) runViewer(startId);
}
