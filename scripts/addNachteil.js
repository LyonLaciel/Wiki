/**
 * QuickAdd User Script: Add Nachteil to Character
 * Uses consolidated JSON database for fast loading
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/nachteile.json";
    
    // Load all Nachteile from single JSON file (FAST!)
    let nachteile;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        nachteile = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!nachteile || nachteile.length === 0) {
        new Notice("No Nachteile found in database!");
        return;
    }
    
    // Sort alphabetically
    nachteile.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    // Create display strings
    const displayStrings = nachteile.map(n => 
        `${n.name} | ${n.ap_wert ?? '-'} AP`
    );
    
    const selected = await quickAddApi.suggester(displayStrings, nachteile);
    
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
    regel: "${escYaml(selected.regel ?? '-')}"
    ap: "${selected.ap_wert ?? '-'}"
    voraussetzung: "${escYaml(selected.voraussetzung ?? '-')}"`;
    
    const emptyRegex = /^(nachteile:)\s*$/m;
    const withEntriesRegex = /(nachteile:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nsonderfertigkeiten:|\nzauber:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("nachteile:")) {
        content = content.replace(/(nachteile:[^\n]*)/m, `$1${entry}`);
    } else {
        if (content.includes("sonderfertigkeiten:")) {
            content = content.replace(/(sonderfertigkeiten:)/, `nachteile:${entry}\n\n$1`);
        } else {
            content = content.replace(/(\n```)(\s*)$/, `\nnachteile:${entry}\n\`\`\`$2`);
        }
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added Nachteil: ${selected.name}`);
};
