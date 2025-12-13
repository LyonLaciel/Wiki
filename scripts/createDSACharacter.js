/**
 * QuickAdd User Script: Create new DSA Character
 */
module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // Prompt for character name
    const name = await quickAddApi.inputPrompt("Charaktername eingeben:");
    if (!name || !name.trim()) {
        new Notice("Kein Name eingegeben!");
        return;
    }
    
    const charType = await quickAddApi.suggester(
        ["PC (Spielercharakter)", "NPC (Nichtspielercharakter)", "Minor (Nebencharakter)"],
        ["PC", "NPC", "Minor"]
    );
    if (!charType) {
        new Notice("Kein Charaktertyp gewählt!");
        return;
    }
    
    const spezies = await quickAddApi.suggester(
        ["Mensch", "Elf", "Halbelf", "Zwerg"],
        ["Mensch", "Elf", "Halbelf", "Zwerg"]
    );
    if (!spezies) {
        new Notice("Keine Spezies gewählt!");
        return;
    }
    
    const charClass = await quickAddApi.inputPrompt("Charakterklasse eingeben: (Krieger/Magier/Geweihter etc.)");
    const ap = await quickAddApi.inputPrompt("AP eingeben:");

    let layout = "DSA";
    let schip = 3;
    if (charType === "Minor") {
        layout = "DSA_Lite";
        schip = 0;
    }
    
    // Calculate initial LE based on species (base + 2*KO, where KO starts at 8)
    const speciesBaseLE = {
        'Mensch': 5,
        'Elf': 2,
        'Halbelf': 5,
        'Zwerg': 8
    };
    const initialKO = 8;
    const initialLE = speciesBaseLE[spezies] + (2 * initialKO);
    
    const charName = name.trim();
    const fileName = charName.replace(/[\\/:*?"<>|]/g, '_'); // Sanitize filename
    
    // Character template
    const template = `---
name: ${charName}
charType: ${charType}
charClass: ${charClass}
notetoolbar: Character Builder
---
\`\`\`statblock
layout: ${layout}

ap_gesamt: 0
ap_gesamt_verfuegbar: ${ap}
name: ${charName}
alter:
geschlecht:
haarfarbe:
augenfarbe:
groesse:
gewicht:
spezies: ${spezies}
kultur:
geburtsort:
profession:
sozialstatus:
image: [[]]

le: ${initialLE}
schip: ${schip}
schip_max: ${schip}


mu: 8
kl: 8
in: 8
ch: 8
ff: 8
ge: 8
kk: 8
ko: 8

conditions:
- name: Schmerz durch LeP
  level: 0
- name: Belastung
  level: 0
- name: Betäubung
  level: 0
- name: Furcht
  level: 0
- name: Paralyse
  level: 0
- name: Schmerz
  level: 0
- name: Verwirrung
  level: 0


nahkampfwaffen:


fernkampfwaffen: 


ruestungen: 


talente:


kampftechniken: 


zauber:


rituale: 

 
zaubertricks:

   
liturgien: 


segnungen: 

  
zeremonien: 


vorteile:


nachteile: 


sonderfertigkeiten: 
\`\`\`
`;
    
    // Create file in Charaktere folder
    const folderPath = "Charaktere";
    const filePath = `${folderPath}/${fileName}.md`;
    
    // Check if folder exists, create if not
    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
        await app.vault.createFolder(folderPath);
    }
    
    // Check if file already exists
    const existingFile = app.vault.getAbstractFileByPath(filePath);
    if (existingFile) {
        new Notice(`Datei "${fileName}.md" existiert bereits!`);
        return;
    }
    
    // Create the file
    const newFile = await app.vault.create(filePath, template);
    
    // Open the new file
    await app.workspace.getLeaf().openFile(newFile);
    
    new Notice(`✨ DSA-Charakter "${charName}" erstellt!`);
};

