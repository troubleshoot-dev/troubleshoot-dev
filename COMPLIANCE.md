# Open Source License Compliance Checklist

This document outlines the compliance actions taken to ensure proper adherence to open source licensing requirements for the troubleshoot.dev project, which is derived from VSCodium.

## MIT License Compliance

- [x] **LICENSE file verification**: The LICENSE file in the root of the repository contains the full text of the MIT License with proper attribution to:
  - VSCodium contributors
  - Peter Squicciarini
  - Microsoft Corporation

- [x] **Copyright notices**: All copied or modified source files from VSCodium retain their original copyright notices.

## Attribution & Credits

- [x] **README attribution**: The README has been updated to clearly reference the MIT License and explain that parts of the code are derived from VSCodium.
  - Added a dedicated "License & Attribution" section to the README.
  - Properly credited original and modified work copyright holders.
  - Added link to the LICENSE file for complete license text.

## Restricted Branding Removal

The following branding references have been addressed:

- [x] **Some VSCodium references updated**:
  - ✅ Updated keywords in Linux desktop files
  - ✅ Updated URLs and descriptions in some appdata.xml files
  - ✅ Created update-branding.ps1 script for systematic updates
  - ✅ Updated ShortDisplayName in VisualElementsManifest.xml files

The following branding references still need to be addressed:

- [ ] **Remaining VSCodium references**:
  - References in setup-fork.sh and other scripts
  - Some URLs still pointing to vscodium.com
  - Icon references in various files

- [ ] **Microsoft references**:
  - References to Microsoft in telemetry blocking scripts (partially addressed)
  - References to Microsoft Azure OpenAI Service (acceptable as service name)
  - References to Microsoft's VS Code in descriptive text

- [ ] **Visual Studio Code references**:
  - Some references in README.md and keywords
  - Some references in appdata.xml descriptions

## Extensions and Dependencies

- [ ] **Third-party extensions**: Need to review any bundled extensions to ensure they are open-source and redistribution-compatible.
  - No Microsoft proprietary extensions should be included.
  - All extensions should comply with their respective licenses.

- [ ] **Dependencies**: Review dependencies in package.json and other configuration files to ensure license compatibility.

## Recommended Actions

1. **Update README.md**: ✅ COMPLETED
   - ✅ Added a clear "License & Attribution" section
   - ✅ Properly attributed VSCodium and explained the MIT license terms
   - ✅ Clarified the relationship to VSCodium and Visual Studio Code

2. **Rebrand Resources**:
   - Replace VSCodium references in resource files with troubleshoot.dev branding
   - Update URLs to point to troubleshoot.dev resources
   - Replace icons and visual elements

3. **Clean Scripts**:
   - Update setup scripts to remove unnecessary VSCodium references
   - Maintain functional references where needed for upstream syncing

4. **Review Extensions**:
   - Audit any bundled extensions for license compliance
   - Remove or replace any proprietary extensions

## Compliance Status

- [x] MIT License: **Compliant** - License file exists with proper attribution
- [x] Attribution & Credits: **Compliant** - Clear attribution added to README with License section
- [ ] Restricted Branding: **Non-Compliant** - Multiple references to restricted brands remain
- [ ] Extensions & Dependencies: **Needs Review** - Comprehensive audit required

This document will be updated as compliance actions are completed.

---

*Last updated: July 18, 2025*