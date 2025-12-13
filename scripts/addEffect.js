/**
 * QuickAdd User Script: Add Effect
 * Manually add temporary effects to characters in an encounter
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
    
    // Helper: Parse effects block from encounter content
    const parseEffectsBlock = (content) => {
        const effectsMatch = content.match(/```effects\n([\s\S]*?)```/);
        if (!effectsMatch) return null;
        
        const rawContent = effectsMatch[1];
        const characters = {};
        
        let currentChar = null;
        let currentEffect = null;
        
        const lines = rawContent.split('\n');
        for (const line of lines) {
            const charMatch = line.match(/^([^:\s][^:]*):$/);
            if (charMatch) {
                currentChar = charMatch[1].trim();
                characters[currentChar] = [];
                currentEffect = null;
                continue;
            }
            
            const effectStartMatch = line.match(/^\s+-\s*name:\s*(.+)$/);
            if (effectStartMatch && currentChar) {
                currentEffect = { name: effectStartMatch[1].trim() };
                characters[currentChar].push(currentEffect);
                continue;
            }
            
            const propMatch = line.match(/^\s+([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.+)$/);
            if (propMatch && currentEffect) {
                const key = propMatch[1];
                let value = propMatch[2].trim();
                const num = parseFloat(value.replace(/^\+/, ''));
                currentEffect[key] = isNaN(num) ? value : num;
            }
        }
        
        return characters;
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
    
    let encounterContent = await app.vault.read(activeFile);
    
    // Check for effects block
    if (!encounterContent.includes('```effects')) {
        new Notice("Keine Effekte-Block gefunden! Ist dies eine Encounter-Datei?");
        return;
    }
    
    // Get character files
    const folderPath = activeFile.parent?.path || '';
    const encounterFiles = getFilesInFolder(folderPath);
    
    const characterNames = [];
    for (const file of encounterFiles) {
        if (file.path === activeFile.path) continue;
        
        const content = await app.vault.read(file);
        const statblock = parseStatblock(content);
        if (statblock && statblock.name) {
            characterNames.push(statblock.name);
        }
    }
    
    if (characterNames.length === 0) {
        new Notice("Keine Charaktere gefunden!");
        return;
    }
    
    // Step 1: Select character
    const selectedChar = await quickAddApi.suggester(characterNames, characterNames);
    if (!selectedChar) return;
    
    // Step 2: Enter effect name
    const effectName = await quickAddApi.inputPrompt(
        "Effekt-Name:",
        "z.B. Zauber-Buff, Patzer: Gestolpert"
    );
    if (!effectName || effectName.trim() === '') return;
    
    // Step 3: Select modifier type(s)
    const modifierTypes = [
        { label: "🏃 GS (Geschwindigkeit)", key: "gs" },
        { label: "⚔️ AT Modifikator", key: "at_mod" },
        { label: "🛡️ PA Modifikator", key: "pa_mod" },
        { label: "🏃 AW Modifikator", key: "aw_mod" },
        { label: "🏹 FK Modifikator", key: "fk_mod" },
        { label: "🩹 Schmerz (temporär)", key: "schmerz" },
        { label: "💫 Betäubung (temporär)", key: "betaeubung" },
        { label: "😨 Furcht (temporär)", key: "furcht" },
        { label: "🧊 Paralyse (temporär)", key: "paralyse" },
        { label: "🌀 Verwirrung (temporär)", key: "verwirrung" },
        { label: "📋 Status (Text)", key: "status" },
        { label: "✅ Fertig - Keine weiteren Modifikatoren", key: "__DONE__" }
    ];
    
    const effect = { name: effectName.trim() };
    
    // Multi-select modifiers
    while (true) {
        const selectedMod = await quickAddApi.suggester(
            modifierTypes.map(m => m.label),
            modifierTypes
        );
        
        if (!selectedMod || selectedMod.key === "__DONE__") break;
        
        if (selectedMod.key === "status") {
            const statusValue = await quickAddApi.inputPrompt(
                "Status-Text:",
                "z.B. Liegend, Fixiert, Blutend"
            );
            if (statusValue && statusValue.trim() !== '') {
                effect.status = statusValue.trim();
            }
        } else {
            const modValue = await quickAddApi.inputPrompt(
                `${selectedMod.label} Wert:`,
                "z.B. +2 oder -3 oder 1"
            );
            if (modValue && modValue.trim() !== '') {
                const parsed = parseInt(modValue.trim().replace(/^\+/, ''));
                if (!isNaN(parsed)) {
                    effect[selectedMod.key] = parsed;
                }
            }
        }
        
        // Remove selected option from list
        const idx = modifierTypes.findIndex(m => m.key === selectedMod.key);
        if (idx > -1 && selectedMod.key !== "__DONE__") {
            modifierTypes.splice(idx, 1);
        }
    }
    
    // Step 4: Enter duration
    const durationStr = await quickAddApi.inputPrompt(
        "Dauer in Kampfrunden (KR):",
        "z.B. 3"
    );
    if (!durationStr || durationStr.trim() === '') return;
    
    const duration = parseInt(durationStr.trim());
    if (isNaN(duration) || duration <= 0) {
        new Notice("Ungültige Dauer! Bitte eine positive Zahl eingeben.");
        return;
    }
    
    effect.kr = duration;
    
    // Parse existing effects and add new one
    const effectsData = parseEffectsBlock(encounterContent);
    
    if (!effectsData[selectedChar]) {
        effectsData[selectedChar] = [];
    }
    effectsData[selectedChar].push(effect);
    
    // Update effects block
    const newEffectsContent = serializeEffectsBlock(effectsData);
    encounterContent = encounterContent.replace(
        /```effects\n[\s\S]*?```/,
        '```effects\n' + newEffectsContent + '```'
    );
    
    await app.vault.modify(activeFile, encounterContent);
    
    // Log to encounter
    const modParts = [];
    if (effect.gs) modParts.push(`GS${effect.gs > 0 ? '+' : ''}${effect.gs}`);
    if (effect.at_mod) modParts.push(`AT${effect.at_mod > 0 ? '+' : ''}${effect.at_mod}`);
    if (effect.pa_mod) modParts.push(`PA${effect.pa_mod > 0 ? '+' : ''}${effect.pa_mod}`);
    if (effect.aw_mod) modParts.push(`AW${effect.aw_mod > 0 ? '+' : ''}${effect.aw_mod}`);
    if (effect.fk_mod) modParts.push(`FK${effect.fk_mod > 0 ? '+' : ''}${effect.fk_mod}`);
    if (effect.schmerz) modParts.push(`Schmerz ${effect.schmerz}`);
    if (effect.betaeubung) modParts.push(`Betäubung ${effect.betaeubung}`);
    if (effect.status) modParts.push(effect.status);
    
    const modStr = modParts.length > 0 ? ` (${modParts.join(', ')})` : '';
    
    let logContent = await app.vault.read(activeFile);
    logContent += `\n> ✨ **${selectedChar}** erhält Effekt: ${effect.name}${modStr} für ${duration} KR\n`;
    await app.vault.modify(activeFile, logContent);
    
    new Notice(`✨ ${selectedChar}: ${effect.name} für ${duration} KR hinzugefügt`);
};

