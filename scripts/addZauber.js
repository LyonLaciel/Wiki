/**
 * QuickAdd User Script: Add Zauber to Character
 * Uses consolidated JSON database with two-stage selection by Merkmal
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/zauber.json";
    
    // Load all Zauber from single JSON file (FAST!)
    let zauber;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        zauber = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!zauber || zauber.length === 0) {
        new Notice("No Zauber found in database!");
        return;
    }
    
    // Stage 1: Select by Merkmal
    const merkmale = [...new Set(zauber.map(z => z.merkmal).filter(Boolean))].sort();
    merkmale.unshift("🔮 Alle Zauber anzeigen");
    
    const selectedMerkmal = await quickAddApi.suggester(merkmale, merkmale);
    if (!selectedMerkmal) return;
    
    // Stage 2: Filter and show spells
    const filtered = selectedMerkmal === "🔮 Alle Zauber anzeigen"
        ? zauber
        : zauber.filter(z => z.merkmal === selectedMerkmal);
    
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    const displayStrings = filtered.map(z => 
        `${z.name} | ${z.probe || '-'} | ${z.asp_kosten || '-'} | Sf.${z.steigerungsfaktor || '-'}`
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
    
    // Format erweiterungen as YAML array
    const formatErweiterungen = (erw) => {
        if (!erw || !Array.isArray(erw) || erw.length === 0) return '';
        return '\n    erweiterungen:\n' + erw.map(e => {
            if (typeof e === 'object') {
                const name = e.name ?? '';
                const beschreibung = e.beschreibung ?? e.wirkung ?? '';
                return `      - "${escYaml(name + (beschreibung ? ': ' + beschreibung : ''))}"`;
            }
            return `      - "${escYaml(e)}"`;
        }).join('\n');
    };
    
    const erweiterungenStr = formatErweiterungen(selected.zaubererweiterungen ?? selected.erweiterungen);
    const reversalisStr = selected.reversalis ? `\n    reversalis: "${escYaml(selected.reversalis)}"` : '';
    const wirkungStr = selected.wirkung ? `\n    wirkung: "${escYaml(selected.wirkung)}"` : '';
    
    const entry = `
  - name: "${escYaml(selected.name)}"
    probe: "${escYaml(selected.probe ?? '-')}"
    zauberdauer: "${escYaml(selected.zauberdauer ?? '-')}"
    asp: "${escYaml(selected.asp_kosten ?? '-')}"
    rw: "${escYaml(selected.reichweite ?? '-')}"
    wirkungsdauer: "${escYaml(selected.wirkungsdauer ?? '-')}"
    merkmal: "${escYaml(selected.merkmal ?? '-')}"
    sf: "${escYaml(selected.steigerungsfaktor ?? '-')}"${wirkungStr}${reversalisStr}${erweiterungenStr}`;
    
    const emptyRegex = /^(zauber:)\s*$/m;
    const withEntriesRegex = /(zauber:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nrituale:|\nzaubertricks:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("zauber:")) {
        content = content.replace(/(zauber:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nzauber:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added Zauber: ${selected.name}`);
};
