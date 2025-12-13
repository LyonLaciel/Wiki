/**
 * QuickAdd User Script: Add Vorteil to Character
 * Uses consolidated JSON database for fast loading
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/vorteile.json";
    
    // Load all Vorteile from single JSON file (FAST!)
    let vorteile;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        vorteile = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!vorteile || vorteile.length === 0) {
        new Notice("No Vorteile found in database!");
        return;
    }
    
    // Sort alphabetically
    vorteile.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    // Create display strings
    const displayStrings = vorteile.map(v => 
        `${v.name} | ${v.ap_wert ?? '-'} AP`
    );
    
    const selected = await quickAddApi.suggester(displayStrings, vorteile);
    
    if (!selected) return;
    
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No active file!");
        return;
    }
    
    let content = await app.vault.read(activeFile);
    
    // Escape quotes in strings for YAML
    const escYaml = str => String(str ?? '').replace(/"/g, '\\"');
    
    const entry = `
  - name: "${escYaml(selected.name)}"
    regel: "${escYaml(selected.regel ?? '-')}"
    ap: "${selected.ap_wert ?? '-'}"
    voraussetzung: "${escYaml(selected.voraussetzung ?? '-')}"`;
    
    const emptyRegex = /^(vorteile:)\s*$/m;
    const withEntriesRegex = /(vorteile:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nnachteile:|\nsonderfertigkeiten:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("vorteile:")) {
        content = content.replace(/(vorteile:[^\n]*)/m, `$1${entry}`);
    } else {
        if (content.includes("nachteile:")) {
            content = content.replace(/(nachteile:)/, `vorteile:${entry}\n\n$1`);
        } else {
            content = content.replace(/(\n```)(\s*)$/, `\nvorteile:${entry}\n\`\`\`$2`);
        }
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added Vorteil: ${selected.name}`);
};
