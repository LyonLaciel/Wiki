/**
 * QuickAdd User Script: Add Zaubertrick to Character
 * Uses consolidated JSON database with optional Merkmal filter
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/zaubertricks.json";
    
    // Load all Zaubertricks from single JSON file (FAST!)
    let zaubertricks;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        zaubertricks = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!zaubertricks || zaubertricks.length === 0) {
        new Notice("No Zaubertricks found in database!");
        return;
    }
    
    // Stage 1: Select by Merkmal (optional for smaller list)
    const merkmale = [...new Set(zaubertricks.map(z => z.merkmal).filter(Boolean))].sort();
    merkmale.unshift("🎭 Alle Zaubertricks anzeigen");
    
    const selectedMerkmal = await quickAddApi.suggester(merkmale, merkmale);
    if (!selectedMerkmal) return;
    
    // Stage 2: Filter and show tricks
    const filtered = selectedMerkmal === "🎭 Alle Zaubertricks anzeigen"
        ? zaubertricks
        : zaubertricks.filter(z => z.merkmal === selectedMerkmal);
    
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    const displayStrings = filtered.map(z => 
        `${z.name} | ${z.merkmal || '-'} | ${z.reichweite || '-'}`
    );
    
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
    probe: "-"
    zauberdauer: "1 Aktion"
    asp: "1 AsP"
    rw: "${escYaml(selected.reichweite ?? '-')}"
    wirkungsdauer: "${escYaml(selected.wirkungsdauer ?? '-')}"
    merkmal: "${escYaml(selected.merkmal ?? '-')}"
    sf: "-"`;
    
    const emptyRegex = /^(zaubertricks:)\s*$/m;
    const withEntriesRegex = /(zaubertricks:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nliturgien:|\nsegnungen:|\nzeremonien:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("zaubertricks:")) {
        content = content.replace(/(zaubertricks:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nzaubertricks:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added Zaubertrick: ${selected.name}`);
};
