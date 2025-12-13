/**
 * QuickAdd User Script: Add Rüstung to Character
 * Uses consolidated JSON database with optional RS filter
 * Includes anmerkung, ruestungsvorteil, and ruestungsnachteil
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/ruestungen.json";
    
    // Load all Rüstungen from single JSON file (FAST!)
    let ruestungen;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        ruestungen = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!ruestungen || ruestungen.length === 0) {
        new Notice("No Rüstungen found in database!");
        return;
    }
    
    // Stage 1: Select by RS value
    const rsValues = [...new Set(ruestungen.map(r => r.rs).filter(rs => rs !== null && rs !== undefined))].sort((a, b) => a - b);
    const rsOptions = rsValues.map(rs => `RS ${rs}`);
    rsOptions.unshift("🛡️ Alle Rüstungen anzeigen");
    
    const selectedRs = await quickAddApi.suggester(rsOptions, rsOptions);
    if (!selectedRs) return;
    
    // Stage 2: Filter and show armor
    let filtered;
    if (selectedRs === "🛡️ Alle Rüstungen anzeigen") {
        filtered = ruestungen;
    } else {
        const rsValue = parseInt(selectedRs.replace('RS ', ''));
        filtered = ruestungen.filter(r => r.rs === rsValue);
    }
    
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    
    const displayStrings = filtered.map(r => {
        const rs = r.rs ?? '-';
        const be = r.be ?? '-';
        const preis = r.preis || '-';
        return `${r.name} | RS ${rs} | BE ${be} | ${preis}`;
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
    
    const entry = `
  - name: "${escYaml(selected.name)}"
    rs: "${selected.rs ?? '-'}"
    be: "${selected.be ?? '-'}"
    zusaetzliche_abzuege: "${escYaml(selected.zusaetzliche_abzuege ?? '-')}"
    gewicht: "${escYaml(selected.gewicht ?? '-')}"
    preis: "${escYaml(selected.preis ?? '-')}"
    anmerkung: "${escYaml(selected.anmerkung ?? '')}"
    ruestungsvorteil: "${escYaml(selected.ruestungsvorteil ?? '')}"
    ruestungsnachteil: "${escYaml(selected.ruestungsnachteil ?? '')}"`;
    
    const emptyRegex = /^(ruestungen:)\s*$/m;
    const withEntriesRegex = /(ruestungen:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\ntalente:|\nkampftechniken:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("ruestungen:")) {
        content = content.replace(/(ruestungen:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nruestungen:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`🛡️ Added Rüstung: ${selected.name}`);
};
