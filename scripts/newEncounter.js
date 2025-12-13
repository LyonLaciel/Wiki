/**
 * QuickAdd User Script: New Encounter
 * Creates an encounter tracking file with initiative tracking for selected characters
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // Helper: Get all folders in vault
    const getAllFolders = () => {
        const folders = [];
        const rootFolder = app.vault.getRoot();
        
        const traverse = (folder, path = "") => {
            const currentPath = path ? `${path}/${folder.name}` : folder.name;
            if (folder.children) {
                // Only add non-root folders
                if (path !== "") {
                    folders.push(currentPath);
                } else if (folder.name !== "") {
                    folders.push(folder.name);
                }
                
                for (const child of folder.children) {
                    if (child.children !== undefined) {
                        traverse(child, folder.name === "" ? "" : currentPath);
                    }
                }
            }
        };
        
        traverse(rootFolder);
        return folders.sort();
    };
    
    // Helper: Get all markdown files in a folder (recursive)
    const getFilesInFolder = (folderPath) => {
        const files = [];
        const folder = app.vault.getAbstractFileByPath(folderPath);
        
        if (!folder || !folder.children) return files;
        
        const traverse = (f) => {
            if (f.children) {
                for (const child of f.children) {
                    traverse(child);
                }
            } else if (f.extension === "md") {
                files.push(f);
            }
        };
        
        traverse(folder);
        return files;
    };
    
    // Helper: Parse statblock YAML from file content
    const parseStatblock = (content) => {
        const statblockMatch = content.match(/```statblock\s*\n([\s\S]*?)```/);
        if (!statblockMatch) return null;
        
        const yamlContent = statblockMatch[1];
        const data = {};
        
        // Simple YAML parser for flat properties
        // Use character class that includes German umlauts
        const lines = yamlContent.split('\n');
        for (const line of lines) {
            const match = line.match(/^([a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*):\s*(.*)$/);
            if (match) {
                const key = match[1];
                let value = match[2].trim();
                // Try to parse as number
                const num = parseFloat(value);
                data[key] = isNaN(num) ? value : num;
            }
        }
        
        // Also extract Schmerz durch LeP level from conditions
        const schmerzMatch = yamlContent.match(/-\s*name:\s*Schmerz durch LeP\s*\n\s*level:\s*(\d+)/i);
        data.schmerzDurchLeP = schmerzMatch ? parseInt(schmerzMatch[1]) : 0;
        
        // Extract conditions array for Schmerz penalty calculation
        const conditionsMatch = yamlContent.match(/conditions:\s*\n((?:\s*-\s*name:[\s\S]*?level:\s*\d+\s*\n?)+)/i);
        if (conditionsMatch) {
            data.conditions = [];
            const conditionBlocks = conditionsMatch[1].matchAll(/-\s*name:\s*(.+?)\s*\n\s*level:\s*(\d+)/gi);
            for (const cMatch of conditionBlocks) {
                data.conditions.push({ name: cMatch[1].trim(), level: parseInt(cMatch[2]) });
            }
        }
        
        // Extract ruestungen array for armor penalty calculation
        const ruestungenMatch = yamlContent.match(/ruestungen:\s*\n((?:\s+-\s+[\s\S]*?)?)(?=\n[a-zA-ZäöüÄÖÜß_][a-zA-ZäöüÄÖÜß0-9_]*:|```|$)/i);
        if (ruestungenMatch) {
            data.ruestungen = [];
            const armorBlocks = ruestungenMatch[1].split(/\n\s+-\s+/).filter(b => b.trim());
            for (const block of armorBlocks) {
                const armor = {};
                const nameMatch = block.match(/name:\s*"?([^"\n]+)"?/i);
                const rsMatch = block.match(/rs:\s*"?(\d+)"?/i);
                const abzuegeMatch = block.match(/zusaetzliche_abzuege:\s*"?([^"\n]+)"?/i);
                
                if (nameMatch) armor.name = nameMatch[1].trim();
                if (rsMatch) armor.rs = rsMatch[1];
                if (abzuegeMatch) armor.zusaetzliche_abzuege = abzuegeMatch[1].trim();
                
                if (armor.name) data.ruestungen.push(armor);
            }
        }
        
        return data;
    };
    
    // Helper: Parse armor additional penalties (e.g., "-1 GS, -1 INI")
    const parseArmorPenalties = (ruestungen) => {
        let gsPenalty = 0;
        let iniPenalty = 0;
        
        if (!Array.isArray(ruestungen)) return { gs: 0, ini: 0 };
        
        for (const armor of ruestungen) {
            const abzuege = String(armor.zusaetzliche_abzuege || '');
            if (abzuege && abzuege !== '-') {
                // Parse patterns like "-1 GS", "-2 INI"
                const gsMatch = abzuege.match(/(-?\d+)\s*GS/i);
                const iniMatch = abzuege.match(/(-?\d+)\s*INI/i);
                if (gsMatch) gsPenalty += parseInt(gsMatch[1]) || 0;
                if (iniMatch) iniPenalty += parseInt(iniMatch[1]) || 0;
            }
        }
        
        return { gs: gsPenalty, ini: iniPenalty };
    };
    
    // Helper: Calculate derived stats
    const calculateStats = (data) => {
        const toNum = v => typeof v === 'number' ? v : (parseFloat(v) || 0);
        
        // Species base values
        const bases = {
            'Mensch': { le: 5, sk: -5, zk: -5, gs: 8 },
            'Elf': { le: 2, sk: -4, zk: -6, gs: 8 },
            'Halbelf': { le: 5, sk: -4, zk: -6, gs: 8 },
            'Zwerg': { le: 8, sk: -4, zk: -4, gs: 6 }
        };
        
        const species = data.spezies || 'Mensch';
        const b = bases[species] || bases['Mensch'];
        
        const mu = toNum(data.mu);
        const kl = toNum(data.kl);
        const iin = toNum(data.in);
        const ch = toNum(data.ch);
        const ge = toNum(data.ge);
        const ko = toNum(data.ko);
        const kk = toNum(data.kk);
        
        // Mods
        const skMod = toNum(data.sk_mod);
        const zkMod = toNum(data.zk_mod);
        const awMod = toNum(data.aw_mod);
        const iniMod = toNum(data.ini_mod);
        const wsMod = toNum(data.ws_mod);
        const leMod = toNum(data.le_mod);
        
        // Get armor penalties
        const armorPenalties = parseArmorPenalties(data.ruestungen);
        
        // Calculate values
        const maxLE = b.le + (2 * ko) + leMod;
        const currentLE = toNum(data.le) || maxLE;
        
        const skBase = Math.round((mu + kl + iin) / 6) + b.sk;
        const sk = skBase + skMod;
        
        const zkBase = Math.round((ko + ko + kk) / 6) + b.zk;
        const zk = zkBase + zkMod;
        
        const awBase = Math.floor(ge / 2);
        const aw = awBase + awMod;
        
        const iniBase = Math.floor((mu + ge) / 2);
        const ini = iniBase + iniMod + armorPenalties.ini; // Apply armor INI penalty
        
        const wsBase = Math.floor(ko / 2);
        const ws = wsBase + wsMod;
        
        // GS with Schmerz and armor penalties
        const gsBase = b.gs + armorPenalties.gs; // Apply armor GS penalty to base
        
        // Get Schmerz level from conditions
        const getSchmerzLevel = (conditions) => {
            if (!conditions || !Array.isArray(conditions)) return 0;
            let total = 0;
            for (const c of conditions) {
                const name = String(c.name || '').toLowerCase();
                if (name.includes('schmerz')) {
                    total += parseInt(c.level) || 0;
                }
            }
            return total;
        };
        const schmerzLevel = getSchmerzLevel(data.conditions);
        const gsEffective = Math.max(0, gsBase - schmerzLevel);
        
        const ae = toNum(data.ae) || 0;
        const aeMax = toNum(data.ae_max) || 0;
        
        const ke = toNum(data.ke) || 0;
        const keMax = toNum(data.ke_max) || 0;
        
        return {
            name: data.name || 'Unbekannt',
            le: currentLE,
            leMax: maxLE,
            ae: ae,
            aeMax: aeMax,
            ke: ke,
            keMax: keMax,
            sk: sk,
            zk: zk,
            gsBase: gsBase,
            gs: gsEffective,
            schmerzLevel: schmerzLevel,
            armorGSPenalty: armorPenalties.gs,
            armorINIPenalty: armorPenalties.ini,
            ini: ini,
            ws: ws,
            aw: aw
        };
    };
    
    // Helper: Roll 1d6
    const roll1d6 = () => Math.floor(Math.random() * 6) + 1;
    
    // Helper: Calculate Zone-LeP based on max LE (Lebensenergiezonen)
    const calculateZoneLeP = (maxLE) => ({
        kopf: Math.round(maxLE * 0.20),
        torso: Math.round(maxLE * 0.80),
        linkerArm: Math.round(maxLE * 0.20),
        rechterArm: Math.round(maxLE * 0.20),
        linkesBein: Math.round(maxLE * 0.30),
        rechtesBein: Math.round(maxLE * 0.30)
    });
    
    // Step 1: Select source folder
    const folders = getAllFolders();
    if (folders.length === 0) {
        new Notice("No folders found in vault!");
        return;
    }
    
    const sourceFolder = await quickAddApi.suggester(
        folders,
        folders
    );
    if (!sourceFolder) return;
    
    // Step 2: Get files and let user select multiple
    const files = getFilesInFolder(sourceFolder);
    if (files.length === 0) {
        new Notice(`No markdown files found in ${sourceFolder}!`);
        return;
    }
    
    // Multi-select: Keep asking until user cancels or selects "Done"
    const selectedFiles = [];
    const fileNames = files.map(f => f.basename);
    
    while (true) {
        const remaining = fileNames.filter(n => !selectedFiles.includes(n));
        if (remaining.length === 0) break;
        
        const options = ["✅ Fertig - Encounter erstellen", ...remaining];
        const displayOptions = options.map((o, i) => {
            if (i === 0) return o;
            const isSelected = selectedFiles.includes(o);
            return isSelected ? `✓ ${o}` : o;
        });
        
        const choice = await quickAddApi.suggester(
            [`✅ Fertig (${selectedFiles.length} ausgewählt)`, ...remaining],
            ["__DONE__", ...remaining]
        );
        
        if (!choice || choice === "__DONE__") break;
        
        if (!selectedFiles.includes(choice)) {
            selectedFiles.push(choice);
            new Notice(`Added: ${choice} (${selectedFiles.length} total)`);
        }
    }
    
    if (selectedFiles.length === 0) {
        new Notice("No characters selected!");
        return;
    }
    
    // Step 3: Select target folder
    const targetFolder = await quickAddApi.suggester(
        ["📁 Neuen Ordner erstellen...", ...folders],
        ["__NEW__", ...folders]
    );
    
    if (!targetFolder) return;
    
    let finalTargetFolder = targetFolder;
    
    if (targetFolder === "__NEW__") {
        const newFolderName = await quickAddApi.inputPrompt("Neuer Ordner Name:");
        if (!newFolderName) return;
        
        finalTargetFolder = `Encounters/${newFolderName}`;
        await app.vault.createFolder(finalTargetFolder).catch(() => {});
    }
    
    // Step 4: Copy files and collect stats
    const encounterData = [];
    
    for (const fileName of selectedFiles) {
        const file = files.find(f => f.basename === fileName);
        if (!file) continue;
        
        try {
            const content = await app.vault.read(file);
            const statblock = parseStatblock(content);
            
            if (statblock) {
                const stats = calculateStats(statblock);
                const iniRoll = roll1d6();
                encounterData.push({
                    ...stats,
                    iniRoll: iniRoll,
                    iniTotal: stats.ini + iniRoll,
                    fileName: fileName,
                    originalPath: file.path
                });
            }
            
            // Copy file to target folder
            const targetPath = `${finalTargetFolder}/${file.name}`;
            const existingFile = app.vault.getAbstractFileByPath(targetPath);
            if (!existingFile) {
                await app.vault.copy(file, targetPath);
            }
        } catch (e) {
            console.error(`Error processing ${fileName}:`, e);
        }
    }
    
    // Sort by initiative (highest first)
    encounterData.sort((a, b) => b.iniTotal - a.iniTotal);
    
    // Step 5 & 6: Create encounter file with tables
    const encounterName = await quickAddApi.inputPrompt("Encounter Name:", `Encounter_${new Date().toISOString().slice(0,10)}`);
    if (!encounterName) return;
    
    // Build the encounter file content
    let encounterContent = `> Erstellt: ${new Date().toLocaleString('de-DE')}\n\n`;
    encounterContent += `## Charakterübersicht\n\n`;
    
    // Individual character tables
    for (const char of encounterData) {
        encounterContent += `### ${char.name}\n\n`;
        
        // Build header and values dynamically based on available stats
        let headers = ['LE'];
        let values = [`${char.le}/${char.leMax}`];
        
        if (char.aeMax > 0) {
            headers.push('AE');
            values.push(`${char.ae}/${char.aeMax}`);
        }
        
        if (char.keMax > 0) {
            headers.push('KE');
            values.push(`${char.ke}/${char.keMax}`);
        }
        
        headers.push('SK', 'ZK', 'GS', 'INI', 'WS', 'AW');
        // Display GS with armor and pain penalties if applicable
        let gsDisplay = `${char.gs}`;
        if (char.armorGSPenalty !== 0 || char.schmerzLevel > 0) {
            const baseGS = 8 + char.armorGSPenalty; // Species base + armor
            gsDisplay = `${baseGS}`;
            if (char.schmerzLevel > 0) {
                gsDisplay += `→${char.gs}`;
            }
            if (char.armorGSPenalty !== 0) {
                gsDisplay += ` (${char.armorGSPenalty} Rüst.)`;
            }
        }
        // Display INI with armor penalty if applicable
        let iniDisplay = `${char.iniTotal}`;
        if (char.armorINIPenalty !== 0) {
            iniDisplay += ` (${char.armorINIPenalty} Rüst.)`;
        }
        values.push(char.sk, char.zk, gsDisplay, iniDisplay, char.ws, char.aw);
        
        encounterContent += `| ${headers.join(' | ')} |\n`;
        encounterContent += `|${headers.map(() => ':---:').join('|')}|\n`;
        encounterContent += `| ${values.join(' | ')} |\n\n`;

        let columnIdHash = crypto.randomUUID();

        encounterContent += `--- start-multi-column: ID_${columnIdHash}\n`;
        encounterContent += "```column-settings\n";
        encounterContent += `Number of Columns: 2\n`;
        encounterContent += `Largest Column: standard\n`;
        encounterContent += "```\n";
        
        // Conditions tracker
        encounterContent += `**Zustände:** \n\n`;
        encounterContent += `| Zustand | Stufe | Notizen |\n`;
        encounterContent += `|:--------|:-----:|:--------|\n`;
        encounterContent += `| Betäubung | | |\n`;
        encounterContent += `| Belastung | | |\n`;
        encounterContent += `| Furcht | | |\n`;
        encounterContent += `| Paralyse | | |\n`;
        encounterContent += `| Schmerz | | |\n`;
        // Show Schmerz durch LeP with current level if > 0
        const schmerzNote = char.schmerzLevel > 0 ? `GS −${char.schmerzLevel}` : '';
        const schmerzStufe = char.schmerzLevel > 0 ? char.schmerzLevel : '';
        encounterContent += `| Schmerz durch LeP | ${schmerzStufe} | ${schmerzNote} |\n`;
        encounterContent += `| Verwirrung | | |\n\n`;
    
        encounterContent += "--- column-break ---\n\n";
           
        // Zone-LeP table (Lebensenergiezonen)
        const zoneLeP = calculateZoneLeP(char.leMax);
        encounterContent += `**Lebensenergiezonen:**\n\n`;
        encounterContent += `| Zone | LeP | Max | Schlimme Verl. | Status |\n`;
        encounterContent += `|:-----|:---:|:---:|:--------------:|:-------|\n`;
        encounterContent += `| Kopf | ${zoneLeP.kopf} | ${zoneLeP.kopf} | 0 | OK |\n`;
        encounterContent += `| Torso | ${zoneLeP.torso} | ${zoneLeP.torso} | 0 | OK |\n`;
        encounterContent += `| Linker Arm | ${zoneLeP.linkerArm} | ${zoneLeP.linkerArm} | 0 | OK |\n`;
        encounterContent += `| Rechter Arm | ${zoneLeP.rechterArm} | ${zoneLeP.rechterArm} | 0 | OK |\n`;
        encounterContent += `| Linkes Bein | ${zoneLeP.linkesBein} | ${zoneLeP.linkesBein} | 0 | OK |\n`;
        encounterContent += `| Rechtes Bein | ${zoneLeP.rechtesBein} | ${zoneLeP.rechtesBein} | 0 | OK |\n\n`;
        
        encounterContent += "--- end-multi-column\n";

         // Warning if incapacitated
         if (char.schmerzLevel >= 4) {
            encounterContent += `> ⚠️ **Handlungsunfähig** (Schmerz Stufe IV)\n\n`;
        }

        // Zone failure difficulty tracker (starts at 0, increases with each hit to 0-LeP zone)
        encounterContent += `*Zonen-Ausfall-Erschwernis: 0*\n\n`;
        
        encounterContent += `---\n\n`;
    }
    
    // Add empty effects tracking block
    encounterContent += `## Temporäre Effekte\n\n`;
    encounterContent += "```effects\n";
    // Add placeholder entries for each character
    for (const char of encounterData) {
        encounterContent += `${char.name}:\n`;
    }
    encounterContent += "```\n\n";
    
    // Round 1 with initiative
    encounterContent += `---\n\n`;
    encounterContent += `## Runde 1\n\n`;
    encounterContent += `### Initiativereihenfolge\n\n`;
    encounterContent += `| Rang | Name | INI (Basis + 1W6) | Gesamt | Aktive Effekte |\n`;
    encounterContent += `|:----:|:-----|:-----------------:|:------:|:---------------|\n`;
    
    encounterData.forEach((char, index) => {
        let iniCalc = `${char.ini} + ${char.iniRoll}`;
        if (char.armorINIPenalty !== 0) {
            iniCalc += ` (${char.armorINIPenalty} Rüst.)`;
        }
        encounterContent += `| ${index + 1} | [[${char.fileName}\\|${char.name}]] | ${iniCalc} | **${char.iniTotal}** | - |\n`;
    });
    
    encounterContent += `\n---\n\n`;
    
    // Create the encounter file
    const encounterPath = `${finalTargetFolder}/${encounterName}.md`;
    await app.vault.create(encounterPath, encounterContent);
    
    // Open the new file
    const newFile = app.vault.getAbstractFileByPath(encounterPath);
    if (newFile) {
        await app.workspace.getLeaf().openFile(newFile);
    }
    
    new Notice(`⚔️ Encounter "${encounterName}" erstellt mit ${encounterData.length} Charakteren!`);
};

