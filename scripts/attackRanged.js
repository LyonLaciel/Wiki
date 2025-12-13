/**
 * QuickAdd User Script: FK Ranged (Fernkampf Attack)
 * Comprehensive ranged combat system for DSA 5
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // ========================================
    // RANGED FUMBLE TABLES (Fernkampf-Patzertabellen)
    // ========================================
    
    const FUMBLE_CATEGORIES = {
        2: { name: "Waffe zerstört", key: "waffe_zerstoert" },
        3: { name: "Waffe schwer beschädigt", key: "waffe_schwer_beschaedigt" },
        4: { name: "Waffe beschädigt", key: "waffe_beschaedigt" },
        5: { name: "Waffe verloren", key: "waffe_verloren" },
        6: { name: "Kamerad/Unschuldiger getroffen", key: "kamerad_getroffen" },
        7: { name: "Fehlschuss", key: "fehlschuss" },
        8: { name: "Zerrung", key: "zerrung" },
        9: { name: "Ladehemmung", key: "ladehemmung" },
        10: { name: "Zu konzentriert", key: "zu_konzentriert" },
        11: { name: "Selbst verletzt", key: "selbst_verletzt" },
        12: { name: "Selbst schwer verletzt", key: "selbst_schwer_verletzt" }
    };
    
    const FUMBLE_DETAILS = {
        waffe_zerstoert: {
            "1-10": "Die Waffe kann nicht mehr repariert werden. Einzelteile verursachen 1W6 SP. Bei unzerstörbaren Waffen: Waffe verloren.",
            "11-20": "Die Waffe ist zerbrochen. Reparatur um 3 erschwert, kostet 25% des Preises. Bei unzerstörbaren Waffen: Waffe verloren."
        },
        waffe_schwer_beschaedigt: {
            "1-6": "Nicht mehr verwendbar bis repariert. Reparatur um 1 erschwert. Bei unzerstörbaren: Waffe verloren.",
            "7-12": "Nicht mehr verwendbar bis repariert. Bei unzerstörbaren: Waffe verloren.",
            "13-18": "Schwer beschädigt aber einsetzbar. FK um 4 erschwert bis repariert. Bei unzerstörbaren: Waffe verloren.",
            "19-20": "Nochmal würfeln!"
        },
        waffe_beschaedigt: {
            "1-5": "Kratzer, keine regeltechnischen Auswirkungen.",
            "6-10": "Beschädigt. FK um 2 erschwert bis repariert.",
            "11-15": "Beschädigt. FK um 4 erschwert bis repariert.",
            "16-20": "Beschädigt. FK um 4 erschwert bis repariert. Reparatur um 1 erschwert."
        },
        waffe_verloren: {
            "1-3": "Waffe 1W6+2 Schritt weit weg + verhakt. Kraftakt zum Befreien nötig.",
            "4-6": "Waffe 1W6+2 Schritt weit weg.",
            "7-9": "Waffe gefallen + verhakt. Kraftakt zum Befreien nötig.",
            "10-12": "Waffe auf Boden gefallen. Normales Aufheben.",
            "13-15": "Waffe/Geschoss hat Gefährten fast getroffen. -3 VW für diesen bis Ende nächster KR. Sonst: -3 FK für Held.",
            "16-18": "Waffe gefallen, Aufheben um 2 erleichtert.",
            "19-20": "Nochmal würfeln!"
        },
        kamerad_getroffen: {
            "1-2": "Kamerad/Unschuldiger getroffen. Voller Schaden +2 TP. Keine Verteidigung möglich.",
            "3-4": "Kamerad/Unschuldiger getroffen. Voller Schaden +2 TP. Verteidigung -2.",
            "5-6": "Treffer in rechten Arm. Voller Schaden +2 TP. Verteidigung möglich.",
            "7-8": "Kamerad/Unschuldiger getroffen. Voller Schaden.",
            "9-10": "Kamerad/Unschuldiger getroffen. Schaden -2 TP (min 1). Keine Verteidigung.",
            "11-12": "Kamerad/Unschuldiger getroffen. Schaden -2 TP (min 1). Verteidigung möglich.",
            "13-14": "Kamerad/Unschuldiger getroffen. Schaden -2 TP (min 1). Verteidigung +2.",
            "15-20": "Nochmal würfeln!"
        },
        fehlschuss: {
            "1-2": "Kleidung eines Gefährten/Unschuldigen festgenagelt. Status Fixiert bis Ende nächster KR.",
            "3-4": "Ladezeit steigt um 2 Aktionen.",
            "5-6": "Fehlschuss bleibt in Gefährten hängen, richtet nur 1 SP an (0 SP bei RS 1+).",
            "7-8": "Ladezeit steigt um 1 Aktion.",
            "9-10": "Geschoss beim Schuss zerstört.",
            "11-12": "Spektakulärer Fehlschuss trifft Objekt (Schild, Fenster etc.).",
            "13-14": "Fehlschuss, Geschoss verloren.",
            "15-16": "Schuss geht weit daneben, Geschoss fliegt bis Maximalreichweite.",
            "17-20": "Nochmal würfeln!"
        },
        zerrung: {
            "1-2": "1 Stufe Schmerz + 1 Stufe Paralyse für 1 Stunde.",
            "3-4": "1 Stufe Schmerz + 1 Stufe Paralyse für 5 KR.",
            "5-6": "Nackenschmerzen: -2 VW für 3 KR.",
            "7-8": "Rückenschmerzen: 1 Stufe Schmerz für 3 KR.",
            "9-10": "Zerrung: 1 Stufe Schmerz bis Ende nächster KR.",
            "11-12": "Nackenschmerzen: -1 AT und -1 VW für 3 KR.",
            "13-14": "Zerrung im Arm: -2 AT für 3 KR.",
            "15-20": "Nochmal würfeln!"
        },
        ladehemmung: {
            "1-3": "5 komplette KR nötig um Waffe einsatzbereit zu machen.",
            "4-6": "3 komplette KR nötig um Waffe einsatzbereit zu machen.",
            "7-9": "2 komplette KR nötig um Waffe einsatzbereit zu machen.",
            "10-12": "1 komplette KR nötig um Waffe einsatzbereit zu machen.",
            "13-15": "Waffe macht Schwierigkeiten: FK um 2 erschwert bis Kampfende.",
            "16-18": "Waffe macht Schwierigkeiten: FK um 1 erschwert bis Kampfende.",
            "19-20": "Nochmal würfeln!"
        },
        zu_konzentriert: {
            "1-5": "Mit Zielen beschäftigt. 2 Aktionen zum Abschießen nötig (längerdauernde Handlung).",
            "6-10": "Mit Waffe beschäftigt. Verteidigungen um 4 erschwert bis nächste Aktion.",
            "11-15": "Mit Waffe beschäftigt. Keine Verteidigungen bis nächste Aktion.",
            "16-20": "Mit Zielen beschäftigt. Keine Verteidigungen + 2 Aktionen zum Abschießen nötig."
        },
        selbst_verletzt: {
            "1-6": "Selbst verletzt: Waffenschaden halbiert.",
            "7-12": "Selbst verletzt: Voller Waffenschaden.",
            "13-18": "Selbst verletzt: Voller Waffenschaden + Status Blutend.",
            "19-20": "Nochmal würfeln!"
        },
        selbst_schwer_verletzt: {
            "1-10": "Schwerer Eigentreffer: Waffenschaden verdoppelt + Status Blutend.",
            "11-20": "Schwerer Eigentreffer: Voller Waffenschaden + Status Blutend + alle Handlungen -2 bis Ende nächster KR."
        }
    };
    
    // Defense fumble tables (same as melee defend.js but for shield/dodge)
    const DEFENSE_FUMBLE_CATEGORIES = {
        2: { name: "Schild zerstört", key: "schild_zerstoert" },
        3: { name: "Schild schwer beschädigt", key: "schild_schwer_beschaedigt" },
        4: { name: "Schild beschädigt", key: "schild_beschaedigt" },
        5: { name: "Schild verloren", key: "schild_verloren" },
        6: { name: "Schild stecken geblieben", key: "schild_stecken" },
        7: { name: "Sturz", key: "sturz" },
        8: { name: "Stolpern", key: "stolpern" },
        9: { name: "Fuß verdreht", key: "fuss_verdreht" },
        10: { name: "Beule", key: "beule" },
        11: { name: "Selbst verletzt", key: "selbst_verletzt_def" },
        12: { name: "Selbst schwer verletzt", key: "selbst_schwer_verletzt_def" }
    };
    
    const DEFENSE_FUMBLE_DETAILS = {
        schild_zerstoert: {
            "1-10": "Schild zerspringt: 1W6 SP. Bei unzerstörbaren: Schild verloren.",
            "11-20": "Schild zerbrochen: Reparatur um 3 erschwert, kostet 25%. Bei unzerstörbaren: Schild verloren."
        },
        schild_schwer_beschaedigt: {
            "1-6": "Nicht mehr verwendbar. Reparatur um 1 erschwert.",
            "7-12": "Nicht mehr verwendbar bis repariert.",
            "13-18": "AT und PA um 4 erschwert bis repariert.",
            "19-20": "Nochmal würfeln!"
        },
        schild_beschaedigt: {
            "1-5": "Kratzer, keine Auswirkungen.",
            "6-10": "AT und PA um 1 erschwert bis repariert.",
            "11-15": "AT und PA um 2 erschwert bis repariert.",
            "16-20": "AT und PA um 3 erschwert bis repariert."
        },
        schild_verloren: {
            "1-3": "Schild 1W6+2 Schritt weit weg + verhakt.",
            "4-6": "Schild 1W6+2 Schritt weit weg.",
            "7-9": "Schild gefallen, Aufheben um 2 erschwert.",
            "10-12": "Schild auf Boden gefallen.",
            "13-15": "Schild hat Gefährten fast getroffen: -3 VW bis Ende nächster KR.",
            "16-18": "Schild gefallen, Aufheben um 2 erleichtert.",
            "19-20": "Nochmal würfeln!"
        },
        schild_stecken: {
            "1-2": "Schild trifft Gefährten. Voller Schaden wenn keine VW.",
            "3-4": "Schild steckt fest. 1 Aktion + Kraftakt zum Befreien.",
            "5-6": "Schild steckt fest. 1 Aktion + Kraftakt -1 zum Befreien.",
            "7-8": "Schild steckt fest. 1 Aktion + Kraftakt -2 zum Befreien.",
            "9-10": "Schild steckt fest. 5 Aktionen + Kraftakt -2 zum Befreien.",
            "11-12": "Schild verbogen: -1 AT/PA nach Befreien bis Kampfende.",
            "13-14": "Schild trifft Gefährten. VW möglich, sonst voller Schaden.",
            "15-20": "Nochmal würfeln!"
        },
        sturz: {
            "1-2": "Liegend + 1W3 Gefährten zu Boden (Körperbeherrschung -2). Sonst: 1 Stufe Schmerz 5 Min.",
            "3-4": "Körperbeherrschung -3 oder Liegend + 1W6+2 SP + 1 Stufe Betäubung 3 KR.",
            "5-6": "Körperbeherrschung -3 oder Liegend + 1W6+2 SP.",
            "7-8": "Körperbeherrschung -2 oder Liegend + 1W6 SP.",
            "9-10": "Körperbeherrschung -2 oder Liegend.",
            "11-12": "Körperbeherrschung -1 oder Liegend.",
            "13-14": "Körperbeherrschung oder Liegend.",
            "15-16": "Körperbeherrschung +1 oder Liegend.",
            "17-20": "Nochmal würfeln!"
        },
        stolpern: {
            "1-2": "In Gegnerwaffe gestolpert: voller Schaden + nächste Handlung -2.",
            "3-4": "Schwer gestolpert: nächste Handlung -3.",
            "5-6": "Missgeschick: Gegenstand verloren. -2 alle Handlungen + Eingeengt + Fixiert bis Ende nächster KR.",
            "7-8": "Gestolpert: nächste Handlung -2.",
            "9-10": "Aus Gleichgewicht: alle Gegner +2 AT bis Ende nächster KR.",
            "11-12": "Leicht gestolpert: nächste Handlung -1.",
            "13-14": "Aus Gleichgewicht: alle Gegner +1 AT bis Ende nächster KR.",
            "15-20": "Nochmal würfeln!"
        },
        fuss_verdreht: {
            "1-3": "2 Stufen Schmerz für 3 KR.",
            "4-6": "1 Stufe Schmerz für 5 KR.",
            "7-9": "1 Stufe Schmerz für 3 KR.",
            "10-12": "+2 TP Schaden, keine Schmerz-Stufe.",
            "13-15": "1 Stufe Schmerz für 1 KR.",
            "16-18": "+1 TP Schaden, keine Schmerz-Stufe.",
            "19-20": "Nochmal würfeln!"
        },
        beule: {
            "1-5": "2 Stufen Betäubung für 1 Stunde.",
            "6-10": "1 Stufe Betäubung + Status Blutend.",
            "11-15": "1 Stufe Betäubung für 1 Stunde.",
            "16-20": "1 Stufe Betäubung für 2 KR."
        },
        selbst_verletzt_def: {
            "1-6": "Selbst verletzt: Waffenschaden halbiert. Unbewaffnet: 1W6 TP.",
            "7-12": "Selbst verletzt: voller Waffenschaden. Unbewaffnet: 1W6 TP.",
            "13-18": "Selbst verletzt: voller Waffenschaden + Status Blutend.",
            "19-20": "Nochmal würfeln!"
        },
        selbst_schwer_verletzt_def: {
            "1-10": "Schwerer Eigentreffer: Waffenschaden verdoppelt + Status Blutend.",
            "11-20": "Schwerer Eigentreffer: voller Waffenschaden + Status Blutend + alle Handlungen -2."
        }
    };
    
    // ========================================
    // CRITICAL HIT TABLES (Kritische Erfolge für FK)
    // ========================================
    
    const CRIT_CATEGORIES = {
        2: { name: "Leichter Treffer", key: "leicht", baseEffect: "+2 TP" },
        3: { name: "Leicht betäubender Treffer", key: "leicht_betaeubend", baseEffect: "+2 TP, 1 Stufe Betäubung 2 KR" },
        4: { name: "Mittelschwerer Treffer", key: "mittelschwer", baseEffect: "×1.5 TP" },
        5: { name: "Mittelschwerer schmerzhafter Treffer", key: "mittelschwer_schmerz", baseEffect: "×1.5 TP, 1 Stufe Schmerz 5 KR" },
        6: { name: "Mittelschwerer betäubender Treffer", key: "mittelschwer_betaeubend", baseEffect: "×1.5 TP, 1 Stufe Betäubung 5 KR" },
        7: { name: "Schwerer Treffer", key: "schwer", baseEffect: "×2 TP" },
        8: { name: "Schwerer betäubender Treffer", key: "schwer_betaeubend", baseEffect: "×2 TP, 1 Stufe Betäubung 5 KR" },
        9: { name: "Schwerer schmerzhafter Treffer", key: "schwer_schmerz", baseEffect: "×2 TP, 1 Stufe Schmerz 5 KR" },
        10: { name: "Aus dem Gleichgewicht gebracht", key: "gleichgewicht", baseEffect: "-4 VW, Körperbeherrschung -2 oder Liegend" },
        11: { name: "Gehirnerschütterung", key: "gehirnerschuetterung", baseEffect: "Selbstbeherrschung -2 oder Bewusstlos 5 KR, 2 Stufen Betäubung 1h" },
        12: { name: "Extrem schwerer Treffer", key: "extrem_schwer", baseEffect: "×3 TP" }
    };
    
    const CRIT_DETAILS = {
        leicht: {
            "1-10": { desc: "+1 TP", tpBonus: 1 },
            "11-20": { desc: "+3 TP", tpBonus: 3 }
        },
        leicht_betaeubend: {
            "1-6": { desc: "+1 TP, 1 Stufe Betäubung 1 KR", tpBonus: 1, effect: { type: "Betäubung", level: 1, kr: 1 } },
            "7-12": { desc: "+2 TP, 1 Stufe Betäubung 2 KR", tpBonus: 2, effect: { type: "Betäubung", level: 1, kr: 2 } },
            "13-18": { desc: "+3 TP, 1 Stufe Betäubung 3 KR", tpBonus: 3, effect: { type: "Betäubung", level: 1, kr: 3 } },
            "19-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        mittelschwer: {
            "1-5": { desc: "×1.5 TP + Status Blutend", tpMult: 1.5, status: "Blutend" },
            "6-10": { desc: "×1.5 TP", tpMult: 1.5 },
            "11-15": { desc: "Status Blutend", status: "Blutend" },
            "16-20": { desc: "Körperbeherrschung oder Liegend", probe: "Körperbeherrschung (Kampfmanöver)", failStatus: "Liegend" }
        },
        mittelschwer_schmerz: {
            "1-3": { desc: "×1.5 TP, 1 Stufe Schmerz + 1 Stufe Betäubung 2 KR", tpMult: 1.5, effect: { type: "Schmerz", level: 1, kr: 2 }, effect2: { type: "Betäubung", level: 1, kr: 2 } },
            "4-6": { desc: "×1.5 TP, 1 Stufe Schmerz 2 KR + Blutend", tpMult: 1.5, effect: { type: "Schmerz", level: 1, kr: 2 }, status: "Blutend" },
            "7-9": { desc: "×1.5 TP, 1 Stufe Schmerz 2 KR", tpMult: 1.5, effect: { type: "Schmerz", level: 1, kr: 2 } },
            "10-12": { desc: "1 Stufe Schmerz 2 KR + Blutend", effect: { type: "Schmerz", level: 1, kr: 2 }, status: "Blutend" },
            "13-15": { desc: "1 Stufe Schmerz 2 KR", effect: { type: "Schmerz", level: 1, kr: 2 } },
            "16-18": { desc: "1 Stufe Schmerz 1 KR", effect: { type: "Schmerz", level: 1, kr: 1 } },
            "19-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        mittelschwer_betaeubend: {
            "1-2": { desc: "×1.5 TP, Selbstbeherrschung oder Bewusstlos 3 KR, 1 Stufe Betäubung 8 KR", tpMult: 1.5, probe: "Selbstbeherrschung (Handlungsfähigkeit bewahren)", failStatus: "Bewusstlos 3 KR", effect: { type: "Betäubung", level: 1, kr: 8 } },
            "3-4": { desc: "×1.5 TP, 2 Stufen Betäubung 5 KR", tpMult: 1.5, effect: { type: "Betäubung", level: 2, kr: 5 } },
            "5-6": { desc: "×1.5 TP, 1 Stufe Betäubung 8 KR", tpMult: 1.5, effect: { type: "Betäubung", level: 1, kr: 8 } },
            "7-8": { desc: "×1.5 TP, 1 Stufe Betäubung 5 KR", tpMult: 1.5, effect: { type: "Betäubung", level: 1, kr: 5 } },
            "9-10": { desc: "+1 TP, 1 Stufe Betäubung 5 KR", tpBonus: 1, effect: { type: "Betäubung", level: 1, kr: 5 } },
            "11-12": { desc: "+1 TP, 2 Stufen Betäubung 3 KR", tpBonus: 1, effect: { type: "Betäubung", level: 2, kr: 3 } },
            "13-14": { desc: "+1 TP, 2 Stufen Betäubung 1 KR", tpBonus: 1, effect: { type: "Betäubung", level: 2, kr: 1 } },
            "15-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        schwer: {
            "1-2": { desc: "×2 TP, 1 Stufe Betäubung 5 KR + Blutend", tpMult: 2, effect: { type: "Betäubung", level: 1, kr: 5 }, status: "Blutend" },
            "3-4": { desc: "×2 TP, 1 Stufe Betäubung 5 KR", tpMult: 2, effect: { type: "Betäubung", level: 1, kr: 5 } },
            "5-6": { desc: "×2 TP + Blutend", tpMult: 2, status: "Blutend" },
            "7-8": { desc: "×2 TP, 1 Stufe Schmerz 2 KR", tpMult: 2, effect: { type: "Schmerz", level: 1, kr: 2 } },
            "9-10": { desc: "×2 TP", tpMult: 2 },
            "11-12": { desc: "+5 TP, Körperbeherrschung -1 oder Liegend", tpBonus: 5, probe: "Körperbeherrschung (Kampfmanöver) -1", failStatus: "Liegend" },
            "13-14": { desc: "+3 TP, Körperbeherrschung -1 oder Liegend", tpBonus: 3, probe: "Körperbeherrschung (Kampfmanöver) -1", failStatus: "Liegend" },
            "15-16": { desc: "+1 TP, Körperbeherrschung -1 oder Liegend", tpBonus: 1, probe: "Körperbeherrschung (Kampfmanöver) -1", failStatus: "Liegend" },
            "17-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        schwer_betaeubend: {
            "1-2": { desc: "×2 TP, Selbstbeherrschung -1 oder Bewusstlos 5 KR, 1 Stufe Betäubung 10 KR", tpMult: 2, probe: "Selbstbeherrschung (Handlungsfähigkeit bewahren) -1", failStatus: "Bewusstlos 5 KR", effect: { type: "Betäubung", level: 1, kr: 10 } },
            "3-4": { desc: "×2 TP, 2 Stufen Betäubung 5 KR", tpMult: 2, effect: { type: "Betäubung", level: 2, kr: 5 } },
            "5-6": { desc: "×2 TP, 1 Stufe Betäubung 8 KR", tpMult: 2, effect: { type: "Betäubung", level: 1, kr: 8 } },
            "7-8": { desc: "×2 TP, 1 Stufe Betäubung 5 KR", tpMult: 2, effect: { type: "Betäubung", level: 1, kr: 5 } },
            "9-10": { desc: "+3 TP, 1 Stufe Betäubung 5 KR", tpBonus: 3, effect: { type: "Betäubung", level: 1, kr: 5 } },
            "11-12": { desc: "+3 TP, 2 Stufen Betäubung 3 KR", tpBonus: 3, effect: { type: "Betäubung", level: 2, kr: 3 } },
            "13-14": { desc: "+3 TP, 2 Stufen Betäubung 1 KR", tpBonus: 3, effect: { type: "Betäubung", level: 2, kr: 1 } },
            "15-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        schwer_schmerz: {
            "1-3": { desc: "×2 TP, 1 Stufe Schmerz + 1 Stufe Betäubung 5 KR", tpMult: 2, effect: { type: "Schmerz", level: 1, kr: 5 }, effect2: { type: "Betäubung", level: 1, kr: 5 } },
            "4-6": { desc: "×2 TP, 1 Stufe Schmerz 5 KR + Blutend", tpMult: 2, effect: { type: "Schmerz", level: 1, kr: 5 }, status: "Blutend" },
            "7-9": { desc: "×2 TP, 1 Stufe Schmerz 5 KR", tpMult: 2, effect: { type: "Schmerz", level: 1, kr: 5 } },
            "10-12": { desc: "1 Stufe Schmerz 5 KR + Blutend", effect: { type: "Schmerz", level: 1, kr: 5 }, status: "Blutend" },
            "13-15": { desc: "1 Stufe Schmerz 5 KR", effect: { type: "Schmerz", level: 1, kr: 5 } },
            "16-18": { desc: "2 Stufen Schmerz 5 KR", effect: { type: "Schmerz", level: 2, kr: 5 } },
            "19-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        gleichgewicht: {
            "1-5": { desc: "×2 TP, -2 VW bis Ende nächster KR, Körperbeherrschung -2 oder Liegend", tpMult: 2, vwPenalty: 2, probe: "Körperbeherrschung (Kampfmanöver) -2", failStatus: "Liegend" },
            "6-10": { desc: "×1.5 TP, -2 VW bis Ende nächster KR, Körperbeherrschung oder Liegend", tpMult: 1.5, vwPenalty: 2, probe: "Körperbeherrschung (Kampfmanöver)", failStatus: "Liegend" },
            "11-15": { desc: "-4 VW bis Ende nächster KR, Körperbeherrschung -2 oder Liegend", vwPenalty: 4, probe: "Körperbeherrschung (Kampfmanöver) -2", failStatus: "Liegend" },
            "16-20": { desc: "-2 VW bis Ende nächster KR, Körperbeherrschung oder Liegend", vwPenalty: 2, probe: "Körperbeherrschung (Kampfmanöver)", failStatus: "Liegend" }
        },
        gehirnerschuetterung: {
            "1-6": { desc: "×1.5 TP, Selbstbeherrschung -2 oder Bewusstlos 5 KR, 2 Stufen Betäubung 1h", tpMult: 1.5, probe: "Selbstbeherrschung (Handlungsfähigkeit bewahren) -2", failStatus: "Bewusstlos 5 KR", effect: { type: "Betäubung", level: 2, duration: "1 Stunde" } },
            "7-12": { desc: "Selbstbeherrschung -2 oder Bewusstlos 5 KR, 2 Stufen Betäubung 1h", probe: "Selbstbeherrschung (Handlungsfähigkeit bewahren) -2", failStatus: "Bewusstlos 5 KR", effect: { type: "Betäubung", level: 2, duration: "1 Stunde" } },
            "13-18": { desc: "Selbstbeherrschung oder Bewusstlos 5 KR, 1 Stufe Betäubung 1h", probe: "Selbstbeherrschung (Handlungsfähigkeit bewahren)", failStatus: "Bewusstlos 5 KR", effect: { type: "Betäubung", level: 1, duration: "1 Stunde" } },
            "19-20": { desc: "Nochmal würfeln!", reroll: true }
        },
        extrem_schwer: {
            "1-10": { desc: "×3 TP", tpMult: 3 },
            "11-20": { desc: "×2 TP, Selbstbeherrschung oder Handlungsunfähig 1W3 KR, 1 Stufe Schmerz 3 KR", tpMult: 2, probe: "Selbstbeherrschung (Handlungsfähigkeit bewahren)", failStatus: "Handlungsunfähig 1W3 KR", effect: { type: "Schmerz", level: 1, kr: 3 } }
        }
    };
    
    // ========================================
    // DEFENSE FUMBLE TABLES (Verteidigung-Patzertabellen für FK)
    // ========================================
    
    const DEF_FUMBLE_CATEGORIES = {
        2: { name: "Schild/Waffe zerstört", key: "def_zerstoert" },
        3: { name: "Schild/Waffe schwer beschädigt", key: "def_schwer_beschaedigt" },
        4: { name: "Schild/Waffe beschädigt", key: "def_beschaedigt" },
        5: { name: "Schild/Waffe verloren", key: "def_verloren" },
        6: { name: "Schild/Waffe stecken geblieben", key: "def_stecken" },
        7: { name: "Sturz", key: "def_sturz" },
        8: { name: "Stolpern", key: "def_stolpern" },
        9: { name: "Fuß verdreht", key: "def_fuss_verdreht" },
        10: { name: "Beule", key: "def_beule" },
        11: { name: "Selbst verletzt", key: "def_selbst_verletzt" },
        12: { name: "Selbst schwer verletzt", key: "def_selbst_schwer_verletzt" }
    };
    
    const DEF_FUMBLE_DETAILS = {
        def_zerstoert: {
            "1-10": "Waffe/Schild zerspringt in Einzelteile: Nicht mehr reparierbar. Einzelteile verursachen 1W6 SP. Bei unzerstörbaren: wie Verloren.",
            "11-20": "Waffe/Schild zerbrochen: Reparatur um 3 erschwert, kostet 25% des Preises. Bei unzerstörbaren: wie Verloren."
        },
        def_schwer_beschaedigt: {
            "1-6": "Extrem schwere Beschädigung: Nicht verwendbar bis repariert. Reparatur um 1 erschwert. Bei unzerstörbaren: wie Verloren.",
            "7-12": "Stark beschädigt: Nicht verwendbar bis repariert. Bei unzerstörbaren: wie Verloren.",
            "13-18": "Kaum noch zu gebrauchen: Schwer beschädigt aber einsetzbar. AT und PA um 4 erschwert bis repariert. Bei unzerstörbaren: wie Verloren.",
            "19-20": "Nochmal würfeln!"
        },
        def_beschaedigt: {
            "1-5": "Kratzer: Keine regeltechnischen Auswirkungen.",
            "6-10": "Leicht beschädigt: AT und PA um 1 erschwert bis repariert.",
            "11-15": "Beschädigt: AT und PA um 2 erschwert bis repariert.",
            "16-20": "Schwer beschädigt: AT und PA um 3 erschwert bis repariert."
        },
        def_verloren: {
            "1-3": "Weit weg + ungünstig: 1W6+2 Schritt entfernt + verhakt. Kraftakt zum Befreien nötig.",
            "4-6": "Weit weg: 1W6+2 Schritt entfernt. Bewegung + Aufheben nötig.",
            "7-9": "Ungünstig gefallen: Aufheben um 2 erschwert.",
            "10-12": "Auf Boden gefallen: Normales Aufheben möglich.",
            "13-15": "Gefährten gestreift: Gefährte hat -3 VW bis Ende nächster KR. Sonst: -3 AT für Held.",
            "16-18": "Günstig gefallen: Aufheben um 2 erleichtert.",
            "19-20": "Nochmal würfeln!"
        },
        def_stecken: {
            "1-2": "Gefährten verletzt: Waffe trifft Gefährten. Schild-PA oder AW möglich, sonst voller Schaden. Sonst: -3 AT für Held.",
            "3-4": "Steckt fest: 1 Aktion + Kraftakt zum Befreien.",
            "5-6": "Steckt ziemlich fest: 1 Aktion + Kraftakt -1 zum Befreien.",
            "7-8": "Steckt sehr tief: 1 Aktion + Kraftakt -2 zum Befreien.",
            "9-10": "Steckt extrem tief: 5 Aktionen + Kraftakt -2 zum Befreien.",
            "11-12": "Verbogen: 1 Aktion + Kraftakt -2. Nach Befreien: -1 AT/PA bis Kampfende.",
            "13-14": "Gefährten getroffen: Gefährte kann VW einsetzen, sonst voller Schaden. Sonst: -3 AT für Held.",
            "15-20": "Nochmal würfeln!"
        },
        def_sturz: {
            "1-2": "Abgeräumt: Liegend + zieht 1W3 Gefährten zu Boden (Körperbeherrschung -2). Sonst: 1 Stufe Schmerz 5 Min.",
            "3-4": "Luftraubender Sturz: Körperbeherrschung -3 oder Liegend + 1W6+2 SP + 1 Stufe Betäubung 3 KR.",
            "5-6": "Sehr schmerzhafter Sturz: Körperbeherrschung -3 oder Liegend + 1W6+2 SP.",
            "7-8": "Schmerzhafter Sturz: Körperbeherrschung -2 oder Liegend + 1W6 SP.",
            "9-10": "Gestürzt: Körperbeherrschung -2 oder Liegend.",
            "11-12": "Leichter Sturz: Körperbeherrschung -1 oder Liegend.",
            "13-14": "Harmloser Sturz: Körperbeherrschung oder Liegend.",
            "15-16": "Fehltritt: Körperbeherrschung +1 oder Liegend.",
            "17-20": "Nochmal würfeln!"
        },
        def_stolpern: {
            "1-2": "In Gegnerwaffe gestolpert: Voller Waffenschaden + nächste Handlung -2.",
            "3-4": "Schwer gestolpert: Nächste Handlung -3.",
            "5-6": "Missgeschick: -2 alle Handlungen + Eingeengt + Fixiert bis Ende nächster KR.",
            "7-8": "Gestolpert: Nächste Handlung -2.",
            "9-10": "Schwer aus Gleichgewicht: Alle Gegner +2 AT bis Ende nächster KR.",
            "11-12": "Leicht gestolpert: Nächste Handlung -1.",
            "13-14": "Aus Gleichgewicht: Alle Gegner +1 AT bis Ende nächster KR.",
            "15-20": "Nochmal würfeln!"
        },
        def_fuss_verdreht: {
            "1-3": "Verdreht und überdehnt: 2 Stufen Schmerz für 3 KR.",
            "4-6": "Schlimm schmerzend: 1 Stufe Schmerz für 5 KR.",
            "7-9": "Schmerzend: 1 Stufe Schmerz für 3 KR.",
            "10-12": "Schwer verknackst: +2 TP Schaden, keine Schmerz-Stufe.",
            "13-15": "Leicht schmerzend: 1 Stufe Schmerz für 1 KR.",
            "16-18": "Leicht verknackst: +1 TP Schaden, keine Schmerz-Stufe.",
            "19-20": "Nochmal würfeln!"
        },
        def_beule: {
            "1-5": "Große Beule: 2 Stufen Betäubung für 1 Stunde.",
            "6-10": "Blutende Beule: 1 Stufe Betäubung + Status Blutend.",
            "11-15": "Kopfschmerzen: 1 Stufe Betäubung für 1 Stunde.",
            "16-20": "Leichte Kopfschmerzen: 1 Stufe Betäubung für 2 KR."
        },
        def_selbst_verletzt: {
            "1-6": "Selbst verletzt: Waffenschaden halbiert. Unbewaffnet: 1W6 TP.",
            "7-12": "Selbst verletzt: Voller Waffenschaden. Unbewaffnet: 1W6 TP.",
            "13-18": "Selbst verletzt: Voller Waffenschaden + Status Blutend. Unbewaffnet: 1W6 TP.",
            "19-20": "Nochmal würfeln!"
        },
        def_selbst_schwer_verletzt: {
            "1-10": "Schwerer Eigentreffer: Waffenschaden verdoppelt + Status Blutend. Unbewaffnet: 1W6 TP.",
            "11-20": "Schwerer Eigentreffer: Voller Waffenschaden + Status Blutend + alle Handlungen -2 bis Ende nächster KR."
        }
    };
    
    // ========================================
    // HIT ZONE TABLES (Trefferzonen)
    // ========================================
    
    // Humanoid hit zones by size (1W20)
    const HUMANOID_ZONES = {
        klein: { // Small humanoid (or large attacker vs medium target)
            ranges: [
                { min: 1, max: 6, zone: "Kopf" },
                { min: 7, max: 10, zone: "Torso" },
                { min: 11, max: 18, zone: "Arm" },
                { min: 19, max: 20, zone: "Bein" }
            ]
        },
        mittel: { // Medium humanoid (standard)
            ranges: [
                { min: 1, max: 2, zone: "Kopf" },
                { min: 3, max: 12, zone: "Torso" },
                { min: 13, max: 16, zone: "Arm" },
                { min: 17, max: 20, zone: "Bein" }
            ]
        },
        gross: { // Large humanoid (or small attacker vs medium target)
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
        klein: { // Small quadruped (e.g., goat)
            ranges: [
                { min: 1, max: 4, zone: "Kopf" },
                { min: 5, max: 12, zone: "Torso" },
                { min: 13, max: 16, zone: "Vorderbein" },
                { min: 17, max: 20, zone: "Hinterbein" }
            ]
        },
        mittel: { // Medium quadruped (e.g., wolf)
            ranges: [
                { min: 1, max: 4, zone: "Kopf" },
                { min: 5, max: 10, zone: "Torso" },
                { min: 11, max: 16, zone: "Vorderbein" },
                { min: 17, max: 20, zone: "Hinterbein" }
            ]
        },
        gross: { // Large quadruped (e.g., cattle)
            ranges: [
                { min: 1, max: 5, zone: "Kopf" },
                { min: 6, max: 11, zone: "Torso" },
                { min: 12, max: 16, zone: "Vorderbein" },
                { min: 17, max: 20, zone: "Hinterbein" }
            ]
        }
    };
    
    // Six-limbed with tail (e.g., dragons, tatzelwurm)
    const SIX_LIMBED_ZONES = {
        gross: { // Large six-limbed (e.g., tatzelwurm)
            ranges: [
                { min: 1, max: 4, zone: "Kopf" },
                { min: 5, max: 12, zone: "Torso" },
                { min: 13, max: 14, zone: "Vordergliedmaßen" },
                { min: 15, max: 16, zone: "Mittlere Gliedmaßen" },
                { min: 17, max: 18, zone: "Hintergliedmaßen" },
                { min: 19, max: 20, zone: "Schwanz" }
            ]
        },
        riesig: { // Huge six-limbed (e.g., dragons)
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
        // Number of tentacles determines distribution
        // Torso: 1-2, Kopf: 3-6, rest distributed to tentacles
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
    
    // Targeted attack penalties
    const TARGETED_ATTACK_PENALTIES = {
        "Kopf": -10,
        "Torso": -4,
        "Arm": -8,
        "Bein": -8,
        "Vorderbein": -8,
        "Hinterbein": -8,
        "Vordergliedmaßen": -8,
        "Mittlere Gliedmaßen": -8,
        "Hintergliedmaßen": -8,
        "Schwanz": -6,
        "Fangarm": -6,
        "Körper": 0
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
    
    // Torso injuries (1W6)
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
    
    const rollDice = (diceStr) => {
        if (!diceStr || diceStr === '-') return { total: 0, rolls: [], formula: diceStr };
        const str = String(diceStr).toUpperCase();
        const match = str.match(/(\d*)W(\d+)([+-]\d+)?/);
        if (!match) {
            const num = parseInt(str);
            return { total: isNaN(num) ? 0 : num, rolls: [], formula: diceStr };
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
    
    const roll1d20 = () => Math.floor(Math.random() * 20) + 1;
    
    const roll2d6 = () => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        return { total: d1 + d2, rolls: [d1, d2] };
    };
    
    // Roll 1d6 for injury determination
    const roll1d6 = () => Math.floor(Math.random() * 6) + 1;
    
    // Roll 1d3 for extra damage
    const roll1d3 = () => Math.floor(Math.random() * 3) + 1;
    
    // Get creature type and size from character data
    const getCreatureType = async (charData, quickAddApi) => {
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
        
        // Select the appropriate zone table
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
        // Remove left/right prefix
        const cleanZone = zone.replace(/^(rechter|linker|rechtes|linkes)\s+/i, '');
        return cleanZone;
    };
    
    // Get injury for a zone from 1W6 roll
    const getInjuryForZone = (zone, roll) => {
        const baseZone = getBaseZone(zone);
        const injuryTable = ZONE_INJURY_MAP[baseZone] || GENERIC_INJURIES;
        return injuryTable[roll] || GENERIC_INJURIES[roll];
    };
    
    // Calculate Wundschwelle (wound threshold)
    const calculateWundschwelle = (ko) => {
        return Math.floor(ko / 2);
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
        let inKeyValueSection = false; // For kampftechniken-style sections
        let keyValueSectionName = null;
        
        // Sections that are key-value maps, not arrays
        const keyValueSections = ['kampftechniken', 'talente'];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for key-value section property (e.g., " bögen: 12")
            // Use character class that includes German umlauts
            if (inKeyValueSection && line.match(/^\s+[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:\s*.+$/)) {
                const propMatch = line.match(/^\s+([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.+)$/);
                if (propMatch && keyValueSectionName) {
                    if (!data[keyValueSectionName]) data[keyValueSectionName] = {};
                    let value = propMatch[2].trim();
                    // Only parse as number if the entire value is a valid number
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
                    // Only parse as number if the entire value is a valid number
                    const num = parseFloat(value);
                    const isValidNumber = !isNaN(num) && String(num) === value;
                    currentObject[propMatch[1]] = isValidNumber ? num : value;
                }
                continue;
            }
            
            const arrayMatch = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*$/);
            if (arrayMatch) {
                // Check if this is a key-value section
                if (keyValueSections.includes(arrayMatch[1])) {
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
                if (currentArrayName && currentObject) {
                    if (!data[currentArrayName]) data[currentArrayName] = [];
                    data[currentArrayName].push(currentObject);
                    currentObject = null;
                }
                currentArrayName = null;
                inArray = false;
                
                const key = match[1];
                let value = match[2].trim().replace(/^"|"$/g, '');
                // Only parse as number if the entire value is a valid number
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
    
    // Get kampftechnik value from kampftechniken object
    const getKtwValue = (kampftechniken, techName) => {
        if (!kampftechniken) return 6;
        const k = techName.toLowerCase().replace(/[^a-zäöüß]/g, '');
        if (k in kampftechniken) return parseInt(kampftechniken[k]) || 6;
        for (const key in kampftechniken) {
            if (toUmlaut(key) === k) return parseInt(kampftechniken[key]) || 6;
        }
        return 6;
    };
    
    const calculateFK = (charData, weapon, kampftechniken) => {
        const toNum = v => typeof v === 'number' ? v : (parseInt(v) || 0);
        
        // Weapon has umlauts (e.g., "Bögen"), statblock may have ASCII (e.g., "boegen")
        const techName = String(weapon.kampftechnik || '').toLowerCase().replace(/[^a-zäöüß]/g, '');
        let ktw = 6;
        if (kampftechniken) {
            if (techName in kampftechniken) {
                ktw = toNum(kampftechniken[techName]);
            } else {
                // Convert statblock keys to umlauts and match
                for (const key in kampftechniken) {
                    if (toUmlaut(key) === techName) {
                        ktw = toNum(kampftechniken[key]);
                        break;
                    }
                }
            }
        }
        
        // FF bonus for ranged weapons
        const ff = toNum(charData.ff);
        const ffBonus = ff <= 8 ? 0 : Math.floor((ff - 8) / 3);
        
        return ktw + ffBonus;
    };
    
    const calculateAW = (charData) => {
        const toNum = v => typeof v === 'number' ? v : (parseInt(v) || 0);
        const ge = toNum(charData.ge);
        const awMod = toNum(charData.aw_mod);
        return Math.floor(ge / 2) + awMod;
    };
    
    const calculateMaxLE = (charData) => {
        const toNum = v => typeof v === 'number' ? v : (parseInt(v) || 0);
        const bases = { 'Mensch': 5, 'Elf': 2, 'Halbelf': 5, 'Zwerg': 8 };
        const species = charData.spezies || 'Mensch';
        const baseLe = bases[species] || 5;
        const ko = toNum(charData.ko);
        const leMod = toNum(charData.le_mod);
        return baseLe + (2 * ko) + leMod;
    };
    
    const calculatePainFromLE = (currentLE, maxLE) => {
        if (currentLE <= 0) return 4;
        if (currentLE <= 5) return 4;
        let pain = 0;
        if (currentLE <= maxLE * 0.25) pain = 3;
        else if (currentLE <= maxLE * 0.5) pain = 2;
        else if (currentLE <= maxLE * 0.75) pain = 1;
        return pain;
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
    
    // Helper function for remove-on-select modifier dialogs
    // categories = [{ name: "Category", prefix: "🎯", options: [{label, value, ...}], removeOnSelect: true/false }, ...]
    // mandatory: if true, loop until all categories are selected; if false, show "Fertig" option
    // Returns { categoryName: selectedOption, ... }
    const selectFromCategories = async (categories, mandatory = true) => {
        const selections = {};
        let remaining = categories.map(c => ({ ...c, options: [...c.options] }));
        
        while (remaining.length > 0) {
            // Build flat list with category prefixes
            const displayOptions = [];
            const values = [];
            
            if (!mandatory) {
                displayOptions.push("✅ Fertig");
                values.push({ done: true });
            }
            
            for (const cat of remaining) {
                for (const opt of cat.options) {
                    displayOptions.push(`${cat.prefix} ${opt.label}`);
                    values.push({ category: cat.name, removeOnSelect: cat.removeOnSelect !== false, ...opt });
                }
            }
            
            const choice = await quickAddApi.suggester(displayOptions, values);
            if (!choice || choice.done) break;
            
            // Store selection
            if (!selections[choice.category]) {
                selections[choice.category] = [];
            }
            selections[choice.category].push(choice);
            
            if (choice.removeOnSelect) {
                // Remove entire category
                remaining = remaining.filter(c => c.name !== choice.category);
            } else {
                // Remove just this option from the category
                const catIndex = remaining.findIndex(c => c.name === choice.category);
                if (catIndex !== -1) {
                    remaining[catIndex].options = remaining[catIndex].options.filter(o => o.label !== choice.label);
                    if (remaining[catIndex].options.length === 0) {
                        remaining.splice(catIndex, 1);
                    }
                }
            }
        }
        
        return selections;
    };
    
    const getTotalRS = (ruestungen) => {
        if (!ruestungen || !Array.isArray(ruestungen)) return 0;
        let total = 0;
        for (const armor of ruestungen) {
            total += parseInt(armor.rs) || 0;
        }
        return total;
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
    
    // Parse fumble text for structured effects
    const parseFumbleEffect = (fumbleText, categoryName) => {
        const effects = [];
        
        // Parse patterns like "X Stufe(n) Schmerz für Y KR"
        const schmerzMatch = fumbleText.match(/(\d+)\s*Stufe[n]?\s*Schmerz\s*für\s*(\d+)\s*K(?:ampf)?R/i);
        if (schmerzMatch) {
            effects.push({
                name: `Patzer: ${categoryName}`,
                schmerz: parseInt(schmerzMatch[1]),
                kr: parseInt(schmerzMatch[2])
            });
        }
        
        // Parse patterns like "X Stufe(n) Betäubung für Y KR"
        const betaeubungMatch = fumbleText.match(/(\d+)\s*Stufe[n]?\s*Betäubung\s*für\s*(\d+)\s*K(?:ampf)?R/i);
        if (betaeubungMatch) {
            effects.push({
                name: `Patzer: ${categoryName}`,
                betaeubung: parseInt(betaeubungMatch[1]),
                kr: parseInt(betaeubungMatch[2])
            });
        }
        
        // Parse patterns like "nächste Handlung -X erschwert"
        const nextActionMatch = fumbleText.match(/nächste\s*Handlung[^-]*-(\d+)/i);
        if (nextActionMatch) {
            effects.push({
                name: `Patzer: ${categoryName}`,
                at_mod: -parseInt(nextActionMatch[1]),
                fk_mod: -parseInt(nextActionMatch[1]),
                kr: 1
            });
        }
        
        // Parse patterns like "-X auf FK" or "FK um X erschwert"
        const fkMatch = fumbleText.match(/(?:FK|Fernkampf)\s*(?:um\s*)?(\d+)\s*erschwert/i);
        if (fkMatch) {
            effects.push({
                name: `Patzer: ${categoryName}`,
                fk_mod: -parseInt(fkMatch[1]),
                kr: 99 // Until repaired or end of combat
            });
        }
        
        // Parse patterns like "X komplette KR nötig"
        const ladehemmungMatch = fumbleText.match(/(\d+)\s*komplette\s*K(?:ampf)?R\s*nötig/i);
        if (ladehemmungMatch) {
            effects.push({
                name: `Patzer: ${categoryName}`,
                status: "Waffe nicht einsatzbereit",
                kr: parseInt(ladehemmungMatch[1])
            });
        }
        
        return effects;
    };
    
    // Serialize effects back to block format
    const serializeEffectsBlock = (characters) => {
        let result = '';
        for (const charName in characters) {
            result += `${charName}:\n\n`;
            for (const effect of characters[charName]) {
                result += `  - name: ${effect.name}\n\n`;
                for (const key in effect) {
                    if (key !== 'name') {
                        const value = effect[key];
                        const prefix = (typeof value === 'number' && value > 0 && key !== 'kr') ? '+' : '';
                        result += `    ${key}: ${prefix}${value}\n\n`;
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
    
    const rollAttackFumble = () => {
        const category2d6 = roll2d6();
        const category = FUMBLE_CATEGORIES[category2d6.total];
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
            category: category.name,
            detailRoll: detail1d20,
            detail: detailText,
            needsReroll: detailText.includes("Nochmal würfeln")
        };
    };
    
    // Roll critical hit with full tables
    const rollCrit = () => {
        const category2d6 = roll2d6();
        const categoryResult = category2d6.total;
        
        const category = CRIT_CATEGORIES[categoryResult];
        const detail1d20 = roll1d20();
        
        const details = CRIT_DETAILS[category.key];
        let detailData = { desc: "Unbekanntes Ergebnis" };
        
        for (const range in details) {
            const [min, max] = range.split('-').map(n => parseInt(n));
            if (detail1d20 >= min && detail1d20 <= (max || min)) {
                detailData = details[range];
                break;
            }
        }
        
        return {
            categoryRoll: category2d6,
            categoryName: category.name,
            categoryKey: category.key,
            baseEffect: category.baseEffect,
            detailRoll: detail1d20,
            detail: detailData,
            needsReroll: detailData.reroll === true
        };
    };
    
    const rollDefenseFumble = (isDodge) => {
        const category2d6 = roll2d6();
        let categoryResult = category2d6.total;
        
        // If dodging (AW) and result is 2-6, add 5
        if (isDodge && categoryResult >= 2 && categoryResult <= 6) {
            categoryResult = Math.min(categoryResult + 5, 12);
        }
        
        const category = DEF_FUMBLE_CATEGORIES[categoryResult];
        const detail1d20 = roll1d20();
        
        const details = DEF_FUMBLE_DETAILS[category.key];
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
            wasAdjusted: isDodge && category2d6.total >= 2 && category2d6.total <= 6,
            category: category.name,
            detailRoll: detail1d20,
            detail: detailText,
            needsReroll: detailText.includes("Nochmal würfeln")
        };
    };
    
    const updateStatblockValue = (content, key, newValue) => {
        const regex = new RegExp(`^(${key}:)\\s*.*$`, 'm');
        if (content.match(regex)) {
            return content.replace(regex, `$1 ${newValue}`);
        }
        return content;
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
    
    if (characters.length < 2) {
        new Notice("Mindestens 2 Charaktere mit Statblocks benötigt!");
        return;
    }
    
    // Parse effects from encounter file
    const encounterContentForEffects = await app.vault.read(activeFile);
    const effectsData = parseEffectsBlock(encounterContentForEffects);
    
    // Step 1: Select attacker
    const attackerNames = characters.map(c => c.name);
    const attackerName = await quickAddApi.suggester(attackerNames, attackerNames);
    if (!attackerName) return;
    
    const attacker = characters.find(c => c.name === attackerName);
    
    // Step 2: Select ranged weapon
    const weapons = attacker.data.fernkampfwaffen || [];
    if (weapons.length === 0) {
        new Notice(`${attackerName} hat keine Fernkampfwaffen!`);
        return;
    }
    
    const weaponNames = weapons.map(w => `${w.name} (${w.tp})`);
    const weaponChoice = await quickAddApi.suggester(weaponNames, weapons);
    if (!weaponChoice) return;
    
    const weapon = weaponChoice;
    const isThrown = String(weapon.kampftechnik || '').toLowerCase().includes('wurf');
    
    // Step 3: Select target
    const targetNames = characters.filter(c => c.name !== attackerName).map(c => c.name);
    const targetName = await quickAddApi.suggester(targetNames, targetNames);
    if (!targetName) return;
    
    const target = characters.find(c => c.name === targetName);
    
    // Step 3b: Get target's creature type for hit zones
    const targetCreatureType = await getCreatureType(target.data, quickAddApi);
    
    // Step 3c: Choose attack type (normal or targeted)
    const attackTypeOptions = [
        "🏹 Normaler Angriff",
        "🎯 Gezielter Schuss: Kopf (−10)",
        "🎯 Gezielter Schuss: Torso (−4)",
        "🎯 Gezielter Schuss: Arme (−8)",
        "🎯 Gezielter Schuss: Beine (−8)"
    ];
    const attackTypeValues = [
        { targeted: false, zone: null, penalty: 0 },
        { targeted: true, zone: "Kopf", penalty: -10 },
        { targeted: true, zone: "Torso", penalty: -4 },
        { targeted: true, zone: "Arm", penalty: -8 },
        { targeted: true, zone: "Bein", penalty: -8 }
    ];
    
    const attackTypeChoice = await quickAddApi.suggester(attackTypeOptions, attackTypeValues);
    if (!attackTypeChoice) return;
    
    const isTargetedAttack = attackTypeChoice.targeted;
    const targetedZone = attackTypeChoice.zone;
    const targetedPenalty = attackTypeChoice.penalty;
    
    // Step 3d: Attack mode (normal or against player)
    const attackModeOptions = [
        "🎲 Normal (Skript würfelt Verteidigung)",
        "👤 Gegen Spieler (Spieler würfelt selbst)"
    ];
    const attackMode = await quickAddApi.suggester(attackModeOptions, ['normal', 'against_player']);
    if (!attackMode) return;
    const isAgainstPlayer = attackMode === 'against_player';
    
    // Step 4-9: Combat situation modifiers using consolidated dialogs
    
    // Define mandatory modifier categories (one must be selected from each)
    const mandatoryCategories = [
        {
            name: "Distanz",
            prefix: "📍",
            removeOnSelect: true,
            options: [
                { label: "Nah (+2 FK, +1 TP)", fk: 2, tp: 1 },
                { label: "Mittel (+/-0)", fk: 0, tp: 0 },
                { label: "Weit (-2 FK, -1 TP)", fk: -2, tp: -1 }
            ]
        },
        {
            name: "Größe",
            prefix: "📏",
            removeOnSelect: true,
            options: [
                { label: "Winzig (-8 FK) - Ratte, Kröte, Spatz", fk: -8 },
                { label: "Klein (-4 FK) - Rehkitz, Schaf, Ziege", fk: -4 },
                { label: "Mittel (+/-0) - Mensch, Zwerg, Esel", fk: 0 },
                { label: "Groß (+4 FK) - Oger, Troll, Rind", fk: 4 },
                { label: "Riesig (+8 FK) - Drache, Riese, Elefant", fk: 8 }
            ]
        },
        {
            name: "Zielbewegung",
            prefix: "🎯",
            removeOnSelect: true,
            options: [
                { label: "Ziel steht still (+2 FK)", fk: 2 },
                { label: "Ziel bewegt sich leicht (+/-0)", fk: 0 },
                { label: "Ziel bewegt sich schnell (-2 FK)", fk: -2 },
                { label: "Ziel schlägt Haken (-4 FK)", fk: -4 }
            ]
        },
        {
            name: "Schützenbewegung",
            prefix: "🏃",
            removeOnSelect: true,
            options: [
                { label: "Schütze steht still (+/-0)", fk: 0 },
                { label: "Schütze geht (-2 FK)", fk: -2 },
                { label: "Schütze rennt (-4 FK)", fk: -4 }
            ]
        }
    ];
    
    // Define optional modifier categories (can select multiple or none)
    const optionalCategories = [
        {
            name: "Sicht",
            prefix: "👁️",
            removeOnSelect: true,
            options: [
                { label: "Leichte Störung (-2 FK) - leichtes Blattwerk, Morgendunst", fk: -2, luckyOnly: false },
                { label: "Silhouette erkennbar (-4 FK) - Nebel, Mondlicht", fk: -4, luckyOnly: false },
                { label: "Schemenhaft erkennbar (-6 FK) - starker Nebel, Sternenlicht", fk: -6, luckyOnly: false },
                { label: "Ziel unsichtbar (nur 1 auf W20) - dichter Rauch, völlige Dunkelheit", fk: 0, luckyOnly: true }
            ]
        },
        {
            name: "Zielen",
            prefix: "🎯",
            removeOnSelect: true,
            options: [
                { label: "Gezielt +2 (1 Aktion)", fk: 2, desc: "Gezielt" },
                { label: "Gezielt +4 (2 Aktionen)", fk: 4, desc: "Doppelt gezielt" }
            ]
        },
        {
            name: "Kampfgetümmel",
            prefix: "⚔️",
            removeOnSelect: true,
            options: [
                { label: "Schuss ins Kampfgetümmel (-2 FK)", fk: -2, desc: "Kampfgetümmel" }
            ]
        },
        {
            name: "Reiten",
            prefix: "🐴",
            removeOnSelect: true,
            options: [
                { label: "Vom Pferd im Schritt (-4 FK)", fk: -4, desc: "Pferd Schritt" },
                { label: "Vom Pferd im Galopp (-8 FK)", fk: -8, desc: "Pferd Galopp" }
            ]
        },
        {
            name: "Position",
            prefix: "⬆️",
            removeOnSelect: true,
            options: [
                { label: "Vorteilhafte Position Angreifer (+2 FK/VW)", attackerBonus: 2, defenderBonus: 0 },
                { label: "Vorteilhafte Position Verteidiger (+2 VW)", attackerBonus: 0, defenderBonus: 2 }
            ]
        },
        {
            name: "Eigener FK-Mod",
            prefix: "🔢",
            removeOnSelect: true,
            options: [
                { label: "Eigener FK-Modifikator eingeben...", isCustom: true, forFK: true }
            ]
        },
        {
            name: "Eigener VW-Mod",
            prefix: "🔢",
            removeOnSelect: true,
            options: [
                { label: "Eigener VW-Modifikator eingeben...", isCustom: true, forDef: true }
            ]
        },
        {
            name: "Eigener TP-Mod",
            prefix: "🔢",
            removeOnSelect: true,
            options: [
                { label: "Eigener TP-Modifikator eingeben...", isCustom: true, forTP: true }
            ]
        }
    ];
    
    // Select mandatory modifiers
    const mandatorySelections = await selectFromCategories(mandatoryCategories, true);
    
    // Select optional modifiers
    const optionalSelections = await selectFromCategories(optionalCategories, false);
    
    // Process mandatory selections
    const distance = mandatorySelections["Distanz"]?.[0] || { fk: 0, tp: 0 };
    const size = mandatorySelections["Größe"]?.[0] || { fk: 0 };
    const movement = mandatorySelections["Zielbewegung"]?.[0] || { fk: 0 };
    const shooterMov = mandatorySelections["Schützenbewegung"]?.[0] || { fk: 0 };
    
    // Process optional selections
    const sight = optionalSelections["Sicht"]?.[0] || { fk: 0, luckyOnly: false };
    
    // Gather all extra FK mods from optional selections
    let extraMod = 0;
    let extraDescs = [];
    
    if (optionalSelections["Zielen"]?.[0]) {
        extraMod += optionalSelections["Zielen"][0].fk || 0;
        extraDescs.push(optionalSelections["Zielen"][0].desc);
    }
    if (optionalSelections["Kampfgetümmel"]?.[0]) {
        extraMod += optionalSelections["Kampfgetümmel"][0].fk || 0;
        extraDescs.push(optionalSelections["Kampfgetümmel"][0].desc);
    }
    if (optionalSelections["Reiten"]?.[0]) {
        extraMod += optionalSelections["Reiten"][0].fk || 0;
        extraDescs.push(optionalSelections["Reiten"][0].desc);
    }
    
    const advantageMods = optionalSelections["Position"]?.[0] || { attackerBonus: 0, defenderBonus: 0 };
    
    // Handle custom FK modifier
    if (optionalSelections["Eigener FK-Mod"]?.[0]?.isCustom) {
        const customFKStr = await quickAddApi.inputPrompt("Eigener FK-Modifikator:", "0");
        const customFK = parseInt(customFKStr) || 0;
        extraMod += customFK;
        if (customFK !== 0) extraDescs.push("Eigener");
    }
    
    // Handle custom VW modifier
    let targetExtraMod = 0;
    if (optionalSelections["Eigener VW-Mod"]?.[0]?.isCustom) {
        const customDefStr = await quickAddApi.inputPrompt("Eigener VW-Modifikator:", "0");
        targetExtraMod = parseInt(customDefStr) || 0;
    }
    
    // Handle custom TP modifier
    let customTPMod = 0;
    if (optionalSelections["Eigener TP-Mod"]?.[0]?.isCustom) {
        const customTPStr = await quickAddApi.inputPrompt("Eigener TP-Modifikator:", "0");
        customTPMod = parseInt(customTPStr) || 0;
    }
    
    const extraDesc = extraDescs.join(", ");
    
    // Step 10: Can target defend?
    const canDefend = await quickAddApi.suggester(
        [
            `✅ Ja, kann verteidigen (Schild-PA oder AW)`,
            "❌ Nein (überrascht, handlungsunfähig, etc.)"
        ],
        [true, false]
    );
    
    let defenseType = null;
    let defenseValue = 0;
    let defenseCount = 0;
    let hasShield = false;
    let defenseWeapon = null;
    
    if (canDefend) {
        // Defense type selection
        const awValue = calculateAW(target.data);
        
        // Check for shield in nahkampfwaffen (kampftechnik "Schilde")
        const nahkampfwaffen = target.data.nahkampfwaffen || [];
        const shields = nahkampfwaffen.filter(w => {
            const tech = String(w.kampftechnik || '').toLowerCase();
            return tech === 'schilde';
        });
        hasShield = shields.length > 0;
        
        const defenseOptions = [];
        const defenseValues = [];
        
        if (hasShield) {
            // Calculate shield PA: KTW/2 + KK bonus + pa_mod
            const ktw = getKtwValue(target.data.kampftechniken, 'schilde');
            const kk = parseInt(target.data.kk) || 8;
            const kkBonus = kk <= 8 ? 0 : Math.floor((kk - 8) / 3);
            const paMod = parseInt(shields[0].pa_mod) || 0;
            const shieldPA = Math.ceil(ktw / 2) + kkBonus + paMod;
            defenseOptions.push(`🛡️ Schild-Parade (PA: ${shieldPA}) - ${shields[0].name}`);
            defenseValues.push({ type: 'PA', value: shieldPA, isShield: true, weapon: shields[0] });
        }
        
        defenseOptions.push(`🏃 Ausweichen (AW: ${awValue})`);
        defenseValues.push({ type: 'AW', value: awValue, isShield: false, weapon: null });
        
        const defenseChoice = await quickAddApi.suggester(defenseOptions, defenseValues);
        if (!defenseChoice) return;
        
        defenseType = defenseChoice.type;
        defenseValue = defenseChoice.value;
        defenseWeapon = defenseChoice.weapon;
        
        // Defense count
        const defCountStr = await quickAddApi.inputPrompt(
            "Wievielte Verteidigung diese Runde? (1 = erste, 2 = zweite, etc.)",
            "1"
        );
        defenseCount = parseInt(defCountStr) || 1;
    }
    
    // ========================================
    // CALCULATE FK AND ATTACK
    // ========================================
    
    // Get effect modifiers
    const attackerEffects = getEffectModifiers(effectsData, attackerName);
    const targetEffects = getEffectModifiers(effectsData, targetName);
    
    const attackerConditionPenalty = getConditionPenalty(attacker.data.conditions);
    const targetConditionPenalty = getConditionPenalty(target.data.conditions);
    
    // Add temporary condition levels from effects to penalty (max 5 total)
    const attackerEffectConditions = attackerEffects.schmerz + attackerEffects.betaeubung + 
        attackerEffects.furcht + attackerEffects.paralyse + attackerEffects.verwirrung;
    const targetEffectConditions = targetEffects.schmerz + targetEffects.betaeubung + 
        targetEffects.furcht + targetEffects.paralyse + targetEffects.verwirrung;
    
    const totalAttackerPenalty = Math.min(5, attackerConditionPenalty + attackerEffectConditions);
    const totalTargetPenalty = Math.min(5, targetConditionPenalty + targetEffectConditions);
    
    // Calculate base FK (without effect modifier - effects logged separately)
    const baseFK = calculateFK(attacker.data, weapon, attacker.data.kampftechniken);
    const effectFKMod = attackerEffects.fk_mod || 0;
    
    // Calculate all FK modifiers
    let totalFKMod = 0;
    totalFKMod += distance.fk;
    totalFKMod += size.fk;
    totalFKMod += movement.fk;
    totalFKMod += shooterMov.fk;
    totalFKMod += sight.fk;
    totalFKMod += extraMod;
    totalFKMod += advantageMods.attackerBonus;
    totalFKMod += targetedPenalty;
    totalFKMod -= totalAttackerPenalty;
    
    const finalFK = baseFK + effectFKMod + totalFKMod;
    
    // ========================================
    // COMBAT RESOLUTION
    // ========================================
    
    let encounterContent = await app.vault.read(activeFile);
    let logEntry = `\n### 🏹 Fernkampfangriff: ${attackerName} → ${targetName}\n\n`;
    
    // Log weapon and modifiers
    logEntry += `**Waffe:** ${weapon.name} (${weapon.tp}) | **Typ:** ${isThrown ? 'Wurfwaffe' : 'Schusswaffe'}`;
    if (isTargetedAttack) logEntry += ` | **Gezielt:** ${targetedZone}`;
    logEntry += `\n\n`;
    logEntry += `**Reichweite:** ${distance.name} | **Größe:** ${size.name} | **Bewegung:** ${movement.name}\n\n`;
    logEntry += `**FK-Berechnung:** Basis ${baseFK}`;
    if (effectFKMod !== 0) logEntry += ` ${effectFKMod > 0 ? '+' : ''}${effectFKMod} (Effekte)`;
    if (distance.fk !== 0) logEntry += ` ${distance.fk > 0 ? '+' : ''}${distance.fk} (Reichweite)`;
    if (size.fk !== 0) logEntry += ` ${size.fk > 0 ? '+' : ''}${size.fk} (Größe)`;
    if (movement.fk !== 0) logEntry += ` ${movement.fk > 0 ? '+' : ''}${movement.fk} (Zielbewegung)`;
    if (shooterMov.fk !== 0) logEntry += ` ${shooterMov.fk} (Schützenbewegung)`;
    if (sight.fk !== 0) logEntry += ` ${sight.fk} (Sicht)`;
    if (extraMod !== 0) logEntry += ` ${extraMod > 0 ? '+' : ''}${extraMod} (${extraDesc})`;
    if (advantageMods.attackerBonus !== 0) logEntry += ` +${advantageMods.attackerBonus} (Vorteilh. Position)`;
    if (targetedPenalty !== 0) logEntry += ` ${targetedPenalty} (Gezielt: ${targetedZone})`;
    if (totalAttackerPenalty > 0) logEntry += ` -${totalAttackerPenalty} (Zustände)`;
    logEntry += ` = **${finalFK}**\n\n`;
    
    // Roll attack
    const attackRoll = roll1d20();
    
    // Check for lucky shot requirement (invisible target)
    if (sight.luckyOnly) {
        logEntry += `**⚠️ Unsichtbares Ziel:** Nur Treffer bei gewürfelter 1!\n\n`;
        if (attackRoll !== 1) {
            logEntry += `**Attacke-Wurf:** 🎲 ${attackRoll} → **Automatisch verfehlt**\n\n`;
            logEntry += `\n---\n\n`;
            encounterContent += logEntry;
            await app.vault.modify(activeFile, encounterContent);
            new Notice(`🎯 ${attackerName} verfehlt das unsichtbare Ziel!`);
            return;
        }
    }
    
    logEntry += `**Attacke-Wurf:** 🎲 ${attackRoll} gegen FK ${finalFK}\n\n`;
    
    let attackResult = "Verfehlt";
    let isCrit = false;
    let isFumble = false;
    let defenseHalved = false;
    let damageMultiplier = 1;
    
    let critResult = null;
    let critTPBonus = 0;
    let critTPMult = 1;
    let critEffects = [];
    
    // Check for crit or fumble
    if (attackRoll === 1) {
        const confirmRoll = roll1d20();
        logEntry += `**Kritisch! Bestätigung:** 🎲 ${confirmRoll} gegen FK ${finalFK}\n\n`;
        
        if (confirmRoll <= finalFK) {
            isCrit = true;
            defenseHalved = true;
            
            // Roll on critical tables
            critResult = rollCrit();
            while (critResult.needsReroll) {
                critResult = rollCrit();
            }
            
            logEntry += `**Krit-Kategorie:** ${critResult.categoryRoll.rolls.join('+')}=${critResult.categoryRoll.total} → ${critResult.categoryName}\n\n`;
            logEntry += `**Krit-Detail:** 🎲 ${critResult.detailRoll} → ${critResult.detail.desc}\n\n`;
            
            // Extract damage modifiers from crit result
            if (critResult.detail.tpBonus) critTPBonus = critResult.detail.tpBonus;
            if (critResult.detail.tpMult) critTPMult = critResult.detail.tpMult;
            
            // Collect effects to apply
            if (critResult.detail.effect) critEffects.push(critResult.detail.effect);
            if (critResult.detail.effect2) critEffects.push(critResult.detail.effect2);
            if (critResult.detail.status) critEffects.push({ type: "Status", name: critResult.detail.status });
            if (critResult.detail.probe) critEffects.push({ type: "Probe", probe: critResult.detail.probe, failStatus: critResult.detail.failStatus });
            if (critResult.detail.vwPenalty) critEffects.push({ type: "VW-Malus", value: critResult.detail.vwPenalty, kr: 1 });
            
            attackResult = "Kritischer Treffer (bestätigt)";
            damageMultiplier = critTPMult;
        } else {
            attackResult = "Treffer (Kritisch unbestätigt)";
            defenseHalved = true;
        }
    } else if (attackRoll === 20) {
        const confirmRoll = roll1d20();
        logEntry += `**Patzer! Bestätigung:** 🎲 ${confirmRoll} gegen FK ${finalFK}\n\n`;
        
        if (confirmRoll > finalFK) {
            isFumble = true;
            attackResult = "Patzer (bestätigt)";
            
            let fumbleResult = rollAttackFumble();
            while (fumbleResult.needsReroll) {
                fumbleResult = rollAttackFumble();
            }
            
            logEntry += `**Patzer-Kategorie:** ${fumbleResult.categoryRoll.rolls.join('+')}=${fumbleResult.categoryRoll.total} → ${fumbleResult.category}\n\n`;
            logEntry += `**Patzer-Detail:** 🎲 ${fumbleResult.detailRoll} → ${fumbleResult.detail}\n\n`;
            
            // Parse and add fumble effects
            const fumbleEffects = parseFumbleEffect(fumbleResult.detail, fumbleResult.category);
            for (const effect of fumbleEffects) {
                encounterContent = await addEffectToEncounter(encounterContent, attackerName, effect);
                logEntry += `> ⚡ Effekt hinzugefügt: ${effect.name} für ${effect.kr} KR\n\n`;
            }
        } else {
            attackResult = "Verfehlt (Patzer nicht bestätigt)";
        }
    } else if (attackRoll <= finalFK) {
        attackResult = "Treffer";
    }
    
    logEntry += `**Ergebnis:** ${attackResult}\n\n`;
    
    // Process hit
    let damageDealt = 0;
    let targetNewLE = parseInt(target.data.le) || 0;
    
    if (!isFumble && attackRoll <= finalFK) {
        let defenseSuccessful = false;
        
        if (canDefend && defenseType) {
            // Apply ranged defense penalty
            const rangedDefPenalty = isThrown ? 2 : 4;
            const defensePenalty = (defenseCount - 1) * 3;
            // Add effect modifiers to defense value
            const effectDefenseMod = defenseType === 'AW' ? targetEffects.aw_mod : targetEffects.pa_mod;
            let effectiveDefense = defenseValue + effectDefenseMod - rangedDefPenalty - totalTargetPenalty - defensePenalty + advantageMods.defenderBonus + targetExtraMod;
            
            if (defenseHalved) {
                effectiveDefense = Math.floor(effectiveDefense / 2);
            }
            
            // Build defense label with weapon/Kampftechnik info
            let defenseLabel = defenseType;
            if (defenseType === 'PA' && defenseWeapon) {
                const kt = defenseWeapon.kampftechnik || 'Schilde';
                defenseLabel = `PA mit ${defenseWeapon.name}, KT: ${kt}`;
            } else if (defenseType === 'AW') {
                defenseLabel = 'Ausweichen';
            }
            
            logEntry += `**Verteidigung (${defenseLabel}):** Basis ${defenseValue}`;
            if (effectDefenseMod !== 0) logEntry += ` ${effectDefenseMod > 0 ? '+' : ''}${effectDefenseMod} (Effekte)`;
            logEntry += ` - ${rangedDefPenalty} (${isThrown ? 'Wurfwaffe' : 'Schusswaffe'})`;
            if (totalTargetPenalty > 0) logEntry += ` -${totalTargetPenalty} (Zustände)`;
            if (defensePenalty > 0) logEntry += ` -${defensePenalty} (${defenseCount}. VW)`;
            if (advantageMods.defenderBonus !== 0) logEntry += ` +${advantageMods.defenderBonus} (Vorteilh. Position)`;
            if (targetExtraMod !== 0) logEntry += ` ${targetExtraMod > 0 ? '+' : ''}${targetExtraMod} (Eigener)`;
            if (defenseHalved) logEntry += ` ÷2 (Krit)`;
            logEntry += ` = **${effectiveDefense}**\n\n`;
            
            // Against Player mode: player rolls their own dice
            if (isAgainstPlayer) {
                logEntry += `**Ziel-VW:** ${effectiveDefense} (Spieler würfelt selbst)\n\n`;
                
                // Prompt GM for player's defense result
                const playerDefenseResult = await quickAddApi.suggester(
                    [
                        `✅ Verteidigung erfolgreich (Wurf ≤ ${effectiveDefense})`,
                        `❌ Verteidigung fehlgeschlagen (Wurf > ${effectiveDefense})`,
                        `🎯 Kritische Verteidigung (1 gewürfelt + bestätigt)`,
                        `💥 Verteidigung gepatzt (20 gewürfelt + bestätigt)`
                    ],
                    ['success', 'fail', 'crit', 'fumble']
                );
                
                if (playerDefenseResult === 'success') {
                    defenseSuccessful = true;
                    logEntry += `**Spieler-Wurf:** Erfolg ✅\n\n`;
                    logEntry += `**Ergebnis:** Verteidigung erfolgreich.\n\n`;
                } else if (playerDefenseResult === 'crit') {
                    defenseSuccessful = true;
                    logEntry += `**Spieler-Wurf:** Kritische Verteidigung! 🎯\n\n`;
                    logEntry += `**Ergebnis:** Kritische Verteidigung! Nächste VW nicht um 3 erschwert.\n\n`;
                } else if (playerDefenseResult === 'fumble') {
                    defenseSuccessful = false;
                    logEntry += `**Spieler-Wurf:** Patzer! 💥\n\n`;
                    // Roll fumble table for player
                    const isDodge = defenseType === 'AW';
                    let defFumble = rollDefenseFumble(isDodge);
                    while (defFumble.needsReroll) {
                        defFumble = rollDefenseFumble(isDodge);
                    }
                    let fumbleRollStr = `${defFumble.categoryRoll.rolls.join('+')}=${defFumble.originalResult}`;
                    if (defFumble.wasAdjusted) {
                        fumbleRollStr += ` (+5 AW) → ${defFumble.adjustedResult}`;
                    }
                    logEntry += `**VW-Patzer-Kategorie:** ${fumbleRollStr} → ${defFumble.category}\n\n`;
                    logEntry += `**VW-Patzer-Detail:** 🎲 ${defFumble.detailRoll} → ${defFumble.detail}\n\n`;
                } else {
                    defenseSuccessful = false;
                    logEntry += `**Spieler-Wurf:** Fehlgeschlagen ❌\n\n`;
                    logEntry += `**Ergebnis:** Verteidigung fehlgeschlagen.\n\n`;
                }
            } else {
                // Normal mode: script rolls defense
                const defenseRoll = roll1d20();
                logEntry += `**VW-Wurf:** 🎲 ${defenseRoll} gegen ${defenseType} ${effectiveDefense}\n\n`;
                
                // Check defense crit/fumble
                if (defenseRoll === 1) {
                    const confirmRoll = roll1d20();
                    logEntry += `**Kritische Verteidigung! Bestätigung:** 🎲 ${confirmRoll}\n\n`;
                    if (confirmRoll <= effectiveDefense) {
                        defenseSuccessful = true;
                        logEntry += `**Ergebnis:** Kritische Verteidigung! Nächste VW nicht um 3 erschwert.\n\n`;
                    } else {
                        defenseSuccessful = true;
                        logEntry += `**Ergebnis:** Verteidigung erfolgreich. Nächste VW nur um 2 erschwert.\n\n`;
                    }
                } else if (defenseRoll === 20) {
                    const confirmRoll = roll1d20();
                    logEntry += `**VW-Patzer! Bestätigung:** 🎲 ${confirmRoll}\n\n`;
                    if (confirmRoll > effectiveDefense) {
                        // Defense fumble - use the detailed tables
                        const isDodge = defenseType === 'AW';
                        let defFumble = rollDefenseFumble(isDodge);
                        while (defFumble.needsReroll) {
                            defFumble = rollDefenseFumble(isDodge);
                        }
                        
                        // Log the fumble with details
                        let fumbleRollStr = `${defFumble.categoryRoll.rolls.join('+')}=${defFumble.originalResult}`;
                        if (defFumble.wasAdjusted) {
                            fumbleRollStr += ` (+5 AW) → ${defFumble.adjustedResult}`;
                        }
                        logEntry += `**VW-Patzer-Kategorie:** ${fumbleRollStr} → ${defFumble.category}\n\n`;
                        logEntry += `**VW-Patzer-Detail:** 🎲 ${defFumble.detailRoll} → ${defFumble.detail}\n\n`;
                        defenseSuccessful = false;
                    } else {
                        defenseSuccessful = false;
                        logEntry += `**Ergebnis:** Verteidigung fehlgeschlagen.\n\n`;
                    }
                } else if (defenseRoll <= effectiveDefense) {
                    defenseSuccessful = true;
                    logEntry += `**Ergebnis:** Verteidigung erfolgreich.\n\n`;
                } else {
                    defenseSuccessful = false;
                    logEntry += `**Ergebnis:** Verteidigung fehlgeschlagen.\n\n`;
                }
            }
        }
        
        // Calculate damage if defense failed
        if (!defenseSuccessful) {
            // Determine hit zone
            let hitZone;
            let zoneRoll = null;
            
            if (isTargetedAttack && targetedZone) {
                // Targeted attack - use specified zone
                hitZone = targetedZone;
                // For arms/legs, randomly determine left/right
                if (hitZone === "Arm" || hitZone === "Bein") {
                    const sideRoll = roll1d20();
                    const side = sideRoll % 2 === 0 ? "rechter" : "linker";
                    hitZone = `${side} ${hitZone}`;
                }
                logEntry += `**Trefferzone:** ${hitZone} (gezielt)\n\n`;
            } else {
                // Random hit zone
                zoneRoll = roll1d20();
                hitZone = determineHitZone(zoneRoll, targetCreatureType);
                logEntry += `**Trefferzone:** 🎲 ${zoneRoll} → ${hitZone}\n\n`;
            }
            
            const tpResult = rollDice(weapon.tp);
            let baseDamage = tpResult.total;
            
            // Apply distance TP modifier
            baseDamage += distance.tp;
            
            // Apply custom TP modifier
            baseDamage += customTPMod;
            
            // Apply crit TP bonus
            baseDamage += critTPBonus;
            
            // Get target RS
            const targetRS = getTotalRS(target.data.ruestungen);
            
            // Calculate final damage (apply crit multiplier)
            let totalTP = critTPMult > 1 ? Math.ceil(baseDamage * critTPMult) : baseDamage;
            damageDealt = Math.max(0, totalTP - targetRS);
            
            logEntry += `**Schaden:** ${weapon.tp}`;
            if (tpResult.rolls.length > 0) logEntry += ` (${tpResult.rolls.join('+')})`;
            logEntry += ` = ${tpResult.total}`;
            if (distance.tp !== 0) logEntry += ` ${distance.tp > 0 ? '+' : ''}${distance.tp} (Reichweite)`;
            if (customTPMod !== 0) logEntry += ` ${customTPMod > 0 ? '+' : ''}${customTPMod} (Mod)`;
            if (critTPBonus > 0) logEntry += ` + ${critTPBonus} (Krit)`;
            if (critTPMult > 1) logEntry += ` × ${critTPMult} (Krit)`;
            logEntry += ` = ${totalTP} TP`;
            logEntry += ` - ${targetRS} RS = **${damageDealt} SP**\n\n`;
            
            // Log and apply critical effects
            if (critEffects.length > 0) {
                for (const eff of critEffects) {
                    if (eff.type === "Status") {
                        logEntry += `> ⚡ **${targetName}** erhält Status: **${eff.name}**\n\n`;
                    } else if (eff.type === "Probe") {
                        logEntry += `> 🎯 **${targetName}** muss Probe auf ${eff.probe} bestehen, sonst: ${eff.failStatus}\n\n`;
                    } else if (eff.type === "VW-Malus") {
                        logEntry += `> ⚡ **${targetName}** erhält -${eff.value} VW bis Ende nächster KR\n\n`;
                        const vwEffect = { name: `Krit: -${eff.value} VW`, vw_mod: -eff.value, kr: 1 };
                        encounterContent = await addEffectToEncounter(encounterContent, targetName, vwEffect);
                    } else if (eff.type && eff.level) {
                        const duration = eff.duration || `${eff.kr} KR`;
                        logEntry += `> ⚡ **${targetName}** erhält ${eff.level} Stufe(n) ${eff.type} für ${duration}\n\n`;
                        const condEffect = { 
                            name: `Krit: ${eff.type}`, 
                            [eff.type.toLowerCase()]: eff.level, 
                            kr: eff.kr || 999 
                        };
                        encounterContent = await addEffectToEncounter(encounterContent, targetName, condEffect);
                    }
                }
            }
            
            // Check Wundschwelle and apply Schlimme Verletzungen
            const targetKO = parseInt(target.data.ko) || 10;
            const wundschwelle = calculateWundschwelle(targetKO);
            const woundMultiple = Math.floor(damageDealt / wundschwelle);
            
            let injuryExtraDamage = 0;
            let isDeadFromExtrem = false;
            
            if (damageDealt >= wundschwelle) {
                logEntry += `**Wundschwelle:** ${wundschwelle} | Schaden: ${damageDealt} SP`;
                if (woundMultiple > 1) logEntry += ` (${woundMultiple}× Schwelle)`;
                logEntry += `\n\n`;
                
                // Roll for specific injury
                const injuryRoll = roll1d6();
                const baseZone = getBaseZone(hitZone);
                const injury = getInjuryForZone(baseZone, injuryRoll);
                
                // Check for Extrem schlimme Verletzung
                // Get current zone's schlimme count BEFORE this new injury
                const normalizedZoneForExtrem = normalizeZoneName(hitZone);
                const zoneValuesForExtrem = parseZoneValues(encounterContent, targetName, normalizedZoneForExtrem);
                const currentSchlimme = zoneValuesForExtrem ? zoneValuesForExtrem.schlimmeCount : 0;
                const extremThreshold = baseZone === 'Torso' ? 3 : 1;
                const isExtrem = currentSchlimme >= extremThreshold;
                
                if (isExtrem && injury.extrem) {
                    // EXTREM SCHLIMME VERLETZUNG
                    logEntry += `\n## ⚠️ EXTREM SCHLIMME VERLETZUNG ⚠️\n\n`;
                    logEntry += `**${injury.name}:** ${injury.extrem.desc}\n\n`;
                    
                    if (injury.extrem.death) {
                        logEntry += `\n## ☠️ TOD ☠️\n\n`;
                        logEntry += `**${targetName}** stirbt an der extrem schlimmen Verletzung!\n\n`;
                        isDeadFromExtrem = true;
                    }
                } else {
                    // Normal Schlimme Verletzung
                    logEntry += `**Schlimme Verletzung (${hitZone}):** 🎲 ${injuryRoll} → ${injury.name}\n\n`;
                    logEntry += `**Effekt:** ${injury.desc}\n\n`;
                    
                    // Apply injury effects
                    if (injury.effect) {
                        // Extra damage
                        if (injury.effect.extraDamage) {
                            if (injury.effect.extraDamage === "1W3") {
                                injuryExtraDamage = roll1d3();
                            } else if (injury.effect.extraDamage === "1W6") {
                                injuryExtraDamage = Math.floor(Math.random() * 6) + 1;
                            }
                            logEntry += `> 💥 Zusätzlicher Schaden: +${injuryExtraDamage} SP\n\n`;
                            damageDealt += injuryExtraDamage;
                        }
                        
                        // Temporary combat modifiers (AT, PA, VW)
                        if (injury.effect.at_mod || injury.effect.pa_mod || injury.effect.vw_mod) {
                            const injuryEffect = {
                                name: `Verletzung: ${injury.name}`,
                                kr: injury.effect.kr || 1
                            };
                            if (injury.effect.at_mod) injuryEffect.at_mod = injury.effect.at_mod;
                            if (injury.effect.pa_mod) injuryEffect.pa_mod = injury.effect.pa_mod;
                            if (injury.effect.vw_mod) {
                                injuryEffect.pa_mod = (injuryEffect.pa_mod || 0) + injury.effect.vw_mod;
                                injuryEffect.aw_mod = injury.effect.vw_mod;
                            }
                            encounterContent = await addEffectToEncounter(encounterContent, targetName, injuryEffect);
                            
                            let modStr = [];
                            if (injury.effect.at_mod) modStr.push(`AT ${injury.effect.at_mod}`);
                            if (injury.effect.pa_mod) modStr.push(`PA ${injury.effect.pa_mod}`);
                            if (injury.effect.vw_mod) modStr.push(`VW ${injury.effect.vw_mod}`);
                            logEntry += `> ⚡ **${targetName}** erhält ${modStr.join(', ')} für ${injury.effect.kr} KR\n\n`;
                        }
                        
                        // Conditions (Schmerz, Betäubung, Verwirrung)
                        if (injury.effect.condition) {
                            const condEffect = {
                                name: `Verletzung: ${injury.name}`,
                                [injury.effect.condition.toLowerCase()]: injury.effect.level,
                                kr: 999 // Long duration, marked with note
                            };
                            encounterContent = await addEffectToEncounter(encounterContent, targetName, condEffect);
                            logEntry += `> ⚡ **${targetName}** erhält ${injury.effect.level} Stufe(n) ${injury.effect.condition} (${injury.effect.duration})\n\n`;
                        }
                        
                        // Status effects (Liegend, Gegenstand fallen gelassen)
                        if (injury.effect.status) {
                            logEntry += `> ⚠️ **${targetName}** erhält Status: **${injury.effect.status}**`;
                            if (injury.effect.duration) logEntry += ` (${injury.effect.duration})`;
                            logEntry += `\n\n`;
                        }
                    }
                }
            }
            
            // Update target LE
            const currentLE = parseInt(target.data.le) || calculateMaxLE(target.data);
            targetNewLE = currentLE - damageDealt;
            const maxLE = calculateMaxLE(target.data);
            
            logEntry += `**LE:** ${currentLE} → ${targetNewLE}/${maxLE}\n\n`;
            
            // Check for pain from LE
            const oldPain = calculatePainFromLE(currentLE, maxLE);
            const newPain = calculatePainFromLE(targetNewLE, maxLE);
            
            if (newPain > oldPain) {
                logEntry += `**Schmerz durch LeP:** +${newPain - oldPain} Stufe(n) → Stufe ${newPain}\n\n`;
                // GS penalty from pain
                const baseGS = parseInt(target.data.gs) || 8;
                const effectiveGS = Math.max(0, baseGS - newPain);
                logEntry += `**GS:** ${baseGS} → ${effectiveGS} (−${newPain} durch Schmerz)\n\n`;
            }
            
            if (newPain >= 4) {
                logEntry += `**⚠️ ${targetName} ist handlungsunfähig! (Schmerz Stufe IV)**\n\n`;
            } else if (targetNewLE <= 0) {
                logEntry += `**⚠️ ${targetName} liegt im Sterben!**\n\n`;
            }
            
            // Update target's character file
            let targetContent = target.content;
            targetContent = updateStatblockValue(targetContent, 'le', targetNewLE);
            
            // Update pain condition
            if (newPain !== oldPain) {
                targetContent = updateConditionLevel(targetContent, 'Schmerz durch LeP', newPain);
                // Also update the condition table in the encounter file
                const noteForTable = newPain > 0 ? `GS −${newPain}` : '';
                encounterContent = updateEncounterConditionTable(encounterContent, targetName, 'Schmerz durch LeP', newPain, noteForTable);
                // Update the Handlungsunfähig warning
                encounterContent = updateHandlungsunfaehigWarning(encounterContent, targetName, newPain);
            }
            
            // Update the stats table (LE, GS) in the encounter file
            const charBaseGS = parseInt(target.data.gs) || 8;
            const effectiveGS = Math.max(0, charBaseGS - newPain);
            const gsDisplay = newPain > 0 ? `${charBaseGS}→${effectiveGS}` : `${charBaseGS}`;
            encounterContent = updateEncounterStatsTable(encounterContent, targetName, targetNewLE, maxLE, gsDisplay);
            
            // Update the Lebensenergiezonen table
            if (hitZone && !isDeadFromExtrem) {
                const normalizedZone = normalizeZoneName(hitZone);
                const baseZoneForDeath = getBaseZone(hitZone);
                const zoneValues = parseZoneValues(encounterContent, targetName, normalizedZone);
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
                    encounterContent = updateEncounterZoneTable(encounterContent, targetName, normalizedZone, newZoneLeP, newSchlimmeCount, newStatus);
                    logEntry += `**Zone ${normalizedZone}:** ${zoneValues.currentLeP} → ${newZoneLeP}/${zoneValues.maxLeP}`;
                    if (newSchlimmeCount > zoneValues.schlimmeCount) logEntry += ` | Schlimme Verl.: ${newSchlimmeCount}`;
                    if (newStatus !== 'OK') logEntry += ` | **${newStatus}**`;
                    logEntry += `\n\n`;
                    
                    // Check for zone failure effects (Ausfall einer LEZ)
                    if (newZoneLeP <= 0) {
                        if (baseZoneForDeath === 'Kopf') {
                            logEntry += `\n> ⚠️ **${targetName}** ist **Bewusstlos**! (Kopf-Zone ausgefallen)\n\n`;
                        } else if (baseZoneForDeath === 'Torso') {
                            logEntry += `\n> ⚠️ **${targetName}** ist **Handlungsunfähig**! (Torso-Zone ausgefallen)\n\n`;
                        } else if (baseZoneForDeath === 'Arm') {
                            logEntry += `\n> ⚠️ **${targetName}**: ${normalizedZone} ist unbrauchbar! (Keine Gegenstände halten, -3 auf Proben)\n\n`;
                        } else if (baseZoneForDeath === 'Bein') {
                            logEntry += `\n> ⚠️ **${targetName}**: ${normalizedZone} ist unbrauchbar! (GS halbiert, -3 auf Proben)\n\n`;
                        }
                    }
                }
            }
            
            await app.vault.modify(target.file, targetContent);
        }
    }
    
    logEntry += `\n---\n\n`;
    
    // Append log to encounter file
    encounterContent += logEntry;
    await app.vault.modify(activeFile, encounterContent);
    
    // Show summary
    if (damageDealt > 0) {
        new Notice(`🏹 ${attackerName} trifft ${targetName} für ${damageDealt} SP! (LE: ${targetNewLE})`);
    } else if (isFumble) {
        new Notice(`💥 ${attackerName} patzt beim Fernkampf!`);
    } else {
        new Notice(`🛡️ ${targetName} entgeht dem Angriff!`);
    }
};

