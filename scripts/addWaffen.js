/**
 * QuickAdd User Script: Add Waffe to Character
 * Uses consolidated JSON database with two-stage selection by weapon subcategory
 * Automatically determines melee vs ranged weapons and parses L/S and AT/PA modifiers
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/waffen.json";
    
    // Ranged weapon subcategories
    const fernkampfKategorien = ["armbrueste", "boegen", "wurfwaffen", "blasrohre", "schleudern"];
    
    // Map subcategory to Kampftechnik name
    const kampftechnikMap = {
        "armbrueste": "Armbrüste",
        "boegen": "Bögen",
        "wurfwaffen": "Wurfwaffen",
        "blasrohre": "Blasrohre",
        "schleudern": "Schleudern",
        "dolche": "Dolche",
        "fechtwaffen": "Fechtwaffen",
        "hiebwaffen": "Hiebwaffen",
        "kettenwaffen": "Kettenwaffen",
        "lanzen": "Lanzen",
        "raufen": "Raufen",
        "schilde": "Schilde",
        "schwerter": "Schwerter",
        "stangenwaffen": "Stangenwaffen",
        "zweihandhiebwaffen": "Zweihandhiebwaffen",
        "zweihandschwerter": "Zweihandschwerter"
    };
    
    // Load all Waffen from single JSON file (FAST!)
    let waffen;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        waffen = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!waffen || waffen.length === 0) {
        new Notice("No Waffen found in database!");
        return;
    }
    
    // Filter out items with null or empty names
    waffen = waffen.filter(w => w.name && w.name.trim() !== '');
    
    if (waffen.length === 0) {
        new Notice("No valid Waffen found in database!");
        return;
    }
    
    // Stage 1: Select by subcategory
    const subcategories = [...new Set(waffen.map(w => w._subcategory).filter(Boolean))].sort();
    subcategories.unshift("⚔️ Alle Waffen anzeigen");
    
    const selectedSubcategory = await quickAddApi.suggester(
        subcategories.map(s => s === "⚔️ Alle Waffen anzeigen" ? s : formatSubcategory(s)), 
        subcategories
    );
    if (!selectedSubcategory) return;
    
    // Stage 2: Filter and show weapons
    const filtered = selectedSubcategory === "⚔️ Alle Waffen anzeigen"
        ? waffen
        : waffen.filter(w => w._subcategory === selectedSubcategory);
    
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    
    const displayStrings = filtered.map(w => {
        const tp = w.tp || '-';
        const preis = w.preis || '-';
        return `${w.name} | TP: ${tp} | ${preis}`;
    });
    
    const selected = await quickAddApi.suggester(displayStrings, filtered);
    
    if (!selected) return;
    
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No active file!");
        return;
    }
    
    let content = await app.vault.read(activeFile);
    
    const escYaml = str => String(str ?? '').replace(/"/g, '\\"');
    
    // Determine if melee or ranged weapon
    const isFernkampf = fernkampfKategorien.includes(selected._subcategory);
    const sectionName = isFernkampf ? "fernkampfwaffen" : "nahkampfwaffen";
    
    // Get Kampftechnik from subcategory
    const kampftechnik = kampftechnikMap[selected._subcategory] || selected._subcategory || '-';
    
    // Parse L/S from l_s field (e.g., "GE/KK 15" -> L: "GE/KK", S: 15)
    // For ranged weapons, use lz field (Ladezeit)
    let lValue = '-';
    let sValue = '-';
    let lzValue = '-';
    
    if (isFernkampf) {
        // For ranged weapons, use lz field if available, otherwise fall back to l_s
        lzValue = selected.lz ?? selected.l_s ?? '-';
    } else if (selected.l_s) {
        // For melee weapons, parse "GE/KK 15" format
        const lsMatch = String(selected.l_s).match(/^([A-Za-z\/]+)\s*(\d+)$/);
        if (lsMatch) {
            lValue = lsMatch[1].toUpperCase();
            sValue = lsMatch[2];
        } else {
            // Handle formats like "GE 15/KK 14"
            const complexMatch = String(selected.l_s).match(/([A-Za-z]+)\s*(\d+)/);
            if (complexMatch) {
                lValue = complexMatch[1].toUpperCase();
                sValue = complexMatch[2];
            } else {
                lValue = selected.l_s;
            }
        }
    }
    
    // Parse AT/PA modifiers from at_pa_mod (e.g., "0/-1" or "-1/+1")
    let atMod = '0';
    let paMod = '0';
    if (selected.at_pa_mod) {
        const modMatch = String(selected.at_pa_mod).match(/^([+-]?\d+)\/([+-]?\d+)$/);
        if (modMatch) {
            atMod = modMatch[1];
            paMod = modMatch[2];
        }
    }
    
    let entry;
    if (isFernkampf) {
        // Ranged weapon entry
        entry = `
  - name: "${escYaml(selected.name)}"
    kampftechnik: "${escYaml(kampftechnik)}"
    tp: "${escYaml(selected.tp ?? '-')}"
    lz: "${escYaml(lzValue)}"
    rw: "${escYaml(selected.rw ?? '-')}"
    gewicht: "${escYaml(selected.gewicht ?? '-')}"
    laenge: "${escYaml(selected.laenge ?? '-')}"
    preis: "${escYaml(selected.preis ?? '-')}"
    waffenvorteil: "${escYaml(selected.waffenvorteil ?? '')}"
    waffennachteil: "${escYaml(selected.waffennachteil ?? '')}"`;
    } else {
        // Melee weapon entry
        entry = `
  - name: "${escYaml(selected.name)}"
    kampftechnik: "${escYaml(kampftechnik)}"
    tp: "${escYaml(selected.tp ?? '-')}"
    l: "${escYaml(lValue)}"
    s: "${escYaml(sValue)}"
    at_mod: "${atMod}"
    pa_mod: "${paMod}"
    rw: "${escYaml(selected.rw ?? '-')}"
    laenge: "${escYaml(selected.laenge ?? '-')}"
    gewicht: "${escYaml(selected.gewicht ?? '-')}"
    preis: "${escYaml(selected.preis ?? '-')}"
    waffenvorteil: "${escYaml(selected.waffenvorteil ?? '')}"
    waffennachteil: "${escYaml(selected.waffennachteil ?? '')}"`;
    }
    
    const emptyRegex = new RegExp(`^(${sectionName}:)\\s*$`, 'm');
    const withEntriesRegex = new RegExp(`(${sectionName}:\\s*\\n(?:\\s+-[\\s\\S]*?)?)(\n\\s*\\n|\\n${getNextSection(sectionName)}:|\\n\`\`\`)`, '');
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes(`${sectionName}:`)) {
        content = content.replace(new RegExp(`(${sectionName}:[^\\n]*)`, 'm'), `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\n${sectionName}:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`⚔️ Added ${isFernkampf ? 'Fernkampfwaffe' : 'Nahkampfwaffe'}: ${selected.name}`);
};

/**
 * Format subcategory name for display
 */
function formatSubcategory(sub) {
    if (!sub) return sub;
    // Capitalize first letter and replace underscores
    return sub.charAt(0).toUpperCase() + sub.slice(1).replace(/_/g, ' ');
}

/**
 * Get the next section name for regex matching
 */
function getNextSection(sectionName) {
    const sections = {
        "nahkampfwaffen": "fernkampfwaffen",
        "fernkampfwaffen": "ruestungen"
    };
    return sections[sectionName] || "ruestungen";
}
