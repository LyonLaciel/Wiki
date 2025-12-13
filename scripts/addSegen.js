/**
 * QuickAdd User Script: Add Segen to Character
 * Uses consolidated JSON database with optional Aspekt filter
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/segen.json";
    
    // Load all Segen from single JSON file (FAST!)
    let segen;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        segen = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!segen || segen.length === 0) {
        new Notice("No Segen found in database!");
        return;
    }
    
    // Stage 1: Select by Aspekt
    const aspekte = [...new Set(segen.map(s => s.aspekt).filter(Boolean))].sort();
    aspekte.unshift("✨ Alle Segen anzeigen");
    
    const selectedAspekt = await quickAddApi.suggester(aspekte, aspekte);
    if (!selectedAspekt) return;
    
    // Stage 2: Filter and show blessings
    const filtered = selectedAspekt === "✨ Alle Segen anzeigen"
        ? segen
        : segen.filter(s => s.aspekt === selectedAspekt);
    
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    
    const displayStrings = filtered.map(s => {
        const reichweite = s.reichweite || '-';
        const wirkungsdauer = s.wirkungsdauer || '-';
        return `${s.name} | RW: ${reichweite} | ${wirkungsdauer}`;
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
    reichweite: "${escYaml(selected.reichweite ?? '-')}"
    wirkungsdauer: "${escYaml(selected.wirkungsdauer ?? '-')}"
    zielkategorie: "${escYaml(selected.zielkategorie ?? '-')}"
    aspekt: "${escYaml(selected.aspekt ?? '-')}"`;
    
    const emptyRegex = /^(segnungen:)\s*$/m;
    const withEntriesRegex = /(segnungen:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nzeremonien:|\nvorteile:|\nnachteile:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("segnungen:")) {
        content = content.replace(/(segnungen:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nsegnungen:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added Segen: ${selected.name}`);
};

