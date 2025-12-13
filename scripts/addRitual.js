/**
 * QuickAdd User Script: Add Ritual to Character
 * Uses consolidated JSON database with two-stage selection by Merkmal
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/rituale.json";
    
    // Load all Rituale from single JSON file (FAST!)
    let rituale;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        rituale = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!rituale || rituale.length === 0) {
        new Notice("No Rituale found in database!");
        return;
    }
    
    // Stage 1: Select by Merkmal
    const merkmale = [...new Set(rituale.map(r => r.merkmal).filter(Boolean))].sort();
    merkmale.unshift("🔮 Alle Rituale anzeigen");
    
    const selectedMerkmal = await quickAddApi.suggester(merkmale, merkmale);
    if (!selectedMerkmal) return;
    
    // Stage 2: Filter and show rituals
    const filtered = selectedMerkmal === "🔮 Alle Rituale anzeigen"
        ? rituale
        : rituale.filter(r => r.merkmal === selectedMerkmal);
    
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    
    const displayStrings = filtered.map(r => {
        const verbreitung = r.verbreitung || '-';
        return `${r.name} | ${r.probe || '-'} | ${r.asp_kosten || '-'} | Sf.${r.steigerungsfaktor || '-'}`;
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
    
    const erweiterungenStr = formatErweiterungen(selected.zaubererweiterungen ?? selected.ritualerweiterungen ?? selected.erweiterungen);
    const reversalisStr = selected.reversalis ? `\n    reversalis: "${escYaml(selected.reversalis)}"` : '';
    const wirkungStr = selected.wirkung ? `\n    wirkung: "${escYaml(selected.wirkung)}"` : '';
    
    const entry = `
  - name: "${escYaml(selected.name)}"
    probe: "${escYaml(selected.probe ?? '-')}"
    ritualdauer: "${escYaml(selected.ritualdauer ?? '-')}"
    asp: "${escYaml(selected.asp_kosten ?? '-')}"
    rw: "${escYaml(selected.reichweite ?? '-')}"
    wirkungsdauer: "${escYaml(selected.wirkungsdauer ?? '-')}"
    merkmal: "${escYaml(selected.merkmal ?? '-')}"
    sf: "${escYaml(selected.steigerungsfaktor ?? '-')}"${wirkungStr}${reversalisStr}${erweiterungenStr}`;
    
    const emptyRegex = /^(rituale:)\s*$/m;
    const withEntriesRegex = /(rituale:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nzaubertricks:|\nliturgien:|\nsegnungen:|\nzeremonien:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("rituale:")) {
        content = content.replace(/(rituale:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nrituale:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`✨ Added Ritual: ${selected.name}`);
};
