/**
 * QuickAdd User Script: Update Value
 * Modifies le, ae, ke, or schip values in a fantasy statblock
 * Automatically updates Schmerz condition based on LE thresholds
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
    
    let statblock = statblockMatch[0];
    
    // Helper to get numeric value from statblock
    const getValue = (key) => {
        const regex = new RegExp(`^${key}:\\s*(-?\\d+)`, 'm');
        const match = statblock.match(regex);
        return match ? parseInt(match[1], 10) : null;
    };
    
    // Helper to get condition level
    const getConditionLevel = (name) => {
        const regex = new RegExp(`-\\s*name:\\s*${name}\\s*\\n\\s*level:\\s*(\\d+)`, 'm');
        const match = statblock.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    // Calculate max LE from species + 2*KO + le_mod
    const getMaxLE = () => {
        const speciesBases = {
            'Mensch': 5,
            'Elf': 2,
            'Halbelf': 5,
            'Zwerg': 8
        };
        
        const speziesMatch = statblock.match(/spezies:\s*(\w+)/);
        const spezies = speziesMatch ? speziesMatch[1] : 'Mensch';
        const baseLe = speciesBases[spezies] ?? 5;
        
        const ko = getValue('ko') ?? 8;
        const leMod = getValue('le_mod') ?? 0;
        
        return baseLe + (2 * ko) + leMod;
    };
    
    // Calculate Schmerz level from LE thresholds
    const calculateSchmerzFromLE = (currentLE, maxLE) => {
        // Thresholds: 3/4, 1/2, 1/4, and <= 5
        let schmerz = 0;
        
        if (currentLE <= maxLE * 0.75) schmerz = 1;
        if (currentLE <= maxLE * 0.5) schmerz = 2;
        if (currentLE <= maxLE * 0.25) schmerz = 3;
        if (currentLE <= 5) schmerz = 4;
        
        return Math.min(4, schmerz); // Max 4 levels
    };
    
    // Gather available properties
    const available = [];
    
    const le = getValue('le');
    if (le !== null) {
        available.push({ key: 'le', name: 'LE (Lebensenergie)', value: le });
    }
    
    const ae = getValue('ae');
    const ae_max = getValue('ae_max');
    if (ae !== null && ae_max !== null && ae_max > 0) {
        available.push({ key: 'ae', name: 'AE (Astralenergie)', value: ae });
    }
    
    const ke = getValue('ke');
    const ke_max = getValue('ke_max');
    if (ke !== null && ke_max !== null && ke_max > 0) {
        available.push({ key: 'ke', name: 'KE (Karmaenergie)', value: ke });
    }
    
    const schip = getValue('schip');
    const schip_max = getValue('schip_max');
    if (schip !== null && schip_max !== null && schip_max > 0) {
        available.push({ key: 'schip', name: 'SchiP (Schicksalspunkte)', value: schip });
    }
    
    if (available.length === 0) {
        new Notice("No modifiable values found in statblock!");
        return;
    }
    
    // Let user select property
    const displayStrings = available.map(p => `${p.name}: ${p.value}`);
    const selected = await quickAddApi.suggester(displayStrings, available);
    
    if (!selected) return;
    
    // Get the change amount
    const inputValue = await quickAddApi.inputPrompt(
        `${selected.name} ändern (aktuell: ${selected.value})`,
        "z.B. +5 oder -3"
    );
    
    if (!inputValue || inputValue.trim() === '') return;
    
    let change = parseInt(inputValue.trim(), 10);
    if (isNaN(change)) {
        new Notice("Ungültige Eingabe! Bitte eine Zahl eingeben.");
        return;
    }
    
    // Special handling for LE damage
    if (selected.key === 'le' && change < 0) {
        // Check for armor - sum all RS values
        const ruestungenMatch = statblock.match(/ruestungen:\s*\n([\s\S]*?)(?=\n\w+:|```)/);
        
        if (ruestungenMatch) {
            const armorBlock = ruestungenMatch[1];
            
            // Sum all RS values from all armor pieces
            let totalRS = 0;
            const rsMatches = armorBlock.matchAll(/rs:\s*(\d+)/g);
            for (const match of rsMatches) {
                totalRS += parseInt(match[1], 10);
            }
            
            if (totalRS > 0) {
                const damageType = await quickAddApi.suggester(
                    [
                        `TP (Trefferpunkte) - Schaden wird um RS ${totalRS} reduziert`,
                        `SP (Schadenspunkte) - Direkter Schaden`
                    ],
                    ['TP', 'SP']
                );
                
                if (!damageType) return;
                
                if (damageType === 'TP') {
                    // Reduce damage by armor
                    const originalDamage = Math.abs(change);
                    const reducedDamage = Math.max(0, originalDamage - totalRS);
                    change = -reducedDamage;
                    
                    if (reducedDamage === 0) {
                        new Notice(`Rüstung absorbiert allen Schaden! (${originalDamage} TP - ${totalRS} RS = 0 SP)`);
                        return;
                    } else {
                        new Notice(`${originalDamage} TP - ${totalRS} RS = ${reducedDamage} SP`);
                    }
                }
            }
        }
    }
    
    // Calculate new value
    const newValue = selected.value + change;
    
    // Update the statblock
    const oldPattern = new RegExp(`(^${selected.key}:)\\s*-?\\d+`, 'm');
    let newStatblock = statblock.replace(oldPattern, `$1 ${newValue}`);
    
    // If LE changed, SET the "Schmerz durch LeP" condition level
    let schmerzMessage = '';
    if (selected.key === 'le') {
        const maxLE = getMaxLE();
        const oldSchmerzFromLE = getConditionLevel('Schmerz durch LeP');
        const newSchmerzFromLE = calculateSchmerzFromLE(newValue, maxLE);
        
        // Always SET the level (not increment/decrement)
        const schmerzPattern = /(-\s*name:\s*Schmerz durch LeP\s*\n\s*level:\s*)\d+/m;
        newStatblock = newStatblock.replace(schmerzPattern, `$1${newSchmerzFromLE}`);
        
        if (oldSchmerzFromLE !== newSchmerzFromLE) {
            if (newSchmerzFromLE > oldSchmerzFromLE) {
                schmerzMessage = ` | ⚠️ Schmerz (LeP): ${oldSchmerzFromLE} → ${newSchmerzFromLE}`;
            } else {
                schmerzMessage = ` | 💚 Schmerz (LeP): ${oldSchmerzFromLE} → ${newSchmerzFromLE}`;
            }
        }
    }
    
    content = content.replace(statblock, newStatblock);
    
    await app.vault.modify(activeFile, content);
    
    const changeStr = change >= 0 ? `+${change}` : `${change}`;
    new Notice(`${selected.name}: ${selected.value} → ${newValue} (${changeStr})${schmerzMessage}`);
};

