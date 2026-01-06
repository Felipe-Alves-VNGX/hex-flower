import { getRegistry, saveRegistry } from '../helpers/flags.js';
import { HEX_SIZE, cubeToPixel, hexCorners, generateId } from '../helpers/hex-math.js';

export async function showManagerDialog() {
    const registry = await getRegistry();
    const flowers = Object.entries(registry);

    let listHtml = "";
    if (flowers.length === 0) {
        listHtml = `<tr><td colspan="3" style="text-align:center; padding: 20px; color:#777;">No Hex Flowers found.<br/>Click Import to start!</td></tr>`;
    } else {
        flowers.forEach(([id, entry]) => {
            const name = entry.name || "Unnamed Flower";
            listHtml += `
            <tr>
                <td><strong>${name}</strong></td>
                <td style="text-align: center;">${entry.data.cells ? entry.data.cells.length : 0} hexes</td>
                <td style="text-align: right;">
                    <button class="hex-btn edit-flower" data-id="${id}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="hex-btn danger delete-flower" data-id="${id}" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    }

    const content = `
    <div class="hex-manager-container">
        <h3 style="border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 10px; color: #fff;">Hex Flower Manager</h3>
        <table class="hex-manager-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th style="text-align:center;">Size</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${listHtml}
            </tbody>
        </table>
        <button id="btn-import-flower" class="hex-btn hex-btn-main"><i class="fas fa-file-import"></i> Create / Import New Flower</button>
    </div>
    `;

    new Dialog({
        title: "Hex Flower Manager",
        content: content,
        buttons: {
            close: { label: "Close" }
        },
        render: (html) => {
            html.closest(".app").addClass("hex-flower-dialog");

            html.find("#btn-import-flower").click(() => {
                showEditDialog(null, registry);
            });

            html.find(".edit-flower").click((ev) => {
                const id = $(ev.currentTarget).data("id");
                showEditDialog(id, registry);
            });

            html.find(".delete-flower").click(async (ev) => {
                const id = $(ev.currentTarget).data("id");
                const confirm = await Dialog.confirm({
                    title: "Delete Hex Flower?",
                    content: `<p>Are you sure you want to delete <strong>${registry[id].name}</strong>?</p>`
                });
                if (confirm) {
                    // Update registry
                    delete registry[id];
                    await saveRegistry(registry);
                    // Refresh
                    Object.values(ui.windows).forEach(w => {
                        if (w.title === "Hex Flower Manager") w.close();
                    });
                    showManagerDialog();
                }
            });
        }
    }, { width: 450, height: "auto" }).render(true);
}

function generateMiniSVG(data) {
    const cells = data.cells || [];
    if (!cells.length) return `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#555;">No Cells</div>`;

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
               preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;

    cells.forEach(cell => {
        const { x, y } = cubeToPixel(cell.coord.q, cell.coord.r, HEX_SIZE);
        svg += `
        <g>
            <polygon points="${hexCorners(x, y, HEX_SIZE)}" 
                     fill="${cell.color || '#cccccc'}" 
                     stroke="#333" stroke-width="1" />
            <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" 
                  font-size="10" style="pointer-events:none;">${cell.emoji || ''}</text>
        </g>`;
    });

    svg += `</svg>`;
    return svg;
}

function showEditDialog(id, registry) {
    const isNew = !id;
    const entry = isNew ? { name: "", data: { cells: [] } } : registry[id];

    // Ensure settings exist (Defaults)
    entry.data.settings = entry.data.settings || {
        navigation: [
            { min: 12, max: 12, dir: "N" },
            { min: 10, max: 11, dir: "NE" },
            { min: 8, max: 9, dir: "SE" },
            { min: 7, max: 7, dir: "SAME" },
            { min: 5, max: 6, dir: "S" },
            { min: 3, max: 4, dir: "SW" },
            { min: 2, max: 2, dir: "NW" }
        ],
        borderBehavior: "stay"
    };

    const jsonString = JSON.stringify(entry.data, null, 2);

    // Helper to generate Nav Rows
    const navRules = entry.data.settings.navigation || [];
    let navRowsHtml = "";
    navRules.forEach((rule, idx) => {
        navRowsHtml += `
        <div class="nav-rule-row" style="display:flex; gap:5px; margin-bottom:5px; align-items:center;">
            <input type="number" class="hex-input" style="width:40px;" value="${rule.min}" data-idx="${idx}" data-field="min">
            <span style="color:#888;">to</span>
            <input type="number" class="hex-input" style="width:40px;" value="${rule.max}" data-idx="${idx}" data-field="max">
            <span style="color:#888;">&rarr;</span>
            <select class="hex-input" style="flex:1;" data-idx="${idx}" data-field="dir">
                <option value="N" ${rule.dir === 'N' ? 'selected' : ''}>N (North)</option>
                <option value="NE" ${rule.dir === 'NE' ? 'selected' : ''}>NE (North-East)</option>
                <option value="SE" ${rule.dir === 'SE' ? 'selected' : ''}>SE (South-East)</option>
                <option value="S" ${rule.dir === 'S' ? 'selected' : ''}>S (South)</option>
                <option value="SW" ${rule.dir === 'SW' ? 'selected' : ''}>SW (South-West)</option>
                <option value="NW" ${rule.dir === 'NW' ? 'selected' : ''}>NW (North-West)</option>
                <option value="SAME" ${rule.dir === 'SAME' ? 'selected' : ''}>Same (Stay)</option>
            </select>
            <button class="hex-btn danger remove-rule" data-idx="${idx}" style="padding: 2px 6px;"><i class="fas fa-times"></i></button>
        </div>`;
    });

    const content = `
    <div class="hex-edit-layout">
        <div class="hex-edit-left">
            <div style="margin-bottom: 10px;">
                <label class="hex-label">Flower Name</label>
                <input type="text" class="hex-input" name="name" value="${entry.name}" placeholder="e.g. My Weather Engine"/>
            </div>

            <div class="nav-tabs">
                <div class="nav-tab active" data-tab="tab-rules">Game Rules</div>
                <div class="nav-tab" data-tab="tab-json">JSON Data</div>
            </div>

            <!-- RULES TAB -->
            <div id="tab-rules" class="tab-content active">
                <div style="background: #222; padding: 10px; border-radius: 4px; border: 1px solid #333; margin-bottom: 10px;">
                    <label class="hex-label">Border Behavior</label>
                    <div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">What happens when moving off-grid?</div>
                    <select class="hex-input" id="border-behavior">
                        <option value="stay" ${entry.data.settings.borderBehavior === 'stay' ? 'selected' : ''}>Stay (Stop at edge)</option>
                        <option value="wrap" ${entry.data.settings.borderBehavior === 'wrap' ? 'selected' : ''}>Wrap (Loop to opposite side)</option>
                        <option value="reflect" ${entry.data.settings.borderBehavior === 'reflect' ? 'selected' : ''}>Reflect (Bounce back 1 hex)</option>
                        <option value="clockwise" ${entry.data.settings.borderBehavior === 'clockwise' ? 'selected' : ''}>Slide Clockwise (Turn 60&deg;)</option>
                        <option value="anticlockwise" ${entry.data.settings.borderBehavior === 'anticlockwise' ? 'selected' : ''}>Slide Anti-Clockwise (Turn -60&deg;)</option>
                    </select>
                </div>

                <div style="background: #222; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <label class="hex-label">Navigation Rules</label>
                    <div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">Roll Ranges mapped to Directions.</div>
                    
                    <div style="display:flex; gap: 5px; margin-bottom: 10px;">
                        <button class="hex-btn preset-btn" data-preset="2d6">2d6 Normal</button>
                        <button class="hex-btn preset-btn" data-preset="d6">d6 Simple</button>
                        <button class="hex-btn preset-btn" data-preset="d8">d8 Direct</button>
                    </div>

                    <div id="nav-rules-container" style="max-height: 250px; overflow-y: auto;">
                        ${navRowsHtml}
                    </div>
                    <button class="hex-btn" id="add-rule-btn" style="width:100%; margin-top:5px;"><i class="fas fa-plus"></i> Add Rule</button>
                </div>
            </div>

            <!-- JSON TAB -->
            <div id="tab-json" class="tab-content">
                <label class="hex-label">Raw JSON</label>
                <textarea class="hex-input" id="hex-json-input" name="json" style="height: 480px;">${jsonString}</textarea>
                <p style="font-size:10px; color:#777; margin: 3px 0 0 0;">Editing this updates Rules tab and vice-versa (on save/switch).</p>
            </div>
        </div>

        <div class="hex-edit-right">
            <div class="hex-preview-header">
                Real-Time Preview
            </div>
            <div class="hex-preview-content" id="hex-preview-container">
            </div>
        </div>
    </div>
    `;

    const d = new Dialog({
        title: isNew ? "Import Hex Flower" : "Edit Hex Flower",
        content: content,
        buttons: {
            save: {
                label: "<i class='fas fa-save'></i> Save",
                callback: async (html) => {
                    const name = html.find('[name="name"]').val();
                    let finalData;
                    try {
                        const jsonRaw = html.find('[name="json"]').val();
                        finalData = JSON.parse(jsonRaw);
                    } catch (e) {
                        return ui.notifications.error("Invalid JSON in Data tab.");
                    }

                    const border = html.find("#border-behavior").val();
                    const newRules = [];
                    html.find(".nav-rule-row").each((_, row) => {
                        const $row = $(row);
                        newRules.push({
                            min: parseInt($row.find('[data-field="min"]').val()) || 0,
                            max: parseInt($row.find('[data-field="max"]').val()) || 0,
                            dir: $row.find('[data-field="dir"]').val()
                        });
                    });

                    finalData.settings = {
                        borderBehavior: border,
                        navigation: newRules
                    };

                    if (!finalData.cells || !Array.isArray(finalData.cells)) {
                        return ui.notifications.error("Invalid Data: Must contain 'cells' array.");
                    }

                    const newId = id || generateId();
                    registry[newId] = {
                        name: name || "Unnamed Flower",
                        data: finalData
                    };

                    await saveRegistry(registry);
                    ui.notifications.info(`Saved "${registry[newId].name}".`);

                    Object.values(ui.windows).forEach(w => w.close());
                    showManagerDialog();
                }
            },
            cancel: {
                label: "<i class='fas fa-arrow-left'></i> Back",
                callback: () => {
                    Object.values(ui.windows).forEach(w => w.close());
                    showManagerDialog();
                }
            }
        },
        render: (html) => {
            html.closest(".app").addClass("hex-flower-dialog");

            const $textarea = html.find("#hex-json-input");
            const $preview = html.find("#hex-preview-container");
            const $rulesContainer = html.find("#nav-rules-container");

            html.find(".nav-tab").click(ev => {
                const $tab = $(ev.currentTarget);
                const target = $tab.data("tab");
                html.find(".nav-tab").removeClass("active");
                $tab.addClass("active");
                html.find(".tab-content").removeClass("active");
                html.find("#" + target).addClass("active");

                if (target === "tab-json") {
                    try {
                        let currentData = JSON.parse($textarea.val());
                        const border = html.find("#border-behavior").val();
                        const newRules = [];
                        html.find(".nav-rule-row").each((_, row) => {
                            const $row = $(row);
                            newRules.push({
                                min: parseInt($row.find('[data-field="min"]').val()) || 0,
                                max: parseInt($row.find('[data-field="max"]').val()) || 0,
                                dir: $row.find('[data-field="dir"]').val()
                            });
                        });
                        currentData.settings = { borderBehavior: border, navigation: newRules };
                        $textarea.val(JSON.stringify(currentData, null, 2));
                        updatePreview();
                    } catch (e) { }
                }
            });

            const updatePreview = () => {
                const raw = $textarea.val();
                try {
                    const data = JSON.parse(raw);
                    const svg = generateMiniSVG(data);
                    $preview.html(svg);
                } catch (e) {
                    $preview.html(`<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#d44;">Invalid JSON</div>`);
                }
            };
            updatePreview();
            $textarea.on("input", updatePreview);

            const renderRow = (rule) => `
                <div class="nav-rule-row" style="display:flex; gap:5px; margin-bottom:5px; align-items:center;">
                    <input type="number" class="hex-input" style="width:40px;" value="${rule.min}" data-field="min">
                    <span style="color:#888;">to</span>
                    <input type="number" class="hex-input" style="width:40px;" value="${rule.max}" data-field="max">
                    <span style="color:#888;">&rarr;</span>
                    <select class="hex-input" style="flex:1;" data-field="dir">
                        <option value="N" ${rule.dir === 'N' ? 'selected' : ''}>N (North)</option>
                        <option value="NE" ${rule.dir === 'NE' ? 'selected' : ''}>NE (North-East)</option>
                        <option value="SE" ${rule.dir === 'SE' ? 'selected' : ''}>SE (South-East)</option>
                        <option value="S" ${rule.dir === 'S' ? 'selected' : ''}>S (South)</option>
                        <option value="SW" ${rule.dir === 'SW' ? 'selected' : ''}>SW (South-West)</option>
                        <option value="NW" ${rule.dir === 'NW' ? 'selected' : ''}>NW (North-West)</option>
                        <option value="SAME" ${rule.dir === 'SAME' ? 'selected' : ''}>Same</option>
                    </select>
                    <button class="hex-btn danger remove-rule" style="padding: 2px 6px;"><i class="fas fa-times"></i></button>
                </div>`;

            html.find("#add-rule-btn").click(() => {
                $rulesContainer.append(renderRow({ min: 0, max: 0, dir: "SAME" }));
                rebindDelete();
            });

            function rebindDelete() {
                html.find(".remove-rule").off("click").click(function () {
                    $(this).closest(".nav-rule-row").remove();
                });
            }
            rebindDelete();

            html.find(".preset-btn").click(function () {
                const type = $(this).data("preset");
                let rules = [];
                if (type === "2d6") {
                    rules = [
                        { min: 12, max: 12, dir: "N" },
                        { min: 10, max: 11, dir: "NE" },
                        { min: 8, max: 9, dir: "SE" },
                        { min: 7, max: 7, dir: "SAME" },
                        { min: 5, max: 6, dir: "S" },
                        { min: 3, max: 4, dir: "SW" },
                        { min: 2, max: 2, dir: "NW" }
                    ];
                } else if (type === "d6") {
                    rules = [
                        { min: 6, max: 6, dir: "N" },
                        { min: 5, max: 5, dir: "NE" },
                        { min: 4, max: 4, dir: "SE" },
                        { min: 3, max: 3, dir: "S" },
                        { min: 2, max: 2, dir: "SW" },
                        { min: 1, max: 1, dir: "NW" }
                    ];
                } else if (type === "d8") {
                    rules = [
                        { min: 8, max: 8, dir: "N" },
                        { min: 7, max: 7, dir: "NE" },
                        { min: 6, max: 6, dir: "SE" },
                        { min: 5, max: 5, dir: "S" },
                        { min: 4, max: 4, dir: "SW" },
                        { min: 3, max: 3, dir: "NW" },
                        { min: 2, max: 2, dir: "SAME" },
                        { min: 1, max: 1, dir: "SAME" }
                    ];
                }

                $rulesContainer.empty();
                rules.forEach(r => $rulesContainer.append(renderRow(r)));
                rebindDelete();
            });
        }
    }, { width: 950, height: 760, resizable: true });

    d.render(true);
}
