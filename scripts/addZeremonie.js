/**
 * QuickAdd User Script: Add Zeremonie to Character
 * Uses consolidated JSON database with two-stage selection by Verbreitung
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const dbPath = "dsa_categories/zeremonien.json";
    
    // Load all Zeremonien from single JSON file (FAST!)
    let zeremonien;
    try {
        const raw = await app.vault.adapter.read(dbPath);
        zeremonien = JSON.parse(raw);
    } catch (e) {
        new Notice(`Error loading database: ${dbPath}`);
        console.error(e);
        return;
    }
    
    if (!zeremonien || zeremonien.length === 0) {
        new Notice("No Zeremonien found in database!");
        return;
    }
    
    // Extract main deity/tradition from verbreitung for grouping
    const getMainTradition = (verbreitung) => {
        if (!verbreitung) return 'Sonstige';
        // Handle non-string verbreitung (could be object or array)
        const vStr = typeof verbreitung === 'string' ? verbreitung : JSON.stringify(verbreitung);
        // Extract first tradition (before comma or parenthesis)
        const match = vStr.match(/^([^,(]+)/);
        return match ? match[1].trim() : 'Sonstige';
    };
    
    // Stage 1: Select by main tradition
    const traditions = [...new Set(zeremonien.map(z => getMainTradition(z.verbreitung)))].sort();
    traditions.unshift("🌟 Alle Zeremonien anzeigen");
    
    const selectedTradition = await quickAddApi.suggester(traditions, traditions);
    if (!selectedTradition) return;
    
    // Stage 2: Filter and show ceremonies
    const filtered = selectedTradition === "🌟 Alle Zeremonien anzeigen"
        ? zeremonien
        : zeremonien.filter(z => getMainTradition(z.verbreitung) === selectedTradition);
    
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    
    const displayStrings = filtered.map(z => {
        const probe = z.probe || '-';
        const kap = z.kap_kosten || '-';
        const sf = z.steigerungsfaktor || '-';
        return `${z.name} | ${probe} | ${kap} | Sf.${sf}`;
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
    
    const vStr = typeof selected.verbreitung === 'string' ? selected.verbreitung : JSON.stringify(selected.verbreitung ?? '-');
    const erweiterungenStr = formatErweiterungen(selected.liturgieerweiterungen ?? selected.erweiterungen);
    const wirkungStr = selected.wirkung ? `\n    wirkung: "${escYaml(selected.wirkung)}"` : '';
    
    const entry = `
  - name: "${escYaml(selected.name)}"
    probe: "${escYaml(selected.probe ?? '-')}"
    zeremoniedauer: "${escYaml(selected.zeremoniedauer ?? '-')}"
    kap: "${escYaml(selected.kap_kosten ?? '-')}"
    rw: "${escYaml(selected.reichweite ?? '-')}"
    wirkungsdauer: "${escYaml(selected.wirkungsdauer ?? '-')}"
    verbreitung: "${escYaml(vStr)}"
    sf: "${escYaml(selected.steigerungsfaktor ?? '-')}"${wirkungStr}${erweiterungenStr}`;
    
    const emptyRegex = /^(zeremonien:)\s*$/m;
    const withEntriesRegex = /(zeremonien:\s*\n(?:\s+-[\s\S]*?)?)(\n\s*\n|\nvorteile:|\nnachteile:|\nsonderfertigkeiten:|\n```)/;
    
    if (emptyRegex.test(content)) {
        content = content.replace(emptyRegex, `$1${entry}`);
    } else if (withEntriesRegex.test(content)) {
        content = content.replace(withEntriesRegex, `$1${entry}$2`);
    } else if (content.includes("zeremonien:")) {
        content = content.replace(/(zeremonien:[^\n]*)/m, `$1${entry}`);
    } else {
        content = content.replace(/(\n```)(\s*)$/, `\nzeremonien:${entry}\n\`\`\`$2`);
    }
    
    await app.vault.modify(activeFile, content);
    new Notice(`🌟 Added Zeremonie: ${selected.name}`);
};

