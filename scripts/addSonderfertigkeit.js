/**
 * QuickAdd User Script: Add Sonderfertigkeit to Character
 * Handles wiki scraper output by grouping items by their _category field
 * and filtering out invalid entries.
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/sonderfertigkeiten.json";
    
    // Load hierarchical sonderfertigkeiten data
    let rawData;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        rawData = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!rawData || rawData.length === 0) {
        new Notice("No Sonderfertigkeiten found in database!");
        return;
    }
    
    // Flatten all items from the nested structure and filter out invalid ones
    const allItems = flattenItems(rawData).filter(item => item.name != null && item.name !== '');
    
    if (allItems.length === 0) {
        new Notice("No valid Sonderfertigkeiten found!");
        return;
    }
    
    // Group items by their _category field
    const categoryGroups = {};
    for (const item of allItems) {
        const cat = item._category || "Sonstige";
        if (!categoryGroups[cat]) {
            categoryGroups[cat] = [];
        }
        categoryGroups[cat].push(item);
    }
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(categoryGroups).sort((a, b) => a.localeCompare(b, 'de'));
    
    // Stage 1: Select category
    const categoryDisplay = sortedCategories.map(cat => `${cat} (${categoryGroups[cat].length})`);
    const selectedCategoryName = await quickAddApi.suggester(categoryDisplay, sortedCategories);
    
    if (!selectedCategoryName) return;
    
    // Get items for selected category
    let items = categoryGroups[selectedCategoryName];
    
    // Sort items alphabetically
    items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    
    // Stage 2: Select specific item
    const displayStrings = items.map(sf => 
        `${sf.name} | ${sf.ap_wert ?? '-'} AP`
    );
    
    const selected = await quickAddApi.suggester(displayStrings, items);
    
    if (!selected) return;
    
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No active file!");
        return;
    }
    
    let content = await app.vault.read(activeFile);
    
    const escYaml = str => String(str ?? '').replace(/"/g, '\\"');
    
    // Use item's _category field for kategorie (proper German name)
    const kategorie = selected._category || selectedCategoryName || "Sonderfertigkeit";
    
    const entry = `
  - name: "${escYaml(selected.name)}"
    kategorie: "${escYaml(kategorie)}"
    ap: "${selected.ap_wert ?? '-'}"
    voraussetzung: "${escYaml(selected.voraussetzungen || selected.voraussetzung || '-')}"`;
    
    const emptyRegex = /^(sonderfertigkeiten:)\s*$/m;
    const withEntriesRegex = /(sonderfertigkeiten:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nzauber:|\nrituale:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("sonderfertigkeiten:")) {
        content = content.replace(/(sonderfertigkeiten:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nsonderfertigkeiten:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added: ${selected.name}`);
};

/**
 * Recursively flatten all items from nested category structure
 */
function flattenItems(data) {
    const items = [];
    
    function traverse(node) {
        if (Array.isArray(node)) {
            for (const child of node) {
                traverse(child);
    }
        } else if (node && typeof node === 'object') {
            if (node.items && Array.isArray(node.items)) {
                items.push(...node.items);
            }
            if (node.children && Array.isArray(node.children)) {
                traverse(node.children);
    }
        }
    }
    
    traverse(data);
    return items;
}
