/**
 * QuickAdd User Script: Update Condition
 * Modifies condition levels in a fantasy statblock (min 0, max 4)
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No active file!");
        return;
    }
    
    let content = await app.vault.read(activeFile);
    
    // Find the statblock
    const statblockMatch = content.match(/```statblock[\s\S]*?```/);
    if (!statblockMatch) {
        new Notice("No statblock found in this file!");
        return;
    }
    
    const statblock = statblockMatch[0];
    
    // Define conditions
    const conditions = [
        { key: 'Belastung', name: 'Belastung' },
        { key: 'Betäubung', name: 'Betäubung' },
        { key: 'Furcht', name: 'Furcht' },
        { key: 'Paralyse', name: 'Paralyse' },
        { key: 'Schmerz', name: 'Schmerz' },
        { key: 'Verwirrung', name: 'Verwirrung' }
    ];
    
    // Get current levels for each condition
    const getConditionLevel = (name) => {
        const regex = new RegExp(`-\\s*name:\\s*${name}\\s*\\n\\s*level:\\s*(\\d+)`, 'm');
        const match = statblock.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    // Build display with current levels
    const available = conditions.map(c => ({
        ...c,
        level: getConditionLevel(c.key)
    }));
    
    const displayStrings = available.map(c => `${c.name}: Stufe ${c.level}`);
    const selected = await quickAddApi.suggester(displayStrings, available);
    
    if (!selected) return;
    
    // Get the change amount
    const inputValue = await quickAddApi.inputPrompt(
        `${selected.name} ändern (aktuell: Stufe ${selected.level})`,
        "z.B. +1 oder -2"
    );
    
    if (!inputValue || inputValue.trim() === '') return;
    
    const change = parseInt(inputValue.trim(), 10);
    if (isNaN(change)) {
        new Notice("Ungültige Eingabe! Bitte eine Zahl eingeben.");
        return;
    }
    
    // Calculate new value with min 0, max 4
    const newLevel = Math.min(4, Math.max(0, selected.level + change));
    
    if (newLevel === selected.level) {
        new Notice(`${selected.name} bleibt bei Stufe ${selected.level}`);
        return;
    }
    
    // Update the statblock
    const oldPattern = new RegExp(
        `(-\\s*name:\\s*${selected.key}\\s*\\n\\s*level:\\s*)\\d+`,
        'm'
    );
    const newStatblock = statblock.replace(oldPattern, `$1${newLevel}`);
    
    content = content.replace(statblock, newStatblock);
    
    await app.vault.modify(activeFile, content);
    
    const changeStr = change >= 0 ? `+${change}` : `${change}`;
    new Notice(`${selected.name}: Stufe ${selected.level} → ${newLevel} (${changeStr})`);
};

