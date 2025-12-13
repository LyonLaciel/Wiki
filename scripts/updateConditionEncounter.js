/**
 * QuickAdd User Script: Update Condition (Encounter)
 * Modifies condition levels for characters in an encounter with logging
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
    
    // Helper: Get condition level from statblock content
    const getConditionLevel = (content, name) => {
        const regex = new RegExp(`-\\s*name:\\s*${name}\\s*\\n\\s*level:\\s*(\\d+)`, 'mi');
        const match = content.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    // Helper: Update condition level in content
    const updateConditionLevel = (content, name, newLevel) => {
        const regex = new RegExp(`(-\\s*name:\\s*${name}\\s*\\n\\s*level:\\s*)\\d+`, 'mi');
        if (content.match(regex)) {
            return content.replace(regex, `$1${newLevel}`);
        }
        return content;
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
        if (file.path === activeFile.path) continue; // Skip encounter file
        
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
    
    // Define all conditions
    const conditions = [
        { key: 'Belastung', name: 'Belastung', icon: '🎒' },
        { key: 'Betäubung', name: 'Betäubung', icon: '💫' },
        { key: 'Furcht', name: 'Furcht', icon: '😨' },
        { key: 'Paralyse', name: 'Paralyse', icon: '🧊' },
        { key: 'Schmerz', name: 'Schmerz', icon: '🩹' },
        { key: 'Schmerz durch LeP', name: 'Schmerz durch LeP', icon: '❤️‍🩹' },
        { key: 'Verwirrung', name: 'Verwirrung', icon: '🌀' }
    ];
    
    // Get current levels for each condition
    const available = conditions.map(c => ({
        ...c,
        level: getConditionLevel(selectedChar.content, c.key)
    }));
    
    // Step 2: Select condition
    const displayStrings = available.map(c => `${c.icon} ${c.name}: Stufe ${c.level}`);
    const selectedCondition = await quickAddApi.suggester(displayStrings, available);
    if (!selectedCondition) return;
    
    // Step 3: Get change amount
    const changeOptions = [
        { label: "➕ +1 Stufe", value: 1 },
        { label: "➕ +2 Stufen", value: 2 },
        { label: "➕ +3 Stufen", value: 3 },
        { label: "➖ −1 Stufe", value: -1 },
        { label: "➖ −2 Stufen", value: -2 },
        { label: "➖ −3 Stufen", value: -3 },
        { label: "🔢 Andere Änderung...", value: null },
        { label: "0️⃣ Auf 0 setzen", value: -selectedCondition.level }
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
            `${selectedCondition.name} ändern (aktuell: Stufe ${selectedCondition.level})`,
            "z.B. +1 oder -2 oder =3"
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
            change = absValue - selectedCondition.level;
        } else {
            change = parseInt(trimmed, 10);
            if (isNaN(change)) {
                new Notice("Ungültige Eingabe! Bitte eine Zahl eingeben.");
                return;
            }
        }
    }
    
    // Calculate new value with min 0, max 4
    const newLevel = Math.min(4, Math.max(0, selectedCondition.level + change));
    
    if (newLevel === selectedCondition.level) {
        new Notice(`${selectedCondition.name} bleibt bei Stufe ${selectedCondition.level}`);
        return;
    }
    
    // Update the character's statblock
    let newContent = updateConditionLevel(selectedChar.content, selectedCondition.key, newLevel);
    
    // If Schmerz (any kind), also need to consider GS penalty
    const isSchmerz = selectedCondition.key.toLowerCase().includes('schmerz');
    let gsInfo = '';
    if (isSchmerz) {
        const statblock = parseStatblock(selectedChar.content);
        // Get base GS from species
        const bases = {
            'Mensch': 8, 'Elf': 8, 'Halbelf': 8, 'Zwerg': 6
        };
        const species = statblock?.spezies || 'Mensch';
        const baseGS = bases[species] || 8;
        
        // Calculate total Schmerz (regular + durch LeP)
        const schmerzRegular = selectedCondition.key === 'Schmerz' 
            ? newLevel 
            : getConditionLevel(selectedChar.content, 'Schmerz');
        const schmerzLeP = selectedCondition.key === 'Schmerz durch LeP' 
            ? newLevel 
            : getConditionLevel(selectedChar.content, 'Schmerz durch LeP');
        const totalSchmerz = schmerzRegular + schmerzLeP;
        const effectiveGS = Math.max(0, baseGS - totalSchmerz);
        
        gsInfo = ` | GS: ${baseGS}→${effectiveGS}`;
    }
    
    await app.vault.modify(selectedChar.file, newContent);
    
    // Log to encounter file and update condition table
    let encounterContent = await app.vault.read(activeFile);
    const changeStr = change >= 0 ? `+${change}` : `${change}`;
    const arrow = newLevel > selectedCondition.level ? '📈' : '📉';
    
    // Update the condition table in the character overview
    const noteForTable = isSchmerz && newLevel > 0 ? `GS −${newLevel}` : '';
    encounterContent = updateEncounterConditionTable(encounterContent, selectedCharName, selectedCondition.name, newLevel, noteForTable);
    
    // Update the Handlungsunfähig warning for Schmerz durch LeP
    if (selectedCondition.key === 'schmerzLep') {
        encounterContent = updateHandlungsunfaehigWarning(encounterContent, selectedCharName, newLevel);
    }
    
    let logEntry = `\n> ${arrow} **${selectedCharName}** | ${selectedCondition.icon} ${selectedCondition.name}: Stufe ${selectedCondition.level} → ${newLevel} (${changeStr})${gsInfo}\n`;
    
    // Add incapacitated warning to log
    if (isSchmerz && newLevel >= 4) {
        logEntry += `> ⚠️ **${selectedCharName} ist handlungsunfähig!**\n`;
    }
    
    encounterContent += logEntry;
    await app.vault.modify(activeFile, encounterContent);
    
    // Show notification
    new Notice(`${selectedCondition.icon} ${selectedCharName}: ${selectedCondition.name} Stufe ${selectedCondition.level} → ${newLevel}`);
};

