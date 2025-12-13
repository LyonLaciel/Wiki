/**
 * QuickAdd User Script: Update Value (Encounter)
 * Modifies LE, AE, KE, or SchiP values for characters in an encounter with logging
 * Automatically updates Schmerz durch LeP based on LE thresholds
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
        
        return data;
    };
    
    // Helper: Get numeric value from statblock content
    const getValue = (content, key) => {
        const regex = new RegExp(`^${key}:\\s*(-?\\d+)`, 'm');
        const match = content.match(regex);
        return match ? parseInt(match[1], 10) : null;
    };
    
    // Helper: Get condition level
    const getConditionLevel = (content, name) => {
        const regex = new RegExp(`-\\s*name:\\s*${name}\\s*\\n\\s*level:\\s*(\\d+)`, 'mi');
        const match = content.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    // Helper: Calculate max LE
    const getMaxLE = (content) => {
        const speciesBases = {
            'Mensch': 5, 'Elf': 2, 'Halbelf': 5, 'Zwerg': 8
        };
        
        const speziesMatch = content.match(/spezies:\s*([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*)/);
        const spezies = speziesMatch ? speziesMatch[1] : 'Mensch';
        const baseLe = speciesBases[spezies] ?? 5;
        
        const ko = getValue(content, 'ko') ?? 8;
        const leMod = getValue(content, 'le_mod') ?? 0;
        
        return baseLe + (2 * ko) + leMod;
    };
    
    // Helper: Calculate Schmerz from LE thresholds
    const calculateSchmerzFromLE = (currentLE, maxLE) => {
        let schmerz = 0;
        if (currentLE <= maxLE * 0.75) schmerz = 1;
        if (currentLE <= maxLE * 0.5) schmerz = 2;
        if (currentLE <= maxLE * 0.25) schmerz = 3;
        if (currentLE <= 5) schmerz = 4;
        return Math.min(4, schmerz);
    };
    
    // Helper: Get total RS from armor
    const getTotalRS = (content) => {
        const ruestungenMatch = content.match(/ruestungen:\s*\n([\s\S]*?)(?=\n[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:|```)/);
        if (!ruestungenMatch) return 0;
        
        const armorBlock = ruestungenMatch[1];
        let totalRS = 0;
        const rsMatches = armorBlock.matchAll(/rs:\s*(\d+)/g);
        for (const match of rsMatches) {
            totalRS += parseInt(match[1], 10);
        }
        return totalRS;
    };
    
    // Helper: Update condition table in encounter file
    const updateEncounterConditionTable = (encounterContent, charName, conditionName, newLevel, note = '') => {
        // Escape special regex characters in the name
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match the character section precisely (name followed by newline, not another character)
        const charSectionRegex = new RegExp(`(### ${escapedName}\\s*\\n[\\s\\S]*?\\| ${conditionName}\\s*\\|)[^|]*\\|[^|]*\\|`, 'i');
        const match = encounterContent.match(charSectionRegex);
        
        if (match) {
            const levelStr = newLevel > 0 ? ` ${newLevel} ` : ' ';
            const noteStr = note ? ` ${note} ` : ' ';
            return encounterContent.replace(charSectionRegex, `$1${levelStr}|${noteStr}|`);
        }
        return encounterContent;
    };
    
    // Update or remove the "Handlungsunfähig" warning for a character
    const updateHandlungsunfaehigWarning = (encounterContent, charName, newPainLevel) => {
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const warningLine = `> ⚠️ **Handlungsunfähig** (Schmerz Stufe IV)`;
        
        // Find the character's section (between ### CharName and the next --- or ### or end)
        const charSectionRegex = new RegExp(
            `(### ${escapedName}\\s*\\n[\\s\\S]*?\\| Verwirrung[^|]*\\|[^|]*\\|[^\\n]*\\n)(\\n?(?:> ⚠️ \\*\\*Handlungsunfähig\\*\\* \\(Schmerz Stufe IV\\)\\n)?)(\\n?---)?`,
            'i'
        );
        
        const match = encounterContent.match(charSectionRegex);
        if (match) {
            const beforeWarning = match[1];
            const separator = match[3] || '---';
            
            if (newPainLevel >= 4) {
                // Add warning if not present
                return encounterContent.replace(charSectionRegex, `${beforeWarning}\n${warningLine}\n\n${separator}`);
            } else {
                // Remove warning if present
                return encounterContent.replace(charSectionRegex, `${beforeWarning}\n${separator}`);
            }
        }
        return encounterContent;
    };
    
    // Helper: Parse armor additional penalties (e.g., "-1 GS, -1 INI")
    const parseArmorPenalties = (content) => {
        let gsPenalty = 0;
        let iniPenalty = 0;
        
        // Parse ruestungen from the statblock content
        const ruestungenMatch = content.match(/ruestungen:\s*\n((?:\s+-[^\n]+\n?|\s+[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:[^\n]+\n?)*)/);
        if (!ruestungenMatch) return { gs: 0, ini: 0 };
        
        const abzuegeMatches = content.matchAll(/zusaetzliche_abzuege:\s*"?([^"\n]+)"?/g);
        for (const match of abzuegeMatches) {
            const abzuege = match[1];
            if (abzuege && abzuege !== '-') {
                const gsMatch = abzuege.match(/(-?\d+)\s*GS/i);
                const iniMatch = abzuege.match(/(-?\d+)\s*INI/i);
                if (gsMatch) gsPenalty += parseInt(gsMatch[1]) || 0;
                if (iniMatch) iniPenalty += parseInt(iniMatch[1]) || 0;
            }
        }
        
        return { gs: gsPenalty, ini: iniPenalty };
    };
    
    // Update LE and GS in the character's stats table in the encounter file
    const updateEncounterStatsTable = (encounterContent, charName, newLE, maxLE, gsDisplay) => {
        // Find the character section and their stats table
        // Format: | LE | SK | ZK | GS | INI | WS | AW |
        //         | 10/21 | 1 | 1 | 7→5 (-1 Rüst.) | 13 | 4 | 4 |
        
        // Escape special regex characters in the name
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const charSectionRegex = new RegExp(
            `(### ${escapedName}\\s*\\n\\n\\|[^\\n]*\\|\\s*\\n\\|[^\\n]*\\|\\s*\\n\\|)([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|`,
            'i'
        );
        
        const match = encounterContent.match(charSectionRegex);
        if (match) {
            const leStr = ` ${newLE}/${maxLE} `;
            // Keep SK, ZK, INI, WS, AW unchanged
            const skStr = match[3];
            const zkStr = match[4];
            const gsStr = ` ${gsDisplay} `;
            const iniStr = match[6];
            const wsStr = match[7];
            const awStr = match[8];
            
            return encounterContent.replace(
                charSectionRegex,
                `$1${leStr}|${skStr}|${zkStr}|${gsStr}|${iniStr}|${wsStr}|${awStr}|`
            );
        }
        return encounterContent;
    };
    
    // Helper: Get base GS from species
    const getBaseGS = (content) => {
        const speciesGS = {
            'Mensch': 8, 'Elf': 8, 'Halbelf': 8, 'Zwerg': 6
        };
        const speziesMatch = content.match(/spezies:\s*([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*)/);
        const spezies = speziesMatch ? speziesMatch[1] : 'Mensch';
        return speciesGS[spezies] ?? 8;
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
    
    // Get active file (should be the encounter file)
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("Keine aktive Datei! Bitte Encounter-Datei öffnen.");
        return;
    }
    
    // Get all character files in the encounter folder
    const folderPath = activeFile.parent?.path || '';
    const encounterFiles = getFilesInFolder(folderPath);
    
    // Collect character data
    const characters = [];
    for (const file of encounterFiles) {
        if (file.path === activeFile.path) continue;
        
        const content = await app.vault.read(file);
        const statblock = parseStatblock(content);
        
        if (statblock && statblock.name) {
            characters.push({
                name: statblock.name,
                file: file,
                content: content
            });
        }
    }
    
    if (characters.length === 0) {
        new Notice("Keine Charaktere im Encounter-Ordner gefunden!");
        return;
    }
    
    // Step 1: Select character
    const charNames = characters.map(c => c.name);
    const selectedCharName = await quickAddApi.suggester(charNames, charNames);
    if (!selectedCharName) return;
    
    const selectedChar = characters.find(c => c.name === selectedCharName);
    let charContent = selectedChar.content;
    
    // Gather available properties
    const available = [];
    
    const le = getValue(charContent, 'le');
    const maxLE = getMaxLE(charContent);
    if (le !== null) {
        available.push({ key: 'le', name: 'LE (Lebensenergie)', value: le, max: maxLE, icon: '❤️' });
    }
    
    const ae = getValue(charContent, 'ae');
    const ae_max = getValue(charContent, 'ae_max');
    if (ae !== null && ae_max !== null && ae_max > 0) {
        available.push({ key: 'ae', name: 'AE (Astralenergie)', value: ae, max: ae_max, icon: '💙' });
    }
    
    const ke = getValue(charContent, 'ke');
    const ke_max = getValue(charContent, 'ke_max');
    if (ke !== null && ke_max !== null && ke_max > 0) {
        available.push({ key: 'ke', name: 'KE (Karmaenergie)', value: ke, max: ke_max, icon: '💛' });
    }
    
    const schip = getValue(charContent, 'schip');
    const schip_max = getValue(charContent, 'schip_max');
    if (schip !== null && schip_max !== null && schip_max > 0) {
        available.push({ key: 'schip', name: 'SchiP (Schicksalspunkte)', value: schip, max: schip_max, icon: '⭐' });
    }
    
    if (available.length === 0) {
        new Notice("Keine änderbaren Werte im Statblock gefunden!");
        return;
    }
    
    // Step 2: Select property
    const displayStrings = available.map(p => `${p.icon} ${p.name}: ${p.value}/${p.max}`);
    const selected = await quickAddApi.suggester(displayStrings, available);
    if (!selected) return;
    
    // Step 3: Quick change options
    const changeOptions = [
        { label: "➕ +1", value: 1 },
        { label: "➕ +5", value: 5 },
        { label: "➕ +10", value: 10 },
        { label: "➖ −1", value: -1 },
        { label: "➖ −5", value: -5 },
        { label: "➖ −10", value: -10 },
        { label: "🔢 Andere Änderung...", value: null },
        { label: "🔄 Auf Maximum setzen", value: selected.max - selected.value }
    ];
    
    const selectedChange = await quickAddApi.suggester(
        changeOptions.map(o => o.label),
        changeOptions
    );
    if (!selectedChange) return;
    
    let change = selectedChange.value;
    
    // If "other" selected, prompt for input
    if (change === null) {
        const inputValue = await quickAddApi.inputPrompt(
            `${selected.name} ändern (aktuell: ${selected.value}/${selected.max})`,
            "z.B. +5 oder -3 oder =10"
        );
        
        if (!inputValue || inputValue.trim() === '') return;
        
        const trimmed = inputValue.trim();
        
        // Check for absolute value with "="
        if (trimmed.startsWith('=')) {
            const absValue = parseInt(trimmed.substring(1), 10);
            if (isNaN(absValue)) {
                new Notice("Ungültige Eingabe!");
                return;
            }
            change = absValue - selected.value;
        } else {
            change = parseInt(trimmed, 10);
            if (isNaN(change)) {
                new Notice("Ungültige Eingabe! Bitte eine Zahl eingeben.");
                return;
            }
        }
    }
    
    // Special handling for LE damage (armor reduction)
    let armorInfo = '';
    if (selected.key === 'le' && change < 0) {
        const totalRS = getTotalRS(charContent);
        
        if (totalRS > 0) {
            const damageType = await quickAddApi.suggester(
                [
                    `⚔️ TP (Trefferpunkte) - Schaden wird um RS ${totalRS} reduziert`,
                    `💥 SP (Schadenspunkte) - Direkter Schaden`
                ],
                ['TP', 'SP']
            );
            
            if (!damageType) return;
            
            if (damageType === 'TP') {
                const originalDamage = Math.abs(change);
                const reducedDamage = Math.max(0, originalDamage - totalRS);
                change = -reducedDamage;
                armorInfo = ` (${originalDamage} TP − ${totalRS} RS)`;
                
                if (reducedDamage === 0) {
                    // Log armor absorption
                    let encounterContent = await app.vault.read(activeFile);
                    encounterContent += `\n> 🛡️ **${selectedCharName}** | Rüstung absorbiert ${originalDamage} TP (RS ${totalRS})\n`;
                    await app.vault.modify(activeFile, encounterContent);
                    
                    new Notice(`🛡️ Rüstung absorbiert allen Schaden! (${originalDamage} TP - ${totalRS} RS = 0 SP)`);
                    return;
                }
            }
        }
    }
    
    // Calculate new value (clamped to 0 minimum, max maximum)
    const newValue = Math.max(0, Math.min(selected.max, selected.value + change));
    const actualChange = newValue - selected.value;
    
    if (actualChange === 0) {
        new Notice(`${selected.name} bleibt unverändert bei ${selected.value}`);
        return;
    }
    
    // Update the statblock
    const oldPattern = new RegExp(`(^${selected.key}:)\\s*-?\\d+`, 'm');
    let newContent = charContent.replace(oldPattern, `$1 ${newValue}`);
    
    // If LE changed, update Schmerz durch LeP
    let schmerzInfo = '';
    let gsInfo = '';
    let incapacitatedWarning = '';
    
    if (selected.key === 'le') {
        const oldSchmerzFromLE = getConditionLevel(charContent, 'Schmerz durch LeP');
        const newSchmerzFromLE = calculateSchmerzFromLE(newValue, maxLE);
        
        // Update the condition level
        const schmerzPattern = /(-\s*name:\s*Schmerz durch LeP\s*\n\s*level:\s*)\d+/mi;
        newContent = newContent.replace(schmerzPattern, `$1${newSchmerzFromLE}`);
        
        if (oldSchmerzFromLE !== newSchmerzFromLE) {
            const arrow = newSchmerzFromLE > oldSchmerzFromLE ? '📈' : '📉';
            schmerzInfo = ` | ${arrow} Schmerz: ${oldSchmerzFromLE}→${newSchmerzFromLE}`;
            
            // GS penalty
            const baseGS = getBaseGS(charContent);
            const schmerzRegular = getConditionLevel(charContent, 'Schmerz');
            const totalSchmerz = schmerzRegular + newSchmerzFromLE;
            const effectiveGS = Math.max(0, baseGS - totalSchmerz);
            gsInfo = ` | GS: ${baseGS}→${effectiveGS}`;
            
            if (newSchmerzFromLE >= 4) {
                incapacitatedWarning = `\n> ⚠️ **${selectedCharName} ist handlungsunfähig!**`;
            }
        }
    }
    
    // Save character file
    await app.vault.modify(selectedChar.file, newContent);
    
    // Build log entry
    const changeStr = actualChange >= 0 ? `+${actualChange}` : `${actualChange}`;
    const arrow = actualChange > 0 ? '💚' : '💔';
    
    let logEntry = `\n> ${arrow} **${selectedCharName}** | ${selected.icon} ${selected.key.toUpperCase()}: ${selected.value}→${newValue}/${selected.max} (${changeStr})${armorInfo}${schmerzInfo}${gsInfo}${incapacitatedWarning}\n`;
    
    // Check for dying
    if (selected.key === 'le' && newValue <= 0) {
        logEntry += `> ☠️ **${selectedCharName} liegt im Sterben!**\n`;
    }
    
    // Append to encounter file and update condition table if Schmerz durch LeP changed
    let encounterContent = await app.vault.read(activeFile);
    
    // If LE changed, update the condition table and stats table
    if (selected.key === 'le') {
        const newSchmerzFromLE = calculateSchmerzFromLE(newValue, maxLE);
        const noteForTable = newSchmerzFromLE > 0 ? `GS −${newSchmerzFromLE}` : '';
        encounterContent = updateEncounterConditionTable(encounterContent, selectedCharName, 'Schmerz durch LeP', newSchmerzFromLE, noteForTable);
        // Update the Handlungsunfähig warning
        encounterContent = updateHandlungsunfaehigWarning(encounterContent, selectedCharName, newSchmerzFromLE);
        
        // Also update the stats table (LE, GS)
        const baseGS = getBaseGS(selectedChar.content);
        // Apply armor GS penalty
        const armorPenalties = parseArmorPenalties(selectedChar.content);
        const armorAdjustedGS = baseGS + armorPenalties.gs;
        const effectiveGS = Math.max(0, armorAdjustedGS - newSchmerzFromLE);
        
        // Build GS display string
        let gsDisplay = `${armorAdjustedGS}`;
        if (newSchmerzFromLE > 0) {
            gsDisplay = `${armorAdjustedGS}→${effectiveGS}`;
        }
        if (armorPenalties.gs < 0) {
            gsDisplay += ` (${armorPenalties.gs} Rüst.)`;
        }
        
        encounterContent = updateEncounterStatsTable(encounterContent, selectedCharName, newValue, maxLE, gsDisplay);
    }
    
    encounterContent += logEntry;
    await app.vault.modify(activeFile, encounterContent);
    
    // Show notification
    new Notice(`${selected.icon} ${selectedCharName}: ${selected.key.toUpperCase()} ${selected.value} → ${newValue} (${changeStr})`);
};

