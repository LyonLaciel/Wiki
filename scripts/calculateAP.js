/**
 * QuickAdd User Script: Calculate and write AP to character
 */
module.exports = async (params) => {
    const { app } = params;
    
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("No active file!");
        return;
    }
    
    let content = await app.vault.read(activeFile);
    
    // Parse the statblock YAML
    const statblockMatch = content.match(/```statblock\s*\n([\s\S]*?)\n```/);
    if (!statblockMatch) {
        new Notice("No statblock found!");
        return;
    }
    
    // Complete YAML parser that handles key-value map sections (talente, kampftechniken)
    const parseStatblock = (yamlStr) => {
        const data = {};
        const lines = yamlStr.split('\n');
        let currentArrayName = null;
        let currentObject = null;
        let inArray = false;
        let inKeyValueSection = false;
        let keyValueSectionName = null;
        
        // Sections that are key-value maps, not arrays
        const keyValueSections = ['kampftechniken', 'talente'];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines
            if (!line.trim()) continue;
            
            // Check for key-value section property (e.g., "  koerperbeherrschung: 7")
            // Use character class that includes German umlauts
            if (inKeyValueSection && line.match(/^\s+[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:\s*.+$/)) {
                const propMatch = line.match(/^\s+([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.+)$/);
                if (propMatch && keyValueSectionName) {
                    if (!data[keyValueSectionName]) data[keyValueSectionName] = {};
                    let value = propMatch[2].trim();
                    const num = parseFloat(value);
                    const isValidNumber = !isNaN(num) && String(num) === value;
                    data[keyValueSectionName][propMatch[1]] = isValidNumber ? num : value;
                }
                continue;
            }
            
            // Check for array item start (with or without leading whitespace)
            if (line.match(/^\s*-\s+[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:/)) {
                inKeyValueSection = false;
                keyValueSectionName = null;
                // Save previous object if any
                if (currentArrayName && currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                }
                currentObject = {};
                const propMatch = line.match(/^\s*-\s+([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*"?([^"]*)"?$/);
                if (propMatch) {
                    currentObject[propMatch[1]] = propMatch[2].replace(/^"|"$/g, '');
                }
                inArray = true;
                continue;
            }
            
            // Check for simple array item (- value)
            if (line.match(/^\s*-\s+[^:]+$/) && currentArrayName) {
                inKeyValueSection = false;
                keyValueSectionName = null;
                if (currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                    currentObject = null;
                }
                const simpleMatch = line.match(/^\s*-\s+(.+)$/);
                if (simpleMatch) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    // Push as simple object with name property for consistency
                    data[currentArrayName].push({ name: simpleMatch[1].trim() });
                }
                continue;
            }
            
            // Check for array property continuation
            if (inArray && line.match(/^\s+[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:/)) {
                const propMatch = line.match(/^\s+([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*"?([^"]*)"?$/);
                if (propMatch && currentObject) {
                    let value = propMatch[2].replace(/^"|"$/g, '');
                    const num = parseFloat(value);
                    const isValidNumber = !isNaN(num) && String(num) === value;
                    currentObject[propMatch[1]] = isValidNumber ? num : value;
                }
                continue;
            }
            
            // Check for section start (key with no value, followed by array or key-value content)
            const sectionMatch = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*$/);
            if (sectionMatch) {
                // Save previous object if any
                if (currentArrayName && currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                }
                currentObject = null;
                
                // Check if this is a key-value section
                if (keyValueSections.includes(sectionMatch[1])) {
                    inKeyValueSection = true;
                    keyValueSectionName = sectionMatch[1];
                    currentArrayName = null;
                    inArray = false;
                } else {
                    inKeyValueSection = false;
                    keyValueSectionName = null;
                    currentArrayName = sectionMatch[1];
                    inArray = false;
                }
                continue;
            }
            
            // Top-level property (key: value)
            const propMatch = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.+)$/);
            if (propMatch) {
                // Save previous object if any
                if (currentArrayName && currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                }
                currentObject = null;
                currentArrayName = null;
                inArray = false;
                inKeyValueSection = false;
                keyValueSectionName = null;
                
                const key = propMatch[1];
                let value = propMatch[2].trim().replace(/^"|"$/g, '');
                const num = parseFloat(value);
                const isValidNumber = !isNaN(num) && String(num) === value;
                data[key] = isValidNumber ? num : value;
            }
        }
        
        // Save last object if any
        if (currentArrayName && currentObject) {
            if (!data[currentArrayName]) data[currentArrayName] = [];
            data[currentArrayName].push(currentObject);
        }
        
        return data;
    };
    
    const data = parseStatblock(statblockMatch[1]);
    
    // AP Calculation functions
    let totalAP = 0;
    const breakdown = {};
    
    // 1. Spezies AP
    const speziesAP = {
        'elf': 18,
        'zwerg': 61,
        'mensch': 0,
        'halbelf': 0
    };
    const spezies = (data.spezies || '').toLowerCase();
    const speziesCost = speziesAP[spezies] || 0;
    breakdown.spezies = speziesCost;
    totalAP += speziesCost;
    
    // 2. Eigenschaften AP (attributes)
    // Cost per level: 8 = base (0), 9-14 = 15 each, 15 = 30, 16 = 45, 17 = 60, 18 = 75, 19 = 90
    const calcEigenschaftAP = (value) => {
        const v = parseInt(value) || 8;
        if (v <= 8) return 0;
        
        let cost = 0;
        for (let i = 9; i <= v; i++) {
            if (i <= 14) cost += 15;
            else if (i === 15) cost += 30;
            else if (i === 16) cost += 45;
            else if (i === 17) cost += 60;
            else if (i === 18) cost += 75;
            else if (i === 19) cost += 90;
            else if (i === 20) cost += 105;
            else if (i === 21) cost += 120;
        }
        return cost;
    };
    
    const eigenschaften = ['mu', 'kl', 'in', 'ch', 'ff', 'ge', 'ko', 'kk'];
    let eigenschaftenAP = 0;
    for (const attr of eigenschaften) {
        eigenschaftenAP += calcEigenschaftAP(data[attr]);
    }
    breakdown.eigenschaften = eigenschaftenAP;
    totalAP += eigenschaftenAP;
    
    // 3. Cost table for skills (A, B, C, D)
    const costTable = {
        'A': { activation: 1, levels: [0,1,1,1,1,1,1,1,1,1,1,1,1,2,3,4,5,6,7,8,9,10,11,12,13,14] },
        'B': { activation: 2, levels: [0,2,2,2,2,2,2,2,2,2,2,2,2,4,6,8,10,12,14,16,18,20,22,24,26,28] },
        'C': { activation: 3, levels: [0,3,3,3,3,3,3,3,3,3,3,3,3,6,9,12,15,18,21,24,27,30,33,36,39,42] },
        'D': { activation: 4, levels: [0,4,4,4,4,4,4,4,4,4,4,4,4,8,12,16,20,24,28,32,36,40,44,48,52,56] }
    };
    
    const calcSkillAP = (fw, sf, startLevel = 0, needsActivation = false) => {
        const fwNum = parseInt(fw) || 0;
        const sfUpper = (sf || 'A').toUpperCase();
        const table = costTable[sfUpper] || costTable['A'];
        
        let cost = 0;
        if (needsActivation && fwNum >= 0) {
            cost += table.activation;
        }
        
        for (let i = Math.max(startLevel + 1, 1); i <= fwNum; i++) {
            cost += table.levels[i] || table.levels[table.levels.length - 1];
        }
        return cost;
    };
    
    // 4. Talente (start at 0, no activation)
    // We need to know the Steigerungsfaktor for each talent
    const talentSF = {
        // Körpertalente
        fliegen: 'B', gaukeleien: 'A', klettern: 'B', koerperbeherrschung: 'D',
        kraftakt: 'B', reiten: 'B', schwimmen: 'B', selbstbeherrschung: 'D',
        singen: 'A', sinnesschaerfe: 'D', tanzen: 'A', taschendiebstahl: 'B',
        verbergen: 'C', zechen: 'A',
        // Gesellschaftstalente
        bekehren_ueberzeugen: 'B', betoeren: 'B', einschuechtern: 'B', etikette: 'B',
        gassenwissen: 'C', menschenkenntnis: 'C', ueberreden: 'C', verkleiden: 'B',
        willenskraft: 'D',
        // Naturtalente
        faehrtensuchen: 'C', fesseln: 'A', fischen_angeln: 'A', orientierung: 'B',
        pflanzenkunde: 'C', tierkunde: 'C', wildnisleben: 'C',
        // Wissenstalente
        brett_gluecksspiel: 'A', geographie: 'B', geschichtswissen: 'B', goetter_kulte: 'B',
        kriegskunst: 'B', magiekunde: 'C', mechanik: 'B', rechnen: 'A',
        rechtskunde: 'A', sagen_legenden: 'B', sphaerenkunde: 'B', sternkunde: 'A',
        // Handwerkstalente
        alchimie: 'C', boote_schiffe: 'B', fahrzeuge: 'A', handel: 'B',
        heilkunde_gift: 'B', heilkunde_krankheiten: 'B', heilkunde_seele: 'B',
        heilkunde_wunden: 'D', holzbearbeitung: 'B', lebensmittelbearbeitung: 'A',
        lederbearbeitung: 'B', malen_zeichnen: 'A', metallbearbeitung: 'C',
        musizieren: 'A', schloesserknacken: 'C', steinbearbeitung: 'A', stoffbearbeitung: 'A'
    };
    
    let talenteAP = 0;
    if (data.talente && typeof data.talente === 'object') {
        for (const [key, value] of Object.entries(data.talente)) {
            const fw = parseInt(value) || 0;
            const sf = talentSF[key.toLowerCase()] || 'A';
            talenteAP += calcSkillAP(fw, sf, 0, false);
        }
    }
    breakdown.talente = talenteAP;
    totalAP += talenteAP;
    
    // 5. Kampftechniken (start at 6, no activation)
    const kampftechnikSF = {
        armbrueste: 'B', boegen: 'C', dolche: 'B', fechtwaffen: 'C',
        hiebwaffen: 'C', kettenwaffen: 'C', lanzen: 'B', raufen: 'B',
        schilde: 'C', schwerter: 'C', stangenwaffen: 'C', wurfwaffen: 'B',
        zweihandhiebwaffen: 'C', zweihandschwerter: 'C'
    };
    
    let kampftechnikenAP = 0;
    if (data.kampftechniken && typeof data.kampftechniken === 'object') {
        for (const [key, value] of Object.entries(data.kampftechniken)) {
            const ktw = parseInt(value) || 6;
            const sf = kampftechnikSF[key.toLowerCase()] || 'B';
            if (ktw > 6) {
                kampftechnikenAP += calcSkillAP(ktw, sf, 6, false);
            }
        }
    }
    breakdown.kampftechniken = kampftechnikenAP;
    totalAP += kampftechnikenAP;
    
    // 6. Zauber (needs activation, then level)
    let zauberAP = 0;
    if (Array.isArray(data.zauber)) {
        for (const spell of data.zauber) {
            const fw = parseInt(spell.fw) || 0;
            const sf = spell.sf || 'A';
            zauberAP += calcSkillAP(fw, sf, 0, true);
        }
    }
    breakdown.zauber = zauberAP;
    totalAP += zauberAP;
    
    // 7. Rituale (needs activation, then level)
    let ritualeAP = 0;
    if (Array.isArray(data.rituale)) {
        for (const ritual of data.rituale) {
            const fw = parseInt(ritual.fw) || 0;
            const sf = ritual.sf || 'A';
            ritualeAP += calcSkillAP(fw, sf, 0, true);
        }
    }
    breakdown.rituale = ritualeAP;
    totalAP += ritualeAP;
    
    // 8. Zaubertricks (1 AP each)
    let zaubertricksAP = 0;
    if (Array.isArray(data.zaubertricks)) {
        zaubertricksAP = data.zaubertricks.length;
    }
    breakdown.zaubertricks = zaubertricksAP;
    totalAP += zaubertricksAP;
    
    // 9. Liturgien (needs activation, then level)
    let liturgienAP = 0;
    if (Array.isArray(data.liturgien)) {
        for (const liturgie of data.liturgien) {
            const fw = parseInt(liturgie.fw) || 0;
            const sf = liturgie.sf || 'A';
            liturgienAP += calcSkillAP(fw, sf, 0, true);
        }
    }
    breakdown.liturgien = liturgienAP;
    totalAP += liturgienAP;
    
    // 10. Zeremonien (needs activation, then level)
    let zeremonienAP = 0;
    if (Array.isArray(data.zeremonien)) {
        for (const zeremonie of data.zeremonien) {
            const fw = parseInt(zeremonie.fw) || 0;
            const sf = zeremonie.sf || 'A';
            zeremonienAP += calcSkillAP(fw, sf, 0, true);
        }
    }
    breakdown.zeremonien = zeremonienAP;
    totalAP += zeremonienAP;
    
    // 11. Segnungen (1 AP each)
    let segnungenAP = 0;
    if (Array.isArray(data.segnungen)) {
        segnungenAP = data.segnungen.length;
    }
    breakdown.segnungen = segnungenAP;
    totalAP += segnungenAP;
    
    // 12. Vorteile (parse AP value)
    const parseAPValue = (apStr) => {
        if (!apStr) return 0;
        const match = String(apStr).match(/(-?\d+)/);
        return match ? parseInt(match[1]) : 0;
    };
    
    let vorteileAP = 0;
    if (Array.isArray(data.vorteile)) {
        for (const vorteil of data.vorteile) {
            vorteileAP += parseAPValue(vorteil.ap);
        }
    }
    breakdown.vorteile = vorteileAP;
    totalAP += vorteileAP;
    
    // 13. Nachteile (negative AP, but we add them as positive cost reduction)
    let nachteileAP = 0;
    if (Array.isArray(data.nachteile)) {
        for (const nachteil of data.nachteile) {
            nachteileAP += parseAPValue(nachteil.ap); // Will be negative
        }
    }
    breakdown.nachteile = nachteileAP;
    totalAP += nachteileAP;
    
    // 14. Sonderfertigkeiten
    let sonderfertigkeitenAP = 0;
    if (Array.isArray(data.sonderfertigkeiten)) {
        for (const sf of data.sonderfertigkeiten) {
            sonderfertigkeitenAP += parseAPValue(sf.ap);
        }
    }
    breakdown.sonderfertigkeiten = sonderfertigkeitenAP;
    totalAP += sonderfertigkeitenAP;
    
    // Write AP to frontmatter
    const apLine = `ap_gesamt: ${totalAP}`;
    
    // Check if ap_gesamt already exists
    if (content.includes('ap_gesamt:')) {
        content = content.replace(/ap_gesamt:\s*\d+/, apLine);
    } else {
        // Add after spezies or at start of statblock content
        content = content.replace(/(```statblock\s*\nlayout:\s*\w+\s*\n)/, `$1${apLine}\n`);
    }
    
    await app.vault.modify(activeFile, content);
    
    // Build breakdown message
    const parts = [];
    if (breakdown.spezies) parts.push(`Spezies: ${breakdown.spezies}`);
    if (breakdown.eigenschaften) parts.push(`Eigenschaften: ${breakdown.eigenschaften}`);
    if (breakdown.talente) parts.push(`Talente: ${breakdown.talente}`);
    if (breakdown.kampftechniken) parts.push(`Kampftechniken: ${breakdown.kampftechniken}`);
    if (breakdown.vorteile) parts.push(`Vorteile: ${breakdown.vorteile}`);
    if (breakdown.nachteile) parts.push(`Nachteile: ${breakdown.nachteile}`);
    if (breakdown.sonderfertigkeiten) parts.push(`SF: ${breakdown.sonderfertigkeiten}`);
    if (breakdown.zauber) parts.push(`Zauber: ${breakdown.zauber}`);
    if (breakdown.rituale) parts.push(`Rituale: ${breakdown.rituale}`);
    if (breakdown.zaubertricks) parts.push(`Tricks: ${breakdown.zaubertricks}`);
    if (breakdown.liturgien) parts.push(`Liturgien: ${breakdown.liturgien}`);
    if (breakdown.zeremonien) parts.push(`Zeremonien: ${breakdown.zeremonien}`);
    if (breakdown.segnungen) parts.push(`Segnungen: ${breakdown.segnungen}`);
    
    new Notice(`AP Gesamt: ${totalAP}\n${parts.join(' | ')}`, 10000);
};

