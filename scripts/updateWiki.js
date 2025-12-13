/**
 * QuickAdd User Script: Update Wiki
 * Copies notes with status: public to PlayerWiki/AbenteuerWiki/ subdirectories
 * based on their type property.
 */
module.exports = async (params) => {
    const { app } = params;
    
    // Mapping of type values to target directories
    const typeToFolder = {
        "location": "PlayerWiki/AbenteuerWiki/Orte und Regionen",
        "culture": "PlayerWiki/AbenteuerWiki/Kulturen",
        "group": "PlayerWiki/AbenteuerWiki/Gruppierungen"
    };
    
    // Ensure all target directories exist
    for (const folderPath of Object.values(typeToFolder)) {
        const folder = app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            await app.vault.createFolder(folderPath);
        }
    }
    
    // Get all markdown files
    const files = app.vault.getMarkdownFiles();
    
    let copiedCount = 0;
    let skippedCount = 0;
    const copiedFiles = [];
    
    for (const file of files) {
        // Get frontmatter using Obsidian's metadataCache
        const metadata = app.metadataCache.getFileCache(file);
        const frontmatter = metadata?.frontmatter;
        
        if (!frontmatter) continue;
        
        // Check if status is public
        if (frontmatter.status !== "public") continue;
        
        // Get the type and check if we have a mapping for it
        const type = frontmatter.type;
        if (!type || !typeToFolder[type]) {
            skippedCount++;
            continue;
        }
        
        const targetFolder = typeToFolder[type];
        const targetPath = `${targetFolder}/${file.name}`;
        
        // Skip if file is already in the correct location
        if (file.path === targetPath) continue;
        
        // Check if a file with the same name already exists in target
        const existingFile = app.vault.getAbstractFileByPath(targetPath);
        if (existingFile) {
            new Notice(`⚠️ Datei "${file.name}" existiert bereits in ${targetFolder}`);
            skippedCount++;
            continue;
        }
        
        // Copy the file
        try {
            const content = await app.vault.read(file);
            await app.vault.create(targetPath, content);
            copiedFiles.push({ name: file.name, type: type, folder: targetFolder });
            copiedCount++;
        } catch (error) {
            new Notice(`❌ Fehler beim Kopieren von "${file.name}": ${error.message}`);
        }
    }
    
    // Summary notification
    if (copiedCount === 0) {
        new Notice("📋 Keine Dateien zum kopieren gefunden.");
    } else {
        new Notice(`✅ Wiki aktualisiert: ${copiedCount} Datei(en) kopiert.`);
        
        // Log details to console
        console.log("=== Wiki Update Summary ===");
        for (const moved of copiedFiles) {
            console.log(`  → ${moved.name} (${moved.type}) → ${moved.folder}`);
        }
    }
    
    if (skippedCount > 0) {
        console.log(`Übersprungen: ${skippedCount} Datei(en) (unbekannter Typ oder bereits vorhanden)`);
    }
};

