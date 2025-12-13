/**
 * QuickAdd User Script: 3d20 Fertigkeitsprobe
 * DSA 5 skill check with 3d20
 * Includes automatic condition modifiers
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
    
    // All talents with their probe attributes and BE (Belastung) effect
    // BE: "Ja" = always affected, "Nein" = never, "Evtl" = sometimes (treated as yes for safety)
    const allTalents = [
        // Körpertalente
        { name: "Fliegen", probe: ["mu", "in", "ge"], category: "Körper", be: true },
        { name: "Gaukeleien", probe: ["mu", "ch", "ff"], category: "Körper", be: true },
        { name: "Klettern", probe: ["mu", "ge", "kk"], category: "Körper", be: true },
        { name: "Körperbeherrschung", probe: ["ge", "ge", "ko"], category: "Körper", be: true },
        { name: "Kraftakt", probe: ["ko", "kk", "kk"], category: "Körper", be: true },
        { name: "Reiten", probe: ["ch", "ge", "kk"], category: "Körper", be: true },
        { name: "Schwimmen", probe: ["ge", "ko", "kk"], category: "Körper", be: true },
        { name: "Selbstbeherrschung", probe: ["mu", "mu", "ko"], category: "Körper", be: false },
        { name: "Singen", probe: ["kl", "ch", "ko"], category: "Körper", be: true }, // Evtl
        { name: "Sinnesschärfe", probe: ["kl", "in", "in"], category: "Körper", be: true }, // Evtl
        { name: "Tanzen", probe: ["kl", "ch", "ge"], category: "Körper", be: true },
        { name: "Taschendiebstahl", probe: ["mu", "ff", "ge"], category: "Körper", be: true },
        { name: "Verbergen", probe: ["mu", "in", "ge"], category: "Körper", be: true },
        { name: "Zechen", probe: ["kl", "ko", "kk"], category: "Körper", be: false },
        // Gesellschaftstalente
        { name: "Bekehren & Überzeugen", probe: ["mu", "kl", "ch"], category: "Gesellschaft", be: false },
        { name: "Betören", probe: ["mu", "ch", "ch"], category: "Gesellschaft", be: true }, // Evtl
        { name: "Einschüchtern", probe: ["mu", "in", "ch"], category: "Gesellschaft", be: false },
        { name: "Etikette", probe: ["kl", "in", "ch"], category: "Gesellschaft", be: false },
        { name: "Gassenwissen", probe: ["kl", "in", "ch"], category: "Gesellschaft", be: true }, // Evtl
        { name: "Menschenkenntnis", probe: ["kl", "in", "ch"], category: "Gesellschaft", be: false },
        { name: "Überreden", probe: ["mu", "in", "ch"], category: "Gesellschaft", be: false },
        { name: "Verkleiden", probe: ["in", "ch", "ge"], category: "Gesellschaft", be: true },
        { name: "Willenskraft", probe: ["mu", "in", "ch"], category: "Gesellschaft", be: false },
        // Naturtalente
        { name: "Fährtensuchen", probe: ["mu", "in", "ge"], category: "Natur", be: true },
        { name: "Fesseln", probe: ["kl", "ff", "kk"], category: "Natur", be: true }, // Evtl
        { name: "Fischen & Angeln", probe: ["ff", "ge", "ko"], category: "Natur", be: true }, // Evtl
        { name: "Orientierung", probe: ["kl", "in", "in"], category: "Natur", be: false },
        { name: "Pflanzenkunde", probe: ["kl", "ff", "ko"], category: "Natur", be: true }, // Evtl
        { name: "Tierkunde", probe: ["mu", "mu", "ch"], category: "Natur", be: true },
        { name: "Wildnisleben", probe: ["mu", "ge", "ko"], category: "Natur", be: true },
        // Wissenstalente (all BE: Nein)
        { name: "Brett- & Glücksspiel", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Geographie", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Geschichtswissen", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Götter & Kulte", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Kriegskunst", probe: ["mu", "kl", "in"], category: "Wissen", be: false },
        { name: "Magiekunde", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Mechanik", probe: ["kl", "kl", "ff"], category: "Wissen", be: false },
        { name: "Rechnen", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Rechtskunde", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Sagen & Legenden", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Sphärenkunde", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        { name: "Sternkunde", probe: ["kl", "kl", "in"], category: "Wissen", be: false },
        // Handwerkstalente
        { name: "Alchimie", probe: ["mu", "kl", "ff"], category: "Handwerk", be: true },
        { name: "Boote & Schiffe", probe: ["ff", "ge", "kk"], category: "Handwerk", be: true },
        { name: "Fahrzeuge", probe: ["ch", "ff", "ko"], category: "Handwerk", be: true },
        { name: "Handel", probe: ["kl", "in", "ch"], category: "Handwerk", be: false },
        { name: "Heilkunde Gift", probe: ["mu", "kl", "in"], category: "Handwerk", be: true },
        { name: "Heilkunde Krankheiten", probe: ["mu", "in", "ko"], category: "Handwerk", be: true },
        { name: "Heilkunde Seele", probe: ["in", "ch", "ko"], category: "Handwerk", be: false },
        { name: "Heilkunde Wunden", probe: ["kl", "ff", "ff"], category: "Handwerk", be: true },
        { name: "Holzbearbeitung", probe: ["ff", "ge", "kk"], category: "Handwerk", be: true },
        { name: "Lebensmittelbearbeitung", probe: ["in", "ff", "ff"], category: "Handwerk", be: true },
        { name: "Lederbearbeitung", probe: ["ff", "ge", "ko"], category: "Handwerk", be: true },
        { name: "Malen & Zeichnen", probe: ["in", "ff", "ff"], category: "Handwerk", be: true },
        { name: "Metallbearbeitung", probe: ["ff", "ko", "kk"], category: "Handwerk", be: true },
        { name: "Musizieren", probe: ["ch", "ff", "ko"], category: "Handwerk", be: true },
        { name: "Schlösserknacken", probe: ["in", "ff", "ff"], category: "Handwerk", be: true },
        { name: "Steinbearbeitung", probe: ["ff", "ff", "kk"], category: "Handwerk", be: true },
        { name: "Stoffbearbeitung", probe: ["kl", "ff", "ff"], category: "Handwerk", be: true }
    ];
    
    // Helper to get attribute value
    const getAttr = (key) => {
        const regex = new RegExp(`^${key}:\\s*(\\d+)`, 'm');
        const match = statblock.match(regex);
        return match ? parseInt(match[1], 10) : 8;
    };
    
    // Helper to get condition level
    const getConditionLevel = (name) => {
        const regex = new RegExp(`-\\s*name:\\s*${name}\\s*\\n\\s*level:\\s*(\\d+)`, 'm');
        const match = statblock.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    // Get all condition levels
    const conditions = {
        schmerzLeP: getConditionLevel('Schmerz durch LeP'),
        belastung: getConditionLevel('Belastung'),
        betaeubung: getConditionLevel('Betäubung'),
        furcht: getConditionLevel('Furcht'),
        paralyse: getConditionLevel('Paralyse'),
        schmerz: getConditionLevel('Schmerz'),
        verwirrung: getConditionLevel('Verwirrung')
    };
    
    // Get armor BE (Belastung from worn armor)
    const getArmorBE = () => {
        const ruestungenMatch = statblock.match(/ruestungen:\s*\n([\s\S]*?)(?=\n\w+:|```)/);
        if (!ruestungenMatch) return 0;
        
        let totalBE = 0;
        const beMatches = ruestungenMatch[1].matchAll(/be:\s*(\d+)/g);
        for (const match of beMatches) {
            totalBE += parseInt(match[1], 10);
        }
        return totalBE;
    };
    
    const armorBE = getArmorBE();
    const totalBelastung = conditions.belastung + armorBE;
    
    // Calculate condition penalty (all except Belastung)
    const conditionPenalty = Math.min(5, 
        conditions.schmerzLeP +
        conditions.betaeubung + 
        conditions.furcht + 
        conditions.paralyse + 
        conditions.schmerz + 
        conditions.verwirrung
    );
    
    // Helper to parse probe string like "MU/KL/CH" into array
    const parseProbe = (probeStr) => {
        if (!probeStr || probeStr === '-') return null;
        return probeStr.toLowerCase().split('/').map(s => s.trim());
    };
    
    // Get character's zauber/rituale/liturgien/zeremonien from statblock
    const getAbilitiesFromSection = (sectionName) => {
        const regex = new RegExp(`${sectionName}:\\s*\\n([\\s\\S]*?)(?=\\n\\w+:|\\n\`\`\`)`, 'm');
        const match = statblock.match(regex);
        if (!match) return [];
        
        const abilities = [];
        const sectionContent = match[1];
        
        // Split into individual entries by finding each "- name:" 
        const entryStarts = [...sectionContent.matchAll(/(?:^|\n)\s*-\s*name:/g)];
        
        for (let i = 0; i < entryStarts.length; i++) {
            const startIdx = entryStarts[i].index;
            const endIdx = i + 1 < entryStarts.length ? entryStarts[i + 1].index : sectionContent.length;
            const entryText = sectionContent.slice(startIdx, endIdx);
            
            // Extract name (quoted)
            const nameMatch = entryText.match(/name:\s*"([^"]+)"/);
            if (!nameMatch) continue;
            
            // Extract probe (quoted)
            const probeMatch = entryText.match(/probe:\s*"([^"]+)"/);
            if (!probeMatch) continue;
            
            // Extract fw (can be quoted or unquoted, may be missing)
            const fwMatch = entryText.match(/fw:\s*"?(\d+)"?/);
            const fw = fwMatch ? parseInt(fwMatch[1], 10) : 0;
            
            abilities.push({
                name: nameMatch[1],
                probe: parseProbe(probeMatch[1]),
                fw: fw,
                be: false // Spells/liturgies are not affected by Belastung
            });
        }
        return abilities;
    };
    
    // Get talente FW from statblock
    const getTalentFW = (talentName) => {
        // Normalize talent name for key matching
        const key = talentName.toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
            .replace(/[^a-z]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        
        // Try talente section object format
        const regex = new RegExp(`talente:[\\s\\S]*?${key}:\\s*(\\d+)`, 'i');
        const match = statblock.match(regex);
        return match ? parseInt(match[1], 10) : 0;
    };
    
    // Check which categories have entries
    const zauber = getAbilitiesFromSection('zauber');
    const rituale = getAbilitiesFromSection('rituale');
    const liturgien = getAbilitiesFromSection('liturgien');
    const zeremonien = getAbilitiesFromSection('zeremonien');
    
    // Build category options
    const categories = [{ key: 'talente', name: '📜 Talente' }];
    if (zauber.length > 0) categories.push({ key: 'zauber', name: '✨ Zauber', items: zauber });
    if (rituale.length > 0) categories.push({ key: 'rituale', name: '🔮 Rituale', items: rituale });
    if (liturgien.length > 0) categories.push({ key: 'liturgien', name: '🙏 Liturgien', items: liturgien });
    if (zeremonien.length > 0) categories.push({ key: 'zeremonien', name: '⛪ Zeremonien', items: zeremonien });
    
    // Select category
    const selectedCategory = await quickAddApi.suggester(
        categories.map(c => c.name),
        categories
    );
    if (!selectedCategory) return;
    
    let selectedAbility;
    let isTalent = false;
    
    if (selectedCategory.key === 'talente') {
        isTalent = true;
        // Show all talents with their FW
        const talentDisplay = allTalents.map(t => {
            const fw = getTalentFW(t.name);
            const beIndicator = t.be ? ' [BE]' : '';
            return `${t.name} (${t.probe.map(p => p.toUpperCase()).join('/')}) | FW ${fw}${beIndicator}`;
        });
        
        const idx = await quickAddApi.suggester(talentDisplay, allTalents.map((t, i) => i));
        if (idx === null || idx === undefined) return;
        
        const talent = allTalents[idx];
        selectedAbility = {
            name: talent.name,
            probe: talent.probe,
            fw: getTalentFW(talent.name),
            be: talent.be
        };
    } else {
        // Show abilities from the category
        const items = selectedCategory.items;
        const display = items.map(a => `${a.name} (${a.probe.map(p => p.toUpperCase()).join('/')}) | FW ${a.fw}`);
        
        const idx = await quickAddApi.suggester(display, items.map((_, i) => i));
        if (idx === null || idx === undefined) return;
        
        selectedAbility = items[idx];
    }
    
    if (!selectedAbility.probe || selectedAbility.probe.length !== 3) {
        new Notice("Ungültige Probe-Attribute!");
        return;
    }
    
    // Calculate total condition modifier
    let conditionMod = -conditionPenalty;
    
    // Add Belastung penalty for talents with BE (condition + armor)
    if (isTalent && selectedAbility.be && totalBelastung > 0) {
        conditionMod -= totalBelastung;
    }
    
    // Cap at -5
    conditionMod = Math.max(-5, conditionMod);
    
    // Ask for additional modifier
    let modPrompt = "Modifikator (Erschwernis/Erleichterung)?";
    if (conditionMod < 0) {
        modPrompt = `Zustände: ${conditionMod} | Zusätzlicher Modifikator?`;
    }
    
    const modInput = await quickAddApi.inputPrompt(
        modPrompt,
        "z.B. -2 für Erschwernis, +3 für Erleichterung, oder leer für 0"
    );
    
    const manualModifier = modInput ? parseInt(modInput.trim(), 10) || 0 : 0;
    const totalModifier = conditionMod + manualModifier;
    
    // Get attribute values
    const attrs = selectedAbility.probe.map(p => getAttr(p));
    const attrNames = selectedAbility.probe.map(p => p.toUpperCase());
    
    // Apply modifier to effective attribute values
    const effAttrs = attrs.map(a => a + totalModifier);
    
    // Check if any effective attribute is 0 or below
    if (effAttrs.some(a => a <= 0)) {
        new Notice(`❌ Probe nicht möglich! Effektive Eigenschaft ≤ 0 durch Modifikator (${totalModifier}).`);
        return;
    }
    
    // Roll 3d20
    const rolls = [
        Math.floor(Math.random() * 20) + 1,
        Math.floor(Math.random() * 20) + 1,
        Math.floor(Math.random() * 20) + 1
    ];
    
    // Count 1s and 20s for critical/patzer
    const ones = rolls.filter(r => r === 1).length;
    const twenties = rolls.filter(r => r === 20).length;
    
    // Check for critical success (Doppel-1 or Dreifach-1)
    const isCritical = ones >= 2;
    const isTripleCrit = ones === 3;
    
    // Check for patzer (Doppel-20 or Dreifach-20)
    const isPatzer = twenties >= 2;
    const isTriplePatzer = twenties === 3;
    
    // Calculate FP
    let fw = selectedAbility.fw;
    let fpRemaining = fw;
    const details = [];
    
    for (let i = 0; i < 3; i++) {
        const roll = rolls[i];
        const eff = effAttrs[i];
        const diff = roll - eff;
        
        const modStr = totalModifier !== 0 ? (totalModifier > 0 ? '+' + totalModifier : totalModifier) : '';
        
        if (diff > 0) {
            // Need to spend FP
            fpRemaining -= diff;
            details.push(`${attrNames[i]} ${attrs[i]}${modStr}: 🎲${roll} (−${diff} FP)`);
        } else {
            details.push(`${attrNames[i]} ${attrs[i]}${modStr}: 🎲${roll} ✓`);
        }
    }
    
    // Determine success
    let success = fpRemaining >= 0;
    let qs = 0;
    
    // Handle criticals and patzers
    if (isCritical) {
        success = true;
        fpRemaining = Math.max(fpRemaining, fw); // Restore FP for critical
    }
    if (isPatzer) {
        success = false;
    }
    
    // Calculate QS (min 1 if success with 0 FP)
    if (success) {
        const fp = Math.max(0, fpRemaining);
        if (fp === 0) {
            qs = 1;
        } else if (fp <= 3) {
            qs = 1;
        } else if (fp <= 6) {
            qs = 2;
        } else if (fp <= 9) {
            qs = 3;
        } else if (fp <= 12) {
            qs = 4;
        } else if (fp <= 15) {
            qs = 5;
        } else {
            qs = 6;
        }
    }
    
    // Build result message
    let result = `**${selectedAbility.name}** (FW ${fw})\n`;
    
    // Show condition info
    const activeConditions = [];
    if (conditions.schmerzLeP > 0) activeConditions.push(`Schmerz (LeP) ${conditions.schmerzLeP}`);
    if (conditions.betaeubung > 0) activeConditions.push(`Betäubung ${conditions.betaeubung}`);
    if (conditions.furcht > 0) activeConditions.push(`Furcht ${conditions.furcht}`);
    if (conditions.paralyse > 0) activeConditions.push(`Paralyse ${conditions.paralyse}`);
    if (conditions.schmerz > 0) activeConditions.push(`Schmerz ${conditions.schmerz}`);
    if (conditions.verwirrung > 0) activeConditions.push(`Verwirrung ${conditions.verwirrung}`);
    if (isTalent && selectedAbility.be && totalBelastung > 0) {
        let belastungStr = `Belastung ${totalBelastung}`;
        if (armorBE > 0 && conditions.belastung > 0) {
            belastungStr += ` (Zustand ${conditions.belastung} + Rüstung ${armorBE})`;
        } else if (armorBE > 0) {
            belastungStr += ` (Rüstung)`;
        }
        activeConditions.push(belastungStr);
    }
    
    if (activeConditions.length > 0) {
        result += `⚠️ ${activeConditions.join(', ')}\n`;
    }
    
    if (totalModifier !== 0) {
        result += `Modifikator: ${totalModifier > 0 ? '+' + totalModifier : totalModifier}`;
        if (conditionMod < 0 && manualModifier !== 0) {
            result += ` (Zustände: ${conditionMod}, Zusatz: ${manualModifier > 0 ? '+' + manualModifier : manualModifier})`;
        }
        result += '\n';
    }
    
    result += `Würfe: [${rolls.join(', ')}]\n`;
    result += details.join('\n') + '\n';
    
    if (isTripleCrit) {
        result += `\n🌟🌟🌟 **DREIFACH-1! LEGENDÄRER ERFOLG!** 🌟🌟🌟\nQS 6+ (Spektakulärer Erfolg!)`;
    } else if (isCritical) {
        result += `\n🌟🌟 **DOPPEL-1! KRITISCHER ERFOLG!** 🌟🌟\nAutomatisch bestanden!`;
    } else if (isTriplePatzer) {
        result += `\n💀💀💀 **DREIFACH-20! KATASTROPHALER PATZER!** 💀💀💀\nSchreckliches Missgeschick!`;
    } else if (isPatzer) {
        result += `\n💀💀 **DOPPEL-20! PATZER!** 💀💀\nAutomatisch misslungen!`;
    } else if (success) {
        result += `\n✅ **Bestanden!** FP: ${Math.max(0, fpRemaining)} → **QS ${qs}**`;
    } else {
        result += `\n❌ **Misslungen!** (${Math.abs(fpRemaining)} Punkte zu wenig)`;
    }
    
    // Show as notice
    new Notice(result, 10000);
    
    // Also log to console for reference
    console.log("=== 3d20 Probe ===");
    console.log(result);
};
