# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-05

### Added
- **Module Structure**: Released as `hex-flower-engine` Foundry VTT module.
- **Auto-Installer**: Script to automatically install Macros and Journal Entries on world load.
- **Hex Flower Manager**: New macro to Import, Edit, and Delete Hex Flowers using a persistent registry.
    - Includes **Real-Time Preview** editor.
    - Split-view JSON editing.
- **Hex Flower Navigator**: New macro for viewing and navigating hex flowers.
    - **Generic Schema Support**: Works with any JSON structure (Biome, Stage, etc).
    - **State Persistence**: Remembers current hex location per flower.
    - **Visual Highlighting**: Shows the current hex on the map.
    - **Navigation Logic**: 2d6 random movement rules with edge handling.
- **User Experience**:
    - **Dark Theme**: Applied a consistent dark UI theme to all dialogs.
    - **Back Buttons**: Easy navigation between flower selection and map view.
    - **Smart Log**: Tooltips and Journal entries automatically format nested properties (e.g., tags).
- **Documentation**: Added `how_to_create_hex_flowers.md` tutorial.
