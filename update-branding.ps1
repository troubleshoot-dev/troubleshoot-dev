# Script to update VSCodium branding to troubleshoot.dev
# This script updates various files to replace VSCodium branding with troubleshoot.dev

Write-Host "🔄 Updating branding from VSCodium to troubleshoot.dev..."

# Function to replace text in a file
function Replace-TextInFile {
    param (
        [string]$FilePath,
        [string]$OldText,
        [string]$NewText
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content -Path $FilePath -Raw
        if ($content -match [regex]::Escape($OldText)) {
            $content = $content -replace [regex]::Escape($OldText), $NewText
            Set-Content -Path $FilePath -Value $content
            Write-Host "✅ Updated: $FilePath"
        } else {
            Write-Host "⚠️ Text not found in: $FilePath"
        }
    } else {
        Write-Host "❌ File not found: $FilePath"
    }
}

# Update Windows VisualElementsManifest files
Replace-TextInFile -FilePath "src/stable/resources/win32/VisualElementsManifest.xml" -OldText 'ShortDisplayName="VSCodium"' -NewText 'ShortDisplayName="troubleshoot.dev"'
Replace-TextInFile -FilePath "src/insider/resources/win32/VisualElementsManifest.xml" -OldText 'ShortDisplayName="VSCodium - Insiders"' -NewText 'ShortDisplayName="troubleshoot.dev - Insiders"'

# Update Linux desktop files
Replace-TextInFile -FilePath "src/stable/resources/linux/code.desktop" -OldText "Keywords=vscodium;codium;vscode;" -NewText "Keywords=troubleshoot;troubleshoot.dev;code;editor;"
Replace-TextInFile -FilePath "src/insider/resources/linux/code.desktop" -OldText "Keywords=vscodium;codium;vscode;" -NewText "Keywords=troubleshoot;troubleshoot.dev;code;editor;"
Replace-TextInFile -FilePath "src/stable/resources/linux/code-url-handler.desktop" -OldText "Keywords=vscodium;codium;vscode;" -NewText "Keywords=troubleshoot;troubleshoot.dev;code;editor;"
Replace-TextInFile -FilePath "src/insider/resources/linux/code-url-handler.desktop" -OldText "Keywords=vscodium;codium;vscode;" -NewText "Keywords=troubleshoot;troubleshoot.dev;code;editor;"

# Update Linux appdata files
$appdataReplacements = @{
    "url type=""homepage"">https://www.vscodium.com</url>" = "url type=""homepage"">https://troubleshoot.dev</url>";
    "<summary>VSCodium. Code editing. Redefined.</summary>" = "<summary>troubleshoot.dev. Code editing and troubleshooting. Redefined.</summary>";
    "<p>VSCodium is a community-driven, freely-licensed binary distribution of Microsoft's editor VS Code.</p>" = "<p>troubleshoot.dev is an AI-powered, open-source code editor designed for troubleshooting, privacy, and developer productivity.</p>";
    "<image>https://www.vscodium.com/img/vscodium.png</image>" = "<image>https://troubleshoot.dev/img/screenshot.png</image>";
}

foreach ($key in $appdataReplacements.Keys) {
    Replace-TextInFile -FilePath "src/stable/resources/linux/code.appdata.xml" -OldText $key -NewText $appdataReplacements[$key]
    Replace-TextInFile -FilePath "src/insider/resources/linux/code.appdata.xml" -OldText $key -NewText $appdataReplacements[$key]
}

# Update snapcraft files
Replace-TextInFile -FilePath "stores/snapcraft/stable/snap/snapcraft.yaml" -OldText "Binary releases of Visual Studio Code without branding/telemetry/licensing" -NewText "AI-powered, open-source code editor designed for troubleshooting, privacy, and developer productivity"
Replace-TextInFile -FilePath "stores/snapcraft/insider/snap/snapcraft.yaml" -OldText "Binary releases of Visual Studio Code - Insiders without branding/telemetry/licensing" -NewText "AI-powered, open-source code editor designed for troubleshooting, privacy, and developer productivity - Insiders"
Replace-TextInFile -FilePath "stores/snapcraft/stable/snap/snapcraft.yaml" -OldText "Icon=vscodium" -NewText "Icon=troubleshoot-dev"
Replace-TextInFile -FilePath "stores/snapcraft/insider/snap/snapcraft.yaml" -OldText "Icon=vscodium-insiders" -NewText "Icon=troubleshoot-dev-insiders"

# Update telemetry blocking script
Replace-TextInFile -FilePath "undo_telemetry.sh" -OldText "# - mobile.events.data.microsoft.com" -NewText "# - mobile.events.data.microsoft.com (blocked)"
Replace-TextInFile -FilePath "undo_telemetry.sh" -OldText "# - vortex.data.microsoft.com" -NewText "# - vortex.data.microsoft.com (blocked)"

Write-Host "✅ Branding update completed!"
Write-Host "⚠️ Note: Some files may still contain references to VSCodium or Microsoft that need manual review."