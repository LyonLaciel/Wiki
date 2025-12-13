/**
 * QuickAdd User Script: Next Round
 * Ends the current combat round and starts a new one with initiative order
 * Handles temporary effects: decrements KR, removes expired effects
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // Helper: Parse statblock YAML from file content
    const parseStatblock = (content) => {
        const statblockMatch = content.match(/```statblock\s*\n([\s\S]*?)```/);
        if (!statblockMatch) return null;
        
        const yamlContent = statblockMatch[1];
        const data = {};
        
        // Use character class that includes German umlauts
        const lines = yamlContent.split('\n');
        for (const line of lines) {
            const match = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.*)$/);
            if (match) {
                const key = match[1];
                let value = match[2].trim();
                const num = parseFloat(value);
                data[key] = isNaN(num) ? value : num;
            }
        }
        
        // Extract Schmerz durch LeP level
        const schmerzMatch = yamlContent.match(/-\s*name:\s*Schmerz durch LeP\s*\n\s*level:\s*(\d+)/i);
        data.schmerzDurchLeP = schmerzMatch ? parseInt(schmerzMatch[1]) : 0;
        
        // Extract ruestungen array for armor penalty calculation
        const ruestungenMatch = yamlContent.match(/ruestungen:\s*\n((?:\s+-\s+[\s\S]*?)?)(?=\n[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:|```|$)/i);
        if (ruestungenMatch) {
            data.ruestungen = [];
            const armorBlocks = ruestungenMatch[1].split(/\n\s+-\s+/).filter(b => b.trim());
            for (const block of armorBlocks) {
                const armor = {};
                const nameMatch = block.match(/name:\s*"?([^"\n]+)"?/i);
                const rsMatch = block.match(/rs:\s*"?(\d+)"?/i);
                const abzuegeMatch = block.match(/zusaetzliche_abzuege:\s*"?([^"\n]+)"?/i);
                
                if (nameMatch) armor.name = nameMatch[1].trim();
                if (rsMatch) armor.rs = rsMatch[1];
                if (abzuegeMatch) armor.zusaetzliche_abzuege = abzuegeMatch[1].trim();
                
                if (armor.name) data.ruestungen.push(armor);
            }
        }
        
        return data;
    };
    
    // Helper: Parse effects block from encounter content
    const parseEffectsBlock = (content) => {
        const effectsMatch = content.match(/```effects\n([\s\S]*?)```/);
        if (!effectsMatch) return { raw: '', characters: {} };
        
        const rawContent = effectsMatch[1];
        const characters = {};
        
        // Parse YAML-like structure
        let currentChar = null;
        let currentEffect = null;
        
        const lines = rawContent.split('\n');
        for (const line of lines) {
            // Character name line (no leading spaces, ends with :)
            const charMatch = line.match(/^([^:\s][^:]*):$/);
            if (charMatch) {
                currentChar = charMatch[1].trim();
                characters[currentChar] = [];
                currentEffect = null;
                continue;
            }
            
            // New effect (starts with "  - name:")
            const effectStartMatch = line.match(/^\s+-\s*name:\s*(.+)$/);
            if (effectStartMatch && currentChar) {
                currentEffect = { name: effectStartMatch[1].trim() };
                characters[currentChar].push(currentEffect);
                continue;
            }
            
            // Effect property (starts with spaces and has key: value)
            const propMatch = line.match(/^\s+([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.+)$/);
            if (propMatch && currentEffect) {
                const key = propMatch[1];
                let value = propMatch[2].trim();
                // Parse numeric values (including +/- prefixed)
                const num = parseFloat(value.replace(/^\+/, ''));
                currentEffect[key] = isNaN(num) ? value : num;
            }
        }
        
        return { raw: rawContent, characters };
    };
    
    // Helper: Serialize effects back to block format
    const serializeEffectsBlock = (characters) => {
        let result = '';
        for (const charName in characters) {
            result += `${charName}:\n`;
            for (const effect of characters[charName]) {
                result += `  - name: ${effect.name}\n`;
                for (const key in effect) {
                    if (key !== 'name') {
                        const value = effect[key];
                        const prefix = (typeof value === 'number' && value > 0 && key !== 'kr') ? '+' : '';
                        result += `    ${key}: ${prefix}${value}\n`;
                    }
                }
            }
        }
        return result;
    };
    
    // Helper: Format effect for display
    const formatEffectDisplay = (effect) => {
        const parts = [];
        if (effect.gs) parts.push(`GS${effect.gs > 0 ? '+' : ''}${effect.gs}`);
        if (effect.at_mod) parts.push(`AT${effect.at_mod > 0 ? '+' : ''}${effect.at_mod}`);
        if (effect.pa_mod) parts.push(`PA${effect.pa_mod > 0 ? '+' : ''}${effect.pa_mod}`);
        if (effect.aw_mod) parts.push(`AW${effect.aw_mod > 0 ? '+' : ''}${effect.aw_mod}`);
        if (effect.fk_mod) parts.push(`FK${effect.fk_mod > 0 ? '+' : ''}${effect.fk_mod}`);
        if (effect.schmerz) parts.push(`Schmerz ${effect.schmerz}`);
        if (effect.betaeubung) parts.push(`Betäubung ${effect.betaeubung}`);
        if (effect.furcht) parts.push(`Furcht ${effect.furcht}`);
        if (effect.paralyse) parts.push(`Paralyse ${effect.paralyse}`);
        if (effect.verwirrung) parts.push(`Verwirrung ${effect.verwirrung}`);
        if (effect.status) parts.push(effect.status);
        
        const modStr = parts.length > 0 ? parts.join(', ') : '';
        return `${effect.name}${modStr ? ' (' + modStr + ')' : ''}, ${effect.kr} KR`;
    };
    
    // Helper: Get all markdown files in folder
    const getFilesInFolder = (folderPath) => {
        const files = [];
        const folder = app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !folder.children) return files;
        
        for (const child of folder.children) {
            if (child.extension === "md") {
                files.push(child);
            }
        }
        return files;
    };
    
    // Helper: Parse armor additional penalties (e.g., "-1 GS, -1 INI")
    const parseArmorPenalties = (ruestungen) => {
        let gsPenalty = 0;
        let iniPenalty = 0;
        
        if (!Array.isArray(ruestungen)) return { gs: 0, ini: 0 };
        
        for (const armor of ruestungen) {
            const abzuege = String(armor.zusaetzliche_abzuege || '');
            if (abzuege && abzuege !== '-') {
                const gsMatch = abzuege.match(/(-?\d+)\s*GS/i);
                const iniMatch = abzuege.match(/(-?\d+)\s*INI/i);
                if (gsMatch) gsPenalty += parseInt(gsMatch[1]) || 0;
                if (iniMatch) iniPenalty += parseInt(iniMatch[1]) || 0;
            }
        }
        
        return { gs: gsPenalty, ini: iniPenalty };
    };
    
    // Helper: Calculate INI from statblock (including armor penalties)
    const calculateINI = (data) => {
        const toNum = v => typeof v === 'number' ? v : (parseFloat(v) || 0);
        const mu = toNum(data.mu);
        const ge = toNum(data.ge);
        const iniMod = toNum(data.ini_mod);
        const armorPenalties = parseArmorPenalties(data.ruestungen);
        return Math.floor((mu + ge) / 2) + iniMod + armorPenalties.ini;
    };
    
    // Helper: Roll 1d6
    const roll1d6 = () => Math.floor(Math.random() * 6) + 1;
    
    // Get active file (should be the encounter file)
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("Keine aktive Datei! Bitte Encounter-Datei öffnen.");
        return;
    }
    
    // Read encounter content
    let encounterContent = await app.vault.read(activeFile);
    
    // Find current round number
    const roundMatches = encounterContent.match(/## Runde (\d+)/g);
    let currentRound = 1;
    if (roundMatches && roundMatches.length > 0) {
        const lastRoundMatch = roundMatches[roundMatches.length - 1].match(/## Runde (\d+)/);
        if (lastRoundMatch) {
            currentRound = parseInt(lastRoundMatch[1]);
        }
    }
    
    const newRound = currentRound + 1;
    
    // Parse and process effects
    const effectsData = parseEffectsBlock(encounterContent);
    const expiredEffects = [];
    
    // Decrement KR and collect expired effects
    for (const charName in effectsData.characters) {
        const effects = effectsData.characters[charName];
        const remainingEffects = [];
        
        for (const effect of effects) {
            if (effect.kr !== undefined) {
                effect.kr -= 1;
                if (effect.kr <= 0) {
                    expiredEffects.push({ charName, effect });
                } else {
                    remainingEffects.push(effect);
                }
            } else {
                remainingEffects.push(effect);
            }
        }
        
        effectsData.characters[charName] = remainingEffects;
    }
    
    // Update the effects block in encounter content
    const newEffectsContent = serializeEffectsBlock(effectsData.characters);
    encounterContent = encounterContent.replace(
        /```effects\n[\s\S]*?```/,
        '```effects\n' + newEffectsContent + '```'
    );
    
    // Parse the FIRST round's initiative table to get each character's ORIGINAL roll
    // (The roll from Round 1 is kept for all subsequent rounds)
    // Format: | Rang | Name | INI (Basis + 1W6) | Gesamt | Aktive Effekte |
    //         | 1 | [[Test\|Test]] | 13 + 6 | **19** | - |
    // Note: The pipe in [[link\|display]] is escaped with backslash in markdown tables
    const originalIniRolls = {};
    
    // Find the FIRST "### Initiativereihenfolge" section (Round 1)
    const iniSections = encounterContent.split(/### Initiativereihenfolge/);
    const firstIniSection = iniSections.length > 1 ? iniSections[1] : '';
    
    // Parse all character rows from the first section
    // Match: | 1 | [[Test\|Test]] | 13 + 5 | **18** | - |
    // or:   | 2 | [[Test 1\|Test 1]] | 12 + 1 (-1 Rüst.) | **13** | - |
    const iniRowRegex = /\|\s*\d+\s*\|\s*\[\[([^\]\\|]+)(?:\\?\|[^\]]+)?\]\]\s*\|\s*(\d+)\s*\+\s*(\d+)/g;
    let match;
    while ((match = iniRowRegex.exec(firstIniSection)) !== null) {
        const charName = match[1].trim();
        const iniRoll = parseInt(match[3]) || 0;
        originalIniRolls[charName] = iniRoll;
    }
    
    // Get all character files in the encounter folder
    const folderPath = activeFile.parent?.path || '';
    const encounterFiles = getFilesInFolder(folderPath);
    
    // Collect character data - keep original initiative roll
    const characters = [];
    for (const file of encounterFiles) {
        if (file.path === activeFile.path) continue;
        
        const content = await app.vault.read(file);
        const statblock = parseStatblock(content);
        
        if (statblock && statblock.name) {
            const ini = calculateINI(statblock);
            // Use the original roll from Round 1, or roll new if not found (shouldn't happen)
            // Note: The wiki link uses file.basename, which may differ from statblock.name
            const charKey = file.basename; // Use filename to match the wiki link format
            const iniRoll = originalIniRolls[charKey] ?? originalIniRolls[statblock.name] ?? roll1d6();
            const schmerzLevel = statblock.schmerzDurchLeP || 0;
            const armorPenalties = parseArmorPenalties(statblock.ruestungen);
            
            // Get active effects for this character
            const charEffects = effectsData.characters[statblock.name] || [];
            const activeEffectsDisplay = charEffects.length > 0
                ? charEffects.map(e => formatEffectDisplay(e)).join('; ')
                : '-';
            
            characters.push({
                name: statblock.name,
                fileName: file.basename,
                ini: ini,
                iniRoll: iniRoll,
                iniTotal: ini + iniRoll,
                schmerzLevel: schmerzLevel,
                armorINIPenalty: armorPenalties.ini,
                incapacitated: schmerzLevel >= 4,
                activeEffects: activeEffectsDisplay
            });
        }
    }
    
    // Sort by initiative (highest first)
    characters.sort((a, b) => b.iniTotal - a.iniTotal);
    
    // Build expired effects log
    let expiredLog = '';
    if (expiredEffects.length > 0) {
        expiredLog = `\n> ⏱️ **Effekte abgelaufen:**\n`;
        for (const { charName, effect } of expiredEffects) {
            const parts = [];
            if (effect.gs) parts.push(`GS${effect.gs > 0 ? '+' : ''}${effect.gs}`);
            if (effect.at_mod) parts.push(`AT${effect.at_mod > 0 ? '+' : ''}${effect.at_mod}`);
            if (effect.pa_mod) parts.push(`PA${effect.pa_mod > 0 ? '+' : ''}${effect.pa_mod}`);
            if (effect.schmerz) parts.push(`Schmerz ${effect.schmerz}`);
            if (effect.betaeubung) parts.push(`Betäubung ${effect.betaeubung}`);
            if (effect.status) parts.push(effect.status);
            const modStr = parts.length > 0 ? ` (${parts.join(', ')})` : '';
            expiredLog += `> - ${charName}: ${effect.name}${modStr} - beendet\n`;
        }
        expiredLog += '\n';
    }
    
    // Build new round section
    let newRoundContent = `\n## Runde ${newRound}\n\n`;
    newRoundContent += expiredLog;
    newRoundContent += `### Initiativereihenfolge\n\n`;
    newRoundContent += `| Rang | Name | INI (Basis + 1W6) | Gesamt | Aktive Effekte |\n`;
    newRoundContent += `|:----:|:-----|:-----------------:|:------:|:---------------|\n`;
    
    characters.forEach((char, index) => {
        const statusIcon = char.incapacitated ? '⚠️' : '';
        let iniCalc = `${char.ini} + ${char.iniRoll}`;
        if (char.armorINIPenalty !== 0) {
            iniCalc += ` (${char.armorINIPenalty} Rüst.)`;
        }
        newRoundContent += `| ${index + 1} | ${statusIcon}[[${char.fileName}\\|${char.name}]] | ${iniCalc} | **${char.iniTotal}** | ${char.activeEffects} |\n`;
    });
    
    newRoundContent += `\n---\n\n`;
    
    // Append new round to encounter file
    encounterContent += newRoundContent;
    await app.vault.modify(activeFile, encounterContent);
    
    // Show notifications
    if (expiredEffects.length > 0) {
        const expiredNames = expiredEffects.map(e => `${e.charName}: ${e.effect.name}`).join(', ');
        new Notice(`⏱️ Effekte abgelaufen: ${expiredNames}`);
    }
    
    const activeCount = characters.filter(c => !c.incapacitated).length;
    new Notice(`⚔️ Runde ${newRound} beginnt! ${activeCount}/${characters.length} Charaktere handlungsfähig.`);
};
