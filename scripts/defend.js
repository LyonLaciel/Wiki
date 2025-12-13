/**
 * QuickAdd User Script: Defend (Verteidigung)
 * Handles defense rolls with PA or AW against melee and ranged attacks, including fumble tables
 * and full damage processing when defense fails (hit zones, RS, Wundschwelle, Schlimme Verletzungen)
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // ========================================
    // DEFENSE FUMBLE TABLES (Patzertabellen)
    // ========================================
    
    const FUMBLE_CATEGORIES = {
        2: { name: "Waffe/Schild zerstört", key: "waffe_zerstoert" },
        3: { name: "Waffe/Schild schwer beschädigt", key: "waffe_schwer_beschaedigt" },
        4: { name: "Waffe/Schild beschädigt", key: "waffe_beschaedigt" },
        5: { name: "Waffe/Schild verloren", key: "waffe_verloren" },
        6: { name: "Waffe/Schild stecken geblieben", key: "waffe_stecken" },
        7: { name: "Sturz", key: "sturz" },
        8: { name: "Stolpern", key: "stolpern" },
        9: { name: "Fuß verdreht", key: "fuss_verdreht" },
        10: { name: "Beule", key: "beule" },
        11: { name: "Selbst verletzt", key: "selbst_verletzt" },
        12: { name: "Selbst schwer verletzt", key: "selbst_schwer_verletzt" }
    };
    
    const FUMBLE_DETAILS = {
        waffe_zerstoert: {
            "1-10": "Waffe zerspringt: Kann nicht repariert werden. Einzelteile verursachen 1W6 SP. Bei unzerstörbaren Waffen: Waffe verloren.",
            "11-20": "Waffe zerbrochen: Reparatur um 3 erschwert, kostet 25% des Preises. Bei unzerstörbaren Waffen: Waffe verloren."
        },
        waffe_schwer_beschaedigt: {
            "1-6": "Extrem schwere Beschädigung: Nicht verwendbar bis repariert. Reparatur um 1 erschwert.",
            "7-12": "Waffe stark beschädigt: Nicht verwendbar bis repariert.",
            "13-18": "Waffe kaum noch zu gebrauchen: AT und PA um 4 erschwert bis repariert.",
            "19-20": "Nochmal würfeln!"
        },
        waffe_beschaedigt: {
            "1-5": "Kratzer an der Waffe: Keine regeltechnischen Auswirkungen.",
            "6-10": "Leicht beschädigt: AT und PA um 1 erschwert bis repariert.",
            "11-15": "Beschädigt: AT und PA um 2 erschwert bis repariert.",
            "16-20": "Schwer beschädigt: AT und PA um 3 erschwert bis repariert."
        },
        waffe_verloren: {
            "1-3": "Waffe weit weg und ungünstig: Liegt 1W6+2 Schritt weit weg + verhakt. Kraftakt zum Befreien.",
            "4-6": "Waffe weit weg: Liegt 1W6+2 Schritt weit weg.",
            "7-9": "Waffe liegt ungünstig: Aufheben um 2 erschwert.",
            "10-12": "Waffe auf Boden gefallen: Normales Aufheben möglich.",
            "13-15": "Waffe streift Gefährten: Dieser hat -3 VW bis Ende nächster KR. Sonst: -3 AT für Held.",
            "16-18": "Waffe liegt günstig: Aufheben um 2 erleichtert.",
            "19-20": "Nochmal würfeln!"
        },
        waffe_stecken: {
            "1-2": "Gefährten verletzt: Waffe trifft Gefährten/Unschuldigen. Schild-PA oder AW möglich, sonst voller Schaden.",
            "3-4": "Waffe steckt fest: 1 Aktion + Kraftakt zum Befreien.",
            "5-6": "Waffe steckt ziemlich fest: 1 Aktion + Kraftakt -1 zum Befreien.",
            "7-8": "Waffe steckt sehr tief fest: 1 Aktion + Kraftakt -2 zum Befreien.",
            "9-10": "Waffe steckt extrem tief fest: 5 Aktionen + Kraftakt -2 zum Befreien.",
            "11-12": "Waffe verbogen: Nach Befreien -1 AT/PA bis Kampfende.",
            "13-14": "Waffe trifft Gefährten: Dieser kann VW einsetzen, sonst voller Schaden.",
            "15-20": "Nochmal würfeln!"
        },
        sturz: {
            "1-2": "Abgeräumt: Liegend + zieht 1W3 Gefährten zu Boden (Körperbeherrschung -2). Sonst: 1 Stufe Schmerz für 5 Min.",
            "3-4": "Luftraubender Sturz: Körperbeherrschung -3 oder Liegend + 1W6+2 SP + 1 Stufe Betäubung für 3 KR.",
            "5-6": "Sehr schmerzhafter Sturz: Körperbeherrschung -3 oder Liegend + 1W6+2 SP.",
            "7-8": "Schmerzhafter Sturz: Körperbeherrschung -2 oder Liegend + 1W6 SP.",
            "9-10": "Gestürzt: Körperbeherrschung -2 oder Liegend.",
            "11-12": "Leichter Sturz: Körperbeherrschung -1 oder Liegend.",
            "13-14": "Harmloser Sturz: Körperbeherrschung oder Liegend.",
            "15-16": "Fehltritt: Körperbeherrschung +1 oder Liegend.",
            "17-20": "Nochmal würfeln!"
        },
        stolpern: {
            "1-2": "In Gegnerwaffe gestolpert: Voller Waffenschaden + nächste Handlung -2.",
            "3-4": "Schwer gestolpert: Nächste Handlung -3.",
            "5-6": "Missgeschick: Gegenstand verloren/Hose rutscht. -2 alle Handlungen + Eingeengt + Fixiert bis Ende nächster KR.",
            "7-8": "Gestolpert: Nächste Handlung -2.",
            "9-10": "Schwer aus dem Gleichgewicht: Alle Gegner +2 AT bis Ende nächster KR.",
            "11-12": "Leicht gestolpert: Nächste Handlung -1.",
            "13-14": "Aus dem Gleichgewicht: Alle Gegner +1 AT bis Ende nächster KR.",
            "15-20": "Nochmal würfeln!"
        },
        fuss_verdreht: {
            "1-3": "Fuß verdreht und überdehnt: 2 Stufen Schmerz für 3 KR.",
            "4-6": "Schlimm schmerzender Fuß: 1 Stufe Schmerz für 5 KR.",
            "7-9": "Schmerzender Fuß: 1 Stufe Schmerz für 3 KR.",
            "10-12": "Schwer verknackst: +2 TP Schaden, keine Schmerz-Stufe.",
            "13-15": "Leicht schmerzender Fuß: 1 Stufe Schmerz für 1 KR.",
            "16-18": "Leicht verknackst: +1 TP Schaden, keine Schmerz-Stufe.",
            "19-20": "Nochmal würfeln!"
        },
        beule: {
            "1-5": "Große Beule: 2 Stufen Betäubung für 1 Stunde.",
            "6-10": "Blutende Beule: 1 Stufe Betäubung + Status Blutend.",
            "11-15": "Kopfschmerzen: 1 Stufe Betäubung für 1 Stunde.",
            "16-20": "Leichte Kopfschmerzen: 1 Stufe Betäubung für 2 KR."
        },
        selbst_verletzt: {
            "1-6": "Selbst verletzt: Waffenschaden halbiert. Unbewaffnet: 1W6 TP.",
            "7-12": "Selbst verletzt: Voller Waffenschaden. Unbewaffnet: 1W6 TP.",
            "13-18": "Selbst verletzt: Voller Waffenschaden + Status Blutend. Unbewaffnet: 1W6 TP.",
            "19-20": "Nochmal würfeln!"
        },
        selbst_schwer_verletzt: {
            "1-10": "Schwerer Eigentreffer: Waffenschaden verdoppelt + Status Blutend. Unbewaffnet: 1W6 TP.",
            "11-20": "Schwerer Eigentreffer: Voller Waffenschaden + Status Blutend + alle Handlungen -2 bis Ende nächster KR."
        }
    };
    
    // ========================================
    // HIT ZONE TABLES (Trefferzonen)
    // ========================================
    
    // Humanoid hit zones by size (1W20)
    const HUMANOID_ZONES = {
        klein: {
            ranges: [
                { min: 1, max: 6, zone: "Kopf" },
                { min: 7, max: 10, zone: "Torso" },
                { min: 11, max: 18, zone: "Arm" },
                { min: 19, max: 20, zone: "Bein" }
            ]
        },
        mittel: {
            ranges: [
                { min: 1, max: 2, zone: "Kopf" },
                { min: 3, max: 12, zone: "Torso" },
                { min: 13, max: 16, zone: "Arm" },
                { min: 17, max: 20, zone: "Bein" }
            ]
        },
        gross: {
            ranges: [
                { min: 1, max: 2, zone: "Kopf" },
                { min: 3, max: 6, zone: "Torso" },
                { min: 7, max: 16, zone: "Arm" },
                { min: 17, max: 20, zone: "Bein" }
            ]
        }
    };
    
    // Quadruped (vierbeinig) hit zones by size
    const QUADRUPED_ZONES = {
        klein: {
            ranges: [
                { min: 1, max: 4, zone: "Kopf" },
                { min: 5, max: 12, zone: "Torso" },
                { min: 13, max: 16, zone: "Vorderbein" },
                { min: 17, max: 20, zone: "Hinterbein" }
            ]
        },
        mittel: {
            ranges: [
                { min: 1, max: 4, zone: "Kopf" },
                { min: 5, max: 10, zone: "Torso" },
                { min: 11, max: 16, zone: "Vorderbein" },
                { min: 17, max: 20, zone: "Hinterbein" }
            ]
        },
        gross: {
            ranges: [
                { min: 1, max: 5, zone: "Kopf" },
                { min: 6, max: 11, zone: "Torso" },
                { min: 12, max: 16, zone: "Vorderbein" },
                { min: 17, max: 20, zone: "Hinterbein" }
            ]
        }
    };
    
    // Six-limbed with tail
    const SIX_LIMBED_ZONES = {
        gross: {
            ranges: [
                { min: 1, max: 4, zone: "Kopf" },
                { min: 5, max: 12, zone: "Torso" },
                { min: 13, max: 14, zone: "Vordergliedmaßen" },
                { min: 15, max: 16, zone: "Mittlere Gliedmaßen" },
                { min: 17, max: 18, zone: "Hintergliedmaßen" },
                { min: 19, max: 20, zone: "Schwanz" }
            ]
        },
        riesig: {
            ranges: [
                { min: 1, max: 2, zone: "Kopf" },
                { min: 3, max: 10, zone: "Torso" },
                { min: 11, max: 14, zone: "Vordergliedmaßen" },
                { min: 15, max: 16, zone: "Mittlere Gliedmaßen" },
                { min: 17, max: 18, zone: "Hintergliedmaßen" },
                { min: 19, max: 20, zone: "Schwanz" }
            ]
        }
    };
    
    // Tentacled creatures
    const TENTACLE_ZONES = {
        default: {
            ranges: [
                { min: 1, max: 2, zone: "Torso" },
                { min: 3, max: 6, zone: "Kopf" },
                { min: 7, max: 20, zone: "Fangarm" }
            ]
        }
    };
    
    // No distinct zones
    const NO_ZONES = {
        default: {
            ranges: [
                { min: 1, max: 20, zone: "Körper" }
            ]
        }
    };
    
    // ========================================
    // SCHLIMME VERLETZUNGEN (Severe Injuries)
    // ========================================
    
    // Head injuries (1W6) - All Extrem = death
    const KOPF_INJURIES = {
        1: { 
            name: "Nase", 
            desc: "Treffer gegen die Nase. Desorientiert (–2 AT bis Ende nächster KR).",
            effect: { at_mod: -2, kr: 2 },
            extrem: { desc: "Nase abgetrennt - tödlicher Blutverlust!", death: true }
        },
        2: { 
            name: "Ohr", 
            desc: "Treffer gegen das Ohr. Orientierungsverlust (1 Stufe Verwirrung für 5 Minuten).",
            effect: { condition: "Verwirrung", level: 1, duration: "5 Minuten" },
            extrem: { desc: "Schädel am Ohr eingeschlagen - Hirntrauma!", death: true }
        },
        3: { 
            name: "Auge", 
            desc: "Schlag gegen ein Auge. Üble Schmerzen (2 Stufen Schmerz für 5 Minuten).",
            effect: { condition: "Schmerz", level: 2, duration: "5 Minuten" },
            extrem: { desc: "Auge durchbohrt ins Gehirn!", death: true }
        },
        4: { 
            name: "Wange", 
            desc: "Schmerzhafter Treffer gegen die Wange (1 Stufe Schmerz für 5 Minuten).",
            effect: { condition: "Schmerz", level: 1, duration: "5 Minuten" },
            extrem: { desc: "Kieferknochen zertrümmert - tödlicher Schock!", death: true }
        },
        5: { 
            name: "Stirn", 
            desc: "Schlag gegen die Stirn. Kurzer Aussetzer (–1 VW bis Ende nächster KR).",
            effect: { vw_mod: -1, kr: 2 },
            extrem: { desc: "Schädel eingeschlagen - sofortiger Tod!", death: true }
        },
        6: { 
            name: "Hinterkopf", 
            desc: "Treffer am Hinterkopf. Stark desorientiert (1 Stufe Betäubung für 5 Minuten).",
            effect: { condition: "Betäubung", level: 1, duration: "5 Minuten" },
            extrem: { desc: "Hinterkopf zertrümmert - Hirntrauma!", death: true }
        }
    };
    
    // Torso injuries (1W6) - All Extrem = death (requires 3 Schlimme first)
    const TORSO_INJURIES = {
        1: { 
            name: "Rippe", 
            desc: "Treffer gegen die Rippe. Luft geraubt (+1W3 SP).",
            effect: { extraDamage: "1W3" },
            extrem: { desc: "Rippen durchbohren Herz/Lunge!", death: true }
        },
        2: { 
            name: "Bauch", 
            desc: "Verletzung am Bauch (+1W6 SP).",
            effect: { extraDamage: "1W6" },
            extrem: { desc: "Bauch aufgeschlitzt - Eingeweide quellen hervor!", death: true }
        },
        3: { 
            name: "Brust", 
            desc: "Verletzung an der Brust. Atem geraubt (+1W3 SP).",
            effect: { extraDamage: "1W3" },
            extrem: { desc: "Brustkorb eingeschlagen - innere Organe zerstört!", death: true }
        },
        4: { 
            name: "Schulter", 
            desc: "Schultertreffer. Kurze Bewegungseinschränkung (–1 VW bis Ende nächster KR).",
            effect: { vw_mod: -1, kr: 2 },
            extrem: { desc: "Schlüsselbein durchbohrt Halsschlagader!", death: true }
        },
        5: { 
            name: "Rücken", 
            desc: "Treffer am Rücken. Schmerzhaft (+1W3 SP).",
            effect: { extraDamage: "1W3" },
            extrem: { desc: "Wirbelsäule durchtrennt!", death: true }
        },
        6: { 
            name: "Genitaltreffer", 
            desc: "Genitaltreffer! Unglaublich schmerzhaft (1 Stufe Schmerz für 5 Minuten).",
            effect: { condition: "Schmerz", level: 1, duration: "5 Minuten" },
            extrem: { desc: "Massive Blutung aus Oberschenkelarterie!", death: true }
        }
    };
    
    // Arm injuries (1W6) - Extrem = limb lost/unusable
    const ARM_INJURIES = {
        1: { 
            name: "Oberarm", 
            desc: "Treffer gegen den Oberarm. Arm leicht gelähmt (–2 AT bis Ende nächster KR).",
            effect: { at_mod: -2, kr: 2 },
            extrem: { desc: "Oberarm abgetrennt!", death: false }
        },
        2: { 
            name: "Unterarm", 
            desc: "Treffer am Unterarm. Eingeschränkte Bewegung (–1 PA bis Ende nächster KR).",
            effect: { pa_mod: -1, kr: 2 },
            extrem: { desc: "Unterarm abgetrennt!", death: false }
        },
        3: { 
            name: "Ellbogen", 
            desc: "Treffer am Ellbogen. Schmerzen (–1 AT bis Ende nächster KR).",
            effect: { at_mod: -1, kr: 2 },
            extrem: { desc: "Ellbogen zertrümmert - Arm unbrauchbar!", death: false }
        },
        4: { 
            name: "Hand", 
            desc: "Handtreffer! Held lässt gehaltenen Gegenstand fallen.",
            effect: { status: "Gegenstand fallen gelassen" },
            extrem: { desc: "Hand abgetrennt!", death: false }
        },
        5: { 
            name: "Finger", 
            desc: "Fingertreffer. Waffe schwer zu kontrollieren (–1 AT bis Ende nächster KR).",
            effect: { at_mod: -1, kr: 2 },
            extrem: { desc: "Mehrere Finger abgetrennt!", death: false }
        },
        6: { 
            name: "Handgelenk", 
            desc: "Schlag gegen das Handgelenk. Held lässt gehaltenen Gegenstand los.",
            effect: { status: "Gegenstand fallen gelassen" },
            extrem: { desc: "Schulter zertrümmert - Arm unbrauchbar!", death: false }
        }
    };
    
    // Leg injuries (1W6) - Extrem = limb lost/unusable
    const BEIN_INJURIES = {
        1: { 
            name: "Oberschenkel", 
            desc: "Treffer gegen den Oberschenkel. Bewegungsschwierigkeiten (–2 AT bis Ende nächster KR).",
            effect: { at_mod: -2, kr: 2 },
            extrem: { desc: "Oberschenkel abgetrennt!", death: false }
        },
        2: { 
            name: "Unterschenkel", 
            desc: "Treffer am Unterschenkel. Bewegung eingeschränkt (–1 PA bis Ende nächster KR).",
            effect: { pa_mod: -1, kr: 2 },
            extrem: { desc: "Unterschenkel abgetrennt!", death: false }
        },
        3: { 
            name: "Knie", 
            desc: "Knietreffer! Schmerzhaft, Beweglichkeit eingeschränkt (–1 AT bis Ende nächster KR).",
            effect: { at_mod: -1, kr: 2 },
            extrem: { desc: "Knie zertrümmert - Bein unbrauchbar!", death: false }
        },
        4: { 
            name: "Fuß", 
            desc: "Treffer gegen den Fuß. Status Liegend.",
            effect: { status: "Liegend" },
            extrem: { desc: "Fuß abgetrennt!", death: false }
        },
        5: { 
            name: "Zeh", 
            desc: "Treffer gegen den Zeh. Schmerzhaft (–1 AT bis Ende nächster KR).",
            effect: { at_mod: -1, kr: 2 },
            extrem: { desc: "Mehrere Zehen abgetrennt!", death: false }
        },
        6: { 
            name: "Ferse", 
            desc: "Fersensehnenverletzung! Status Liegend (für 24 Stunden).",
            effect: { status: "Liegend", duration: "24 Stunden" },
            extrem: { desc: "Hüfte zertrümmert - Bein unbrauchbar!", death: false }
        }
    };
    
    // Generic injuries for non-standard zones
    const GENERIC_INJURIES = {
        1: { name: "Leichte Verletzung", desc: "Leichte Verletzung an dieser Stelle.", effect: {} },
        2: { name: "Prellung", desc: "Schmerzhafte Prellung (+1W3 SP).", effect: { extraDamage: "1W3" } },
        3: { name: "Schnitt", desc: "Blutender Schnitt (+1W3 SP).", effect: { extraDamage: "1W3" } },
        4: { name: "Quetschung", desc: "Quetschung (–1 AT bis Ende nächster KR).", effect: { at_mod: -1, kr: 2 } },
        5: { name: "Treffer", desc: "Schmerzhafter Treffer (+1W3 SP).", effect: { extraDamage: "1W3" } },
        6: { name: "Schwere Verletzung", desc: "Schwere Verletzung (+1W6 SP).", effect: { extraDamage: "1W6" } }
    };
    
    // Map zone categories to injury tables
    const ZONE_INJURY_MAP = {
        "Kopf": KOPF_INJURIES,
        "Torso": TORSO_INJURIES,
        "Arm": ARM_INJURIES,
        "Bein": BEIN_INJURIES,
        "Vorderbein": BEIN_INJURIES,
        "Hinterbein": BEIN_INJURIES,
        "Vordergliedmaßen": ARM_INJURIES,
        "Mittlere Gliedmaßen": ARM_INJURIES,
        "Hintergliedmaßen": BEIN_INJURIES,
        "Schwanz": GENERIC_INJURIES,
        "Fangarm": ARM_INJURIES,
        "Körper": TORSO_INJURIES
    };
    
    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    const roll1d20 = () => Math.floor(Math.random() * 20) + 1;
    
    const roll2d6 = () => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        return { total: d1 + d2, rolls: [d1, d2] };
    };
    
    const roll1d6 = () => Math.floor(Math.random() * 6) + 1;
    const roll1d3 = () => Math.floor(Math.random() * 3) + 1;
    
    // Roll dice from string like "1W6+4" or "2W6"
    const rollDice = (diceStr) => {
        if (!diceStr || diceStr === '-') return 0;
        const str = String(diceStr).toUpperCase();
        const match = str.match(/(\d*)W(\d+)([+-]\d+)?/);
        if (!match) {
            const num = parseInt(str);
            return isNaN(num) ? 0 : num;
        }
        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        let total = modifier;
        const rolls = [];
        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }
        return { total, rolls, formula: diceStr };
    };
    
    const parseStatblock = (content) => {
        const statblockMatch = content.match(/```statblock\s*\n([\s\S]*?)```/);
        if (!statblockMatch) return null;
        
        const yamlContent = statblockMatch[1];
        const data = {};
        
        const lines = yamlContent.split('\n');
        let currentArrayName = null;
        let currentObject = null;
        let inArray = false;
        let inKeyValueSection = false;
        let keyValueSectionName = null;
        
        // Sections that are key-value maps, not arrays
        const keyValueSectionNames = ['kampftechniken'];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for key-value section property (e.g., " bögen: 12")
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
            
            const arrayMatch = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*$/);
            if (arrayMatch) {
                // Check if this is a key-value section
                if (keyValueSectionNames.includes(arrayMatch[1])) {
                    inKeyValueSection = true;
                    keyValueSectionName = arrayMatch[1];
                    inArray = false;
                    if (currentArrayName && currentObject) {
                        if (!data[currentArrayName]) data[currentArrayName] = [];
                        data[currentArrayName].push(currentObject);
                    }
                    currentArrayName = null;
                    currentObject = null;
                    continue;
                }
                
                inKeyValueSection = false;
                keyValueSectionName = null;
                if (currentArrayName && currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                }
                currentArrayName = arrayMatch[1];
                currentObject = null;
                inArray = false;
                continue;
            }
            
            const match = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.*)$/);
            if (match) {
                inKeyValueSection = false;
                keyValueSectionName = null;
                if (currentArrayName && currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                    currentObject = null;
                }
                currentArrayName = null;
                inArray = false;
                
                const key = match[1];
                let value = match[2].trim().replace(/^"|"$/g, '');
                const num = parseFloat(value);
                const isValidNumber = !isNaN(num) && String(num) === value;
                data[key] = isValidNumber ? num : value;
            }
        }
        
        if (currentArrayName && currentObject) {
            if (!data[currentArrayName]) data[currentArrayName] = [];
            data[currentArrayName].push(currentObject);
        }
        
        return data;
    };
    
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
    
    const getConditionPenalty = (conditions) => {
        if (!conditions || !Array.isArray(conditions)) return 0;
        let total = 0;
        for (const c of conditions) {
            total += parseInt(c.level) || 0;
        }
        return Math.min(total, 5);
    };
    
    // Convert ASCII to umlauts (boegen → bögen)
    const toUmlaut = s => s.replace(/oe/g, 'ö').replace(/ae/g, 'ä').replace(/ue/g, 'ü');
    
    // Calculate PA value with shield doubling
    const calculatePA = (charData, weapon, kampftechniken, isShield = false) => {
        const toNum = v => typeof v === 'number' ? v : (parseInt(v) || 0);
        
        const techName = String(weapon.kampftechnik || '').toLowerCase().replace(/[^a-zäöüß]/g, '');
        let ktw = 6;
        if (kampftechniken) {
            if (techName in kampftechniken) {
                ktw = toNum(kampftechniken[techName]);
            } else {
                for (const key in kampftechniken) {
                    if (toUmlaut(key) === techName) {
                        ktw = toNum(kampftechniken[key]);
                        break;
                    }
                }
            }
        }
        
        const ge = toNum(charData.ge);
        const kk = toNum(charData.kk);
        const geBonus = ge <= 8 ? 0 : Math.floor((ge - 8) / 3);
        const kkBonus = kk <= 8 ? 0 : Math.floor((kk - 8) / 3);
        const attrBonus = Math.max(geBonus, kkBonus);
        
        let paMod = toNum(weapon.pa_mod || 0);
        if (isShield) {
            paMod *= 2; // Double pa_mod for shields
        }
        
        return Math.ceil(ktw / 2) + attrBonus + paMod;
    };
    
    const calculateAW = (charData) => {
        const toNum = v => typeof v === 'number' ? v : (parseInt(v) || 0);
        const ge = toNum(charData.ge);
        const awMod = toNum(charData.aw_mod);
        return Math.floor(ge / 2) + awMod;
    };
    
    // Calculate max LE
    const calculateMaxLE = (charData) => {
        const toNum = v => typeof v === 'number' ? v : (parseInt(v) || 0);
        const bases = {
            'Mensch': 5, 'Elf': 2, 'Halbelf': 5, 'Zwerg': 8
        };
        const species = charData.spezies || 'Mensch';
        const baseLe = bases[species] || 5;
        const ko = toNum(charData.ko);
        const leMod = toNum(charData.le_mod);
        return baseLe + (2 * ko) + leMod;
    };
    
    // Calculate Schmerz durch LeP
    const calculatePainFromLE = (currentLE, maxLE) => {
        if (currentLE <= 0) return 4; // Dying
        if (currentLE <= 5) return 4;
        
        let pain = 0;
        if (currentLE <= maxLE * 0.25) pain = 3;
        else if (currentLE <= maxLE * 0.5) pain = 2;
        else if (currentLE <= maxLE * 0.75) pain = 1;
        
        return pain;
    };
    
    // Get RS from armor
    const getTotalRS = (ruestungen) => {
        if (!ruestungen || !Array.isArray(ruestungen)) return 0;
        let total = 0;
        for (const armor of ruestungen) {
            total += parseInt(armor.rs) || 0;
        }
        return total;
    };
    
    // Get BE from armor
    const getTotalBE = (ruestungen) => {
        if (!ruestungen || !Array.isArray(ruestungen)) return 0;
        let total = 0;
        for (const armor of ruestungen) {
            total += parseInt(armor.be) || 0;
        }
        return total;
    };
    
    // Calculate Wundschwelle (wound threshold)
    const calculateWundschwelle = (ko) => {
        return Math.floor(ko / 2);
    };
    
    // Get creature type and size from character data
    const getCreatureType = async (charData) => {
        // Check for explicit statblock fields first
        if (charData.koerpertyp && charData.groessenkategorie) {
            return {
                type: charData.koerpertyp.toLowerCase(),
                size: charData.groessenkategorie.toLowerCase()
            };
        }
        
        // Check species for defaults
        const species = String(charData.spezies || '').toLowerCase();
        const defaultSpecies = ['mensch', 'elf', 'zwerg', 'halbelf'];
        
        if (defaultSpecies.some(s => species.includes(s))) {
            return { type: 'humanoid', size: 'mittel' };
        }
        
        // If no info available, prompt user
        const typeOptions = [
            "Humanoid (Mensch, Elf, Ork, etc.)",
            "Vierbeinig (Wolf, Pferd, etc.)",
            "Sechsgliedrig mit Schwanz (Drache, Tatzelwurm)",
            "Fangarme (Krakenmolch, etc.)",
            "Keine Zonen (Amöbe, Schleim)"
        ];
        const typeValues = ['humanoid', 'vierbeinig', 'sechsgliedrig', 'fangarme', 'keine_zonen'];
        
        const selectedType = await quickAddApi.suggester(typeOptions, typeValues);
        if (!selectedType) return { type: 'humanoid', size: 'mittel' };
        
        // Prompt for size
        const sizeOptions = ["Klein", "Mittel", "Groß", "Riesig"];
        const sizeValues = ['klein', 'mittel', 'gross', 'riesig'];
        
        const selectedSize = await quickAddApi.suggester(sizeOptions, sizeValues);
        if (!selectedSize) return { type: selectedType, size: 'mittel' };
        
        return { type: selectedType, size: selectedSize };
    };
    
    // Determine hit zone from roll based on creature type and size
    const determineHitZone = (roll, creatureType) => {
        let zoneTable;
        
        switch (creatureType.type) {
            case 'humanoid':
                zoneTable = HUMANOID_ZONES[creatureType.size] || HUMANOID_ZONES.mittel;
                break;
            case 'vierbeinig':
                zoneTable = QUADRUPED_ZONES[creatureType.size] || QUADRUPED_ZONES.mittel;
                break;
            case 'sechsgliedrig':
                zoneTable = SIX_LIMBED_ZONES[creatureType.size] || SIX_LIMBED_ZONES.gross;
                break;
            case 'fangarme':
                zoneTable = TENTACLE_ZONES.default;
                break;
            case 'keine_zonen':
                zoneTable = NO_ZONES.default;
                break;
            default:
                zoneTable = HUMANOID_ZONES.mittel;
        }
        
        // Find the matching zone
        for (const range of zoneTable.ranges) {
            if (roll >= range.min && roll <= range.max) {
                let zone = range.zone;
                
                // For arms/legs, determine left/right (even = right, odd = left)
                if (zone === "Arm" || zone === "Bein") {
                    const side = roll % 2 === 0 ? "rechter" : "linker";
                    zone = `${side} ${zone}`;
                }
                if (zone === "Vorderbein" || zone === "Hinterbein") {
                    const side = roll % 2 === 0 ? "rechtes" : "linkes";
                    zone = `${side} ${zone}`;
                }
                
                return zone;
            }
        }
        
        return "Torso"; // Fallback
    };
    
    // Get base zone category (for injury table lookup)
    const getBaseZone = (zone) => {
        const cleanZone = zone.replace(/^(rechter|linker|rechtes|linkes)\s+/i, '');
        return cleanZone;
    };
    
    // Get injury for a zone from 1W6 roll
    const getInjuryForZone = (zone, roll) => {
        const baseZone = getBaseZone(zone);
        const injuryTable = ZONE_INJURY_MAP[baseZone] || GENERIC_INJURIES;
        return injuryTable[roll] || GENERIC_INJURIES[roll];
    };
    
    const rollFumble = (isDodgeOrUnarmed) => {
        const category2d6 = roll2d6();
        let categoryResult = category2d6.total;
        
        // If dodging/unarmed and result is 2-6, add 5
        if (isDodgeOrUnarmed && categoryResult >= 2 && categoryResult <= 6) {
            categoryResult = Math.min(categoryResult + 5, 12);
        }
        
        const category = FUMBLE_CATEGORIES[categoryResult];
        const detail1d20 = roll1d20();
        
        const details = FUMBLE_DETAILS[category.key];
        let detailText = "Unbekanntes Ergebnis";
        
        for (const range in details) {
            const [min, max] = range.split('-').map(n => parseInt(n));
            if (detail1d20 >= min && detail1d20 <= (max || min)) {
                detailText = details[range];
                break;
            }
        }
        
        return {
            categoryRoll: category2d6,
            originalResult: category2d6.total,
            adjustedResult: categoryResult,
            wasAdjusted: isDodgeOrUnarmed && category2d6.total >= 2 && category2d6.total <= 6,
            category: category.name,
            detailRoll: detail1d20,
            detail: detailText,
            needsReroll: detailText.includes("Nochmal würfeln")
        };
    };
    
    // Parse effects block from encounter content
    const parseEffectsBlock = (content) => {
        const effectsMatch = content.match(/```effects\n([\s\S]*?)```/);
        if (!effectsMatch) return {};
        
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
    
    // Get effect modifiers for a character
    const getEffectModifiers = (effectsData, charName) => {
        const effects = effectsData[charName] || [];
        const mods = {
            at_mod: 0, pa_mod: 0, aw_mod: 0, fk_mod: 0, gs: 0,
            schmerz: 0, betaeubung: 0, furcht: 0, paralyse: 0, verwirrung: 0
        };
        
        for (const effect of effects) {
            if (effect.at_mod) mods.at_mod += effect.at_mod;
            if (effect.pa_mod) mods.pa_mod += effect.pa_mod;
            if (effect.aw_mod) mods.aw_mod += effect.aw_mod;
            if (effect.fk_mod) mods.fk_mod += effect.fk_mod;
            if (effect.gs) mods.gs += effect.gs;
            if (effect.schmerz) mods.schmerz += effect.schmerz;
            if (effect.betaeubung) mods.betaeubung += effect.betaeubung;
            if (effect.furcht) mods.furcht += effect.furcht;
            if (effect.paralyse) mods.paralyse += effect.paralyse;
            if (effect.verwirrung) mods.verwirrung += effect.verwirrung;
        }
        
        return mods;
    };
    
    // Update statblock value in file content
    const updateStatblockValue = (content, key, newValue) => {
        const regex = new RegExp(`^(${key}:)\\s*.*$`, 'm');
        if (content.match(regex)) {
            return content.replace(regex, `$1 ${newValue}`);
        }
        return content;
    };
    
    // Update condition level in file content
    const updateConditionLevel = (content, conditionName, newLevel) => {
        const regex = new RegExp(`(-\\s*name:\\s*${conditionName}\\s*\\n\\s*level:)\\s*\\d+`, 'i');
        if (content.match(regex)) {
            return content.replace(regex, `$1 ${newLevel}`);
        }
        return content;
    };
    
    // Update condition table in encounter file
    const updateEncounterConditionTable = (encounterContent, charName, conditionName, newLevel, note = '') => {
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const charSectionRegex = new RegExp(`(### ${escapedName}\\n[\\s\\S]*?\\| ${conditionName}\\s*\\|)[^|]*\\|[^|]*\\|`, 'i');
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
        
        const charSectionRegex = new RegExp(
            `(### ${escapedName}\\n[\\s\\S]*?\\| Verwirrung[^|]*\\|[^|]*\\|[^\\n]*\\n)(\\n?(?:> ⚠️ \\*\\*Handlungsunfähig\\*\\* \\(Schmerz Stufe IV\\)\\n)?)(\\n?---)?`,
            'i'
        );
        
        const match = encounterContent.match(charSectionRegex);
        if (match) {
            const beforeWarning = match[1];
            const separator = match[3] || '---';
            
            if (newPainLevel >= 4) {
                return encounterContent.replace(charSectionRegex, `${beforeWarning}\n${warningLine}\n\n${separator}`);
            } else {
                return encounterContent.replace(charSectionRegex, `${beforeWarning}\n${separator}`);
            }
        }
        return encounterContent;
    };
    
    // Update LE and GS in the character's stats table in the encounter file
    const updateEncounterStatsTable = (encounterContent, charName, newLE, maxLE, gsDisplay) => {
        // Find the character section and their stats table
        // Format varies: | LE | [AE |] [KE |] SK | ZK | GS | INI | WS | AW |
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Match the character section with header, separator, and values rows
        const charSectionRegex = new RegExp(
            `(### ${escapedName}\\s*\\n\\n)(\\|[^\\n]+\\|)\\s*\\n(\\|[^\\n]+\\|)\\s*\\n(\\|[^\\n]+\\|)`,
            'i'
        );
        
        const match = encounterContent.match(charSectionRegex);
        if (!match) return encounterContent;
        
        const prefix = match[1];
        const headerRow = match[2];
        const separatorRow = match[3];
        const valuesRow = match[4];
        
        // Parse headers to find column indices
        const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
        const values = valuesRow.split('|').map(v => v.trim()).filter(v => v);
        
        // Find indices for LE and GS columns
        const leIndex = headers.findIndex(h => h.toUpperCase() === 'LE');
        const gsIndex = headers.findIndex(h => h.toUpperCase() === 'GS');
        
        if (leIndex === -1) return encounterContent;
        
        // Update values
        values[leIndex] = `${newLE}/${maxLE}`;
        if (gsIndex !== -1) {
            values[gsIndex] = gsDisplay;
        }
        
        // Rebuild the values row with proper spacing
        const newValuesRow = '| ' + values.join(' | ') + ' |';
        
        return encounterContent.replace(
            charSectionRegex,
            `${prefix}${headerRow}\n${separatorRow}\n${newValuesRow}`
        );
    };
    
    // Update the Lebensenergiezonen table for a character
    const updateEncounterZoneTable = (encounterContent, charName, zoneName, newLeP, schlimmeCount, status) => {
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedZone = zoneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Find the zone row within the character's section
        // Format: | Zone | LeP | Max | Schlimme Verl. | Status |
        //         | Kopf | 6 | 6 | 0 | OK |
        // Use negative lookahead to stop at next character section (###)
        // Add \\s*\\n after name to match complete header line (prevent "Test" matching "Test 1")
        const zoneRowRegex = new RegExp(
            `(### ${escapedName}\\s*\\n(?:(?!###)[\\s\\S])*?\\| ${escapedZone} \\|)([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|`,
            'i'
        );
        
        const match = encounterContent.match(zoneRowRegex);
        if (!match) return encounterContent;
        
        const maxLeP = match[3].trim(); // Keep max unchanged
        
        return encounterContent.replace(
            zoneRowRegex,
            `$1 ${newLeP} | ${maxLeP} | ${schlimmeCount} | ${status} |`
        );
    };
    
    // Parse current zone values from encounter content
    const parseZoneValues = (encounterContent, charName, zoneName) => {
        const escapedName = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedZone = zoneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Use negative lookahead to stop at next character section (###)
        // Add \\s*\\n after name to match complete header line (prevent "Test" matching "Test 1")
        const zoneRowRegex = new RegExp(
            `### ${escapedName}\\s*\\n(?:(?!###)[\\s\\S])*?\\| ${escapedZone} \\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|`,
            'i'
        );
        
        const match = encounterContent.match(zoneRowRegex);
        if (!match) return null;
        
        return {
            currentLeP: parseInt(match[1].trim()) || 0,
            maxLeP: parseInt(match[2].trim()) || 0,
            schlimmeCount: parseInt(match[3].trim()) || 0,
            status: match[4].trim()
        };
    };
    
    // Normalize hit zone name to match table format (capitalize first letters)
    const normalizeZoneName = (hitZone) => {
        // Map hit zone names to table zone names
        const zoneMap = {
            'kopf': 'Kopf',
            'torso': 'Torso',
            'linker arm': 'Linker Arm',
            'rechter arm': 'Rechter Arm',
            'linkes bein': 'Linkes Bein',
            'rechtes bein': 'Rechtes Bein'
        };
        return zoneMap[hitZone.toLowerCase()] || hitZone;
    };
    
    // Serialize effects back to block format
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
    
    // Add effect to encounter file
    const addEffectToEncounter = async (content, charName, effect) => {
        const effectsData = parseEffectsBlock(content);
        
        if (!effectsData[charName]) {
            effectsData[charName] = [];
        }
        effectsData[charName].push(effect);
        
        const newEffectsContent = serializeEffectsBlock(effectsData);
        return content.replace(
            /```effects\n[\s\S]*?```/,
            '```effects\n' + newEffectsContent + '```'
        );
    };
    
    // ========================================
    // MAIN SCRIPT
    // ========================================
    
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice("Keine aktive Datei! Bitte Encounter-Datei öffnen.");
        return;
    }
    
    const folderPath = activeFile.parent?.path || '';
    const encounterFiles = getFilesInFolder(folderPath);
    
    // Load all character data
    const characters = [];
    for (const file of encounterFiles) {
        if (file.path === activeFile.path) continue;
        
        const content = await app.vault.read(file);
        const statblock = parseStatblock(content);
        if (statblock && statblock.name) {
            characters.push({
                file: file,
                content: content,
                data: statblock,
                name: statblock.name
            });
        }
    }
    
    if (characters.length === 0) {
        new Notice("Keine Charaktere im Encounter-Ordner gefunden!");
        return;
    }
    
    // Parse effects from encounter file
    let encounterContent = await app.vault.read(activeFile);
    const effectsData = parseEffectsBlock(encounterContent);
    
    // Step 1: Select defender
    const defenderNames = characters.map(c => c.name);
    const defenderName = await quickAddApi.suggester(defenderNames, defenderNames);
    if (!defenderName) return;
    
    const defender = characters.find(c => c.name === defenderName);
    
    // Step 2: Select attack type (melee or ranged)
    const attackTypeOptions = [
        "⚔️ Nahkampfangriff",
        "🏹 Fernkampfangriff (Schusswaffe) - VW -4",
        "🎯 Fernkampfangriff (Wurfwaffe) - VW -2"
    ];
    const attackTypeValues = [
        { type: 'melee', penalty: 0 },
        { type: 'ranged_shot', penalty: 4 },
        { type: 'ranged_throw', penalty: 2 }
    ];
    const attackType = await quickAddApi.suggester(attackTypeOptions, attackTypeValues);
    if (!attackType) return;
    
    const isRanged = attackType.type !== 'melee';
    const rangedPenalty = attackType.penalty;
    
    // Step 3: Select defense type
    const defenderWeapons = defender.data.nahkampfwaffen || [];
    
    // Find shields in nahkampfwaffen (kampftechnik "Schilde")
    const defenderShields = defenderWeapons.filter(w => {
        const tech = String(w.kampftechnik || '').toLowerCase();
        return tech === 'schilde';
    });
    // Non-shield weapons
    const defenderNonShieldWeapons = defenderWeapons.filter(w => {
        const tech = String(w.kampftechnik || '').toLowerCase();
        return tech !== 'schilde';
    });
    
    const hasWeapon = defenderNonShieldWeapons.length > 0;
    const hasShield = defenderShields.length > 0;
    
    const defenseOptions = [];
    const defenseValues = [];
    
    // For ranged attacks: only shield parry or dodge allowed
    if (isRanged) {
        if (hasShield) {
            for (const shield of defenderShields) {
                const shieldPA = calculatePA(defender.data, shield, defender.data.kampftechniken, true);
                defenseOptions.push(`🛡️ Schild-Parade mit ${shield.name} (PA: ${shieldPA})`);
                defenseValues.push({ type: 'PA', value: shieldPA, weapon: shield, isUnarmed: false, isShield: true });
            }
        }
    } else {
        // Melee: weapon parry allowed
        if (hasWeapon) {
            for (const weapon of defenderNonShieldWeapons) {
                const paValue = calculatePA(defender.data, weapon, defender.data.kampftechniken, false);
                defenseOptions.push(`🗡️ Parade mit ${weapon.name} (PA: ${paValue})`);
                defenseValues.push({ type: 'PA', value: paValue, weapon: weapon, isUnarmed: false, isShield: false });
            }
        }
        if (hasShield) {
            for (const shield of defenderShields) {
                const shieldPA = calculatePA(defender.data, shield, defender.data.kampftechniken, true);
                defenseOptions.push(`🛡️ Schild-Parade mit ${shield.name} (PA: ${shieldPA})`);
                defenseValues.push({ type: 'PA', value: shieldPA, weapon: shield, isUnarmed: false, isShield: true });
            }
        }
    }
    
    const awValue = calculateAW(defender.data);
    defenseOptions.push(`🏃 Ausweichen (AW: ${awValue})`);
    defenseValues.push({ type: 'AW', value: awValue, weapon: null, isUnarmed: true, isShield: false });
    
    const defenseChoice = await quickAddApi.suggester(defenseOptions, defenseValues);
    if (!defenseChoice) return;
    
    const defenseType = defenseChoice.type;
    let defenseValue = defenseChoice.value;
    const defenseWeapon = defenseChoice.weapon;
    const isUnarmed = defenseChoice.isUnarmed;
    const isShield = defenseChoice.isShield;
    
    // Step 4: Defense count this round
    const defCountStr = await quickAddApi.inputPrompt(
        "Wievielte Verteidigung diese Runde? (1 = erste, 2 = zweite, etc.)",
        "1"
    );
    const defenseCount = parseInt(defCountStr) || 1;
    
    // Step 5: Is defense halved? (e.g., from critical attack)
    const isHalved = await quickAddApi.suggester(
        ["Nein, normale Verteidigung", "Ja, halbiert (z.B. kritischer Angriff)"],
        [false, true]
    );
    
    // Step 5b: Vorteilhafte Position
    const advantageOptions = [
        "⚖️ Normale Position",
        "⬆️ Vorteilhafte Position (+2 VW)"
    ];
    const advantageValues = [0, 2];
    const advantageChoice = await quickAddApi.suggester(advantageOptions, advantageValues);
    const advantageBonus = advantageChoice || 0;
    
    // Step 6: Calculate modifiers
    const conditionPenalty = getConditionPenalty(defender.data.conditions);
    const defensePenalty = (defenseCount - 1) * 3;
    
    // Get effect modifiers
    const defenderEffects = getEffectModifiers(effectsData, defenderName);
    
    // Add temporary condition levels from effects to penalty (max 5 total)
    const effectConditions = defenderEffects.schmerz + defenderEffects.betaeubung + 
        defenderEffects.furcht + defenderEffects.paralyse + defenderEffects.verwirrung;
    
    // Get BE from armor
    const defenderBE = getTotalBE(defender.data.ruestungen);
    const totalConditionPenalty = Math.min(5, conditionPenalty + effectConditions + defenderBE);
    
    // Get effect defense modifier
    const effectDefenseMod = defenseType === 'AW' ? defenderEffects.aw_mod : defenderEffects.pa_mod;
    
    // Step 7: Additional modifiers
    const extraModStr = await quickAddApi.inputPrompt(
        `Zusätzliche Modifikatoren für ${defenderName}? (z.B. -2 für Dunkelheit)`,
        "0"
    );
    const extraMod = parseInt(extraModStr) || 0;
    
    // Calculate final defense value (include ranged penalty and effect modifiers)
    let finalDefense = defenseValue + effectDefenseMod + advantageBonus - totalConditionPenalty - defensePenalty - rangedPenalty + extraMod;
    if (isHalved) {
        finalDefense = Math.floor(finalDefense / 2);
    }
    
    // ========================================
    // DEFENSE RESOLUTION
    // ========================================
    
    const attackTypeLabel = isRanged 
        ? (attackType.type === 'ranged_shot' ? 'Schusswaffe' : 'Wurfwaffe')
        : 'Nahkampf';
    let logEntry = `\n### 🛡️ Verteidigung: ${defenderName} (gegen ${attackTypeLabel})\n\n`;
    
    // Build defense label with weapon/Kampftechnik info
    let defenseLabel = defenseType;
    if (defenseType === 'PA' && defenseWeapon) {
        const kt = defenseWeapon.kampftechnik || 'Unbekannt';
        defenseLabel = `PA mit ${defenseWeapon.name}, KT: ${kt}`;
    } else if (defenseType === 'AW') {
        defenseLabel = 'Ausweichen';
    }
    
    // Log modifiers
    logEntry += `**${defenseLabel}:** Basis ${defenseValue}`;
    if (effectDefenseMod !== 0) logEntry += ` ${effectDefenseMod > 0 ? '+' : ''}${effectDefenseMod} (Effekte)`;
    if (advantageBonus > 0) logEntry += ` +${advantageBonus} (Vorteil)`;
    if (rangedPenalty > 0) logEntry += ` - ${rangedPenalty} (${attackTypeLabel})`;
    if (totalConditionPenalty > 0) {
        let conditionDetails = [];
        if (conditionPenalty > 0) conditionDetails.push(`Zustände ${conditionPenalty}`);
        if (effectConditions > 0) conditionDetails.push(`Effekte ${effectConditions}`);
        if (defenderBE > 0) conditionDetails.push(`BE ${defenderBE}`);
        logEntry += ` - ${totalConditionPenalty} (${conditionDetails.join('+')})`;
    }
    if (defensePenalty > 0) logEntry += ` - ${defensePenalty} (${defenseCount}. VW)`;
    if (extraMod !== 0) logEntry += ` ${extraMod > 0 ? '+' : ''}${extraMod} (Zusatz)`;
    if (isHalved) logEntry += ` ÷2 (halbiert)`;
    logEntry += ` = **${finalDefense}**\n\n`;
    
    // Roll defense
    const defenseRoll = roll1d20();
    logEntry += `**Wurf:** 🎲 ${defenseRoll} gegen ${defenseType} ${finalDefense}\n`;
    
    let defenseResult = "Fehlgeschlagen";
    let isCrit = false;
    let isFumble = false;
    let defenseSuccessful = false;
    
    // Check for crit or fumble
    if (defenseRoll === 1) {
        // Potential critical defense
        const confirmRoll = roll1d20();
        logEntry += `**Kritische Verteidigung! Bestätigung:** 🎲 ${confirmRoll} gegen ${finalDefense}\n`;
        
        if (confirmRoll <= finalDefense) {
            isCrit = true;
            defenseSuccessful = true;
            if (isRanged) {
                defenseResult = "Kritische Verteidigung (bestätigt) - Nächste VW nicht um 3 erschwert!";
            } else {
                defenseResult = "Kritische Verteidigung (bestätigt) - Passierschlag möglich!";
            }
        } else {
            defenseSuccessful = true;
            if (isRanged) {
                defenseResult = "Erfolgreich (Kritisch unbestätigt) - Nächste VW nur um 2 erschwert.";
            } else {
                defenseResult = "Erfolgreich (Kritisch unbestätigt)";
            }
        }
    } else if (defenseRoll === 20) {
        // Potential fumble
        const confirmRoll = roll1d20();
        logEntry += `**Patzer! Bestätigung:** 🎲 ${confirmRoll} gegen ${finalDefense}\n`;
        
        if (confirmRoll > finalDefense) {
            isFumble = true;
            defenseSuccessful = false;
            defenseResult = "Patzer (bestätigt)";
            
            // Roll fumble tables (add 5 to result if dodging/unarmed and result 2-6)
            const useDodgeFumble = isUnarmed || (isRanged && !isShield);
            let fumbleResult = rollFumble(useDodgeFumble);
            while (fumbleResult.needsReroll) {
                fumbleResult = rollFumble(useDodgeFumble);
            }
            
            // Log with adjustment info
            let fumbleRollStr = `${fumbleResult.categoryRoll.rolls.join('+')}=${fumbleResult.originalResult}`;
            if (fumbleResult.wasAdjusted) {
                fumbleRollStr += ` (+5 AW) → ${fumbleResult.adjustedResult}`;
            }
            logEntry += `**Patzer-Kategorie:** ${fumbleRollStr} → ${fumbleResult.category}\n`;
            logEntry += `**Patzer-Detail:** 🎲 ${fumbleResult.detailRoll} → ${fumbleResult.detail}\n`;
        } else {
            defenseSuccessful = false;
            defenseResult = "Fehlgeschlagen (Patzer nicht bestätigt)";
        }
    } else if (defenseRoll <= finalDefense) {
        defenseSuccessful = true;
        defenseResult = "Erfolgreich";
    } else {
        defenseSuccessful = false;
        defenseResult = "Fehlgeschlagen";
    }
    
    logEntry += `**Ergebnis:** ${defenseResult}\n`;
    
    // ========================================
    // DAMAGE PROCESSING (if defense failed)
    // ========================================
    
    let damageDealt = 0;
    let defenderNewLE = parseInt(defender.data.le) || calculateMaxLE(defender.data);
    
    if (!defenseSuccessful) {
        logEntry += `\n--- **Schadensberechnung** ---\n\n`;
        
        // Prompt for TP input
        const tpInputStr = await quickAddApi.inputPrompt(
            "Angreifer TP (gewürfelt inkl. L/S-Bonus)?",
            ""
        );
        
        if (tpInputStr && tpInputStr.trim() !== '') {
            const totalTP = parseInt(tpInputStr) || 0;
            
            // Get defender's creature type for hit zones
            const defenderCreatureType = await getCreatureType(defender.data);
            
            // Determine hit zone
            const zoneMethod = await quickAddApi.suggester(
                [
                    "🎲 Zufall (1W20 würfeln)",
                    "🎯 Kopf (gezielt)",
                    "🎯 Torso (gezielt)",
                    "🎯 Arm (gezielt)",
                    "🎯 Bein (gezielt)"
                ],
                ['random', 'Kopf', 'Torso', 'Arm', 'Bein']
            );
            
            let hitZone;
            let zoneRoll = null;
            
            if (zoneMethod === 'random') {
                zoneRoll = roll1d20();
                hitZone = determineHitZone(zoneRoll, defenderCreatureType);
                logEntry += `**Trefferzone:** 🎲 ${zoneRoll} → ${hitZone}\n`;
            } else {
                hitZone = zoneMethod;
                // For arms/legs, randomly determine left/right
                if (hitZone === "Arm" || hitZone === "Bein") {
                    const sideRoll = roll1d20();
                    const side = sideRoll % 2 === 0 ? "rechter" : "linker";
                    hitZone = `${side} ${hitZone}`;
                }
                logEntry += `**Trefferzone:** ${hitZone} (gezielt)\n`;
            }
            
            // Get target RS
            const defenderRS = getTotalRS(defender.data.ruestungen);
            
            // Calculate final damage
            damageDealt = Math.max(0, totalTP - defenderRS);
            
            logEntry += `**Schaden:** ${totalTP} TP - ${defenderRS} RS = **${damageDealt} SP**\n`;
            
            // Check Wundschwelle and apply Schlimme Verletzungen
            const defenderKO = parseInt(defender.data.ko) || 10;
            const wundschwelle = calculateWundschwelle(defenderKO);
            let isDeadFromExtrem = false;
            
            if (damageDealt >= wundschwelle) {
                const woundMultiple = Math.floor(damageDealt / wundschwelle);
                logEntry += `**Wundschwelle:** ${wundschwelle} | Schaden: ${damageDealt} SP`;
                if (woundMultiple > 1) logEntry += ` (${woundMultiple}× Schwelle)`;
                logEntry += `\n`;
                
                // Roll for specific injury
                const injuryRoll = roll1d6();
                const baseZone = getBaseZone(hitZone);
                const injury = getInjuryForZone(baseZone, injuryRoll);
                
                // Check for Extrem schlimme Verletzung
                // Get current zone's schlimme count BEFORE this new injury
                const normalizedZoneForExtrem = normalizeZoneName(hitZone);
                const zoneValuesForExtrem = parseZoneValues(encounterContent, defenderName, normalizedZoneForExtrem);
                const currentSchlimme = zoneValuesForExtrem ? zoneValuesForExtrem.schlimmeCount : 0;
                const extremThreshold = baseZone === 'Torso' ? 3 : 1;
                const isExtrem = currentSchlimme >= extremThreshold;
                
                if (isExtrem && injury.extrem) {
                    // EXTREM SCHLIMME VERLETZUNG
                    logEntry += `\n## ⚠️ EXTREM SCHLIMME VERLETZUNG ⚠️\n`;
                    logEntry += `**${injury.name}:** ${injury.extrem.desc}\n`;
                    
                    if (injury.extrem.death) {
                        logEntry += `\n## ☠️ TOD ☠️\n`;
                        logEntry += `**${defenderName}** stirbt an der extrem schlimmen Verletzung!\n`;
                        isDeadFromExtrem = true;
                    }
                } else {
                    // Normal Schlimme Verletzung
                    logEntry += `**Schlimme Verletzung (${hitZone}):** 🎲 ${injuryRoll} → ${injury.name}\n`;
                    logEntry += `**Effekt:** ${injury.desc}\n`;
                    
                    // Apply injury effects
                    if (injury.effect) {
                        // Extra damage
                        if (injury.effect.extraDamage) {
                            let injuryExtraDamage = 0;
                            if (injury.effect.extraDamage === "1W3") {
                                injuryExtraDamage = roll1d3();
                            } else if (injury.effect.extraDamage === "1W6") {
                                injuryExtraDamage = Math.floor(Math.random() * 6) + 1;
                            }
                            logEntry += `> 💥 Zusätzlicher Schaden: +${injuryExtraDamage} SP\n`;
                            damageDealt += injuryExtraDamage;
                        }
                        
                        // Temporary combat modifiers (AT, PA, VW)
                        if (injury.effect.at_mod || injury.effect.pa_mod || injury.effect.vw_mod) {
                            const injuryEffect = {
                                name: `Verletzung: ${injury.name}`,
                                kr: injury.effect.kr || 2
                            };
                            if (injury.effect.at_mod) injuryEffect.at_mod = injury.effect.at_mod;
                            if (injury.effect.pa_mod) injuryEffect.pa_mod = injury.effect.pa_mod;
                            if (injury.effect.vw_mod) {
                                injuryEffect.pa_mod = (injuryEffect.pa_mod || 0) + injury.effect.vw_mod;
                                injuryEffect.aw_mod = injury.effect.vw_mod;
                            }
                            encounterContent = await addEffectToEncounter(encounterContent, defenderName, injuryEffect);
                            
                            let modStr = [];
                            if (injury.effect.at_mod) modStr.push(`AT ${injury.effect.at_mod}`);
                            if (injury.effect.pa_mod) modStr.push(`PA ${injury.effect.pa_mod}`);
                            if (injury.effect.vw_mod) modStr.push(`VW ${injury.effect.vw_mod}`);
                            logEntry += `> ⚡ **${defenderName}** erhält ${modStr.join(', ')} für ${injury.effect.kr} KR\n`;
                        }
                        
                        // Conditions (Schmerz, Betäubung, Verwirrung)
                        if (injury.effect.condition) {
                            const condEffect = {
                                name: `Verletzung: ${injury.name}`,
                                [injury.effect.condition.toLowerCase()]: injury.effect.level,
                                kr: 999 // Long duration, marked with note
                            };
                            encounterContent = await addEffectToEncounter(encounterContent, defenderName, condEffect);
                            logEntry += `> ⚡ **${defenderName}** erhält ${injury.effect.level} Stufe(n) ${injury.effect.condition} (${injury.effect.duration})\n`;
                        }
                        
                        // Status effects (Liegend, Gegenstand fallen gelassen)
                        if (injury.effect.status) {
                            logEntry += `> ⚠️ **${defenderName}** erhält Status: **${injury.effect.status}**`;
                            if (injury.effect.duration) logEntry += ` (${injury.effect.duration})`;
                            logEntry += `\n`;
                        }
                    }
                }
            }
            
            // Update defender LE
            const currentLE = parseInt(defender.data.le) || calculateMaxLE(defender.data);
            defenderNewLE = currentLE - damageDealt;
            const maxLE = calculateMaxLE(defender.data);
            
            logEntry += `**LE:** ${currentLE} → ${defenderNewLE}/${maxLE}\n`;
            
            // Check for pain from LE
            const oldPain = calculatePainFromLE(currentLE, maxLE);
            const newPain = calculatePainFromLE(defenderNewLE, maxLE);
            
            if (newPain > oldPain) {
                logEntry += `**Schmerz durch LeP:** +${newPain - oldPain} Stufe(n) → Stufe ${newPain}\n`;
                // GS penalty from pain
                const baseGS = parseInt(defender.data.gs) || 8;
                const effectiveGS = Math.max(0, baseGS - newPain);
                logEntry += `**GS:** ${baseGS} → ${effectiveGS} (−${newPain} durch Schmerz)\n`;
            }
            
            // Death check
            if (defenderNewLE <= 0) {
                logEntry += `\n## 💀 ${defenderName} IST TOT!\n`;
                logEntry += `> Lebensenergie auf 0 gefallen.\n`;
                new Notice(`💀 ${defenderName} ist gestorben! (LE auf 0)`);
            } else if (newPain >= 4) {
                logEntry += `**⚠️ ${defenderName} ist handlungsunfähig! (Schmerz Stufe IV)**\n`;
            }
            
            // Update defender's character file
            let defenderContent = defender.content;
            defenderContent = updateStatblockValue(defenderContent, 'le', defenderNewLE);
            
            // Update pain condition
            if (newPain !== oldPain) {
                defenderContent = updateConditionLevel(defenderContent, 'Schmerz durch LeP', newPain);
                // Also update the condition table in the encounter file
                const noteForTable = newPain > 0 ? `GS −${newPain}` : '';
                encounterContent = updateEncounterConditionTable(encounterContent, defenderName, 'Schmerz durch LeP', newPain, noteForTable);
                // Update the Handlungsunfähig warning
                encounterContent = updateHandlungsunfaehigWarning(encounterContent, defenderName, newPain);
            }
            
            // Update the stats table (LE, GS) in the encounter file
            const charBaseGS = parseInt(defender.data.gs) || 8;
            const effectiveGS = Math.max(0, charBaseGS - newPain);
            const gsDisplay = newPain > 0 ? `${charBaseGS}→${effectiveGS}` : `${charBaseGS}`;
            encounterContent = updateEncounterStatsTable(encounterContent, defenderName, defenderNewLE, maxLE, gsDisplay);
            
            // Update the Lebensenergiezonen table
            if (hitZone && !isDeadFromExtrem) {
                const normalizedZone = normalizeZoneName(hitZone);
                const baseZoneForDeath = getBaseZone(hitZone);
                const zoneValues = parseZoneValues(encounterContent, defenderName, normalizedZone);
                if (zoneValues) {
                    const newZoneLeP = Math.max(0, zoneValues.currentLeP - damageDealt);
                    // Increment Schlimme Verletzungen count if one was triggered
                    const newSchlimmeCount = zoneValues.schlimmeCount + (damageDealt >= wundschwelle ? 1 : 0);
                    // Determine zone status
                    let newStatus = 'OK';
                    if (newZoneLeP <= 0) {
                        newStatus = 'Ausgefallen';
                    } else if (newZoneLeP <= zoneValues.maxLeP * 0.25) {
                        newStatus = 'Kritisch';
                    } else if (newZoneLeP <= zoneValues.maxLeP * 0.5) {
                        newStatus = 'Angeschlagen';
                    }
                    encounterContent = updateEncounterZoneTable(encounterContent, defenderName, normalizedZone, newZoneLeP, newSchlimmeCount, newStatus);
                    logEntry += `**Zone ${normalizedZone}:** ${zoneValues.currentLeP} → ${newZoneLeP}/${zoneValues.maxLeP}`;
                    if (newSchlimmeCount > zoneValues.schlimmeCount) logEntry += ` | Schlimme Verl.: ${newSchlimmeCount}`;
                    if (newStatus !== 'OK') logEntry += ` | **${newStatus}**`;
                    logEntry += `\n`;
                    
                    // Check for zone failure effects (Ausfall einer LEZ)
                    if (newZoneLeP <= 0) {
                        if (baseZoneForDeath === 'Kopf') {
                            logEntry += `\n> ⚠️ **${defenderName}** ist **Bewusstlos**! (Kopf-Zone ausgefallen)\n`;
                        } else if (baseZoneForDeath === 'Torso') {
                            logEntry += `\n> ⚠️ **${defenderName}** ist **Handlungsunfähig**! (Torso-Zone ausgefallen)\n`;
                        } else if (baseZoneForDeath === 'Arm') {
                            logEntry += `\n> ⚠️ **${defenderName}**: ${normalizedZone} ist unbrauchbar! (Keine Gegenstände halten, -3 auf Proben)\n`;
                        } else if (baseZoneForDeath === 'Bein') {
                            logEntry += `\n> ⚠️ **${defenderName}**: ${normalizedZone} ist unbrauchbar! (GS halbiert, -3 auf Proben)\n`;
                        }
                    }
                }
            }
            
            await app.vault.modify(defender.file, defenderContent);
        } else {
            logEntry += `*Keine TP eingegeben - Schadensberechnung übersprungen.*\n`;
        }
    }
    
    logEntry += `\n---\n`;
    
    // Append log to encounter file
    encounterContent += logEntry;
    await app.vault.modify(activeFile, encounterContent);
    
    // Show summary
    if (isCrit) {
        if (isRanged) {
            new Notice(`🛡️ ${defenderName}: Kritische Verteidigung! Nächste VW nicht erschwert!`);
        } else {
            new Notice(`⚔️ ${defenderName}: Kritische Verteidigung! Passierschlag möglich!`);
        }
    } else if (isFumble) {
        new Notice(`💥 ${defenderName}: Verteidigung gepatzt!`);
    } else if (defenseSuccessful) {
        new Notice(`🛡️ ${defenderName}: Verteidigung erfolgreich!`);
    } else if (damageDealt > 0) {
        new Notice(`❌ ${defenderName}: Verteidigung fehlgeschlagen! ${damageDealt} SP erhalten (LE: ${defenderNewLE})`);
    } else {
        new Notice(`❌ ${defenderName}: Verteidigung fehlgeschlagen!`);
    }
};
