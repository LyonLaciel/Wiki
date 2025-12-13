/**
 * QuickAdd User Script: Create Item (Weapon, Armor, or Object)
 * Follows DSA 5 manufacturing rules with optional skill checks
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;

    // ========================================
    // CONSTANTS: INTERVALS
    // ========================================

    // Weapon intervals by Kampftechnik (in hours)
    const KAMPFTECHNIK_INTERVALS = {
        "Armbrüste": { hours: 72, display: "3 Tage" },
        "Blasrohre": { hours: 3, display: "3 Stunden" },
        "Bögen": { hours: 6, display: "6 Stunden" },
        "Diskusse": { hours: 4, display: "4 Stunden" },
        "Dolche": { hours: 4, display: "4 Stunden" },
        "Fächer": { hours: 24, display: "1 Tag" },
        "Fechtwaffen": { hours: 24, display: "1 Tag" },
        "Hiebwaffen": { hours: 2, display: "2 Stunden" },
        "Kettenwaffen": { hours: 6, display: "6 Stunden" },
        "Lanzen": { hours: 2, display: "2 Stunden" },
        "Peitschen": { hours: 2, display: "2 Stunden" },
        "Raufen": { hours: 2, display: "2 Stunden" },
        "Schilde": { hours: 4, display: "4 Stunden" },
        "Schleudern": { hours: 1, display: "1 Stunde" },
        "Schwerter": { hours: 24, display: "1 Tag" },
        "Spießwaffen": { hours: 24, display: "1 Tag" },
        "Stangenwaffen": { hours: 6, display: "6 Stunden" },
        "Wurfwaffen": { hours: 4, display: "4 Stunden" },
        "Zweihandhiebwaffen": { hours: 24, display: "1 Tag" },
        "Zweihandschwerter": { hours: 24, display: "1 Tag" }
    };

    // Armor intervals by Rüstungsart (in hours)
    const ARMOR_TYPE_INTERVALS = {
        "Normale Kleidung": { hours: 2, display: "2 Stunden" },
        "Schwere Kleidung": { hours: 2, display: "2 Stunden" },
        "Stoffrüstung": { hours: 3, display: "3 Stunden" },
        "Lederrüstung": { hours: 6, display: "6 Stunden" },
        "Holzrüstung": { hours: 8, display: "8 Stunden" },
        "Hornrüstung": { hours: 12, display: "12 Stunden" },
        "Knochenrüstung": { hours: 12, display: "12 Stunden" },
        "Schuppenrüstung": { hours: 12, display: "12 Stunden" },
        "Kettenrüstung": { hours: 24, display: "1 Tag" },
        "Plattenrüstung": { hours: 24, display: "1 Tag" },
        "Gestechrüstung": { hours: 48, display: "2 Tage" },
        "Turnierrüstung": { hours: 48, display: "2 Tage" }
    };

    // ========================================
    // CONSTANTS: MATERIALS FOR WEAPONS
    // ========================================

    const WEAPON_MATERIALS = {
        // === METALL ===
        "Bronze": { 
            category: "Metall", 
            tpMod: -1, atMod: 0, paMod: 0,
            probeMod: 1, bruchfaktor: -4, 
            effect: "–1 TP", talent: "Metallbearbeitung"
        },
        "Eisen": { 
            category: "Metall", 
            tpMod: -1, atMod: 0, paMod: 0,
            probeMod: 1, bruchfaktor: -2, 
            effect: "–1 TP", talent: "Metallbearbeitung"
        },
        "Grassodenerz": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -1, bruchfaktor: -2, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Großer Fluss-Stahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: 0, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Khunchomer Stahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: -1, // Note: varies by weapon type
            effect: "Probe: Fechtwaffen –1, Schwerter +1", talent: "Metallbearbeitung"
        },
        "Maraskanstahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 1, bruchfaktor: 1, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Mirhamer Stahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: 0, 
            effect: "Resistenz gegen Rost", talent: "Metallbearbeitung"
        },
        "Premer Stahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -1, bruchfaktor: 0, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Toschkril": { 
            category: "Metall", 
            tpMod: 2, atMod: 0, paMod: 0,
            probeMod: -3, bruchfaktor: 4, 
            effect: "+2 TP, Resistenz gegen Säure", talent: "Metallbearbeitung",
            maxAttempts: 5
        },
        "Uhdenberger Stahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -1, bruchfaktor: 0, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Zwergenstahl": { 
            category: "Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 2, bruchfaktor: 2, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        // === HOLZ ===
        "Ebenholz": { 
            category: "Holz", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: 1, // +2 for bows
            effect: "Probe bei Bögen: +2", talent: "Holzbearbeitung"
        },
        "Eisenbaum": { 
            category: "Holz", 
            tpMod: 1, atMod: 0, paMod: 0,
            probeMod: -2, bruchfaktor: 3, 
            effect: "+1 TP", talent: "Holzbearbeitung"
        },
        "Steineiche": { 
            category: "Holz", 
            tpMod: 1, atMod: 0, paMod: 0,
            probeMod: -1, bruchfaktor: 4, 
            effect: "+1 TP", talent: "Holzbearbeitung"
        },
        "Zyklopenzeder": { 
            category: "Holz", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 1, bruchfaktor: 0, 
            effect: "keine Effekte", talent: "Holzbearbeitung"
        },
        "Horn": { 
            category: "Tierisches", 
            tpMod: -1, atMod: 0, paMod: 0,
            probeMod: 1, bruchfaktor: -2, 
            effect: "–1 TP (nur für bestimmte Waffen)", talent: "Holzbearbeitung"
        },
        "Knochen": { 
            category: "Tierisches", 
            tpMod: -2, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: -2, 
            effect: "–2 TP (nur für bestimmte Waffen)", talent: "Holzbearbeitung"
        },
        // === STEIN ===
        "Vulkanglas": { 
            category: "Stein", 
            tpMod: -1, atMod: 0, paMod: 0,
            probeMod: 2, bruchfaktor: -2, 
            effect: "–1 TP (nur für bestimmte Waffen)", talent: "Steinbearbeitung"
        },
        "Feuerstein": { 
            category: "Stein", 
            tpMod: -1, atMod: 0, paMod: 0,
            probeMod: 1, bruchfaktor: -4, 
            effect: "–1 TP gegen Metallrüstungen (nur für bestimmte Waffen)", talent: "Steinbearbeitung"
        },
        // === MAGISCHE METALLE ===
        "Arkanium (50%)": { 
            category: "Magisches Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: -1, 
            effect: "+2 TP gegen magische Wesen, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Arkanium (75%)": { 
            category: "Magisches Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -1, bruchfaktor: 0, 
            effect: "+3 TP gegen magische Wesen, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Arkanium (100%)": { 
            category: "Magisches Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -2, bruchfaktor: 1, 
            effect: "+4 TP gegen magische Wesen, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Endurium (25%)": { 
            category: "Magisches Metall", 
            tpMod: 1, atMod: 0, paMod: 0,
            probeMod: -3, bruchfaktor: 1, 
            effect: "+1 TP, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Endurium (50%)": { 
            category: "Magisches Metall", 
            tpMod: 1, atMod: 1, paMod: 0,
            probeMod: -3, bruchfaktor: 2, 
            effect: "+1 TP, +1 AT-Mod, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Endurium (100%)": { 
            category: "Magisches Metall", 
            tpMod: 2, atMod: 1, paMod: 0,
            probeMod: -3, bruchfaktor: 4, 
            effect: "+2 TP, +1 AT-Mod, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Mindorium (50%)": { 
            category: "Magisches Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: 0, bruchfaktor: -1, 
            effect: "+1 TP gegen magische Wesen, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Mindorium (75%)": { 
            category: "Magisches Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -1, bruchfaktor: -1, 
            effect: "Doppelter Schaden gegen Geister, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Mindorium (100%)": { 
            category: "Magisches Metall", 
            tpMod: 0, atMod: 0, paMod: 0,
            probeMod: -2, bruchfaktor: -1, 
            effect: "+2 TP gegen magische Wesen, doppelter Schaden gegen Geister, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Titanium (25%)": { 
            category: "Magisches Metall", 
            tpMod: 3, atMod: 0, paMod: 0,
            probeMod: -5, bruchfaktor: 5, 
            effect: "+3 TP, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Titanium (50%)": { 
            category: "Magisches Metall", 
            tpMod: 3, atMod: 1, paMod: 0,
            probeMod: -5, bruchfaktor: 10, 
            effect: "+3 TP, +1 AT-Mod, unzerbrechlich, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Titanium (100%)": { 
            category: "Magisches Metall", 
            tpMod: 4, atMod: 1, paMod: 0,
            probeMod: -5, bruchfaktor: 15, 
            effect: "+4 TP, +1 AT-Mod, unzerbrechlich, Waffe magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        }
    };

    // ========================================
    // CONSTANTS: MATERIALS FOR ARMOR
    // ========================================

    const ARMOR_MATERIALS = {
        // === HOLZ ===
        "Ebenholz": { 
            category: "Holz", 
            rsMod: 0, beMod: 0,
            probeMod: 0, stabilitaet: 1, 
            effect: "keine Effekte", talent: "Holzbearbeitung"
        },
        "Eisenbaum": { 
            category: "Holz", 
            rsMod: 0, beMod: 0,
            probeMod: -2, stabilitaet: 3, 
            effect: "Abzüge auf GS und INI durch BE ignorierbar", talent: "Holzbearbeitung"
        },
        "Steineiche": { 
            category: "Holz", 
            rsMod: 1, beMod: 2,
            probeMod: -1, stabilitaet: 4, 
            effect: "+1 RS, +2 BE", talent: "Holzbearbeitung"
        },
        "Zyklopenzeder": { 
            category: "Holz", 
            rsMod: 0, beMod: 0,
            probeMod: 1, stabilitaet: 0, 
            effect: "keine Effekte", talent: "Holzbearbeitung"
        },
        // === METALL ===
        "Bronze": { 
            category: "Metall", 
            rsMod: -1, beMod: 0,
            probeMod: 2, stabilitaet: -4, 
            effect: "–1 RS", talent: "Metallbearbeitung"
        },
        "Großer Fluss-Stahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: 0, stabilitaet: 0, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Khunchomer Stahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: 0, stabilitaet: -1, 
            effect: "Abzüge auf INI durch BE ignorierbar", talent: "Metallbearbeitung"
        },
        "Maraskanstahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: 1, stabilitaet: 1, 
            effect: "Abzüge auf GS und INI durch BE ignorierbar", talent: "Metallbearbeitung"
        },
        "Mirhamer Stahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: 0, stabilitaet: 0, 
            effect: "Resistenz gegen Rost", talent: "Metallbearbeitung"
        },
        "Premer Stahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: 1, stabilitaet: 0, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Toschkril": { 
            category: "Metall", 
            rsMod: 1, beMod: 0,
            probeMod: -3, stabilitaet: 4, 
            effect: "+1 RS", talent: "Metallbearbeitung",
            maxAttempts: 5
        },
        "Uhdenberger Stahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: -1, stabilitaet: 0, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        "Zwergenstahl": { 
            category: "Metall", 
            rsMod: 0, beMod: 0,
            probeMod: 2, stabilitaet: 2, 
            effect: "keine Effekte", talent: "Metallbearbeitung"
        },
        // === STOFF ===
        "Drôler Stoff": { 
            category: "Stoff", 
            rsMod: 0, beMod: 0,
            probeMod: 1, stabilitaet: 0, 
            effect: "keine Effekte", talent: "Stoffbearbeitung"
        },
        // === TIERISCHES ===
        "Horn": { 
            category: "Tierisches", 
            rsMod: 0, beMod: 0,
            probeMod: -1, stabilitaet: -2, 
            effect: "keine Effekte", talent: "Holzbearbeitung"
        },
        "Iryanleder": { 
            category: "Tierisches", 
            rsMod: 0, beMod: 0,
            probeMod: 1, stabilitaet: 0, 
            effect: "feuerfest (RS x2 gegen Feuer)", talent: "Lederbearbeitung"
        },
        "Knochen": { 
            category: "Tierisches", 
            rsMod: 0, beMod: 0,
            probeMod: -1, stabilitaet: -2, 
            effect: "keine Effekte", talent: "Holzbearbeitung"
        },
        "Phraischafwolle": { 
            category: "Tierisches", 
            rsMod: 0, beMod: 0,
            probeMod: 0, stabilitaet: 1, 
            effect: "Abzüge auf GS durch BE ignorierbar", talent: "Stoffbearbeitung"
        },
        "Wollnashornleder": { 
            category: "Tierisches", 
            rsMod: 0, beMod: 0,
            probeMod: -1, stabilitaet: 1, 
            effect: "kein Schaden durch Messergras", talent: "Lederbearbeitung"
        },
        "Leder (Standard)": { 
            category: "Tierisches", 
            rsMod: 0, beMod: 0,
            probeMod: 0, stabilitaet: 0, 
            effect: "keine Effekte", talent: "Lederbearbeitung"
        },
        // === MAGISCHE METALLE ===
        "Arkanium (10%)": { 
            category: "Magisches Metall", 
            rsMod: 0, beMod: 0,
            probeMod: -3, stabilitaet: 0, 
            effect: "+1 RS gegen magische Angriffe, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Arkanium (25%)": { 
            category: "Magisches Metall", 
            rsMod: 0, beMod: 0,
            probeMod: -6, stabilitaet: 0, 
            effect: "+2 RS gegen magische Angriffe, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Endurium (10%)": { 
            category: "Magisches Metall", 
            rsMod: 1, beMod: 0,
            probeMod: -2, stabilitaet: 1, 
            effect: "+1 RS, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Endurium (25%)": { 
            category: "Magisches Metall", 
            rsMod: 2, beMod: 0,
            probeMod: -3, stabilitaet: 2, 
            effect: "+2 RS, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Endurium (100%)": { 
            category: "Magisches Metall", 
            rsMod: 3, beMod: 0,
            probeMod: -4, stabilitaet: 8, 
            effect: "+3 RS, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Mindorium (10%)": { 
            category: "Magisches Metall", 
            rsMod: 0, beMod: 0,
            probeMod: -2, stabilitaet: 0, 
            effect: "+1 RS gegen Geister, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Mindorium (25%)": { 
            category: "Magisches Metall", 
            rsMod: 0, beMod: 0,
            probeMod: -4, stabilitaet: 0, 
            effect: "+2 RS gegen Geister, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true
        },
        "Titanium (10%)": { 
            category: "Magisches Metall", 
            rsMod: 2, beMod: 0,
            probeMod: -5, stabilitaet: 5, 
            effect: "+2 RS, GS/INI-Abzüge ignorierbar, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Titanium (25%)": { 
            category: "Magisches Metall", 
            rsMod: 3, beMod: 0,
            probeMod: -6, stabilitaet: 10, 
            effect: "+3 RS, GS/INI-Abzüge ignorierbar, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        },
        "Titanium (100%)": { 
            category: "Magisches Metall", 
            rsMod: 4, beMod: 0,
            probeMod: -7, stabilitaet: 15, 
            effect: "+4 RS, GS/INI-Abzüge ignorierbar, Rüstung magisch", talent: "Metallbearbeitung",
            isMagical: true, maxAttempts: 5
        }
    };

    // ========================================
    // CONSTANTS: MANUFACTURING TECHNIQUES
    // ========================================

    const WEAPON_TECHNIQUES = {
        "Keine Technik": {
            effect: "keine Effekte",
            probeMod: 0,
            timeFactor: 1,
            bruchfaktorMod: 0,
            tpMod: 0,
            requirement: null
        },
        "Fältelungstechnik": {
            effect: "+1 TP",
            probeMod: -1,
            timeFactor: 5,
            bruchfaktorMod: 1,
            tpMod: 1,
            requirement: "nur für Metallwaffen"
        },
        "Lehmbacktechnik": {
            effect: "keine besonderen Effekte",
            probeMod: 1,
            timeFactor: 3,
            bruchfaktorMod: 2,
            tpMod: 0,
            requirement: "nur für Metallwaffen"
        }
    };

    const ARMOR_TECHNIQUES = {
        "Keine Technik": {
            effect: "keine Effekte",
            probeMod: 0,
            timeFactor: 1,
            stabilitaetMod: 0,
            specialEffect: null,
            requirement: null
        },
        "Filigranes Kettenknüpfen": {
            effect: "Abzüge auf INI durch BE ignorierbar",
            probeMod: -1,
            timeFactor: 3,
            stabilitaetMod: 0,
            specialEffect: "ignoreINI",
            requirement: "nur für Kettenrüstungen"
        }
    };

    // ========================================
    // CONSTANTS: IMPROVEMENTS
    // ========================================

    const WEAPON_IMPROVEMENTS = {
        "+1 AT-Modifikator": { probeMod: -1, timeFactor: 2, atMod: 1, paMod: 0, tpMod: 0, stackable: true },
        "+1 PA-Modifikator": { probeMod: -2, timeFactor: 3, atMod: 0, paMod: 1, tpMod: 0, stackable: false },
        "+1 TP": { probeMod: -1, timeFactor: 4, atMod: 0, paMod: 0, tpMod: 1, stackable: true },
        "+10% Reichweite (Fernkampf)": { probeMod: -1, timeFactor: 3, atMod: 0, paMod: 0, tpMod: 0, stackable: true, rangeBonus: 10 },
        "+1 Bruchfaktorwert": { probeMod: -1, timeFactor: 1.5, atMod: 0, paMod: 0, tpMod: 0, stackable: true, bruchfaktorMod: 1 }
    };

    const ARMOR_IMPROVEMENTS = {
        "+1 RS": { probeMod: -5, timeFactor: 5, rsMod: 1, stackable: false },
        "–1 GS-Abzug durch BE ignorieren": { probeMod: -1, timeFactor: 2, stackable: true, gsIgnore: 1 },
        "–1 INI-Abzug durch BE ignorieren": { probeMod: -1, timeFactor: 2, stackable: true, iniIgnore: 1 },
        "+1 Stabilitätswert": { probeMod: -1, timeFactor: 1.5, stabilitaetMod: 1, stackable: true }
    };

    // ========================================
    // CONSTANTS: SUBCATEGORY TO KAMPFTECHNIK MAPPING
    // ========================================

    const SUBCATEGORY_TO_KAMPFTECHNIK = {
        "armbrueste": "Armbrüste",
        "boegen": "Bögen",
        "wurfwaffen": "Wurfwaffen",
        "blasrohre": "Blasrohre",
        "schleudern": "Schleudern",
        "dolche": "Dolche",
        "faecher": "Fächer",
        "fechtwaffen": "Fechtwaffen",
        "feuerspeien": "Wurfwaffen",
        "hiebwaffen": "Hiebwaffen",
        "kettenwaffen": "Kettenwaffen",
        "lanzen": "Lanzen",
        "peitschen": "Peitschen",
        "raufen": "Raufen",
        "schilde": "Schilde",
        "schwerter": "Schwerter",
        "spiesswaffen": "Spießwaffen",
        "stangenwaffen": "Stangenwaffen",
        "zweihandhiebwaffen": "Zweihandhiebwaffen",
        "zweihandschwerter": "Zweihandschwerter"
    };

    // ========================================
    // CONSTANTS: ARTIFACT TYPES
    // ========================================

    const ARTIFACT_TYPES = {
        "Zauberspeicher": {
            description: "Speichert einen Zauber mit Auslöser",
            ritual: "ARCANOVI",
            ritualCost: 16,
            ritualDuration: "8 Stunden",
            maxCharges: 7,
            pAspMultiplier: 0.1,
            sfRequired: null,
            canBindSpells: true,
            canBindRituals: true,
            canBindZaubertricks: true
        },
        "Matrixspeicher": {
            description: "Speichert Zauberstruktur, Nutzer zahlt AsP",
            ritual: "ARCANOVI",
            ritualCost: 16,
            ritualDuration: "8 Stunden",
            chargesFormula: "QS + 4",
            pAspMultiplier: 0.1,
            sfRequired: "Matrixgeber",
            canBindSpells: true,
            canBindRituals: true,
            canBindZaubertricks: true
        },
        "Zaubertalisman": {
            description: "Verstärkt einen bestimmten Zauber um +1 FP",
            ritual: "ARCANOVI",
            ritualCost: 16,
            ritualDuration: "8 Stunden",
            chargesFormula: "QS + 4",
            sfRequired: "Auxiliator",
            canBindSpells: true,
            canBindRituals: true,
            canBindZaubertricks: false
        },
        "Kraftspeicher": {
            description: "Speichert rohe Astralkraft",
            ritual: "ARCANOVI",
            ritualCost: 16,
            ritualDuration: "8 Stunden",
            sfRequired: "Gefäß der Macht",
            canBindSpells: false,
            canBindRituals: false,
            canBindZaubertricks: false
        },
        "Magische Waffe": {
            description: "Waffe verursacht magischen Schaden",
            ritual: "ZAUBERKLINGE GEISTERSPEER",
            ritualDuration: "8 Stunden",
            sfRequired: null,
            canBindSpells: false,
            canBindRituals: false,
            canBindZaubertricks: false
        }
    };

    // ========================================
    // CONSTANTS: APPLICATUS (Temporary Artifacts)
    // ========================================

    const APPLICATUS_DATA = {
        ritual: "APPLICATUS",
        ritualCost: 8,
        ritualDuration: "5 Minuten",
        durationFormula: "QS x 5 Stunden",
        maxDuration: 90, // hours
        extensions: {
            "Zwei Zauber": { fw: 8, effect: "2 Zauber nacheinander auslösbar" },
            "Längere Wirkungsdauer 1": { fw: 10, effect: "QS x 10 Stunden" },
            "Drei Zauber": { fw: 12, effect: "3 Zauber nacheinander auslösbar" },
            "Fremdauslöser": { fw: 14, effect: "Andere können auslösen" },
            "Längere Wirkungsdauer 2": { fw: 16, effect: "QS x 15 Stunden", requires: "Längere Wirkungsdauer 1" }
        }
    };

    // ========================================
    // CONSTANTS: ARCANOVI EXTENSIONS
    // ========================================

    const ARCANOVI_EXTENSIONS = {
        "Geringere Ritualdauer": { 
            fw: 8, 
            effect: "Ritualdauer 4 Stunden", 
            ritualDurationHours: 4 
        },
        "Noch geringere Ritualdauer": { 
            fw: 10, 
            effect: "Ritualdauer 2 Stunden", 
            ritualDurationHours: 2,
            requires: "Geringere Ritualdauer" 
        },
        "Weniger Erschwernis 1": { 
            fw: 12, 
            effect: "–1 Erschwernis bei zusätzlichen Ladungen (ARCANOVI)", 
            chargesPenaltyReduction: 1 
        },
        "Artefaktkontrolle": { 
            fw: 14, 
            effect: "–1 Erschwernis auf alle Herstellungsproben", 
            globalProbeMod: 1 
        },
        "Weniger Erschwernis 2": { 
            fw: 16, 
            effect: "–1 Erschwernis bei zusätzlichen Ladungen (ARCANOVI + Zauber)", 
            chargesPenaltyReduction: 1,
            spellPenaltyReduction: 1,
            requires: "Weniger Erschwernis 1" 
        }
    };

    // ========================================
    // CONSTANTS: INFINITUM EXTENSIONS
    // ========================================

    const INFINITUM_EXTENSIONS = {
        "Kürzere Ritualdauer": { 
            fw: 8, 
            effect: "Ritualdauer 8 Stunden", 
            ritualDurationHours: 8 
        },
        "Noch kürzere Ritualdauer": { 
            fw: 10, 
            effect: "Ritualdauer 4 Stunden", 
            ritualDurationHours: 4,
            requires: "Kürzere Ritualdauer" 
        },
        "Zwei Zauber": { 
            fw: 12, 
            effect: "2 Zauber permanent auf Artefakt", 
            maxSpells: 2 
        },
        "Artefaktmeisterschaft": { 
            fw: 14, 
            effect: "ARCANOVI nur um (6–QS) erschwert statt (10–QS)", 
            reducedPenaltyFormula: true 
        },
        "Drei Zauber": { 
            fw: 16, 
            effect: "3 Zauber permanent auf Artefakt", 
            maxSpells: 3,
            requires: "Zwei Zauber" 
        }
    };

    // ========================================
    // CONSTANTS: ZAUBERKLINGE EXTENSIONS
    // ========================================

    const ZAUBERKLINGE_EXTENSIONS = {
        "Verkürzte Ritualdauer": { 
            fw: 8, 
            effect: "Ritualdauer 4 Stunden", 
            ritualDurationHours: 4 
        },
        "Noch kürzere Ritualdauer": { 
            fw: 10, 
            effect: "Ritualdauer 2 Stunden", 
            ritualDurationHours: 2,
            requires: "Verkürzte Ritualdauer" 
        },
        "Trägerwahl": { 
            fw: 12, 
            effect: "Nur magisch für bestimmte Personen" 
        },
        "Zwei Waffen": { 
            fw: 14, 
            effect: "2 Waffen verzaubern, QS aufteilen", 
            extraCost: 4,
            weaponCount: 2 
        },
        "Hass auf...": { 
            fw: 16, 
            effect: "+1 TP gegen bestimmte Wesenart", 
            extraCost: 4,
            bonusTP: 1 
        }
    };

    // ========================================
    // CONSTANTS: ARTEFAKTTHESEN
    // ========================================

    const ARTEFAKTTHESEN = {
        "Keine Artefaktthese": {
            effect: "Keine besonderen Effekte",
            prereqMagiekunde: 0,
            prereqArcanovi: 0
        },
        "Konkrete Artefaktthese": {
            effect: "–50% Herstellungszeit, +2 FP bei Gelingen",
            prereqMagiekunde: 10,
            prereqArcanovi: 0,
            timeReduction: 0.5,
            fpBonus: 2
        },
        "Artefaktthese der Aufladung": {
            effect: "Nur erste Ladung zählt für pAsP-Berechnung",
            prereqMagiekunde: 10,
            prereqArcanovi: 10,
            pAspOnlyFirstCharge: true
        },
        "Artefaktthese der Effizienz": {
            effect: "+1 kostenlose Ladung (max. 7)",
            prereqMagiekunde: 8,
            prereqArcanovi: 10,
            bonusCharge: 1
        },
        "Artefaktthese der Intelligenz": {
            effect: "Mehrere Zauber wirken intelligent zusammen",
            prereqMagiekunde: 14,
            prereqArcanovi: 14,
            intelligentArtifact: true,
            allowsMultipleSpells: true
        },
        "Artefaktthese des Mechanopathikus": {
            effect: "Selbstauslösend, zapft AsP von Zauberern ab",
            prereqMagiekunde: 12,
            prereqArcanovi: 12,
            mechanopathic: true
        }
    };

    // Kraftspeicher materials with max AsP
    const KRAFTSPEICHER_MATERIALS = {
        "Bergkristall": { maxAsp: 7, note: "-" },
        "Diamant": { maxAsp: 13, note: "-" },
        "Topas": { maxAsp: 9, note: "-" },
        "Schwarze Perle": { maxAsp: 12, note: "-" },
        "Karfunkelstein": { maxAsp: 50, note: "Abhängig vom Drachen" },
        "Kashra-Stein": { maxAsp: 20, note: "Regeneriert 1W6 AsP/Tag" },
        "Sangurit-Kristall": { maxAsp: 30, note: "Nur mit Blutmagie aufladbar" }
    };

    // ZAUBERKLINGE costs by weapon size
    const ZAUBERKLINGE_COSTS = {
        "klein": { 
            cost: 10, 
            examples: "Dolche, Fechtwaffen, Kurzschwerter",
            subcategories: ["dolche", "fechtwaffen"]
        },
        "mittel": { 
            cost: 20, 
            examples: "Hiebwaffen, Kettenwaffen, Schwerter",
            subcategories: ["hiebwaffen", "kettenwaffen", "schwerter", "stangenwaffen", "spiesswaffen"]
        },
        "groß": { 
            cost: 35, 
            examples: "Zweihändig geführte Waffen",
            subcategories: ["zweihandhiebwaffen", "zweihandschwerter", "lanzen"]
        }
    };

    // Self-recharging options
    const SELF_RECHARGING_OPTIONS = {
        "Keine Selbstaufladung": { probeMod: 0, costMultiplier: 1, rechargeRate: null },
        "Monatlich (1 Ladung/Monat)": { probeMod: -1, costMultiplier: 5, rechargeRate: "1/Monat" },
        "Wöchentlich (1 Ladung/Woche)": { probeMod: -2, costMultiplier: 10, rechargeRate: "1/Woche" },
        "Täglich (1 Ladung/Tag)": { probeMod: -3, costMultiplier: 25, rechargeRate: "1/Tag" }
    };

    // ========================================
    // CONSTANTS: SPELL TYPES FOR ARTIFACTS
    // ========================================

    const SPELL_TYPES = {
        "Zauberspruch": {
            jsonFile: "dsa_categories/zauber.json",
            sfRequired: null,
            label: "Zauber"
        },
        "Ritual": {
            jsonFile: "dsa_categories/rituale.json",
            sfRequired: "Ritual-Artefakte herstellen",
            label: "Ritual"
        },
        "Zaubertrick": {
            jsonFile: "dsa_categories/zaubertricks.json",
            sfRequired: "Zaubertrick-Artefakte herstellen",
            label: "Zaubertrick"
        }
    };

    // ========================================
    // CONSTANTS: MATERIAL COST REDUCTION
    // ========================================

    const MATERIAL_COST_REDUCTION = {
        costPer100S: 1, // -1 pAsP per 100 Silbertaler
        maxReduction: 0.5, // max 50% reduction
        probeBonus: 1 // +1 on ARCANOVI per 100S (alternative)
    };

    // Iron/Steel penalty
    const IRON_STEEL_PENALTY = -2;

    // ========================================
    // CONSTANTS: ARTEFAKTEIGENSCHAFTEN
    // ========================================

    const ARTEFAKT_EIGENSCHAFTEN = {
        "Gespür des Schöpfers": {
            qsCost: 1,
            effect: "Hersteller spürt stets Richtung zum Artefakt"
        },
        "Resistenz gegen profanen Schaden": {
            qsCost: 1,
            effect: "Strukturschaden wird halbiert"
        },
        "Siegel und Zertifikat": {
            qsCost: 1,
            effect: "Signatur für magische Analysen erkennbar"
        },
        "Wandelbares Artefakt": {
            qsCost: 1,
            effect: "Artefakt wandelt bei Aktivierung sein Aussehen"
        },
        "Selbstreparatur": {
            qsCost: 2,
            effect: "Erhält am Ende jeder KR 1W6 Strukturpunkte zurück"
        },
        "Variabler Auslöser": {
            qsCost: 2,
            effect: "Auslöser kann bei Wiederaufladung ausgetauscht werden"
        },
        "Verschleierung": {
            qsCost: 2,
            effect: "Analysen und Entdecken um –3 erschwert"
        },
        "Magischer Apport": {
            qsCost: 3,
            effect: "Kann vom Hersteller zu sich gerufen werden (GS 15)"
        },
        "Starke Magie": {
            qsCost: 4,
            effect: "Würfelt auf 15 statt 14"
        },
        "Unzerstörbar": {
            qsCost: 4,
            effect: "Nur durch Drachenfeuer, Lava o.ä. zerstörbar"
        },
        "Artefaktseele": {
            qsCost: 5,
            effect: "Artefakt erhält einen eigenen Verstand"
        }
    };

    // ========================================
    // CONSTANTS: VEREDELUNG MATERIALS
    // ========================================

    const VEREDELUNG_MATERIALS = {
        // Unedle Metalle
        "Blei": { 
            category: "Unedle Metalle", probeMod: -1, talent: "Metallbearbeitung",
            effect: "Hinterlässt graue Spuren"
        },
        "Eisen": { 
            category: "Unedle Metalle", probeMod: 1, talent: "Metallbearbeitung",
            effect: "Gebundene Zauber –1 QS; ARCANOVI –1 erschwert"
        },
        "Kupfer": { 
            category: "Unedle Metalle", probeMod: 2, talent: "Metallbearbeitung",
            effect: "Immun gegen Feuerschaden"
        },
        "Zinn": { 
            category: "Unedle Metalle", probeMod: -1, talent: "Metallbearbeitung",
            effect: "Kreischt bei Aktivierung (1 Stufe Furcht)"
        },
        // Halbedle Metalle
        "Antimon": { 
            category: "Halbedle Metalle", probeMod: -1, talent: "Metallbearbeitung",
            effect: "ARCANOVI +1 erleichtert"
        },
        "Bronze": { 
            category: "Halbedle Metalle", probeMod: 1, talent: "Metallbearbeitung",
            effect: "+25% Strukturpunkte"
        },
        "Stahl": { 
            category: "Halbedle Metalle", probeMod: 0, talent: "Metallbearbeitung",
            effect: "Kein Witterungsschaden"
        },
        // Edle Metalle
        "Silber": { 
            category: "Edle Metalle", probeMod: -1, talent: "Metallbearbeitung",
            effect: "Gilt als Silberwaffe; zieht Blitze an"
        },
        "Gold": { 
            category: "Edle Metalle", probeMod: 1, talent: "Metallbearbeitung",
            effect: "Intelligentes Artefakt kann Umgebung beobachten"
        },
        "Mondsilber (Platin)": { 
            category: "Edle Metalle", probeMod: -4, talent: "Metallbearbeitung",
            effect: "1 auf 1W6: Ladung nicht verbraucht"
        },
        "Toschkril (Zwergensilber)": { 
            category: "Edle Metalle", probeMod: -3, talent: "Metallbearbeitung",
            effect: "Immun gegen Säure; TP-Zauber +1 TP"
        },
        // Magische Metalle
        "Mindorium": { 
            category: "Magische Metalle", probeMod: -2, talent: "Metallbearbeitung",
            effect: "Magischer Schaden; ARCANOVI +1/–1 pAsP",
            requiresBerufsgeheimnis: true,
            arcanoviBonus: 1,
            pAspReduction: 1
        },
        "Arkanium": { 
            category: "Magische Metalle", probeMod: -3, talent: "Metallbearbeitung",
            effect: "Magischer Schaden; ARCANOVI +2/–2 pAsP",
            requiresBerufsgeheimnis: true,
            arcanoviBonus: 2,
            pAspReduction: 2
        },
        "Endurium": { 
            category: "Magische Metalle", probeMod: -4, talent: "Metallbearbeitung",
            effect: "Magischer Schaden; ARCANOVI +3/–3 pAsP",
            requiresBerufsgeheimnis: true,
            arcanoviBonus: 3,
            pAspReduction: 3
        },
        "Titanium": { 
            category: "Magische Metalle", probeMod: -6, talent: "Metallbearbeitung",
            effect: "Magischer Schaden; ARCANOVI +4/–4 pAsP",
            requiresBerufsgeheimnis: true,
            arcanoviBonus: 4,
            pAspReduction: 4
        },
        // Edelsteine
        "Achat": { 
            category: "Edelsteine", probeMod: 0, talent: "Steinbearbeitung",
            effect: "Merkmal Elementar (Humus) +1 FP"
        },
        "Amethyst": { 
            category: "Edelsteine", probeMod: 0, talent: "Steinbearbeitung",
            effect: "Merkmal Einfluss +1 FP"
        },
        "Rubin": { 
            category: "Edelsteine", probeMod: 1, talent: "Steinbearbeitung",
            effect: "Merkmal Elementar (Feuer) +1 FP; 1 auf 1W6: Blutrausch"
        },
        "Saphir": { 
            category: "Edelsteine", probeMod: 1, talent: "Steinbearbeitung",
            effect: "Merkmal Sphären (Limbus) +1 FP"
        },
        "Smaragd": { 
            category: "Edelsteine", probeMod: 1, talent: "Steinbearbeitung",
            effect: "Merkmal Objekt +1 FP; verfärbt sich bei TP-Magie"
        },
        "Malachit": { 
            category: "Edelsteine", probeMod: 0, talent: "Steinbearbeitung",
            effect: "Merkmal Heilung +1 FP"
        },
        "Bergkristall": { 
            category: "Edelsteine", probeMod: 0, talent: "Steinbearbeitung",
            effect: "Merkmal Hellsicht +1 FP"
        },
        "Magnetit": { 
            category: "Edelsteine", probeMod: 0, talent: "Steinbearbeitung",
            effect: "Merkmal Antimagie +1 FP"
        },
        // Obskuritäten
        "Alicorn": { 
            category: "Obskuritäten", probeMod: 1, talent: "Holzbearbeitung",
            effect: "Hellsicht/Heilung +1 FP; 1 Tag immun gegen Gifte/Krankheiten"
        },
        "Blutulme": { 
            category: "Obskuritäten", probeMod: -1, talent: "Holzbearbeitung",
            effect: "Max. 8 statt 7 Ladungen"
        }
    };

    // ========================================
    // CONSTANTS: ZAUBERZEICHEN (ARKANOGLYPHEN)
    // ========================================

    const ZAUBERZEICHEN = {
        "Leuchtendes Zeichen": {
            aspCost: 2,
            merkmal: "Elementar",
            effect: "Leuchtet wie FLIM FLAM mit QS 4",
            apWert: 3
        },
        "Zeichen der Haltbarkeit": {
            aspCost: 8,
            merkmal: "Temporal",
            effect: "Inhalt eines Gefäßes unbegrenzt haltbar",
            apWert: 2
        },
        "Zeichen der Leichtigkeit": {
            aspCost: "1-16",
            merkmal: "Objekt",
            effect: "Gefäßinhalt wird federleicht",
            apWert: 4
        },
        "Fallensiegel": {
            aspCost: 8,
            merkmal: "Elementar",
            effect: "Elementarschlag bei Betreten (2W6+8 TP)",
            apWert: 8
        },
        "Siegel der Stille": {
            aspCost: 12,
            merkmal: "Objekt",
            effect: "Dämpft Geräusche des Objekts",
            apWert: 10
        },
        "Ungesehenes Zeichen": {
            aspCost: "2-32",
            merkmal: "Einfluss",
            effect: "Objekt wird von Personen mit SK ≤2 ignoriert",
            apWert: 8
        },
        "Zeichen der Wachsamkeit": {
            aspCost: 2,
            merkmal: "Illusion",
            effect: "Lautes Geräusch bei Annäherung (16 Schritt)",
            apWert: 5
        },
        "Zeichen des versperrten Blicks": {
            aspCost: 8,
            merkmal: "Antimagie",
            effect: "Hellsicht-Zauber –3 im Radius von 8 Schritt",
            apWert: 5
        },
        "Glyphe der elementaren Attraktion": {
            aspCost: 8,
            merkmal: "Elementar",
            effect: "Element erscheint im Gefäß (Kühlung/Heizung)",
            apWert: 10
        },
        "Elastisches Zeichen": {
            aspCost: "2-32",
            merkmal: "Objekt",
            effect: "Objekt wird elastisch wie Gummi",
            apWert: 15
        },
        "Arkanoglyphe der stabilen Matrix": {
            aspCost: 8,
            merkmal: "Objekt",
            effect: "Zauberzeichen hat 50 SP statt normal zerstörbar",
            apWert: 5,
            isZusatzzeichen: true
        },
        "Geduldiges Zeichen": {
            aspCost: 10,
            merkmal: "Hellsicht",
            effect: "Verzögerte Aktivierung bei Bedingung",
            apWert: 8,
            isZusatzzeichen: true
        },
        "Kraftquellenspeisung": {
            aspCost: 10,
            pAsp: 2,
            merkmal: "Objekt",
            effect: "Permanente Wirkung auf Kraftlinien",
            apWert: 10,
            isZusatzzeichen: true
        },
        // Missing Zauberzeichen added:
        "Glyphe des verfluchten Goldes": {
            aspCost: 22,
            merkmal: "Verwandlung",
            effect: "Fluch bei Entfernung von Schatz (1 LeP/Stunde bis Rückgabe)",
            apWert: 15
        },
        "Sigille des unsichtbaren Weges": {
            aspCost: 8,
            merkmal: "Telekinese",
            effect: "Unsichtbare Brücke zwischen zwei Zeichen (max. 20 Schritt, 1000 Stein Belastung)",
            apWert: 5
        },
        "Sigille des Wegweisens": {
            aspCost: 4,
            merkmal: "Hellsicht",
            effect: "Zeigt Weg zu vorher bestimmtem Ort (max. 5 Meilen, +5 Orientierung)",
            apWert: 5
        },
        "Zeichen wider Sumus Griff": {
            aspCost: "1 pro 10 Raumschritt",
            merkmal: "Elementar",
            effect: "Schwerkraft im Raum verschoben (Wand/Decke wird Boden)",
            apWert: 15
        },
        "Arkanoglyphe der Voraussicht": {
            aspCost: 5,
            merkmal: "Hellsicht",
            effect: "Zauberzeichen nur für bestimmte Zielkategorie aktiv",
            apWert: 5,
            isZusatzzeichen: true
        },
        "Schutzsiegel": {
            aspCost: 8,
            merkmal: "Verwandlung",
            effect: "1W6+4 SP bei Versuch, das Zeichen zu zerstören",
            apWert: 5,
            isZusatzzeichen: true
        }
    };

    // ========================================
    // CONSTANTS: CHAOTISCHE NEBENEFFEKTE
    // ========================================

    const NEBENEFFEKTE_TABLE = {
        1: "Artefaktseele: Dämon (1), Elementar (2-3), Geist (4-5) oder spontanes Bewusstsein (6)",
        2: "Artefaktseele: Dämon (1), Elementar (2-3), Geist (4-5) oder spontanes Bewusstsein (6)",
        3: "Ungewöhnlich leicht: Wiegt nur noch 1/3",
        4: "Ungewöhnlich schwer: Wiegt das Dreifache",
        5: "Versteift sich: Verliert jegliche Flexibilität",
        6: "Wird weich und biegsam wie ein Hanfseil",
        7: "Lockt Tiere an: Katzen (1), Vögel (2), Eidechsen (3), Spinnen (4), Wasserlebewesen (5), Raubtier (6)",
        8: "Verzögerte Auslösung: 2 KR zwischen Aktivierung und Wirkung",
        9: "Riecht stark bei Aktivierung: Zwiebeln (1), Schwefel (2), Blüten (3), Blut (4), Meeresbrise (5), Holzfeuer (6)",
        10: "Färbt ab: Hinterlässt schwer entfernbare Flecken",
        11: "Nur nachts aktivierbar",
        12: "Aktiviert sich nur in 50% der Fälle (1-3 auf 1W6)",
        13: "Zirpendes Geräusch: Macht Reptilien im Umkreis von 1 Meile aggressiv",
        14: "Verwandelt sich nach Jahr und Tag in Nahrungsmittel",
        15: "Aktiviert sich selbst bei Erschütterung",
        16: "Geht nach Jahr und Tag in Flammen auf",
        17: "Nach Jahr und Tag erscheint Dämon/Dschinn und nimmt Artefakt mit",
        18: "Verlustängste: Besitzer will Artefakt gegen echte/imaginäre Feinde schützen",
        19: "Flüstert Prophezeiungen, wenn man Ohr anlegt",
        20: "Wird von Schuppen (1), Haut (2), Chitin (3), Pelz (4), Augen (5) oder Mischung (6) überzogen",
        21: "Penetrante Kopfschmerzen (1 Stufe Betäubung) nur für Erschaffer",
        22: "Glänzt verräterisch bei Sonnenlicht (1-3) oder Mondlicht (4-6)",
        23: "Kein zusätzlicher Effekt"
    };

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    function rollD20() {
        return Math.floor(Math.random() * 20) + 1;
    }

    function rollD6() {
        return Math.floor(Math.random() * 6) + 1;
    }

    /**
     * Execute a single 3D20 probe (for rituals like ARCANOVI)
     * Returns { success, qs, rolls, remainingFP, critical }
     */
    async function executeSingleProbe(fw, attr1, attr2, attr3, probeMod) {
        const roll1 = rollD20();
        const roll2 = rollD20();
        const roll3 = rollD20();
        
        // Apply probe modifier to attributes
        const effectiveAttr1 = attr1 + probeMod;
        const effectiveAttr2 = attr2 + probeMod;
        const effectiveAttr3 = attr3 + probeMod;
        
        // Check for critical success (two 1s) or critical failure (two 20s)
        const ones = [roll1, roll2, roll3].filter(r => r === 1).length;
        const twenties = [roll1, roll2, roll3].filter(r => r === 20).length;
        
        if (twenties >= 2) {
            return {
                success: false,
                qs: 0,
                rolls: [roll1, roll2, roll3],
                remainingFP: -1,
                critical: "Patzer!"
            };
        }
        
        if (ones >= 2) {
            // Critical success - automatic QS based on FW
            const qs = Math.max(1, Math.ceil(fw / 3));
            return {
                success: true,
                qs: qs,
                rolls: [roll1, roll2, roll3],
                remainingFP: fw,
                critical: "Kritischer Erfolg!"
            };
        }
        
        // Normal check - calculate remaining FP
        let remainingFP = fw;
        if (roll1 > effectiveAttr1) remainingFP -= (roll1 - effectiveAttr1);
        if (roll2 > effectiveAttr2) remainingFP -= (roll2 - effectiveAttr2);
        if (roll3 > effectiveAttr3) remainingFP -= (roll3 - effectiveAttr3);
        
        if (remainingFP >= 0) {
            const qs = Math.max(1, Math.ceil((remainingFP + 1) / 3));
            return {
                success: true,
                qs: Math.min(qs, 6), // Max QS 6
                rolls: [roll1, roll2, roll3],
                remainingFP: remainingFP,
                critical: null
            };
        } else {
            return {
                success: false,
                qs: 0,
                rolls: [roll1, roll2, roll3],
                remainingFP: remainingFP,
                critical: null
            };
        }
    }

    function formatHours(hours) {
        if (hours >= 48) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            if (remainingHours === 0) {
                return `${days} Tag${days > 1 ? 'e' : ''}`;
            }
            return `${days} Tag${days > 1 ? 'e' : ''} ${remainingHours} Stunden`;
        } else if (hours >= 24) {
            return `1 Tag`;
        } else {
            return `${hours} Stunde${hours !== 1 ? 'n' : ''}`;
        }
    }

    function formatModifier(mod) {
        if (mod > 0) return `+${mod}`;
        if (mod < 0) return `${mod}`;
        return "±0";
    }

    /**
     * Execute a Sammelprobe (cumulative skill check)
     */
    async function executeSammelprobe(fw, attr1, attr2, attr3, probeMod, maxAttempts = 7) {
        let totalQS = 0;
        let attemptResults = [];
        const targetQS = 10;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const roll1 = rollD20();
            const roll2 = rollD20();
            const roll3 = rollD20();
            
            // Calculate remaining FP after attribute checks
            let remainingFP = fw;
            const effectiveAttr1 = attr1 + probeMod;
            const effectiveAttr2 = attr2 + probeMod;
            const effectiveAttr3 = attr3 + probeMod;
            
            // Check for critical success (two 1s)
            const ones = [roll1, roll2, roll3].filter(r => r === 1).length;
            const twenties = [roll1, roll2, roll3].filter(r => r === 20).length;
            
            if (twenties >= 2) {
                // Critical failure
                attemptResults.push({
                    attempt,
                    rolls: [roll1, roll2, roll3],
                    success: false,
                    qs: 0,
                    critical: "Patzer!"
                });
                continue;
            }
            
            if (ones >= 2) {
                // Critical success - automatic QS 1 minimum
                attemptResults.push({
                    attempt,
                    rolls: [roll1, roll2, roll3],
                    success: true,
                    qs: Math.max(1, Math.ceil(remainingFP / 3)),
                    critical: "Kritischer Erfolg!"
                });
                totalQS += Math.max(1, Math.ceil(remainingFP / 3));
                if (totalQS >= targetQS) break;
                continue;
            }
            
            // Normal check
            if (roll1 > effectiveAttr1) remainingFP -= (roll1 - effectiveAttr1);
            if (roll2 > effectiveAttr2) remainingFP -= (roll2 - effectiveAttr2);
            if (roll3 > effectiveAttr3) remainingFP -= (roll3 - effectiveAttr3);
            
            if (remainingFP >= 0) {
                const qs = Math.max(1, Math.ceil((remainingFP + 1) / 3));
                attemptResults.push({
                    attempt,
                    rolls: [roll1, roll2, roll3],
                    success: true,
                    qs: qs,
                    remainingFP: remainingFP
                });
                totalQS += qs;
                if (totalQS >= targetQS) break;
            } else {
                attemptResults.push({
                    attempt,
                    rolls: [roll1, roll2, roll3],
                    success: false,
                    qs: 0,
                    remainingFP: remainingFP
                });
            }
        }
        
        return { totalQS, attemptResults, success: totalQS >= targetQS };
    }

    // ========================================
    // MAIN EXECUTION
    // ========================================

    try {
        // Step 1: Select item type
        const itemTypes = ["⚔️ Waffe", "🛡️ Rüstung", "🔮 Artefakt", "📦 Allgemeiner Gegenstand"];
        const selectedType = await quickAddApi.suggester(itemTypes, itemTypes);
        if (!selectedType) return;

        let itemData = {};
        let baseInterval = 2; // Default 2 hours
        let selectedMaterial = null;
        let selectedTechnique = null;
        let selectedImprovements = [];
        let kampftechnik = null;
        let armorType = null;
        
        // Artifact-specific variables
        let artifactData = null;
        let selectedVeredelung = null;
        let selectedZauberzeichen = [];
        let selectedEigenschaften = [];
        let artifactNebeneffekt = null;

        // ========================================
        // WEAPON FLOW
        // ========================================
        if (selectedType === "⚔️ Waffe") {
            // Load weapons from JSON
            let waffen;
            try {
                const raw = await app.vault.adapter.read("dsa_categories/waffen.json");
                waffen = JSON.parse(raw).filter(w => w.name && w.name.trim() !== '' && w.tp);
            } catch (e) {
                new Notice("Fehler beim Laden der Waffen-Datenbank!");
                console.error(e);
                return;
            }

            // Select subcategory
            const subcategories = [...new Set(waffen.map(w => w._subcategory).filter(Boolean))].sort();
            subcategories.unshift("⚔️ Alle Waffen anzeigen");
            
            const selectedSubcat = await quickAddApi.suggester(
                subcategories.map(s => s === "⚔️ Alle Waffen anzeigen" ? s : s.charAt(0).toUpperCase() + s.slice(1)),
                subcategories
            );
            if (!selectedSubcat) return;

            // Filter weapons
            const filtered = selectedSubcat === "⚔️ Alle Waffen anzeigen"
                ? waffen
                : waffen.filter(w => w._subcategory === selectedSubcat);
            
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

            // Select weapon
            const displayStrings = filtered.map(w => `${w.name} | TP: ${w.tp || '-'} | ${w.preis || '-'}`);
            const selectedWeaponIndex = await quickAddApi.suggester(displayStrings, filtered.map((_, i) => i));
            if (selectedWeaponIndex === null || selectedWeaponIndex === undefined) return;

            const selectedWeapon = filtered[selectedWeaponIndex];
            kampftechnik = SUBCATEGORY_TO_KAMPFTECHNIK[selectedWeapon._subcategory] || "Hiebwaffen";
            
            itemData = {
                type: "Waffe",
                name: selectedWeapon.name,
                baseTP: selectedWeapon.tp || "1W6",
                baseATMod: 0,
                basePAMod: 0,
                kampftechnik: kampftechnik,
                gewicht: selectedWeapon.gewicht || "-",
                laenge: selectedWeapon.laenge || "-",
                preis: selectedWeapon.preis || "-",
                komplexitaet: selectedWeapon.komplexitaet || "einfach",
                subcategory: selectedWeapon._subcategory
            };

            // Parse AT/PA modifiers if present
            if (selectedWeapon.at_pa_mod) {
                const atPaMatch = selectedWeapon.at_pa_mod.match(/([+-]?\d+)\/([+-]?\d+)/);
                if (atPaMatch) {
                    itemData.baseATMod = parseInt(atPaMatch[1]) || 0;
                    itemData.basePAMod = parseInt(atPaMatch[2]) || 0;
                }
            }

            baseInterval = KAMPFTECHNIK_INTERVALS[kampftechnik]?.hours || 2;

            // Select material for weapon
            const materialCategories = [...new Set(Object.values(WEAPON_MATERIALS).map(m => m.category))];
            const materialOptions = [];
            for (const cat of materialCategories) {
                const mats = Object.entries(WEAPON_MATERIALS).filter(([_, m]) => m.category === cat);
                for (const [name, data] of mats) {
                    materialOptions.push({
                        display: `[${cat}] ${name} | Probe: ${formatModifier(data.probeMod)} | ${data.effect}`,
                        name: name,
                        data: data
                    });
                }
            }

            const selectedMatIndex = await quickAddApi.suggester(
                materialOptions.map(m => m.display),
                materialOptions.map((_, i) => i)
            );
            if (selectedMatIndex === null || selectedMatIndex === undefined) return;
            selectedMaterial = materialOptions[selectedMatIndex];

            // Select technique for weapon (only metal techniques for metal weapons)
            const applicableTechniques = Object.entries(WEAPON_TECHNIQUES).filter(([name, tech]) => {
                if (!tech.requirement) return true;
                if (tech.requirement === "nur für Metallwaffen" && selectedMaterial.data.category === "Metall") return true;
                if (tech.requirement === "nur für Metallwaffen" && selectedMaterial.data.category === "Magisches Metall") return true;
                return name === "Keine Technik";
            });

            const techOptions = applicableTechniques.map(([name, tech]) => ({
                display: `${name} | Probe: ${formatModifier(tech.probeMod)} | Zeit: x${tech.timeFactor} | ${tech.effect}`,
                name: name,
                data: tech
            }));

            const selectedTechIndex = await quickAddApi.suggester(
                techOptions.map(t => t.display),
                techOptions.map((_, i) => i)
            );
            if (selectedTechIndex === null || selectedTechIndex === undefined) return;
            selectedTechnique = techOptions[selectedTechIndex];

            // Select improvements (max 2)
            const improvementOptions = Object.entries(WEAPON_IMPROVEMENTS).map(([name, data]) => ({
                display: `${name} | Probe: ${formatModifier(data.probeMod)} | Zeit: x${data.timeFactor}`,
                name: name,
                data: data
            }));

            const selectImprovements = await quickAddApi.yesNoPrompt("Verbesserungen hinzufügen?", "Möchtest du Verbesserungen zur Waffe hinzufügen? (max. 2, benötigt SF Waffenbau)");
            if (selectImprovements) {
                // First improvement
                const imp1Index = await quickAddApi.suggester(
                    ["❌ Keine weitere Verbesserung", ...improvementOptions.map(i => i.display)],
                    [null, ...improvementOptions.map((_, i) => i)]
                );
                if (imp1Index !== null && imp1Index !== undefined) {
                    selectedImprovements.push(improvementOptions[imp1Index]);
                    
                    // Second improvement
                    const remainingImps = improvementOptions.filter((imp, i) => {
                        if (i === imp1Index && !imp.data.stackable) return false;
                        return true;
                    });
                    
                    const imp2Index = await quickAddApi.suggester(
                        ["❌ Keine weitere Verbesserung", ...remainingImps.map(i => i.display)],
                        [null, ...remainingImps.map((_, i) => i)]
                    );
                    if (imp2Index !== null && imp2Index !== undefined) {
                        selectedImprovements.push(remainingImps[imp2Index]);
                    }
                }
            }
        }
        // ========================================
        // ARMOR FLOW
        // ========================================
        else if (selectedType === "🛡️ Rüstung") {
            // Load armor from JSON
            let ruestungen;
            try {
                const raw = await app.vault.adapter.read("dsa_categories/ruestungen.json");
                ruestungen = JSON.parse(raw).filter(r => r.name && r.name.trim() !== '');
            } catch (e) {
                new Notice("Fehler beim Laden der Rüstungs-Datenbank!");
                console.error(e);
                return;
            }

            // Select armor type first
            const armorTypes = Object.keys(ARMOR_TYPE_INTERVALS);
            const selectedArmorType = await quickAddApi.suggester(armorTypes, armorTypes);
            if (!selectedArmorType) return;
            armorType = selectedArmorType;

            // Filter armors or let user input custom
            const armorOptions = ruestungen.filter(r => r.name).slice(0, 50); // Limit for performance
            armorOptions.unshift({ name: "📝 Eigene Rüstung eingeben", custom: true });

            const displayStrings = armorOptions.map(r => 
                r.custom ? r.name : `${r.name} | RS: ${r.rs || '-'} | BE: ${r.be || '-'}`
            );
            
            const selectedArmorIndex = await quickAddApi.suggester(displayStrings, armorOptions.map((_, i) => i));
            if (selectedArmorIndex === null || selectedArmorIndex === undefined) return;

            let selectedArmor = armorOptions[selectedArmorIndex];
            
            if (selectedArmor.custom) {
                const customName = await quickAddApi.inputPrompt("Name der Rüstung:");
                if (!customName) return;
                const customRS = await quickAddApi.inputPrompt("RS (Rüstungsschutz):", "1");
                const customBE = await quickAddApi.inputPrompt("BE (Behinderung):", "1");
                
                selectedArmor = {
                    name: customName,
                    rs: customRS,
                    be: customBE
                };
            }

            itemData = {
                type: "Rüstung",
                name: selectedArmor.name,
                baseRS: parseInt(selectedArmor.rs) || 0,
                baseBE: parseInt(selectedArmor.be) || 0,
                armorType: armorType,
                gewicht: selectedArmor.gewicht || "-",
                preis: selectedArmor.preis || "-",
                komplexitaet: "einfach"
            };

            baseInterval = ARMOR_TYPE_INTERVALS[armorType]?.hours || 6;

            // Select material for armor
            const materialCategories = [...new Set(Object.values(ARMOR_MATERIALS).map(m => m.category))];
            const materialOptions = [];
            for (const cat of materialCategories) {
                const mats = Object.entries(ARMOR_MATERIALS).filter(([_, m]) => m.category === cat);
                for (const [name, data] of mats) {
                    materialOptions.push({
                        display: `[${cat}] ${name} | Probe: ${formatModifier(data.probeMod)} | ${data.effect}`,
                        name: name,
                        data: data
                    });
                }
            }

            const selectedMatIndex = await quickAddApi.suggester(
                materialOptions.map(m => m.display),
                materialOptions.map((_, i) => i)
            );
            if (selectedMatIndex === null || selectedMatIndex === undefined) return;
            selectedMaterial = materialOptions[selectedMatIndex];

            // Select technique for armor
            const applicableTechniques = Object.entries(ARMOR_TECHNIQUES).filter(([name, tech]) => {
                if (!tech.requirement) return true;
                if (tech.requirement === "nur für Kettenrüstungen" && armorType === "Kettenrüstung") return true;
                return name === "Keine Technik";
            });

            const techOptions = applicableTechniques.map(([name, tech]) => ({
                display: `${name} | Probe: ${formatModifier(tech.probeMod)} | Zeit: x${tech.timeFactor} | ${tech.effect}`,
                name: name,
                data: tech
            }));

            const selectedTechIndex = await quickAddApi.suggester(
                techOptions.map(t => t.display),
                techOptions.map((_, i) => i)
            );
            if (selectedTechIndex === null || selectedTechIndex === undefined) return;
            selectedTechnique = techOptions[selectedTechIndex];

            // Select improvements (max 2)
            const improvementOptions = Object.entries(ARMOR_IMPROVEMENTS).map(([name, data]) => ({
                display: `${name} | Probe: ${formatModifier(data.probeMod)} | Zeit: x${data.timeFactor}`,
                name: name,
                data: data
            }));

            const selectImprovements = await quickAddApi.yesNoPrompt("Verbesserungen hinzufügen?", "Möchtest du Verbesserungen zur Rüstung hinzufügen? (max. 2, benötigt SF Rüstungsbau)");
            if (selectImprovements) {
                const imp1Index = await quickAddApi.suggester(
                    ["❌ Keine weitere Verbesserung", ...improvementOptions.map(i => i.display)],
                    [null, ...improvementOptions.map((_, i) => i)]
                );
                if (imp1Index !== null && imp1Index !== undefined) {
                    selectedImprovements.push(improvementOptions[imp1Index]);
                    
                    const remainingImps = improvementOptions.filter((imp, i) => {
                        if (i === imp1Index && !imp.data.stackable) return false;
                        return true;
                    });
                    
                    const imp2Index = await quickAddApi.suggester(
                        ["❌ Keine weitere Verbesserung", ...remainingImps.map(i => i.display)],
                        [null, ...remainingImps.map((_, i) => i)]
                    );
                    if (imp2Index !== null && imp2Index !== undefined) {
                        selectedImprovements.push(remainingImps[imp2Index]);
                    }
                }
            }
        }
        // ========================================
        // ARTIFACT FLOW
        // ========================================
        else if (selectedType === "🔮 Artefakt") {
            
            // ========================================
            // STEP 1: OBJECT SOURCE (Crafting Pipeline)
            // ========================================
            
            const objectSourceOptions = [
                "📦 Bestehendes Objekt verwenden",
                "⚔️ Neue Waffe herstellen",
                "🛡️ Neue Rüstung herstellen",
                "🔧 Neuen Gegenstand herstellen"
            ];
            
            const selectedObjectSource = await quickAddApi.suggester(objectSourceOptions, objectSourceOptions);
            if (!selectedObjectSource) return;
            
            let craftedBaseItem = null;
            let baseItemCraftingResult = null;
            let isIronSteelObject = false;
            let baseItemData = null;
            let baseItemMaterial = null;
            let baseItemTechnique = null;
            let baseItemImprovements = [];
            let baseItemInterval = 2;
            let baseItemProbeMod = 0;
            let baseItemMaxAttempts = 7;
            
            // If crafting a new item first, run the FULL crafting sub-flow
            if (selectedObjectSource === "⚔️ Neue Waffe herstellen") {
                // WEAPON CRAFTING SUB-FLOW
                let waffen;
                try {
                    const raw = await app.vault.adapter.read("dsa_categories/waffen.json");
                    waffen = JSON.parse(raw).filter(w => w.name && w.name.trim() !== '' && w.tp);
                } catch (e) {
                    new Notice("Fehler beim Laden der Waffen-Datenbank!");
                    console.error(e);
                    return;
                }

                const subcategories = [...new Set(waffen.map(w => w._subcategory).filter(Boolean))].sort();
                subcategories.unshift("⚔️ Alle Waffen anzeigen");
                
                const selectedSubcat = await quickAddApi.suggester(
                    subcategories.map(s => s === "⚔️ Alle Waffen anzeigen" ? s : s.charAt(0).toUpperCase() + s.slice(1)),
                    subcategories
                );
                if (!selectedSubcat) return;

                const filtered = selectedSubcat === "⚔️ Alle Waffen anzeigen"
                    ? waffen
                    : waffen.filter(w => w._subcategory === selectedSubcat);
                
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

                const displayStrings = filtered.map(w => `${w.name} | TP: ${w.tp || '-'} | ${w.preis || '-'}`);
                const selectedWeaponIndex = await quickAddApi.suggester(displayStrings, filtered.map((_, i) => i));
                if (selectedWeaponIndex === null || selectedWeaponIndex === undefined) return;

                const selectedWeapon = filtered[selectedWeaponIndex];
                const weaponKampftechnik = SUBCATEGORY_TO_KAMPFTECHNIK[selectedWeapon._subcategory] || "Hiebwaffen";
                
                baseItemData = {
                    type: "Waffe",
                    name: selectedWeapon.name,
                    baseTP: selectedWeapon.tp || "1W6",
                    atMod: parseInt(selectedWeapon.at) || 0,
                    paMod: parseInt(selectedWeapon.pa) || 0,
                    kampftechnik: weaponKampftechnik,
                    subcategory: selectedWeapon._subcategory
                };

                baseItemInterval = KAMPFTECHNIK_INTERVALS[weaponKampftechnik]?.hours || 2;

                // Select material for weapon
                const materialCategories = [...new Set(Object.values(WEAPON_MATERIALS).map(m => m.category))];
                const materialOptions = [];
                for (const cat of materialCategories) {
                    const mats = Object.entries(WEAPON_MATERIALS).filter(([_, m]) => m.category === cat);
                    for (const [name, data] of mats) {
                        materialOptions.push({
                            display: `[${cat}] ${name} | Probe: ${formatModifier(data.probeMod)} | ${data.effect}`,
                            name: name,
                            data: data
                        });
                    }
                }

                const selectedMatIndex = await quickAddApi.suggester(
                    materialOptions.map(m => m.display),
                    materialOptions.map((_, i) => i)
                );
                if (selectedMatIndex === null || selectedMatIndex === undefined) return;
                baseItemMaterial = materialOptions[selectedMatIndex];
                
                // Check for iron/steel based on material
                isIronSteelObject = baseItemMaterial.data.category === "Metall" || 
                                   baseItemMaterial.data.category === "Magisches Metall";

                // Select technique for weapon
                const applicableTechniques = Object.entries(WEAPON_TECHNIQUES).filter(([name, tech]) => {
                    if (!tech.requirement) return true;
                    if (tech.requirement === "nur für Metallwaffen" && (baseItemMaterial.data.category === "Metall" || baseItemMaterial.data.category === "Magisches Metall")) return true;
                    return name === "Keine Technik";
                });

                const techOptions = applicableTechniques.map(([name, tech]) => ({
                    display: `${name} | Probe: ${formatModifier(tech.probeMod)} | Zeit: x${tech.timeFactor} | ${tech.effect}`,
                    name: name,
                    data: tech
                }));

                const selectedTechIndex = await quickAddApi.suggester(
                    techOptions.map(t => t.display),
                    techOptions.map((_, i) => i)
                );
                if (selectedTechIndex === null || selectedTechIndex === undefined) return;
                baseItemTechnique = techOptions[selectedTechIndex];

                // Select improvements (max 2)
                const improvementOptions = Object.entries(WEAPON_IMPROVEMENTS).map(([name, data]) => ({
                    display: `${name} | Probe: ${formatModifier(data.probeMod)} | Zeit: x${data.timeFactor}`,
                    name: name,
                    data: data
                }));

                const selectImprovements = await quickAddApi.yesNoPrompt("Verbesserungen?", "Verbesserungen hinzufügen? (max. 2, SF Waffenbau)");
                if (selectImprovements) {
                    const imp1Index = await quickAddApi.suggester(
                        ["❌ Keine", ...improvementOptions.map(i => i.display)],
                        [null, ...improvementOptions.map((_, i) => i)]
                    );
                    if (imp1Index !== null && imp1Index !== undefined) {
                        baseItemImprovements.push(improvementOptions[imp1Index]);
                        
                        const remainingImps = improvementOptions.filter((imp, i) => {
                            if (i === imp1Index && !imp.data.stackable) return false;
                            return true;
                        });
                        
                        const imp2Index = await quickAddApi.suggester(
                            ["❌ Keine weitere", ...remainingImps.map(i => i.display)],
                            [null, ...remainingImps.map((_, i) => i)]
                        );
                        if (imp2Index !== null && imp2Index !== undefined) {
                            baseItemImprovements.push(remainingImps[imp2Index]);
                        }
                    }
                }
                
                craftedBaseItem = { needsCrafting: true, type: "weapon", data: baseItemData };

            } else if (selectedObjectSource === "🛡️ Neue Rüstung herstellen") {
                // ARMOR CRAFTING SUB-FLOW
                let ruestungen;
                try {
                    const raw = await app.vault.adapter.read("dsa_categories/ruestungen.json");
                    ruestungen = JSON.parse(raw).filter(r => r.name && r.name.trim() !== '');
                } catch (e) {
                    new Notice("Fehler beim Laden der Rüstungs-Datenbank!");
                    console.error(e);
                    return;
                }

                // Select armor type first
                const armorTypes = Object.keys(ARMOR_TYPE_INTERVALS);
                const selectedArmorType = await quickAddApi.suggester(armorTypes, armorTypes);
                if (!selectedArmorType) return;

                // Filter armors by type or let user input custom
                const armorOptions = ruestungen.filter(r => r.name).slice(0, 100);
                armorOptions.unshift({ name: "📝 Eigene Rüstung eingeben", custom: true });

                const displayStrings = armorOptions.map(r => 
                    r.custom ? r.name : `${r.name} | RS: ${r.rs || '-'} | BE: ${r.be || '-'} | ${r.preis || '-'}`
                );
                
                const selectedArmorIndex = await quickAddApi.suggester(displayStrings, armorOptions.map((_, i) => i));
                if (selectedArmorIndex === null || selectedArmorIndex === undefined) return;

                const selectedArmor = armorOptions[selectedArmorIndex];
                let armorName;
                let baseRS = 0;
                let baseBE = 0;

                if (selectedArmor.custom) {
                    armorName = await quickAddApi.inputPrompt("Name der Rüstung:");
                    if (!armorName) return;
                    const rsInput = await quickAddApi.inputPrompt("RS (Rüstungsschutz):", "1");
                    baseRS = parseInt(rsInput) || 0;
                    const beInput = await quickAddApi.inputPrompt("BE (Behinderung):", "1");
                    baseBE = parseInt(beInput) || 0;
                } else {
                    armorName = selectedArmor.name;
                    baseRS = parseInt(selectedArmor.rs) || 0;
                    baseBE = parseInt(selectedArmor.be) || 0;
                }
                
                baseItemData = {
                    type: "Rüstung",
                    name: armorName,
                    armorType: selectedArmorType,
                    baseRS: baseRS,
                    baseBE: baseBE
                };

                baseItemInterval = ARMOR_TYPE_INTERVALS[selectedArmorType]?.hours || 6;

                // Select material for armor
                const materialCategories = [...new Set(Object.values(ARMOR_MATERIALS).map(m => m.category))];
                const materialOptions = [];
                for (const cat of materialCategories) {
                    const mats = Object.entries(ARMOR_MATERIALS).filter(([_, m]) => m.category === cat);
                    for (const [name, data] of mats) {
                        materialOptions.push({
                            display: `[${cat}] ${name} | Probe: ${formatModifier(data.probeMod)} | ${data.effect}`,
                            name: name,
                            data: data
                        });
                    }
                }

                const selectedMatIndex = await quickAddApi.suggester(
                    materialOptions.map(m => m.display),
                    materialOptions.map((_, i) => i)
                );
                if (selectedMatIndex === null || selectedMatIndex === undefined) return;
                baseItemMaterial = materialOptions[selectedMatIndex];

                isIronSteelObject = baseItemMaterial.data.category === "Metall" || 
                                   baseItemMaterial.data.category === "Magisches Metall";

                // Select technique for armor
                const applicableTechniques = Object.entries(ARMOR_TECHNIQUES).filter(([name, tech]) => {
                    if (!tech.requirement) return true;
                    if (tech.requirement === "nur für Kettenrüstungen" && selectedArmorType === "Kettenrüstung") return true;
                    return name === "Keine Technik";
                });

                const techOptions = applicableTechniques.map(([name, tech]) => ({
                    display: `${name} | Probe: ${formatModifier(tech.probeMod)} | Zeit: x${tech.timeFactor} | ${tech.effect}`,
                    name: name,
                    data: tech
                }));

                const selectedTechIndex = await quickAddApi.suggester(
                    techOptions.map(t => t.display),
                    techOptions.map((_, i) => i)
                );
                if (selectedTechIndex === null || selectedTechIndex === undefined) return;
                baseItemTechnique = techOptions[selectedTechIndex];

                // Select improvements (max 2)
                const improvementOptions = Object.entries(ARMOR_IMPROVEMENTS).map(([name, data]) => ({
                    display: `${name} | Probe: ${formatModifier(data.probeMod)} | Zeit: x${data.timeFactor}`,
                    name: name,
                    data: data
                }));

                const selectImprovements = await quickAddApi.yesNoPrompt("Verbesserungen?", "Verbesserungen hinzufügen? (max. 2, SF Rüstungsbau)");
                if (selectImprovements) {
                    const imp1Index = await quickAddApi.suggester(
                        ["❌ Keine", ...improvementOptions.map(i => i.display)],
                        [null, ...improvementOptions.map((_, i) => i)]
                    );
                    if (imp1Index !== null && imp1Index !== undefined) {
                        baseItemImprovements.push(improvementOptions[imp1Index]);
                        
                        const remainingImps = improvementOptions.filter((imp, i) => {
                            if (i === imp1Index && !imp.data.stackable) return false;
                            return true;
                        });
                        
                        const imp2Index = await quickAddApi.suggester(
                            ["❌ Keine weitere", ...remainingImps.map(i => i.display)],
                            [null, ...remainingImps.map((_, i) => i)]
                        );
                        if (imp2Index !== null && imp2Index !== undefined) {
                            baseItemImprovements.push(remainingImps[imp2Index]);
                        }
                    }
                }
                
                craftedBaseItem = { needsCrafting: true, type: "armor", data: baseItemData };

            } else if (selectedObjectSource === "🔧 Neuen Gegenstand herstellen") {
                // GENERAL OBJECT CRAFTING SUB-FLOW
                const objectName = await quickAddApi.inputPrompt("Name des Gegenstands:");
                if (!objectName) return;

                const talentOptions = ["Holzbearbeitung", "Lederbearbeitung", "Metallbearbeitung", "Steinbearbeitung", "Stoffbearbeitung"];
                const selectedTalent = await quickAddApi.suggester(talentOptions, talentOptions);
                if (!selectedTalent) return;

                const intervalStr = await quickAddApi.inputPrompt("Intervall (in Stunden):", "2");
                baseItemInterval = parseInt(intervalStr) || 2;

                baseItemData = {
                    type: "Gegenstand",
                    name: objectName,
                    talent: selectedTalent
                };

                baseItemMaterial = { name: "Standard", data: { probeMod: 0 } };
                baseItemTechnique = { name: "Keine Technik", data: { probeMod: 0, timeFactor: 1 } };

                // Check for iron/steel
                const checkIronSteel = await quickAddApi.yesNoPrompt(
                    "Eisen/Stahl?",
                    "Besteht das Objekt zu mindestens 50% aus Eisen oder Stahl?"
                );
                isIronSteelObject = checkIronSteel;
                
                craftedBaseItem = { needsCrafting: true, type: "object", data: baseItemData };

            } else {
                // Existing object - check for iron/steel
                const checkIronSteel = await quickAddApi.yesNoPrompt(
                    "Eisen/Stahl?",
                    "Besteht das Objekt zu mindestens 50% aus Eisen oder Stahl? (–2 auf Verzauberungsprobe)"
                );
                isIronSteelObject = checkIronSteel;
                
                craftedBaseItem = { needsCrafting: false };
            }
            
            // Calculate base item crafting modifiers and store in artifactData
            // (will be used later in skill check section)
            if (craftedBaseItem?.needsCrafting) {
                if (baseItemMaterial) baseItemProbeMod += baseItemMaterial.data.probeMod || 0;
                if (baseItemTechnique) baseItemProbeMod += baseItemTechnique.data.probeMod || 0;
                for (const imp of baseItemImprovements) {
                    baseItemProbeMod += imp.data.probeMod || 0;
                }
                if (baseItemMaterial?.data?.maxAttempts) {
                    baseItemMaxAttempts = baseItemMaterial.data.maxAttempts;
                }
            }
            
            // Store in artifactData for later use in skill check section
            // (artifactData is accessible outside this block)
            // Note: artifactData will be initialized after this point, so we set a flag
            const baseItemCraftingInfo = {
                probeMod: baseItemProbeMod,
                maxAttempts: baseItemMaxAttempts
            };
            
            // ========================================
            // STEP 2: ARTEFAKTTHESE (Optional)
            // ========================================
            
            const useArtefaktthese = await quickAddApi.yesNoPrompt(
                "Artefaktthese?",
                "Soll eine Artefaktthese angewendet werden?"
            );
            
            let selectedArtefaktthese = null;
            if (useArtefaktthese) {
                const thesenOptions = Object.entries(ARTEFAKTTHESEN)
                    .filter(([name]) => name !== "Keine Artefaktthese")
                    .map(([name, data]) => ({
                        display: `${name} | ${data.effect} | Voraussetzung: Magiekunde ${data.prereqMagiekunde}${data.prereqArcanovi > 0 ? `, ARCANOVI ${data.prereqArcanovi}` : ''}`,
                        name: name,
                        data: data
                    }));
                
                const selectedTheseIndex = await quickAddApi.suggester(
                    thesenOptions.map(t => t.display),
                    thesenOptions.map((_, i) => i)
                );
                
                if (selectedTheseIndex !== null && selectedTheseIndex !== undefined) {
                    selectedArtefaktthese = thesenOptions[selectedTheseIndex];
                }
            }
            
            // ========================================
            // STEP 3: ARTIFACT TYPE(S) - Vielfachartefakt Support
            // ========================================
            
            const artifactTypes = [];
            let isVielfachartefakt = false;
            
            // First artifact type
            const artifactTypeOptions = Object.entries(ARTIFACT_TYPES).map(([name, data]) => ({
                display: `${name}: ${data.description}`,
                name: name,
                data: data
            }));
            
            const selectedArtifactTypeIndex = await quickAddApi.suggester(
                artifactTypeOptions.map(a => a.display),
                artifactTypeOptions.map((_, i) => i)
            );
            if (selectedArtifactTypeIndex === null || selectedArtifactTypeIndex === undefined) return;
            
            artifactTypes.push(artifactTypeOptions[selectedArtifactTypeIndex]);
            
            // Ask about Vielfachartefakt
            const addMoreTypes = await quickAddApi.yesNoPrompt(
                "Vielfachartefakt?",
                "Soll das Artefakt mehrere Typen kombinieren? (SF Vielfachartefakt erforderlich)"
            );
            
            if (addMoreTypes) {
                isVielfachartefakt = true;
                let addAnother = true;
                
                while (addAnother && artifactTypes.length < 5) {
                    const remainingTypes = artifactTypeOptions.filter(t => 
                        !artifactTypes.find(at => at.name === t.name)
                    );
                    
                    if (remainingTypes.length === 0) break;
                    
                    const options = ["❌ Fertig mit Typen", ...remainingTypes.map(t => t.display)];
                    const selected = await quickAddApi.suggester(options, options.map((_, i) => i));
                    
                    if (!selected || selected === 0) {
                        addAnother = false;
                    } else {
                        artifactTypes.push(remainingTypes[selected - 1]);
                    }
                }
            }
            
            // Initialize artifact data
            artifactData = {
                types: artifactTypes.map(t => t.name),
                isVielfachartefakt: isVielfachartefakt,
                ritual: "ARCANOVI", // Primary ritual
                ritualCost: 16,
                ritualDuration: "8 Stunden",
                sfRequired: [],
                spells: [], // Array for multiple spells
                charges: 1,
                selfRecharging: null,
                isPermanent: false,
                infinitumCost: 0,
                infinitumPAsp: 0,
                weaponData: null,
                kraftspeicherMaterial: null,
                aspToStore: 0,
                totalAspCost: 0,
                totalPAspCost: 0,
                probeMod: 0,
                isIronSteel: isIronSteelObject,
                craftedBaseItem: craftedBaseItem,
                baseItemData: baseItemData,
                baseItemMaterial: baseItemMaterial,
                baseItemTechnique: baseItemTechnique,
                baseItemImprovements: baseItemImprovements,
                artefaktthese: selectedArtefaktthese,
                extensions: {
                    arcanovi: [],
                    infinitum: [],
                    zauberklinge: [],
                    applicatus: []
                },
                arcanoviQS: 0, // Track ARCANOVI QS separately for Eigenschaften
                probeBreakdown: [],
                veredelungPAspReduction: 0,
                baseItemProbeMod: baseItemCraftingInfo.probeMod,
                baseItemMaxAttempts: baseItemCraftingInfo.maxAttempts
            };
            
            // Apply iron/steel penalty
            if (isIronSteelObject) {
                artifactData.probeMod += IRON_STEEL_PENALTY;
            }
            
            // Collect SF requirements
            for (const artifactType of artifactTypes) {
                if (artifactType.data.sfRequired) {
                    artifactData.sfRequired.push(artifactType.data.sfRequired);
                }
            }
            if (isVielfachartefakt) {
                artifactData.sfRequired.push("Vielfachartefakt");
            }

            // ========================================
            // SPELL BINDING (for spell-binding artifact types)
            // ========================================
            
            // Check if any selected artifact type can bind spells
            const canBindSpells = artifactTypes.some(t => t.data.canBindSpells);
            const canBindRituals = artifactTypes.some(t => t.data.canBindRituals);
            const canBindZaubertricks = artifactTypes.some(t => t.data.canBindZaubertricks);
            
            if (canBindSpells || canBindRituals || canBindZaubertricks) {
                
                // Determine max spells allowed
                let maxSpellsAllowed = 1;
                
                // Check for Vielfachartefakt or Artefaktthese der Intelligenz
                if (isVielfachartefakt) {
                    maxSpellsAllowed = 10; // Vielfachartefakt allows many spells
                } else if (selectedArtefaktthese?.data?.allowsMultipleSpells) {
                    maxSpellsAllowed = 5; // Artefaktthese der Intelligenz
                }
                // INFINITUM multiple spells will be handled after permanent selection
                
                // Choose between ARCANOVI and APPLICATUS for Zauberspeicher
                let useApplicatus = false;
                if (artifactTypes.some(t => t.name === "Zauberspeicher")) {
                    const ritualChoice = await quickAddApi.suggester(
                        [
                            "ARCANOVI (permanent, 16 AsP, 8h, pAsP-Kosten)",
                            "APPLICATUS (temporär, 8 AsP, 5min, KEINE pAsP-Kosten)"
                        ],
                        ["arcanovi", "applicatus"]
                    );
                    
                    if (ritualChoice === "applicatus") {
                        useApplicatus = true;
                        artifactData.ritual = "APPLICATUS";
                        artifactData.ritualCost = APPLICATUS_DATA.ritualCost;
                        artifactData.ritualDuration = APPLICATUS_DATA.ritualDuration;
                        artifactData.isApplicatus = true;
                        
                        // APPLICATUS extensions allow multiple spells
                        maxSpellsAllowed = 3; // With Drei Zauber extension
                    }
                }
                
                // Spell selection loop
                let addMoreSpells = true;
                while (addMoreSpells && artifactData.spells.length < maxSpellsAllowed) {
                    
                    // Select spell type
                    const availableSpellTypes = [];
                    if (canBindSpells) availableSpellTypes.push("Zauberspruch");
                    if (canBindRituals) availableSpellTypes.push("Ritual");
                    if (canBindZaubertricks) availableSpellTypes.push("Zaubertrick");
                    
                    let selectedSpellType = "Zauberspruch";
                    if (availableSpellTypes.length > 1) {
                        const spellTypeDisplay = availableSpellTypes.map(st => {
                            const sf = SPELL_TYPES[st].sfRequired;
                            return sf ? `${st} (SF: ${sf})` : st;
                        });
                        
                        const typeIndex = await quickAddApi.suggester(spellTypeDisplay, availableSpellTypes);
                        if (!typeIndex) {
                            if (artifactData.spells.length === 0) return;
                            break;
                        }
                        selectedSpellType = typeIndex;
                    }
                    
                    // Load spells from appropriate JSON
                    let spellList;
                    try {
                        const raw = await app.vault.adapter.read(SPELL_TYPES[selectedSpellType].jsonFile);
                        spellList = JSON.parse(raw).filter(s => s.name && s.name.trim() !== '');
                    } catch (e) {
                        new Notice(`Fehler beim Laden der ${selectedSpellType}-Datenbank!`);
                        console.error(e);
                        // Fall back to zauber.json
                        try {
                            const raw = await app.vault.adapter.read("dsa_categories/zauber.json");
                            spellList = JSON.parse(raw).filter(z => z.name && z.name.trim() !== '');
                        } catch (e2) {
                            new Notice("Fehler beim Laden der Zauber-Datenbank!");
                            console.error(e2);
                            return;
                        }
                    }
                    
                    // Select by Merkmal
                    const merkmale = [...new Set(spellList.map(s => s.merkmal).filter(Boolean))].sort();
                    merkmale.unshift("📚 Alle anzeigen");
                    
                    const selectedMerkmal = await quickAddApi.suggester(merkmale, merkmale);
                    if (!selectedMerkmal) {
                        if (artifactData.spells.length === 0) return;
                        break;
                    }
                    
                    // Filter spells
                    const filteredSpells = selectedMerkmal === "📚 Alle anzeigen"
                        ? spellList
                        : spellList.filter(s => s.merkmal === selectedMerkmal);
                    
                    filteredSpells.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
                    
                    // Select spell
                    const spellDisplayStrings = filteredSpells.map(s => {
                        const cost = s.asp_kosten || s.kosten || '-';
                        return `${s.name} | ${cost} | ${s.merkmal || '-'}`;
                    });
                    
                    const selectedSpellIndex = await quickAddApi.suggester(spellDisplayStrings, filteredSpells.map((_, i) => i));
                    if (selectedSpellIndex === null || selectedSpellIndex === undefined) {
                        if (artifactData.spells.length === 0) return;
                        break;
                    }
                    
                    const selectedSpell = filteredSpells[selectedSpellIndex];
                    
                    // Parse spell cost
                    let spellBaseCost = 0;
                    const costField = selectedSpell.asp_kosten || selectedSpell.kosten || '';
                    if (costField) {
                        const costMatch = costField.match(/(\d+)\s*AsP/);
                        if (costMatch) {
                            spellBaseCost = parseInt(costMatch[1]) || 0;
                        }
                    }
                    
                    // Add spell to list
                    artifactData.spells.push({
                        name: selectedSpell.name,
                        type: selectedSpellType,
                        cost: spellBaseCost,
                        merkmal: selectedSpell.merkmal,
                        data: selectedSpell,
                        sfRequired: SPELL_TYPES[selectedSpellType].sfRequired
                    });
                    
                    // Track SF requirements
                    if (SPELL_TYPES[selectedSpellType].sfRequired) {
                        if (!artifactData.sfRequired.includes(SPELL_TYPES[selectedSpellType].sfRequired)) {
                            artifactData.sfRequired.push(SPELL_TYPES[selectedSpellType].sfRequired);
                        }
                    }
                    
                    // Ask about more spells if allowed
                    if (maxSpellsAllowed > 1 && artifactData.spells.length < maxSpellsAllowed) {
                        const continueAdding = await quickAddApi.yesNoPrompt(
                            "Weiterer Zauber?",
                            `Noch einen ${selectedSpellType} hinzufügen? (${artifactData.spells.length}/${maxSpellsAllowed})`
                        );
                        if (!continueAdding) {
                            addMoreSpells = false;
                        }
                    } else {
                        addMoreSpells = false;
                    }
                }
                
                // For backward compatibility, set single spell properties
                if (artifactData.spells.length > 0) {
                    artifactData.spellName = artifactData.spells[0].name;
                    artifactData.spellCost = artifactData.spells[0].cost;
                    artifactData.spellMerkmal = artifactData.spells[0].merkmal;
                    artifactData.spellData = artifactData.spells[0].data;
                }
                
                // For Zauberspeicher: select number of charges (1-7)
                if (artifactTypes.some(t => t.name === "Zauberspeicher") && !useApplicatus) {
                    const chargeOptions = ["1", "2", "3", "4", "5", "6", "7"];
                    const selectedCharges = await quickAddApi.suggester(
                        chargeOptions.map(c => `${c} Ladung${c === "1" ? "" : "en"} (Probe: ${c === "1" ? "±0" : `-${parseInt(c) - 1}`})`),
                        chargeOptions
                    );
                    if (!selectedCharges) return;
                    
                    artifactData.charges = parseInt(selectedCharges);
                    
                    // Apply Artefaktthese der Effizienz bonus
                    if (selectedArtefaktthese?.data?.bonusCharge) {
                        artifactData.charges = Math.min(7, artifactData.charges + selectedArtefaktthese.data.bonusCharge);
                    }
                    
                    // Each charge after the first adds -1 to probe
                    artifactData.probeMod += -(artifactData.charges - 1);

                    // Self-recharging option
                    const rechargeOptions = Object.entries(SELF_RECHARGING_OPTIONS).map(([name, data]) => ({
                        display: `${name}${data.probeMod !== 0 ? ` (Probe: ${data.probeMod}, Kosten: x${data.costMultiplier})` : ''}`,
                        name: name,
                        data: data
                    }));
                    
                    const selectedRechargeIndex = await quickAddApi.suggester(
                        rechargeOptions.map(r => r.display),
                        rechargeOptions.map((_, i) => i)
                    );
                    if (selectedRechargeIndex === null || selectedRechargeIndex === undefined) return;
                    
                    const selectedRecharge = rechargeOptions[selectedRechargeIndex];
                    if (selectedRecharge.name !== "Keine Selbstaufladung") {
                        artifactData.selfRecharging = selectedRecharge.name;
                        artifactData.probeMod += selectedRecharge.data.probeMod;
                        artifactData.spellCostMultiplier = selectedRecharge.data.costMultiplier;
                    } else {
                        artifactData.spellCostMultiplier = 1;
                    }
                }

                // Permanent with INFINITUM IMMERDAR? (only for ARCANOVI, not APPLICATUS)
                if (!useApplicatus) {
                    const makePermanent = await quickAddApi.yesNoPrompt(
                        "Permanent?",
                        "Soll das Artefakt mit INFINITUM IMMERDAR permanent werden? (+64 AsP, +8 pAsP)"
                    );
                    
                    if (makePermanent) {
                        artifactData.isPermanent = true;
                        artifactData.infinitumCost = 64;
                        artifactData.infinitumPAsp = 8;
                        
                        // INFINITUM extensions for multiple spells
                        const selectInfinitumExtensions = await quickAddApi.yesNoPrompt(
                            "INFINITUM Erweiterungen?",
                            "INFINITUM-Erweiterungen auswählen? (z.B. für mehrere permanente Zauber)"
                        );
                        
                        if (selectInfinitumExtensions) {
                            const infinitumExtOptions = Object.entries(INFINITUM_EXTENSIONS).map(([name, data]) => ({
                                display: `${name} (FW ${data.fw}): ${data.effect}`,
                                name: name,
                                data: data
                            }));
                            
                            let selectMoreExt = true;
                            while (selectMoreExt) {
                                const remaining = infinitumExtOptions.filter(e => 
                                    !artifactData.extensions.infinitum.find(x => x.name === e.name)
                                );
                                if (remaining.length === 0) break;
                                
                                const options = ["❌ Fertig", ...remaining.map(e => e.display)];
                                const selected = await quickAddApi.suggester(options, options.map((_, i) => i));
                                
                                if (!selected || selected === 0) {
                                    selectMoreExt = false;
                                } else {
                                    const selectedExt = remaining[selected - 1];
                                    artifactData.extensions.infinitum.push(selectedExt);
                                    
                                    // If Zwei/Drei Zauber selected, allow adding more spells
                                    if (selectedExt.data.maxSpells && selectedExt.data.maxSpells > artifactData.spells.length) {
                                        const addMore = await quickAddApi.yesNoPrompt(
                                            "Weitere Zauber?",
                                            `${selectedExt.name} erlaubt ${selectedExt.data.maxSpells} Zauber. Weitere hinzufügen?`
                                        );
                                        
                                        if (addMore) {
                                            // Allow adding more spells up to max
                                            while (artifactData.spells.length < selectedExt.data.maxSpells) {
                                                // Re-use spell selection logic (simplified)
                                                let spellList;
                                                try {
                                                    const raw = await app.vault.adapter.read("dsa_categories/zauber.json");
                                                    spellList = JSON.parse(raw).filter(z => z.name && z.name.trim() !== '');
                                                } catch (e) {
                                                    break;
                                                }
                                                
                                                spellList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
                                                const spellDisplayStrings = spellList.map(z => {
                                                    const cost = z.asp_kosten || '-';
                                                    return `${z.name} | ${cost}`;
                                                });
                                                
                                                const spellIdx = await quickAddApi.suggester(
                                                    ["❌ Keine weiteren Zauber", ...spellDisplayStrings],
                                                    [null, ...spellList.map((_, i) => i)]
                                                );
                                                
                                                if (spellIdx === null) break;
                                                
                                                const spell = spellList[spellIdx];
                                                let cost = 0;
                                                if (spell.asp_kosten) {
                                                    const match = spell.asp_kosten.match(/(\d+)\s*AsP/);
                                                    if (match) cost = parseInt(match[1]) || 0;
                                                }
                                                
                                                artifactData.spells.push({
                                                    name: spell.name,
                                                    type: "Zauberspruch",
                                                    cost: cost,
                                                    merkmal: spell.merkmal,
                                                    data: spell,
                                                    sfRequired: null
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // APPLICATUS extensions
                if (useApplicatus) {
                    const selectApplicatusExtensions = await quickAddApi.yesNoPrompt(
                        "APPLICATUS Erweiterungen?",
                        "APPLICATUS-Erweiterungen auswählen?"
                    );
                    
                    if (selectApplicatusExtensions) {
                        const appExtOptions = Object.entries(APPLICATUS_DATA.extensions).map(([name, data]) => ({
                            display: `${name} (FW ${data.fw}): ${data.effect}`,
                            name: name,
                            data: data
                        }));
                        
                        let selectMoreExt = true;
                        while (selectMoreExt) {
                            const remaining = appExtOptions.filter(e => 
                                !artifactData.extensions.applicatus.find(x => x.name === e.name)
                            );
                            if (remaining.length === 0) break;
                            
                            const options = ["❌ Fertig", ...remaining.map(e => e.display)];
                            const selected = await quickAddApi.suggester(options, options.map((_, i) => i));
                            
                            if (!selected || selected === 0) {
                                selectMoreExt = false;
                            } else {
                                artifactData.extensions.applicatus.push(remaining[selected - 1]);
                            }
                        }
                    }
                }
            }
            // ========================================
            // KRAFTSPEICHER
            // ========================================
            if (artifactTypes.some(t => t.name === "Kraftspeicher")) {
                // Select Kraftspeicher material
                const ksMatOptions = Object.entries(KRAFTSPEICHER_MATERIALS).map(([name, data]) => ({
                    display: `${name} (max. ${data.maxAsp} AsP) - ${data.note}`,
                    name: name,
                    data: data
                }));
                
                const selectedKsMatIndex = await quickAddApi.suggester(
                    ksMatOptions.map(m => m.display),
                    ksMatOptions.map((_, i) => i)
                );
                if (selectedKsMatIndex === null || selectedKsMatIndex === undefined) return;
                
                artifactData.kraftspeicherMaterial = ksMatOptions[selectedKsMatIndex];
                
                // Input AsP to store
                const maxAsp = artifactData.kraftspeicherMaterial.data.maxAsp;
                const aspStr = await quickAddApi.inputPrompt(`AsP zu speichern (max. ${maxAsp}):`, String(maxAsp));
                artifactData.aspToStore = Math.min(parseInt(aspStr) || 0, maxAsp);
            }
            
            // ========================================
            // MAGISCHE WAFFE
            // ========================================
            if (artifactTypes.some(t => t.name === "Magische Waffe")) {
                // Load weapons from JSON
                let waffen;
                try {
                    const raw = await app.vault.adapter.read("dsa_categories/waffen.json");
                    waffen = JSON.parse(raw).filter(w => w.name && w.name.trim() !== '' && w.tp);
                } catch (e) {
                    new Notice("Fehler beim Laden der Waffen-Datenbank!");
                    console.error(e);
                    return;
                }

                // Select weapon
                const subcategories = [...new Set(waffen.map(w => w._subcategory).filter(Boolean))].sort();
                subcategories.unshift("⚔️ Alle Waffen anzeigen");
                
                const selectedSubcat = await quickAddApi.suggester(
                    subcategories.map(s => s === "⚔️ Alle Waffen anzeigen" ? s : s.charAt(0).toUpperCase() + s.slice(1)),
                    subcategories
                );
                if (!selectedSubcat) return;

                const filtered = selectedSubcat === "⚔️ Alle Waffen anzeigen"
                    ? waffen
                    : waffen.filter(w => w._subcategory === selectedSubcat);
                
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));

                const displayStrings = filtered.map(w => `${w.name} | TP: ${w.tp || '-'} | ${w.preis || '-'}`);
                const selectedWeaponIndex = await quickAddApi.suggester(displayStrings, filtered.map((_, i) => i));
                if (selectedWeaponIndex === null || selectedWeaponIndex === undefined) return;

                const selectedWeapon = filtered[selectedWeaponIndex];
                artifactData.weaponData = selectedWeapon;

                // Determine weapon size and cost
                let weaponSize = "mittel";
                let weaponCost = 20;
                for (const [size, data] of Object.entries(ZAUBERKLINGE_COSTS)) {
                    if (data.subcategories.includes(selectedWeapon._subcategory)) {
                        weaponSize = size;
                        weaponCost = data.cost;
                        break;
                    }
                }
                artifactData.weaponSize = weaponSize;
                artifactData.zauberkligneCost = weaponCost;

                // Duration type
                const durationOptions = [
                    { display: `Standard (QS x 3 Tage) - ${weaponCost} AsP`, type: "standard", cost: weaponCost, pAspPercent: 0 },
                    { display: `Lang (QS x 30 Jahre) - ${weaponCost * 5} AsP, 5% pAsP`, type: "long", cost: weaponCost * 5, pAspPercent: 5 }
                ];
                
                const selectedDurationIndex = await quickAddApi.suggester(
                    durationOptions.map(d => d.display),
                    durationOptions.map((_, i) => i)
                );
                if (selectedDurationIndex === null || selectedDurationIndex === undefined) return;
                
                artifactData.duration = durationOptions[selectedDurationIndex];

                // Iron/steel already checked at start
                
                // ZAUBERKLINGE extensions
                const selectZauberklingeExtensions = await quickAddApi.yesNoPrompt(
                    "ZAUBERKLINGE Erweiterungen?",
                    "ZAUBERKLINGE-Erweiterungen auswählen?"
                );
                
                if (selectZauberklingeExtensions) {
                    const zkExtOptions = Object.entries(ZAUBERKLINGE_EXTENSIONS).map(([name, data]) => ({
                        display: `${name} (FW ${data.fw}): ${data.effect}${data.extraCost ? ` (+${data.extraCost} AsP)` : ''}`,
                        name: name,
                        data: data
                    }));
                    
                    let selectMoreExt = true;
                    while (selectMoreExt) {
                        const remaining = zkExtOptions.filter(e => 
                            !artifactData.extensions.zauberklinge.find(x => x.name === e.name)
                        );
                        if (remaining.length === 0) break;
                        
                        const options = ["❌ Fertig", ...remaining.map(e => e.display)];
                        const selected = await quickAddApi.suggester(options, options.map((_, i) => i));
                        
                        if (!selected || selected === 0) {
                            selectMoreExt = false;
                        } else {
                            artifactData.extensions.zauberklinge.push(remaining[selected - 1]);
                        }
                    }
                }
            }

            // ========================================
            // ARCANOVI EXTENSIONS (if using ARCANOVI)
            // ========================================
            if (artifactData.ritual === "ARCANOVI") {
                const selectArcanoviExtensions = await quickAddApi.yesNoPrompt(
                    "ARCANOVI Erweiterungen?",
                    "ARCANOVI-Erweiterungen auswählen? (z.B. kürzere Ritualdauer)"
                );
                
                if (selectArcanoviExtensions) {
                    const arcExtOptions = Object.entries(ARCANOVI_EXTENSIONS).map(([name, data]) => ({
                        display: `${name} (FW ${data.fw}): ${data.effect}`,
                        name: name,
                        data: data
                    }));
                    
                    let selectMoreExt = true;
                    while (selectMoreExt) {
                        const remaining = arcExtOptions.filter(e => 
                            !artifactData.extensions.arcanovi.find(x => x.name === e.name)
                        );
                        if (remaining.length === 0) break;
                        
                        const options = ["❌ Fertig", ...remaining.map(e => e.display)];
                        const selected = await quickAddApi.suggester(options, options.map((_, i) => i));
                        
                        if (!selected || selected === 0) {
                            selectMoreExt = false;
                        } else {
                            const selectedExt = remaining[selected - 1];
                            artifactData.extensions.arcanovi.push(selectedExt);
                            
                            // Apply extension effects
                            if (selectedExt.data.globalProbeMod) {
                                artifactData.probeMod += selectedExt.data.globalProbeMod;
                            }
                        }
                    }
                }
            }
            
            // ========================================
            // MATERIAL COST REDUCTION (optional)
            // ========================================
            const useMaterialReduction = await quickAddApi.yesNoPrompt(
                "Materialien zur Kostenreduktion?",
                "Sollen besondere Materialien zur pAsP-Reduktion oder Probe-Erleichterung eingesetzt werden? (100 Silber pro Effekt)"
            );
            
            let materialReductionPAsp = 0;
            let materialReductionProbe = 0;
            
            if (useMaterialReduction) {
                const reductionChoice = await quickAddApi.suggester(
                    [
                        "pAsP reduzieren (–1 pAsP pro 100S, max. 50%)",
                        "Probe erleichtern (+1 pro 100S)"
                    ],
                    ["pasp", "probe"]
                );
                
                if (reductionChoice) {
                    const amountStr = await quickAddApi.inputPrompt(
                        "Wie viele 100er-Einheiten? (z.B. 3 = 300 Silbertaler):",
                        "1"
                    );
                    const amount = parseInt(amountStr) || 0;
                    
                    if (reductionChoice === "pasp") {
                        materialReductionPAsp = amount;
                        artifactData.materialReductionPAsp = amount;
                    } else {
                        materialReductionProbe = amount;
                        artifactData.materialReductionProbe = amount;
                        artifactData.probeMod += amount;
                    }
                }
            }

            // ========================================
            // ARTIFACT: VEREDELUNG (optional)
            // ========================================
            const addVeredelung = await quickAddApi.yesNoPrompt(
                "Veredelung?",
                "Soll das Artefakt mit einem besonderen Material veredelt werden?"
            );
            
            if (addVeredelung) {
                const veredCategories = [...new Set(Object.values(VEREDELUNG_MATERIALS).map(v => v.category))];
                const veredOptions = [];
                for (const cat of veredCategories) {
                    const mats = Object.entries(VEREDELUNG_MATERIALS).filter(([_, v]) => v.category === cat);
                    for (const [name, data] of mats) {
                        veredOptions.push({
                            display: `[${cat}] ${name} | Probe: ${formatModifier(data.probeMod)} | ${data.effect}`,
                            name: name,
                            data: data
                        });
                    }
                }
                
                const selectedVeredIndex = await quickAddApi.suggester(
                    veredOptions.map(v => v.display),
                    veredOptions.map((_, i) => i)
                );
                
                if (selectedVeredIndex !== null && selectedVeredIndex !== undefined) {
                    selectedVeredelung = veredOptions[selectedVeredIndex];
                }
            }

            // ========================================
            // ARTIFACT: ZAUBERZEICHEN (optional)
            // ========================================
            const addZauberzeichen = await quickAddApi.yesNoPrompt(
                "Zauberzeichen?",
                "Sollen Arkanoglyphen auf das Artefakt gezeichnet werden?"
            );
            
            if (addZauberzeichen) {
                const zeichenOptions = Object.entries(ZAUBERZEICHEN)
                    .filter(([_, z]) => !z.isZusatzzeichen)
                    .map(([name, data]) => ({
                        display: `${name} | ${data.aspCost} AsP | ${data.effect}`,
                        name: name,
                        data: data
                    }));
                
                // Allow selecting multiple Zauberzeichen
                let selectMore = true;
                while (selectMore && selectedZauberzeichen.length < 3) {
                    const remaining = zeichenOptions.filter(z => !selectedZauberzeichen.find(s => s.name === z.name));
                    if (remaining.length === 0) break;
                    
                    const options = ["❌ Fertig mit Zauberzeichen", ...remaining.map(z => z.display)];
                    const selectedZeichenIndex = await quickAddApi.suggester(options, options.map((_, i) => i));
                    
                    if (!selectedZeichenIndex || selectedZeichenIndex === 0) {
                        selectMore = false;
                    } else {
                        selectedZauberzeichen.push(remaining[selectedZeichenIndex - 1]);
                    }
                }
            }

            // ========================================
            // ARTIFACT: CALCULATE COSTS
            // ========================================
            let totalAsp = 0;
            let totalPAsp = 0;
            
            // Calculate costs based on artifact types
            for (const artifactType of artifactTypes) {
                if (artifactType.name === "Zauberspeicher" && !artifactData.isApplicatus) {
                    const multiplier = artifactData.spellCostMultiplier || 1;
                    // Sum all spell costs
                    const spellTotal = artifactData.spells.reduce((sum, spell) => sum + spell.cost, 0) * multiplier * artifactData.charges;
                    totalAsp += artifactData.ritualCost + spellTotal;
                    
                    // Calculate pAsP
                    if (selectedArtefaktthese?.data?.pAspOnlyFirstCharge) {
                        // Artefaktthese der Aufladung: only first charge counts
                        const firstChargeTotal = artifactData.ritualCost + artifactData.spells.reduce((sum, spell) => sum + spell.cost, 0) * multiplier;
                        totalPAsp += Math.ceil(firstChargeTotal * 0.1);
                    } else {
                        totalPAsp += Math.ceil((artifactData.ritualCost + spellTotal) * 0.1);
                    }
                } else if (artifactType.name === "Zauberspeicher" && artifactData.isApplicatus) {
                    // APPLICATUS: no pAsP!
                    const spellTotal = artifactData.spells.reduce((sum, spell) => sum + spell.cost, 0);
                    totalAsp += APPLICATUS_DATA.ritualCost + spellTotal;
                    // No pAsP for APPLICATUS
                } else if (artifactType.name === "Matrixspeicher") {
                    const spellTotal = artifactData.spells.reduce((sum, spell) => sum + spell.cost, 0);
                    totalAsp += artifactData.ritualCost + spellTotal;
                    totalPAsp += Math.ceil((artifactData.ritualCost + spellTotal) * 0.1);
                } else if (artifactType.name === "Zaubertalisman") {
                    const spellTotal = artifactData.spells.reduce((sum, spell) => sum + spell.cost, 0);
                    totalAsp += artifactData.ritualCost + spellTotal;
                    // Zaubertalisman normally has no pAsP, but with self-recharging it does
                    if (artifactData.selfRecharging) {
                        totalPAsp += Math.ceil((artifactData.ritualCost + spellTotal) * 0.1);
                    }
                } else if (artifactType.name === "Kraftspeicher") {
                    totalAsp += artifactData.ritualCost + artifactData.aspToStore;
                    // No pAsP for Kraftspeicher
                } else if (artifactType.name === "Magische Waffe" && artifactData.duration) {
                    let weaponCost = artifactData.duration.cost;
                    
                    // Add extension costs
                    for (const ext of artifactData.extensions.zauberklinge) {
                        if (ext.data.extraCost) {
                            weaponCost += ext.data.extraCost;
                        }
                    }
                    
                    totalAsp += weaponCost;
                    if (artifactData.duration.pAspPercent > 0) {
                        totalPAsp += Math.ceil(weaponCost * artifactData.duration.pAspPercent / 100);
                    }
                }
            }
            
            // Add INFINITUM costs if permanent
            if (artifactData.isPermanent) {
                totalAsp += artifactData.infinitumCost;
                totalPAsp += artifactData.infinitumPAsp;
            }
            
            // Apply material cost reduction to pAsP
            if (materialReductionPAsp > 0) {
                const maxReduction = Math.ceil(totalPAsp * MATERIAL_COST_REDUCTION.maxReduction);
                const actualReduction = Math.min(materialReductionPAsp, maxReduction);
                totalPAsp = Math.max(0, totalPAsp - actualReduction);
                artifactData.materialReductionApplied = actualReduction;
            }
            
            // Apply Veredelung pAsP reduction (for magical metals)
            if (selectedVeredelung?.data?.pAspReduction) {
                const veredelungReduction = selectedVeredelung.data.pAspReduction;
                totalPAsp = Math.max(0, totalPAsp - veredelungReduction);
                artifactData.veredelungPAspReduction = veredelungReduction;
            }

            artifactData.totalAspCost = totalAsp;
            artifactData.totalPAspCost = totalPAsp;

            // Add Zauberzeichen costs
            for (const zeichen of selectedZauberzeichen) {
                const cost = typeof zeichen.data.aspCost === 'number' ? zeichen.data.aspCost : 8;
                artifactData.totalAspCost += cost;
                if (zeichen.data.pAsp) {
                    artifactData.totalPAspCost += zeichen.data.pAsp;
                }
            }

            // Set item name
            let artifactName = "";
            if (artifactTypes.some(t => t.name === "Magische Waffe") && artifactData.weaponData) {
                artifactName = artifactData.weaponData.name;
            } else if (artifactData.spells && artifactData.spells.length > 0) {
                const spellNames = artifactData.spells.map(s => s.name).join("+");
                artifactName = await quickAddApi.inputPrompt("Name des Artefakts:", `${spellNames}-Artefakt`);
            } else if (artifactData.kraftspeicherMaterial) {
                artifactName = await quickAddApi.inputPrompt("Name des Kraftspeichers:", artifactData.kraftspeicherMaterial.name);
            } else {
                artifactName = await quickAddApi.inputPrompt("Name des Artefakts:");
            }
            if (!artifactName) return;

            itemData = {
                type: "Artefakt",
                name: artifactName,
                artifactTypes: artifactData.types,
                komplexitaet: "komplex"
            };

            // Set ritual duration as base interval (for display)
            baseInterval = 8; // 8 hours for ARCANOVI/ZAUBERKLINGE

            // Use minimal material/technique for artifact output calculation
            selectedMaterial = { name: "Artefakt", data: { probeMod: artifactData.probeMod, effect: "-" } };
            selectedTechnique = { name: "Keine", data: { probeMod: 0, timeFactor: 1 } };
        }
        // ========================================
        // GENERAL OBJECT FLOW
        // ========================================
        else if (selectedType === "📦 Allgemeiner Gegenstand") {
            const objectName = await quickAddApi.inputPrompt("Name des Gegenstands:");
            if (!objectName) return;

            const talentOptions = [
                "Holzbearbeitung",
                "Lederbearbeitung", 
                "Metallbearbeitung",
                "Steinbearbeitung",
                "Stoffbearbeitung",
                "Malen & Zeichnen",
                "Anderes Talent"
            ];
            const selectedTalent = await quickAddApi.suggester(talentOptions, talentOptions);
            if (!selectedTalent) return;

            let talent = selectedTalent;
            if (selectedTalent === "Anderes Talent") {
                talent = await quickAddApi.inputPrompt("Welches Talent?");
                if (!talent) return;
            }

            const komplexitaetOptions = ["Primitiv", "Einfach", "Komplex"];
            const selectedKomplexitaet = await quickAddApi.suggester(komplexitaetOptions, komplexitaetOptions);
            if (!selectedKomplexitaet) return;

            const intervalStr = await quickAddApi.inputPrompt("Intervall (in Stunden):", "2");
            baseInterval = parseInt(intervalStr) || 2;

            itemData = {
                type: "Gegenstand",
                name: objectName,
                talent: talent,
                komplexitaet: selectedKomplexitaet.toLowerCase()
            };

            // Simple material selection for general objects
            selectedMaterial = {
                name: "Standard",
                data: { probeMod: 0, effect: "keine Effekte", talent: talent }
            };
            selectedTechnique = {
                name: "Keine Technik",
                data: { probeMod: 0, timeFactor: 1, effect: "keine Effekte" }
            };
        }

        // ========================================
        // CALCULATE TOTAL MODIFIERS
        // ========================================

        let totalProbeMod = 0;
        let totalTimeFactor = 1;
        let maxAttempts = 7;

        // Material modifiers
        if (selectedMaterial) {
            totalProbeMod += selectedMaterial.data.probeMod || 0;
            if (selectedMaterial.data.maxAttempts) {
                maxAttempts = selectedMaterial.data.maxAttempts;
            }
        }

        // Technique modifiers
        if (selectedTechnique && selectedTechnique.data) {
            totalProbeMod += selectedTechnique.data.probeMod || 0;
            totalTimeFactor *= selectedTechnique.data.timeFactor || 1;
        }

        // Improvement modifiers
        for (const imp of selectedImprovements) {
            totalProbeMod += imp.data.probeMod || 0;
            totalTimeFactor *= imp.data.timeFactor || 1;
        }

        // Calculate total time
        const totalIntervalHours = baseInterval * totalTimeFactor;
        const totalTimeForSuccess = totalIntervalHours * 7; // Assuming max 7 attempts

        // ========================================
        // SKILL CHECK OR MANUAL QS
        // ========================================

        let finalQS = 0;
        let attemptLog = [];
        let craftingSuccess = false;
        let baseItemCraftingLog = null;
        let arcanoviProbeLog = null;
        
        // Track all probe modifiers for breakdown
        let probeBreakdown = [];

        // For artifacts: handle base item crafting separately from enchantment
        if (itemData.type === "Artefakt" && artifactData) {
            
            // STEP A: Base item crafting (if needed) - Sammelprobe
            if (artifactData.craftedBaseItem?.needsCrafting) {
                const craftCheckMethod = await quickAddApi.suggester(
                    ["🎲 Herstellungsprobe würfeln", "📝 Herstellungs-QS eingeben", "⏭️ Herstellung überspringen"],
                    ["roll", "manual", "skip"]
                );
                
                if (craftCheckMethod === "roll") {
                    const craftFW = parseInt(await quickAddApi.inputPrompt("Handwerks-FW (für Herstellung):", "10")) || 10;
                    const craftAttr1 = parseInt(await quickAddApi.inputPrompt("Attribut 1 (z.B. FF):", "12")) || 12;
                    const craftAttr2 = parseInt(await quickAddApi.inputPrompt("Attribut 2 (z.B. GE):", "12")) || 12;
                    const craftAttr3 = parseInt(await quickAddApi.inputPrompt("Attribut 3 (z.B. KO):", "12")) || 12;
                    
                    // Use baseItemProbeMod for crafting (stored in artifactData)
                    const craftProbeMod = artifactData.baseItemProbeMod || 0;
                    const craftMaxAttempts = artifactData.baseItemMaxAttempts || 7;
                    
                    const craftResult = await executeSammelprobe(craftFW, craftAttr1, craftAttr2, craftAttr3, craftProbeMod, craftMaxAttempts);
                    baseItemCraftingLog = {
                        success: craftResult.success,
                        totalQS: craftResult.totalQS,
                        attempts: craftResult.attemptResults,
                        probeMod: craftProbeMod
                    };
                    
                    new Notice(`Herstellung: ${craftResult.success ? '✅' : '❌'} QS ${craftResult.totalQS}/10`, 5000);
                    
                    if (!craftResult.success) {
                        new Notice("Herstellung fehlgeschlagen! Artefakt kann nicht erstellt werden.", 5000);
                        return;
                    }
                } else if (craftCheckMethod === "manual") {
                    const craftQS = parseInt(await quickAddApi.inputPrompt("Herstellungs-QS eingeben (10 = Erfolg):", "10")) || 0;
                    baseItemCraftingLog = {
                        success: craftQS >= 10,
                        totalQS: craftQS,
                        attempts: [],
                        probeMod: artifactData.baseItemProbeMod || 0
                    };
                    
                    if (craftQS < 10) {
                        new Notice("Herstellung fehlgeschlagen! Artefakt kann nicht erstellt werden.", 5000);
                        return;
                    }
                }
                // If skipped, assume base item exists
            }
            
            // STEP B: Enchantment probe - SINGLE PROBE (not Sammelprobe!)
            // Build probe breakdown
            probeBreakdown = [];
            let enchantProbeMod = 0;
            
            if (artifactData.isIronSteel) {
                probeBreakdown.push({ source: "Eisen/Stahl-Objekt", mod: IRON_STEEL_PENALTY });
                enchantProbeMod += IRON_STEEL_PENALTY;
            }
            
            if (artifactData.materialReductionProbe) {
                probeBreakdown.push({ source: "Materialien (Probe-Erleichterung)", mod: artifactData.materialReductionProbe });
                enchantProbeMod += artifactData.materialReductionProbe;
            }
            
            if (artifactData.artefaktthese?.data?.fpBonus) {
                probeBreakdown.push({ source: `Artefaktthese (${artifactData.artefaktthese.name})`, mod: artifactData.artefaktthese.data.fpBonus });
                // FP bonus is applied differently - it's bonus FP on success, not probe mod
            }
            
            // ARCANOVI extension bonuses
            for (const ext of artifactData.extensions.arcanovi) {
                if (ext.data.globalProbeMod) {
                    probeBreakdown.push({ source: `ARCANOVI: ${ext.name}`, mod: ext.data.globalProbeMod });
                    enchantProbeMod += ext.data.globalProbeMod;
                }
            }
            
            // Veredelung bonus (for magical metals)
            if (selectedVeredelung?.data?.arcanoviBonus) {
                probeBreakdown.push({ source: `Veredelung (${selectedVeredelung.name})`, mod: selectedVeredelung.data.arcanoviBonus });
                enchantProbeMod += selectedVeredelung.data.arcanoviBonus;
            }
            
            // Charges penalty
            if (artifactData.charges > 1) {
                const chargesPenalty = -(artifactData.charges - 1);
                probeBreakdown.push({ source: `Zusätzliche Ladungen (${artifactData.charges - 1}x)`, mod: chargesPenalty });
                enchantProbeMod += chargesPenalty;
            }
            
            // Self-recharging penalty
            if (artifactData.selfRecharging) {
                const rechargeData = SELF_RECHARGING_OPTIONS[artifactData.selfRecharging];
                if (rechargeData?.probeMod) {
                    probeBreakdown.push({ source: `Selbstaufladung (${artifactData.selfRecharging})`, mod: rechargeData.probeMod });
                    enchantProbeMod += rechargeData.probeMod;
                }
            }
            
            // Store for output
            artifactData.probeBreakdown = probeBreakdown;
            artifactData.totalEnchantProbeMod = enchantProbeMod;
            
            const enchantCheckMethod = await quickAddApi.suggester(
                ["🎲 Verzauberungsprobe würfeln", "📝 QS direkt eingeben"],
                ["roll", "manual"]
            );
            
            if (enchantCheckMethod === "roll") {
                const ritualFW = parseInt(await quickAddApi.inputPrompt(`${artifactData.ritual}-FW:`, "12")) || 12;
                const attr1 = parseInt(await quickAddApi.inputPrompt("KL:", "14")) || 14;
                const attr2 = parseInt(await quickAddApi.inputPrompt("IN:", "12")) || 12;
                const attr3 = parseInt(await quickAddApi.inputPrompt("FF:", "12")) || 12;
                
                // Execute SINGLE probe for ARCANOVI/APPLICATUS/ZAUBERKLINGE
                const probeResult = await executeSingleProbe(ritualFW, attr1, attr2, attr3, enchantProbeMod);
                
                finalQS = probeResult.qs;
                craftingSuccess = probeResult.success;
                arcanoviProbeLog = {
                    rolls: probeResult.rolls,
                    qs: probeResult.qs,
                    success: probeResult.success,
                    critical: probeResult.critical,
                    probeMod: enchantProbeMod
                };
                
                let resultText = `**${artifactData.ritual} Probe:**\n`;
                resultText += `Würfe: [${probeResult.rolls.join(', ')}]\n`;
                resultText += `Probenmodifikator: ${formatModifier(enchantProbeMod)}\n`;
                if (probeResult.critical) resultText += `${probeResult.critical}\n`;
                resultText += `**QS: ${finalQS}** → ${craftingSuccess ? '✅ Erfolg!' : '❌ Fehlgeschlagen'}`;
                
                new Notice(resultText, 8000);
            } else {
                // Manual QS input for enchantment
                const qsInput = await quickAddApi.inputPrompt(
                    `${artifactData.ritual} QS eingeben (1-6, Probenmod: ${formatModifier(enchantProbeMod)}):`,
                    "3"
                );
                finalQS = Math.min(6, Math.max(0, parseInt(qsInput) || 0));
                craftingSuccess = finalQS > 0;
                arcanoviProbeLog = {
                    rolls: [],
                    qs: finalQS,
                    success: craftingSuccess,
                    probeMod: enchantProbeMod,
                    manual: true
                };
            }
            
            // Store ARCANOVI probe log
            artifactData.arcanoviProbeLog = arcanoviProbeLog;
            artifactData.baseItemCraftingLog = baseItemCraftingLog;
            
        } else {
            // NON-ARTIFACT: Normal Sammelprobe flow
            const checkMethod = await quickAddApi.suggester(
                ["🎲 Proben würfeln", "📝 QS direkt eingeben"],
                ["roll", "manual"]
            );
            if (!checkMethod) return;

            if (checkMethod === "roll") {
                // Get character stats
                const talentFW = parseInt(await quickAddApi.inputPrompt("Talent-FW:", "10")) || 10;
                const attr1 = parseInt(await quickAddApi.inputPrompt("Attribut 1 (z.B. FF):", "12")) || 12;
                const attr2 = parseInt(await quickAddApi.inputPrompt("Attribut 2 (z.B. GE):", "12")) || 12;
                const attr3 = parseInt(await quickAddApi.inputPrompt("Attribut 3 (z.B. KO):", "12")) || 12;

                // Execute Sammelprobe
                const result = await executeSammelprobe(talentFW, attr1, attr2, attr3, totalProbeMod, maxAttempts);
                finalQS = result.totalQS;
                attemptLog = result.attemptResults;
                craftingSuccess = result.success;

                // Show results
                let resultText = `**Sammelprobe Ergebnisse:**\n`;
                resultText += `Probenmodifikator: ${formatModifier(totalProbeMod)}\n\n`;
                for (const attempt of attemptLog) {
                    resultText += `Versuch ${attempt.attempt}: [${attempt.rolls.join(', ')}] → `;
                    if (attempt.critical) {
                        resultText += `${attempt.critical} `;
                    }
                    resultText += attempt.success ? `✓ QS ${attempt.qs}` : `✗ Misslungen`;
                    resultText += `\n`;
                }
                resultText += `\n**Gesamt-QS: ${finalQS}/10** → ${craftingSuccess ? '✅ Erfolg!' : '❌ Fehlgeschlagen'}`;
                
                new Notice(resultText, 10000);
            } else {
                // Manual QS input
                const qsInput = await quickAddApi.inputPrompt(`QS eingeben (10 = Erfolg, Probenmod: ${formatModifier(totalProbeMod)}):`, "10");
                finalQS = parseInt(qsInput) || 0;
                craftingSuccess = finalQS >= 10;
            }
        }

        // ========================================
        // ARTIFACT-SPECIFIC POST-ROLL HANDLING
        // ========================================
        
        if (itemData.type === "Artefakt" && artifactData) {
            // The QS from the check is the ARCANOVI QS (used for Eigenschaften)
            artifactData.arcanoviQS = finalQS;
            
            // Calculate actual charges for Matrixspeicher/Zaubertalisman (QS + 4)
            if (artifactData.types.includes("Matrixspeicher") || artifactData.types.includes("Zaubertalisman")) {
                artifactData.charges = finalQS + 4;
            }

            // Check for Nebeneffekt on QS 1 (only on ARCANOVI)
            if (finalQS === 1 && craftingSuccess && artifactData.ritual === "ARCANOVI") {
                const rollNebeneffekt = await quickAddApi.yesNoPrompt(
                    "Nebeneffekt?",
                    "ARCANOVI QS 1 erreicht! Soll ein chaotischer Nebeneffekt ausgewürfelt werden?"
                );
                
                if (rollNebeneffekt) {
                    const roll = rollD20();
                    const fp = 0; // Base FP, could be modified
                    const effectKey = Math.min(roll + fp, 23);
                    artifactNebeneffekt = {
                        roll: roll,
                        effect: NEBENEFFEKTE_TABLE[effectKey] || NEBENEFFEKTE_TABLE[23]
                    };
                    new Notice(`Nebeneffekt (1W20=${roll}): ${artifactNebeneffekt.effect}`, 15000);
                }
            }

            // Select Artefakteigenschaften (spend ARCANOVI QS, not Sammelprobe QS!)
            if (craftingSuccess && artifactData.arcanoviQS > 0) {
                const selectEigenschaften = await quickAddApi.yesNoPrompt(
                    "Artefakteigenschaften?",
                    `Du hast ${artifactData.arcanoviQS} ARCANOVI-QS. Möchtest du Artefakteigenschaften hinzufügen?`
                );
                
                if (selectEigenschaften) {
                    let remainingQS = artifactData.arcanoviQS;
                    let selectMore = true;
                    
                    while (selectMore && remainingQS > 0) {
                        const availableEigenschaften = Object.entries(ARTEFAKT_EIGENSCHAFTEN)
                            .filter(([name, data]) => 
                                data.qsCost <= remainingQS && 
                                !selectedEigenschaften.find(e => e.name === name)
                            )
                            .map(([name, data]) => ({
                                display: `${name} (${data.qsCost} QS) - ${data.effect}`,
                                name: name,
                                data: data
                            }));
                        
                        if (availableEigenschaften.length === 0) break;
                        
                        const options = [`❌ Fertig (${remainingQS} QS verbleibend)`, ...availableEigenschaften.map(e => e.display)];
                        const selectedIndex = await quickAddApi.suggester(options, options.map((_, i) => i));
                        
                        if (!selectedIndex || selectedIndex === 0) {
                            selectMore = false;
                        } else {
                            const selected = availableEigenschaften[selectedIndex - 1];
                            selectedEigenschaften.push(selected);
                            remainingQS -= selected.data.qsCost;
                            new Notice(`${selected.name} hinzugefügt. ${remainingQS} QS verbleibend.`);
                        }
                    }
                    
                    artifactData.remainingArcanoviQS = remainingQS;
                }
            }
        }

        // ========================================
        // CALCULATE FINAL ITEM STATS
        // ========================================

        let finalStats = {};

        if (itemData.type === "Waffe") {
            let tpMod = 0;
            let atMod = itemData.baseATMod || 0;
            let paMod = itemData.basePAMod || 0;
            let bruchfaktor = 0;

            // Apply material bonuses
            if (selectedMaterial?.data) {
                tpMod += selectedMaterial.data.tpMod || 0;
                atMod += selectedMaterial.data.atMod || 0;
                paMod += selectedMaterial.data.paMod || 0;
                bruchfaktor += selectedMaterial.data.bruchfaktor || 0;
            }

            // Apply technique bonuses
            if (selectedTechnique?.data) {
                tpMod += selectedTechnique.data.tpMod || 0;
                bruchfaktor += selectedTechnique.data.bruchfaktorMod || 0;
            }

            // Apply improvement bonuses
            for (const imp of selectedImprovements) {
                tpMod += imp.data.tpMod || 0;
                atMod += imp.data.atMod || 0;
                paMod += imp.data.paMod || 0;
                bruchfaktor += imp.data.bruchfaktorMod || 0;
            }

            // Format TP with modifier
            let finalTP = itemData.baseTP;
            if (tpMod !== 0) {
                finalTP = `${itemData.baseTP}${tpMod > 0 ? '+' : ''}${tpMod}`;
            }

            finalStats = {
                tp: finalTP,
                atMod: atMod,
                paMod: paMod,
                bruchfaktor: bruchfaktor,
                isMagical: selectedMaterial?.data?.isMagical || false
            };
        } else if (itemData.type === "Rüstung") {
            let rsMod = 0;
            let beMod = 0;
            let stabilitaet = 0;

            // Apply material bonuses
            if (selectedMaterial?.data) {
                rsMod += selectedMaterial.data.rsMod || 0;
                beMod += selectedMaterial.data.beMod || 0;
                stabilitaet += selectedMaterial.data.stabilitaet || 0;
            }

            // Apply technique bonuses
            if (selectedTechnique?.data) {
                stabilitaet += selectedTechnique.data.stabilitaetMod || 0;
            }

            // Apply improvement bonuses
            for (const imp of selectedImprovements) {
                rsMod += imp.data.rsMod || 0;
                stabilitaet += imp.data.stabilitaetMod || 0;
            }

            finalStats = {
                rs: (itemData.baseRS || 0) + rsMod,
                be: (itemData.baseBE || 0) + beMod,
                stabilitaet: stabilitaet,
                isMagical: selectedMaterial?.data?.isMagical || false
            };
        }

        // ========================================
        // GENERATE OUTPUT NOTE
        // ========================================

        const timestamp = new Date().toISOString().split('T')[0];
        let markdown = `# ${itemData.name} (Handgefertigt)\n\n`;
        markdown += `> Hergestellt am ${timestamp}\n\n`;

        // ========================================
        // ARTIFACT SUMMARY (at the very top)
        // ========================================
        if (itemData.type === "Artefakt" && artifactData) {
            markdown += `## ⭐ Artefakt-Übersicht\n\n`;
            markdown += `| Eigenschaft | Wert |\n`;
            markdown += `|-------------|------|\n`;
            
            // Artifact type(s)
            const typeNames = artifactData.types.join(", ");
            markdown += `| **Typ(en)** | ${typeNames} |\n`;
            
            // Base object info with combat values
            if (artifactData.baseItemData) {
                let baseObjStr = artifactData.baseItemData.name;
                if (artifactData.baseItemMaterial && artifactData.baseItemMaterial.name !== "Standard") {
                    baseObjStr += ` (${artifactData.baseItemMaterial.name}`;
                    if (artifactData.baseItemTechnique && artifactData.baseItemTechnique.name !== "Keine Technik") {
                        baseObjStr += `, ${artifactData.baseItemTechnique.name}`;
                    }
                    baseObjStr += `)`;
                }
                // Add combat values based on type
                if (artifactData.baseItemData.type === "Waffe") {
                    baseObjStr += ` - TP: ${artifactData.baseItemData.baseTP}`;
                    if (artifactData.baseItemData.atMod !== undefined) {
                        baseObjStr += `, AT${formatModifier(artifactData.baseItemData.atMod)}`;
                    }
                    if (artifactData.baseItemData.paMod !== undefined) {
                        baseObjStr += `, PA${formatModifier(artifactData.baseItemData.paMod)}`;
                    }
                } else if (artifactData.baseItemData.type === "Rüstung") {
                    if (artifactData.baseItemData.baseRS !== undefined) {
                        baseObjStr += ` - RS: ${artifactData.baseItemData.baseRS}`;
                    }
                    if (artifactData.baseItemData.baseBE !== undefined) {
                        baseObjStr += `, BE: ${artifactData.baseItemData.baseBE}`;
                    }
                }
                markdown += `| **Basisobjekt** | ${baseObjStr} |\n`;
            } else if (artifactData.weaponData) {
                markdown += `| **Basisobjekt** | ${artifactData.weaponData.name} (${artifactData.weaponSize}) |\n`;
            }
            
            // Bound spells/rituals
            if (artifactData.spells && artifactData.spells.length > 0) {
                const spellStrs = artifactData.spells.map(s => {
                    const cost = s.aspCost || '?';
                    return `${s.name} (${cost} AsP)`;
                });
                markdown += `| **Gebundene Zauber** | ${spellStrs.join(", ")} |\n`;
            }
            
            // Charges
            if (artifactData.charges) {
                markdown += `| **Ladungen** | ${artifactData.charges} |\n`;
            }
            
            // Self-recharging
            if (artifactData.selfRecharging) {
                const rechargeData = SELF_RECHARGING_OPTIONS[artifactData.selfRecharging];
                const rechargeRate = rechargeData ? `${rechargeData.chargesPerPeriod} Ladung/${rechargeData.period}` : artifactData.selfRecharging;
                markdown += `| **Selbstaufladung** | ${artifactData.selfRecharging} (${rechargeRate}) |\n`;
            }
            
            // Artefakteigenschaften
            if (selectedEigenschaften && selectedEigenschaften.length > 0) {
                const eigenschaftNames = selectedEigenschaften.map(e => e.name).join(", ");
                markdown += `| **Artefakteigenschaften** | ${eigenschaftNames} |\n`;
            }
            
            // Veredelung
            if (selectedVeredelung) {
                let veredelungStr = selectedVeredelung.name;
                if (selectedVeredelung.data.arcanoviBonus) {
                    veredelungStr += ` (+${selectedVeredelung.data.arcanoviBonus} ARCANOVI`;
                    if (selectedVeredelung.data.pAspReduction) {
                        veredelungStr += `, -${selectedVeredelung.data.pAspReduction} pAsP`;
                    }
                    veredelungStr += `)`;
                } else {
                    veredelungStr += ` (${selectedVeredelung.data.effect})`;
                }
                markdown += `| **Veredelung** | ${veredelungStr} |\n`;
            }
            
            // Zauberzeichen
            if (selectedZauberzeichen && selectedZauberzeichen.length > 0) {
                const zeichenNames = selectedZauberzeichen.map(z => z.name).join(", ");
                markdown += `| **Zauberzeichen** | ${zeichenNames} |\n`;
            }
            
            // Permanent/Temporary
            if (artifactData.isPermanent) {
                markdown += `| **Permanent** | Ja (INFINITUM IMMERDAR) |\n`;
            } else if (artifactData.isApplicatus) {
                markdown += `| **Temporär** | Ja (APPLICATUS) |\n`;
            }
            
            // Total costs
            let costStr = `${artifactData.totalAspCost} AsP`;
            if (artifactData.totalPAspCost > 0) {
                costStr += `, ${artifactData.totalPAspCost} pAsP`;
            }
            markdown += `| **Gesamtkosten** | ${costStr} |\n`;
            
            // ARCANOVI QS
            markdown += `| **${artifactData.ritual} QS** | ${artifactData.arcanoviQS} |\n`;
            
            markdown += `\n`;
        }

        // Status
        markdown += `## Status\n`;
        markdown += `- **Herstellung**: ${craftingSuccess ? '✅ Erfolgreich' : '❌ Fehlgeschlagen'}\n`;
        markdown += `- **Erreichte QS**: ${finalQS}/10\n\n`;

        // Final Stats
        markdown += `## Werte\n`;
        markdown += `| Eigenschaft | Wert |\n`;
        markdown += `|-------------|------|\n`;

        if (itemData.type === "Waffe") {
            markdown += `| TP | ${finalStats.tp} |\n`;
            markdown += `| AT-Mod | ${formatModifier(finalStats.atMod)} |\n`;
            markdown += `| PA-Mod | ${formatModifier(finalStats.paMod)} |\n`;
            markdown += `| Kampftechnik | ${itemData.kampftechnik} |\n`;
            if (finalStats.bruchfaktor !== 0) {
                markdown += `| Bruchfaktor-Mod | ${formatModifier(finalStats.bruchfaktor)} |\n`;
            }
            if (finalStats.isMagical) {
                markdown += `| Magisch | Ja |\n`;
            }
            markdown += `| Gewicht | ${itemData.gewicht} |\n`;
            markdown += `| Länge | ${itemData.laenge} |\n`;
        } else if (itemData.type === "Rüstung") {
            markdown += `| RS | ${finalStats.rs} |\n`;
            markdown += `| BE | ${finalStats.be} |\n`;
            markdown += `| Rüstungsart | ${itemData.armorType} |\n`;
            if (finalStats.stabilitaet !== 0) {
                markdown += `| Stabilitäts-Mod | ${formatModifier(finalStats.stabilitaet)} |\n`;
            }
            if (finalStats.isMagical) {
                markdown += `| Magisch | Ja |\n`;
            }
        } else if (itemData.type === "Artefakt" && artifactData) {
            // Artifact-specific output
            const typeNames = artifactData.types.join(", ");
            markdown += `| Artefakttyp(en) | ${typeNames} |\n`;
            
            if (artifactData.isVielfachartefakt) {
                markdown += `| Vielfachartefakt | Ja |\n`;
            }
            
            markdown += `| Ritual | ${artifactData.ritual} |\n`;
            markdown += `| ARCANOVI QS | ${artifactData.arcanoviQS} |\n`;
            
            // List all bound spells
            if (artifactData.spells && artifactData.spells.length > 0) {
                if (artifactData.spells.length === 1) {
                    const spell = artifactData.spells[0];
                    markdown += `| Gebundener ${spell.type} | ${spell.name} |\n`;
                    if (spell.merkmal) {
                        markdown += `| Merkmal | ${spell.merkmal} |\n`;
                    }
                } else {
                    markdown += `| Gebundene Zauber | ${artifactData.spells.length} |\n`;
                }
            }
            
            if (artifactData.charges) {
                markdown += `| Ladungen | ${artifactData.charges} |\n`;
            }
            
            if (artifactData.selfRecharging) {
                markdown += `| Selbstaufladung | ${artifactData.selfRecharging} |\n`;
            }
            
            if (artifactData.isPermanent) {
                markdown += `| Permanent | Ja (INFINITUM IMMERDAR) |\n`;
            }
            
            if (artifactData.isApplicatus) {
                markdown += `| Temporär | Ja (APPLICATUS) |\n`;
            }
            
            if (artifactData.kraftspeicherMaterial) {
                markdown += `| Speichermaterial | ${artifactData.kraftspeicherMaterial.name} |\n`;
                markdown += `| Gespeicherte AsP | ${artifactData.aspToStore} / ${artifactData.kraftspeicherMaterial.data.maxAsp} |\n`;
            }
            
            if (artifactData.weaponData) {
                markdown += `| Waffe | ${artifactData.weaponData.name} |\n`;
                markdown += `| Waffengröße | ${artifactData.weaponSize} |\n`;
                markdown += `| Wirkungsdauer | ${artifactData.duration.type === 'standard' ? 'QS x 3 Tage' : 'QS x 30 Jahre'} |\n`;
            }
            
            if (artifactData.isIronSteel) {
                markdown += `| Eisen/Stahl | Ja (–2 auf Probe) |\n`;
            }
            
            markdown += `| Magisch | Ja |\n`;
        } else {
            markdown += `| Typ | ${itemData.type} |\n`;
            if (itemData.talent) {
                markdown += `| Talent | ${itemData.talent} |\n`;
            }
        }

        markdown += `| Komplexität | ${itemData.komplexitaet} |\n\n`;

        // Artifact-specific sections
        if (itemData.type === "Artefakt" && artifactData) {
            
            // Artefaktthese section (if used)
            if (artifactData.artefaktthese) {
                markdown += `## Artefaktthese\n`;
                markdown += `- **These**: ${artifactData.artefaktthese.name}\n`;
                markdown += `- **Effekt**: ${artifactData.artefaktthese.data.effect}\n`;
                markdown += `- **Voraussetzungen**: Magiekunde ${artifactData.artefaktthese.data.prereqMagiekunde}`;
                if (artifactData.artefaktthese.data.prereqArcanovi > 0) {
                    markdown += `, ARCANOVI ${artifactData.artefaktthese.data.prereqArcanovi}`;
                }
                markdown += `\n\n`;
            }
            
            // Multiple spells section
            if (artifactData.spells && artifactData.spells.length > 1) {
                markdown += `## Gebundene Zauber/Rituale/Tricks\n`;
                markdown += `| # | Name | Typ | Kosten | Merkmal | SF benötigt |\n`;
                markdown += `|---|------|-----|--------|---------|-------------|\n`;
                artifactData.spells.forEach((spell, idx) => {
                    markdown += `| ${idx + 1} | ${spell.name} | ${spell.type} | ${spell.cost} AsP | ${spell.merkmal || '-'} | ${spell.sfRequired || '-'} |\n`;
                });
                markdown += `\n`;
            }
            
            // Extensions section
            const allExtensions = [
                ...artifactData.extensions.arcanovi.map(e => ({ ...e, ritual: 'ARCANOVI' })),
                ...artifactData.extensions.infinitum.map(e => ({ ...e, ritual: 'INFINITUM' })),
                ...artifactData.extensions.zauberklinge.map(e => ({ ...e, ritual: 'ZAUBERKLINGE' })),
                ...artifactData.extensions.applicatus.map(e => ({ ...e, ritual: 'APPLICATUS' }))
            ];
            
            if (allExtensions.length > 0) {
                markdown += `## Zaubererweiterungen\n`;
                markdown += `| Ritual | Erweiterung | Effekt |\n`;
                markdown += `|--------|-------------|--------|\n`;
                for (const ext of allExtensions) {
                    markdown += `| ${ext.ritual} | ${ext.name} (FW ${ext.data.fw}) | ${ext.data.effect} |\n`;
                }
                markdown += `\n`;
            }
            
            // Costs section
            markdown += `## Kosten\n`;
            markdown += `| Kostenart | AsP |\n`;
            markdown += `|-----------|-----|\n`;
            
            if (artifactData.ritualCost) {
                markdown += `| ${artifactData.ritual} | ${artifactData.ritualCost} |\n`;
            }
            
            // List spell costs
            if (artifactData.spells && artifactData.spells.length > 0) {
                const multiplier = artifactData.spellCostMultiplier || 1;
                const charges = artifactData.charges || 1;
                
                for (const spell of artifactData.spells) {
                    if (artifactData.types.includes("Zauberspeicher") && !artifactData.isApplicatus) {
                        markdown += `| ${spell.name} (${spell.cost} x ${multiplier} x ${charges}) | ${spell.cost * multiplier * charges} |\n`;
                    } else {
                        markdown += `| ${spell.name} | ${spell.cost} |\n`;
                    }
                }
            }
            
            if (artifactData.aspToStore) {
                markdown += `| Zu speichernde AsP | ${artifactData.aspToStore} |\n`;
            }
            
            if (artifactData.duration && artifactData.types.includes("Magische Waffe")) {
                let weaponCost = artifactData.duration.cost;
                for (const ext of artifactData.extensions.zauberklinge) {
                    if (ext.data.extraCost) {
                        weaponCost += ext.data.extraCost;
                    }
                }
                markdown += `| ZAUBERKLINGE | ${weaponCost} |\n`;
            }
            
            if (artifactData.isPermanent) {
                markdown += `| INFINITUM IMMERDAR | ${artifactData.infinitumCost} (+${artifactData.infinitumPAsp} pAsP) |\n`;
            }
            
            for (const zeichen of selectedZauberzeichen) {
                const cost = typeof zeichen.data.aspCost === 'number' ? zeichen.data.aspCost : 8;
                markdown += `| ${zeichen.name} | ${cost} |\n`;
            }
            
            // Material reduction note
            if (artifactData.materialReductionApplied) {
                markdown += `| *Materialreduktion* | *–${artifactData.materialReductionApplied} pAsP* |\n`;
            }
            if (artifactData.materialReductionProbe) {
                markdown += `| *Materialien (Probe)* | *+${artifactData.materialReductionProbe} auf Probe* |\n`;
            }
            
            // Veredelung pAsP reduction
            if (artifactData.veredelungPAspReduction > 0) {
                markdown += `| *Veredelung (${selectedVeredelung?.name})* | *–${artifactData.veredelungPAspReduction} pAsP* |\n`;
            }
            
            markdown += `| **Gesamt AsP** | **${artifactData.totalAspCost}** |\n`;
            if (artifactData.totalPAspCost > 0) {
                markdown += `| **Permanent AsP** | **${artifactData.totalPAspCost}** |\n`;
            } else if (artifactData.isApplicatus) {
                markdown += `| **Permanent AsP** | **0** (APPLICATUS) |\n`;
            }
            markdown += `\n`;

            // Artefakteigenschaften
            if (selectedEigenschaften.length > 0) {
                markdown += `## Artefakteigenschaften\n`;
                for (const eigenschaft of selectedEigenschaften) {
                    markdown += `- **${eigenschaft.name}** (${eigenschaft.data.qsCost} QS): ${eigenschaft.data.effect}\n`;
                }
                markdown += `\n`;
            }

            // Veredelung
            if (selectedVeredelung) {
                markdown += `## Veredelung\n`;
                markdown += `- **Material**: ${selectedVeredelung.name}\n`;
                markdown += `- **Kategorie**: ${selectedVeredelung.data.category}\n`;
                markdown += `- **Probenmod**: ${formatModifier(selectedVeredelung.data.probeMod)}\n`;
                markdown += `- **Effekt**: ${selectedVeredelung.data.effect}\n`;
                if (selectedVeredelung.data.requiresBerufsgeheimnis) {
                    markdown += `- ⚠️ *Benötigt Berufsgeheimnis*\n`;
                }
                markdown += `\n`;
            }

            // Zauberzeichen
            if (selectedZauberzeichen.length > 0) {
                markdown += `## Zauberzeichen (Arkanoglyphen)\n`;
                for (const zeichen of selectedZauberzeichen) {
                    markdown += `- **${zeichen.name}**\n`;
                    markdown += `  - Kosten: ${zeichen.data.aspCost} AsP\n`;
                    markdown += `  - Merkmal: ${zeichen.data.merkmal}\n`;
                    markdown += `  - Effekt: ${zeichen.data.effect}\n`;
                }
                markdown += `\n`;
            }

            // Nebeneffekt
            if (artifactNebeneffekt) {
                markdown += `## ⚠️ Chaotischer Nebeneffekt\n`;
                markdown += `> **Wurf**: 1W20 = ${artifactNebeneffekt.roll}\n`;
                markdown += `> **Effekt**: ${artifactNebeneffekt.effect}\n\n`;
            }

            // SF Requirements
            markdown += `## Voraussetzungen\n`;
            if (artifactData.sfRequired && artifactData.sfRequired.length > 0) {
                markdown += `> ⚠️ Benötigte Sonderfertigkeiten:\n`;
                for (const sf of artifactData.sfRequired) {
                    markdown += `> - **${sf}**\n`;
                }
            }
            if (artifactData.types.includes("Magische Waffe") && !artifactData.sfRequired?.includes("Zauberklinge")) {
                markdown += `> Für ZAUBERKLINGE GEISTERSPEER wird keine besondere SF benötigt.\n`;
            }
            if (artifactData.isPermanent) {
                markdown += `> Für INFINITUM IMMERDAR wird Kenntnis des Rituals benötigt.\n`;
            }
            if (artifactData.artefaktthese) {
                markdown += `> Für die Artefaktthese "${artifactData.artefaktthese.name}" werden ${artifactData.artefaktthese.data.prereqMagiekunde} AP benötigt.\n`;
            }
            markdown += `\n`;
        }

        // Manufacturing Details (non-artifact)
        if (itemData.type !== "Artefakt") {
            markdown += `## Herstellungsdetails\n`;
            markdown += `- **Material**: ${selectedMaterial?.name || 'Standard'}\n`;
            if (selectedMaterial?.data?.effect) {
                markdown += `  - Effekt: ${selectedMaterial.data.effect}\n`;
            }
            markdown += `- **Technik**: ${selectedTechnique?.name || 'Keine'}\n`;
            if (selectedTechnique?.data?.effect && selectedTechnique.name !== "Keine Technik") {
                markdown += `  - Effekt: ${selectedTechnique.data.effect}\n`;
            }
            if (selectedImprovements.length > 0) {
                markdown += `- **Verbesserungen**:\n`;
                for (const imp of selectedImprovements) {
                    markdown += `  - ${imp.name}\n`;
                }
            }
            markdown += `- **Probenmodifikator**: ${formatModifier(totalProbeMod)}\n`;
            markdown += `- **Basis-Intervall**: ${formatHours(baseInterval)}\n`;
            markdown += `- **Zeit-Faktor**: x${totalTimeFactor}\n`;
            markdown += `- **Geschätzte Herstellungszeit**: ${formatHours(totalIntervalHours)} pro Versuch\n`;
            markdown += `- **Max. Versuche**: ${maxAttempts}\n\n`;
        } else {
            // Artifact ritual details
            markdown += `## Ritualdetails\n`;
            markdown += `- **Ritual**: ${artifactData.ritual}\n`;
            markdown += `- **Ritualdauer**: ${artifactData.ritualDuration}\n`;
            markdown += `\n`;
            
            // Probe breakdown section
            if (artifactData.probeBreakdown && artifactData.probeBreakdown.length > 0) {
                markdown += `## Probenmodifikatoren (${artifactData.ritual})\n`;
                markdown += `| Quelle | Modifikator |\n`;
                markdown += `|--------|-------------|\n`;
                markdown += `| Basis | ±0 |\n`;
                for (const item of artifactData.probeBreakdown) {
                    markdown += `| ${item.source} | ${formatModifier(item.mod)} |\n`;
                }
                markdown += `| **Gesamt** | **${formatModifier(artifactData.totalEnchantProbeMod || 0)}** |\n`;
                markdown += `\n`;
            }
            
            // Base item crafting details (if crafted)
            if (artifactData.baseItemCraftingLog) {
                markdown += `## Herstellung des Basisobjekts\n`;
                markdown += `- **Ergebnis**: ${artifactData.baseItemCraftingLog.success ? '✅ Erfolgreich' : '❌ Fehlgeschlagen'}\n`;
                markdown += `- **Gesamt-QS**: ${artifactData.baseItemCraftingLog.totalQS}/10\n`;
                markdown += `- **Probenmodifikator**: ${formatModifier(artifactData.baseItemCraftingLog.probeMod)}\n`;
                if (artifactData.baseItemData) {
                    markdown += `- **Objekt**: ${artifactData.baseItemData.name} (${artifactData.baseItemData.type})\n`;
                    // Add combat values based on type
                    if (artifactData.baseItemData.type === "Waffe") {
                        markdown += `- **TP**: ${artifactData.baseItemData.baseTP}\n`;
                        if (artifactData.baseItemData.atMod !== undefined) {
                            markdown += `- **AT-Mod**: ${formatModifier(artifactData.baseItemData.atMod)}\n`;
                        }
                        if (artifactData.baseItemData.paMod !== undefined) {
                            markdown += `- **PA-Mod**: ${formatModifier(artifactData.baseItemData.paMod)}\n`;
                        }
                    } else if (artifactData.baseItemData.type === "Rüstung") {
                        if (artifactData.baseItemData.baseRS !== undefined) {
                            markdown += `- **RS**: ${artifactData.baseItemData.baseRS}\n`;
                        }
                        if (artifactData.baseItemData.baseBE !== undefined) {
                            markdown += `- **BE**: ${artifactData.baseItemData.baseBE}\n`;
                        }
                    }
                }
                if (artifactData.baseItemMaterial) {
                    markdown += `- **Material**: ${artifactData.baseItemMaterial.name}\n`;
                }
                if (artifactData.baseItemTechnique && artifactData.baseItemTechnique.name !== "Keine Technik") {
                    markdown += `- **Technik**: ${artifactData.baseItemTechnique.name}\n`;
                }
                if (artifactData.baseItemImprovements && artifactData.baseItemImprovements.length > 0) {
                    markdown += `- **Verbesserungen**: ${artifactData.baseItemImprovements.map(i => i.name).join(', ')}\n`;
                }
                markdown += `\n`;
            }
            
            // ARCANOVI probe log
            if (artifactData.arcanoviProbeLog) {
                markdown += `## ${artifactData.ritual} Probe\n`;
                if (artifactData.arcanoviProbeLog.manual) {
                    markdown += `- **QS (manuell eingegeben)**: ${artifactData.arcanoviProbeLog.qs}\n`;
                } else {
                    markdown += `- **Würfe**: [${artifactData.arcanoviProbeLog.rolls.join(', ')}]\n`;
                    if (artifactData.arcanoviProbeLog.critical) {
                        markdown += `- **${artifactData.arcanoviProbeLog.critical}**\n`;
                    }
                    markdown += `- **QS**: ${artifactData.arcanoviProbeLog.qs}\n`;
                }
                markdown += `- **Ergebnis**: ${artifactData.arcanoviProbeLog.success ? '✅ Erfolgreich' : '❌ Fehlgeschlagen'}\n`;
                markdown += `\n`;
            }
        }

        // Attempt Log (if rolled) - for non-artifacts
        if (attemptLog.length > 0) {
            markdown += `## Würfelprotokoll\n`;
            markdown += `| Versuch | Würfe | Ergebnis | QS |\n`;
            markdown += `|---------|-------|----------|----|\n`;
            for (const attempt of attemptLog) {
                const rolls = `[${attempt.rolls.join(', ')}]`;
                const result = attempt.critical || (attempt.success ? '✓' : '✗');
                markdown += `| ${attempt.attempt} | ${rolls} | ${result} | ${attempt.qs} |\n`;
            }
            markdown += `\n`;
        }

        // Requirements Notice (non-artifact)
        if (itemData.type !== "Artefakt") {
            if (itemData.komplexitaet === "einfach") {
                markdown += `## Voraussetzungen\n`;
                markdown += `> ⚠️ Für die Herstellung dieses Gegenstands wird die SF **${itemData.type === "Waffe" ? "Waffenbau" : itemData.type === "Rüstung" ? "Rüstungsbau" : "entsprechende SF"}** benötigt.\n\n`;
            } else if (itemData.komplexitaet === "komplex") {
                markdown += `## Voraussetzungen\n`;
                markdown += `> ⚠️ Für die Herstellung dieses Gegenstands wird die SF **${itemData.type === "Waffe" ? "Waffenbau" : itemData.type === "Rüstung" ? "Rüstungsbau" : "entsprechende SF"}** sowie ein **Berufsgeheimnis** benötigt.\n\n`;
            }
        }

        // Notes section
        markdown += `## Notizen\n\n`;

        // Create file
        const safeFileName = itemData.name.replace(/[\/\\:*?"<>|]/g, '_');
        const folderPath = itemData.type === "Artefakt" ? "Artefakte" : "Hergestellte Gegenstände";
        
        // Ensure folder exists
        if (!app.vault.getAbstractFileByPath(folderPath)) {
            await app.vault.createFolder(folderPath);
        }

        const filePath = `${folderPath}/${safeFileName}.md`;
        const existingFile = app.vault.getAbstractFileByPath(filePath);
        
        if (existingFile) {
            // Add timestamp to make unique
            const uniquePath = `${folderPath}/${safeFileName}_${Date.now()}.md`;
            await app.vault.create(uniquePath, markdown);
            new Notice(`Gegenstand erstellt: ${uniquePath}`);
        } else {
            await app.vault.create(filePath, markdown);
            new Notice(`Gegenstand erstellt: ${filePath}`);
        }

    } catch (error) {
        console.error("Create Item Error:", error);
        new Notice("Fehler: " + error.message);
    }
};

