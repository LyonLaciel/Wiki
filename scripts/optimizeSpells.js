/**
 * QuickAdd User Script: Optimize Spells/Rituals
 * Generates optimized configuration files for character spells/rituals
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;

    // ========================================
    // STEP TABLES (Stufentabellen)
    // ========================================

    const ZAUBER_DURATION_STEPS = [
        "1 Aktion", "2 Aktionen", "4 Aktionen",
        "8 Aktionen", "16 Aktionen", "32 Aktionen"
    ];

    const RITUAL_DURATION_STEPS = [
        "5 Minuten", "30 Minuten", "2 Stunden",
        "8 Stunden", "16 Stunden", "32 Stunden"
    ];

    const RANGE_STEPS = [
        "Berührung", "4 Schritt", "8 Schritt",
        "16 Schritt", "32 Schritt", "64 Schritt"
    ];

    const ZAUBER_COST_STEPS = [1, 2, 4, 8, 16, 32];
    const RITUAL_COST_STEPS = [8, 16, 32, 64, 128, 256];

    // ========================================
    // SONDERFERTIGKEIT BONUSES (assumed all available)
    // ========================================

    const SF_CONFIG = {
        kraftkontrolle: true,      // -1 AsP (min 1)
        kraftfokus: true,          // -1 AsP (min 1, stacks)
        modifikationsfokus: true,  // +1 extra modification
        merkmalsfokus: [           // +1 probe per Merkmal
            "Antimagie", "Dämonisch", "Einfluss", "Elementar",
            "Heilung", "Hellsicht", "Objekt", "Sphären",
            "Telekinese", "Temporal", "Verwandlung"
        ],
        hexenEmotionen: true,      // +2 probe (can increase to +3 with Macht des Hasses)
        machtDesHasses: true,      // +1 additional (total +3 with hexenEmotionen)
        qabalyamagier: true,       // Drop one component free (no -2)
        exorzistIII: true,         // +1 vs demons/elementals/spirits
        daemonenmeisterin: true,   // +1 anrufung, -2 AsP for summons
        bewegungszauberei: true,   // +1 probe for movement spells, 2x duration
        destruktor: true,          // +10 SP if base >= 5
        jaegerinnen: true,         // +1 SP/TP
        liebeszauberei: true       // +1 probe for desire spells, 2x duration
    };

    // Spells affected by Bewegungszauberei
    const MOVEMENT_SPELLS = ["Axxeleratus", "Krötensprung", "Spinnenlauf", "Transversalis"];
    
    // Spells that are summon/banishment related (for Dämonenmeisterin/Exorzist)
    const SUMMON_BANISH_SPELLS = [
        "Invocatio Minima", "Invocatio Minor", "Invocatio Maior", "Invocatio Maxima",
        "Pentagramma", "Hexagramma", "Heptagramma", "Oktagramma",
        "Elementarer Diener", "Adamantium"
    ];

    // ========================================
    // PARSER FUNCTIONS
    // ========================================

    /**
     * Extract statblock YAML from file content
     */
    function extractStatblock(content) {
        const statblockMatch = content.match(/```statblock\s*([\s\S]*?)```/);
        if (!statblockMatch) return null;
        return statblockMatch[1];
    }

    /**
     * Parse YAML-like statblock content
     */
    function parseStatblockYAML(yamlContent) {
        const lines = yamlContent.split('\n');
        const result = { zauber: [], rituale: [] };
        let currentSection = null;
        let currentItem = null;
        let currentArray = null;
        let indentLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Detect section starts
            if (trimmed === 'zauber:') {
                currentSection = 'zauber';
                currentArray = result.zauber;
                continue;
            }
            if (trimmed === 'rituale:') {
                currentSection = 'rituale';
                currentArray = result.rituale;
                continue;
            }

            // Skip if not in a relevant section
            if (!currentSection) continue;

            // New item in array (starts with "- name:")
            if (trimmed.startsWith('- name:')) {
                currentItem = {
                    name: trimmed.replace('- name:', '').trim().replace(/^["']|["']$/g, ''),
                    probe: '',
                    zauberdauer: '',
                    asp: '',
                    rw: '',
                    wirkungsdauer: '',
                    merkmal: '',
                    fw: 0,
                    sf: '',
                    wirkung: '',
                    reversalis: '',
                    erweiterungen: [],
                    isRitual: currentSection === 'rituale'
                };
                currentArray.push(currentItem);
                continue;
            }

            // Properties of current item
            if (currentItem) {
                // Handle erweiterungen array
                if (trimmed === 'erweiterungen:') {
                    continue;
                }
                if (trimmed.startsWith('- "') || trimmed.startsWith("- '")) {
                    // This is an erweiterung
                    const erw = trimmed.slice(2).trim().replace(/^["']|["']$/g, '');
                    currentItem.erweiterungen.push(erw);
                    continue;
                }

                // Regular properties
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex > 0) {
                    const key = trimmed.substring(0, colonIndex).trim();
                    let value = trimmed.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                    
                    if (key === 'probe') currentItem.probe = value;
                    else if (key === 'zauberdauer' || key === 'ritualdauer') currentItem.zauberdauer = value;
                    else if (key === 'asp') currentItem.asp = value;
                    else if (key === 'rw') currentItem.rw = value;
                    else if (key === 'wirkungsdauer') currentItem.wirkungsdauer = value;
                    else if (key === 'merkmal') currentItem.merkmal = value;
                    else if (key === 'fw') currentItem.fw = parseInt(value) || 0;
                    else if (key === 'sf') currentItem.sf = value;
                    else if (key === 'wirkung') currentItem.wirkung = value;
                    else if (key === 'reversalis') currentItem.reversalis = value;
                }
            }

            // Check if we've left the current section (new top-level key)
            if (!line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('-') && trimmed.includes(':')) {
                if (!trimmed.startsWith('zauber:') && !trimmed.startsWith('rituale:')) {
                    currentSection = null;
                    currentItem = null;
                    currentArray = null;
                }
            }
        }

        return result;
    }

    /**
     * Check if a property is marked as "nicht modifizierbar"
     */
    function isNotModifiable(value) {
        if (!value) return false;
        const lower = value.toLowerCase();
        return lower.includes('nicht modifizierbar') || lower.includes('nicht modifizierbare');
    }

    /**
     * Parse base ASP cost from string (handles complex formats)
     */
    function parseBaseCost(aspString) {
        if (!aspString) return { base: 0, perUnit: null, notModifiable: false };
        
        const notModifiable = isNotModifiable(aspString);
        
        // Extract the first number as base cost
        const match = aspString.match(/(\d+)\s*AsP/i);
        if (match) {
            return { base: parseInt(match[1]), perUnit: null, notModifiable };
        }
        return { base: 0, perUnit: null, notModifiable };
    }

    /**
     * Parse duration string to find step index
     */
    function parseDuration(durationStr, isRitual) {
        if (!durationStr) return { stepIndex: -1, notModifiable: false };
        
        const notModifiable = isNotModifiable(durationStr);
        const steps = isRitual ? RITUAL_DURATION_STEPS : ZAUBER_DURATION_STEPS;
        
        // Normalize: remove parentheses and extra spaces
        const normalized = durationStr.toLowerCase().replace(/\([^)]*\)/g, '').trim();
        
        // Try to extract number
        const numMatch = normalized.match(/(\d+)/);
        if (numMatch) {
            const num = parseInt(numMatch[1]);
            
            if (isRitual) {
                // Match ritual durations
                if (normalized.includes('minute')) {
                    if (num <= 5) return { stepIndex: 0, notModifiable }; // 5 Minuten
                    if (num <= 30) return { stepIndex: 1, notModifiable }; // 30 Minuten
                }
                if (normalized.includes('stunde')) {
                    if (num <= 2) return { stepIndex: 2, notModifiable }; // 2 Stunden
                    if (num <= 8) return { stepIndex: 3, notModifiable }; // 8 Stunden
                    if (num <= 16) return { stepIndex: 4, notModifiable }; // 16 Stunden
                    return { stepIndex: 5, notModifiable }; // 32 Stunden
                }
            } else {
                // Match zauber durations (Aktionen)
                if (normalized.includes('aktion')) {
                    if (num === 1) return { stepIndex: 0, notModifiable };
                    if (num === 2) return { stepIndex: 1, notModifiable };
                    if (num <= 4) return { stepIndex: 2, notModifiable };
                    if (num <= 8) return { stepIndex: 3, notModifiable };
                    if (num <= 16) return { stepIndex: 4, notModifiable };
                    return { stepIndex: 5, notModifiable };
                }
            }
        }
        
        return { stepIndex: -1, notModifiable };
    }

    /**
     * Parse range string to find step index
     */
    function parseRange(rangeStr) {
        if (!rangeStr) return { stepIndex: -1, isSelbst: false };
        
        const normalized = rangeStr.toLowerCase().trim();
        
        if (normalized === 'selbst') {
            return { stepIndex: -1, isSelbst: true };
        }
        
        for (let i = 0; i < RANGE_STEPS.length; i++) {
            if (normalized.includes(RANGE_STEPS[i].toLowerCase())) {
                return { stepIndex: i, isSelbst: false };
            }
        }
        
        // Try to extract number of Schritt
        const schrittMatch = rangeStr.match(/(\d+)\s*Schritt/i);
        if (schrittMatch) {
            const num = parseInt(schrittMatch[1]);
            const idx = RANGE_STEPS.findIndex(s => s.includes(num + ' Schritt'));
            if (idx >= 0) return { stepIndex: idx, isSelbst: false };
        }
        
        return { stepIndex: -1, isSelbst: false };
    }

    // ========================================
    // MODIFICATION RULES
    // ========================================

    /**
     * Calculate available modifications based on FW
     */
    function calculateAvailableModifications(fw) {
        let mods = Math.floor(fw / 4);
        if (SF_CONFIG.modifikationsfokus) mods += 1;
        return mods;
    }

    /**
     * Apply Zauberdauer senken modification
     * Returns: { newStepIndex, probePenalty }
     */
    function applyDurationReduction(currentStep, isRitual) {
        const minStep = 0; // 1 Aktion or 5 Minuten
        if (currentStep <= minStep) {
            return { newStepIndex: currentStep, applied: false, probePenalty: 0 };
        }
        return { newStepIndex: currentStep - 1, applied: true, probePenalty: -1 };
    }

    /**
     * Apply Kosten senken modification
     * Returns: { newCostStep, probePenalty }
     */
    function applyCostReduction(currentCost, isRitual) {
        const steps = isRitual ? RITUAL_COST_STEPS : ZAUBER_COST_STEPS;
        const currentIndex = steps.findIndex(c => c >= currentCost);
        
        if (currentIndex <= 0) {
            return { newCost: currentCost, applied: false, probePenalty: 0 };
        }
        
        return { newCost: steps[currentIndex - 1], applied: true, probePenalty: -1 };
    }

    /**
     * Apply Reichweite erhöhen modification
     * Returns: { newStepIndex, probePenalty }
     */
    function applyRangeIncrease(currentStep) {
        const maxStep = RANGE_STEPS.length - 1;
        if (currentStep >= maxStep || currentStep < 0) {
            return { newStepIndex: currentStep, applied: false, probePenalty: 0 };
        }
        return { newStepIndex: currentStep + 1, applied: true, probePenalty: -1 };
    }

    // ========================================
    // SONDERFERTIGKEIT CALCULATIONS
    // ========================================

    /**
     * Calculate probe bonus from Sonderfertigkeiten
     */
    function calculateProbeBonus(spell) {
        let bonus = 0;
        const bonusSources = [];

        // Merkmalsfokus: +1 if spell's Merkmal is in the list
        if (SF_CONFIG.merkmalsfokus.includes(spell.merkmal)) {
            bonus += 1;
            bonusSources.push(`Merkmalsfokus (${spell.merkmal}): +1`);
        }

        // Hexen-Emotionen + Macht des Hasses: +3
        if (SF_CONFIG.hexenEmotionen && SF_CONFIG.machtDesHasses) {
            bonus += 3;
            bonusSources.push("Hexen-Emotionen + Macht des Hasses: +3");
        } else if (SF_CONFIG.hexenEmotionen) {
            bonus += 2;
            bonusSources.push("Hexen-Emotionen: +2");
        }

        // Exorzist III: +1 for banishment/summon spells
        if (SF_CONFIG.exorzistIII && SUMMON_BANISH_SPELLS.some(s => spell.name.includes(s))) {
            bonus += 1;
            bonusSources.push("Exorzist III: +1");
        }

        // Bewegungszauberei: +1 for movement spells
        if (SF_CONFIG.bewegungszauberei && MOVEMENT_SPELLS.some(s => spell.name.includes(s))) {
            bonus += 1;
            bonusSources.push("Bewegungszauberei: +1");
        }

        return { bonus, sources: bonusSources };
    }

    /**
     * Calculate ASP reduction from Sonderfertigkeiten
     */
    function calculateAspReduction(spell, baseCost) {
        let reduction = 0;
        const reductionSources = [];

        // Kraftkontrolle: -1 AsP
        if (SF_CONFIG.kraftkontrolle && baseCost > 1) {
            reduction += 1;
            reductionSources.push("Kraftkontrolle: -1");
        }

        // Kraftfokus: -1 AsP (stacks)
        if (SF_CONFIG.kraftfokus && baseCost - reduction > 1) {
            reduction += 1;
            reductionSources.push("Kraftfokus: -1");
        }

        // Dämonenmeisterin: -2 AsP for summons
        if (SF_CONFIG.daemonenmeisterin && SUMMON_BANISH_SPELLS.some(s => spell.name.includes(s))) {
            reduction += 2;
            reductionSources.push("Dämonenmeisterin: -2");
        }

        // Ensure minimum 1 AsP
        const finalCost = Math.max(1, baseCost - reduction);
        return { reduction, finalCost, sources: reductionSources };
    }

    // ========================================
    // OPTIMIZER
    // ========================================

    /**
     * Optimize a single spell/ritual
     */
    function optimizeSpell(spell) {
        const result = {
            ...spell,
            finalProbe: spell.probe,
            finalZauberdauer: spell.zauberdauer,
            finalAsp: 0,
            finalRw: spell.rw,
            modificationsUsed: [],
            erweiterungenSelected: [...spell.erweiterungen], // Select all erweiterungen
            probeBonus: 0,
            probePenalty: 0,
            sfBonuses: [],
            aspReductions: []
        };

        // Parse base values
        const costInfo = parseBaseCost(spell.asp);
        const durationInfo = parseDuration(spell.zauberdauer, spell.isRitual);
        const rangeInfo = parseRange(spell.rw);

        // Calculate available modifications
        const availableMods = calculateAvailableModifications(spell.fw);
        let modsUsed = 0;

        // Priority 2: Apply Zauberdauer senken (if possible)
        if (!durationInfo.notModifiable && durationInfo.stepIndex > 0 && modsUsed < availableMods) {
            const reduction = applyDurationReduction(durationInfo.stepIndex, spell.isRitual);
            if (reduction.applied) {
                const steps = spell.isRitual ? RITUAL_DURATION_STEPS : ZAUBER_DURATION_STEPS;
                result.finalZauberdauer = steps[reduction.newStepIndex];
                result.probePenalty += reduction.probePenalty;
                result.modificationsUsed.push(`Zauberdauer senken (${spell.zauberdauer} → ${result.finalZauberdauer})`);
                modsUsed++;
            }
        }

        // Priority 3: Apply Kosten senken (only if base > 4 AsP)
        if (!costInfo.notModifiable && costInfo.base > 4 && modsUsed < availableMods) {
            const reduction = applyCostReduction(costInfo.base, spell.isRitual);
            if (reduction.applied) {
                result.finalAsp = reduction.newCost;
                result.probePenalty += reduction.probePenalty;
                result.modificationsUsed.push(`Kosten senken (${costInfo.base} → ${reduction.newCost} AsP)`);
                modsUsed++;
            }
        } else {
            result.finalAsp = costInfo.base;
        }

        // Optional: Apply Reichweite erhöhen (if useful and mods available)
        if (!rangeInfo.isSelbst && rangeInfo.stepIndex >= 0 && rangeInfo.stepIndex < RANGE_STEPS.length - 1 && modsUsed < availableMods) {
            const increase = applyRangeIncrease(rangeInfo.stepIndex);
            if (increase.applied) {
                result.finalRw = RANGE_STEPS[increase.newStepIndex];
                result.probePenalty += increase.probePenalty;
                result.modificationsUsed.push(`Reichweite erhöhen (${spell.rw} → ${result.finalRw})`);
                modsUsed++;
            }
        }

        // Calculate SF bonuses
        const probeBonus = calculateProbeBonus(spell);
        result.probeBonus = probeBonus.bonus;
        result.sfBonuses = probeBonus.sources;

        // Calculate ASP reductions
        const aspReduction = calculateAspReduction(spell, result.finalAsp);
        result.finalAsp = aspReduction.finalCost;
        result.aspReductions = aspReduction.sources;

        // Calculate net probe modifier
        result.netProbeModifier = result.probeBonus + result.probePenalty;

        // Format final probe string
        if (result.netProbeModifier !== 0) {
            const sign = result.netProbeModifier > 0 ? '+' : '';
            result.finalProbe = `${spell.probe} **${sign}${result.netProbeModifier}**`;
        }

        return result;
    }

    // ========================================
    // MARKDOWN GENERATOR
    // ========================================

    /**
     * Generate markdown content for optimized spell
     */
    function generateMarkdown(optimized) {
        const type = optimized.isRitual ? "Ritual" : "Zauber";
        
        let md = `# ${optimized.name} - OPTIMALE KONFIGURATION\n\n`;

        // Final values table
        md += `## FINALE WERTE\n`;
        md += `| Eigenschaft | Optimiert |\n`;
        md += `|-------------|----------|\n`;
        md += `| Probe | ${optimized.finalProbe} |\n`;
        md += `| ${optimized.isRitual ? 'Ritualdauer' : 'Zauberdauer'} | ${optimized.finalZauberdauer} |\n`;
        md += `| AsP-Kosten | ${optimized.finalAsp} AsP |\n`;
        md += `| Reichweite | ${optimized.finalRw} |\n`;
        md += `| Wirkungsdauer | ${optimized.wirkungsdauer} |\n`;
        md += `| Merkmal | ${optimized.merkmal} |\n`;
        md += `| FW | ${optimized.fw} |\n\n`;

        // Modifications used
        if (optimized.modificationsUsed.length > 0) {
            md += `## Genutzte Modifikationen\n`;
            optimized.modificationsUsed.forEach(mod => {
                md += `- ${mod}\n`;
            });
            md += `\n`;
        } else {
            md += `## Genutzte Modifikationen\n- Keine\n\n`;
        }

        // SF Bonuses
        if (optimized.sfBonuses.length > 0 || optimized.aspReductions.length > 0) {
            md += `## Aktive Boni\n`;
            md += `| Quelle | Effekt |\n`;
            md += `|--------|--------|\n`;
            optimized.sfBonuses.forEach(bonus => {
                md += `| ${bonus.split(':')[0]} | ${bonus.split(':')[1]?.trim() || ''} |\n`;
            });
            optimized.aspReductions.forEach(reduction => {
                md += `| ${reduction.split(':')[0]} | ${reduction.split(':')[1]?.trim() || ''} AsP |\n`;
            });
            md += `\n`;
        }

        // Net probe modifier
        md += `## Probe-Zusammenfassung\n`;
        md += `| Komponente | Wert |\n`;
        md += `|------------|------|\n`;
        md += `| SF-Boni | +${optimized.probeBonus} |\n`;
        md += `| Modifikations-Mali | ${optimized.probePenalty} |\n`;
        md += `| **Netto** | **${optimized.netProbeModifier >= 0 ? '+' : ''}${optimized.netProbeModifier}** |\n\n`;

        // Erweiterungen
        if (optimized.erweiterungenSelected.length > 0) {
            md += `## Erweiterungen\n`;
            optimized.erweiterungenSelected.forEach((erw, i) => {
                md += `${i + 1}. ${erw}\n`;
            });
            md += `\n`;
        }

        // Base data reference
        md += `---\n\n`;
        md += `## Basisdaten (Referenz)\n`;
        md += `| Eigenschaft | Original |\n`;
        md += `|-------------|----------|\n`;
        md += `| Probe | ${optimized.probe} |\n`;
        md += `| ${optimized.isRitual ? 'Ritualdauer' : 'Zauberdauer'} | ${optimized.zauberdauer} |\n`;
        md += `| AsP-Kosten | ${optimized.asp} |\n`;
        md += `| Reichweite | ${optimized.rw} |\n`;
        md += `| Wirkungsdauer | ${optimized.wirkungsdauer} |\n`;
        md += `| Merkmal | ${optimized.merkmal} |\n\n`;

        // Wirkung
        if (optimized.wirkung) {
            md += `## Wirkung\n${optimized.wirkung}\n\n`;
        }

        // Reversalis
        if (optimized.reversalis) {
            md += `## Reversalis\n${optimized.reversalis}\n`;
        }

        return md;
    }

    // ========================================
    // MAIN EXECUTION
    // ========================================

    try {
        // Get active file
        const activeFile = app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("Keine Datei geöffnet!");
            return;
        }

        // Read file content
        const content = await app.vault.read(activeFile);
        
        // Extract and parse statblock
        const statblockYAML = extractStatblock(content);
        if (!statblockYAML) {
            new Notice("Kein Statblock gefunden!");
            return;
        }

        const parsed = parseStatblockYAML(statblockYAML);
        const allSpells = [...parsed.zauber, ...parsed.rituale];

        if (allSpells.length === 0) {
            new Notice("Keine Zauber oder Rituale gefunden!");
            return;
        }

        // Let user select which spells to optimize
        const spellNames = allSpells.map(s => s.name);
        const options = ["📚 Alle optimieren", ...spellNames];
        
        const selection = await quickAddApi.suggester(
            options,
            options
        );

        if (!selection) return;

        // Determine which spells to process
        let spellsToProcess = [];
        if (selection === "📚 Alle optimieren") {
            spellsToProcess = allSpells;
        } else {
            spellsToProcess = allSpells.filter(s => s.name === selection);
        }

        // Get character name from file
        const charName = activeFile.basename;
        const outputFolder = charName;

        // Ensure output folder exists
        const folderPath = outputFolder;
        if (!app.vault.getAbstractFileByPath(folderPath)) {
            await app.vault.createFolder(folderPath);
        }

        // Process each spell
        let createdCount = 0;
        for (const spell of spellsToProcess) {
            const optimized = optimizeSpell(spell);
            const markdown = generateMarkdown(optimized);
            
            // Create safe filename
            const safeFileName = spell.name.replace(/[\/\\:*?"<>|]/g, '_');
            const filePath = `${folderPath}/${safeFileName}.md`;

            // Check if file exists and handle accordingly
            const existingFile = app.vault.getAbstractFileByPath(filePath);
            if (existingFile) {
                await app.vault.modify(existingFile, markdown);
            } else {
                await app.vault.create(filePath, markdown);
            }
            createdCount++;
        }

        new Notice(`${createdCount} Zauber/Rituale optimiert in ${outputFolder}/`);

    } catch (error) {
        console.error("Optimize Spells Error:", error);
        new Notice("Fehler: " + error.message);
    }
};

