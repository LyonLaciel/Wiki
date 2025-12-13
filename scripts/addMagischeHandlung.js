/**
 * QuickAdd User Script: Add Magische Handlung to Character
 * Uses consolidated JSON database with two-stage selection by type
 * 
 * Includes: Elfenlieder, Hexenflüche, Zaubermelodien, Zaubertänze, 
 * Bannzeichen, Animistenkräfte, Goblinrituale, etc.
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/magische_handlungen.json";
    
    // Load all Magische Handlungen from single JSON file (FAST!)
    let handlungen;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        handlungen = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!handlungen || handlungen.length === 0) {
        new Notice("No Magische Handlungen found in database!");
        return;
    }
    
    // Stage 1: Select by category/type (extracted from _source_file or use merkmal)
    // Group by merkmal or a custom category field if available
    const categories = [...new Set(handlungen.map(h => h.merkmal || 'Sonstige').filter(Boolean))].sort();
    categories.unshift("🌟 Alle anzeigen");
    
    const selectedCategory = await quickAddApi.suggester(categories, categories);
    if (!selectedCategory) return;
    
    // Stage 2: Filter and show items
    const filtered = selectedCategory === "🌟 Alle anzeigen"
        ? handlungen
        : handlungen.filter(h => (h.merkmal || 'Sonstige') === selectedCategory);
    
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    const displayStrings = filtered.map(h => {
        const verbreitung = h.verbreitung || '-';
        return `${h.name} | ${h.probe || '-'} | ${h.asp_kosten || '-'} | ${verbreitung}`;
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
    typ: "${escYaml(selected.merkmal ?? '-')}"
    probe: "${escYaml(selected.probe ?? '-')}"
    dauer: "${escYaml(selected.talent ?? '-')}"
    asp: "${escYaml(selected.asp_kosten ?? '-')}"
    merkmal: "${escYaml(selected.merkmal ?? '-')}"
    sf: "${escYaml(selected.steigerungsfaktor ?? '-')}"`;
    
    // Add to magische_handlungen section
    const emptyRegex = /^(magische_handlungen:)\s*$/m;
    const withEntriesRegex = /(magische_handlungen:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nzauber:|\nrituale:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("magische_handlungen:")) {
        content = content.replace(/(magische_handlungen:[^\n]*)/m, `$1${entry}`);
    } else {
        if (content.includes("zauber:")) {
            content = content.replace(/(zauber:)/, `magische_handlungen:${entry}\n\n$1`);
        } else {
            content = content.replace(/(\n```)(\s*)$/, `\nmagische_handlungen:${entry}\n\`\`\`$2`);
        }
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added: ${selected.name}`);
};
