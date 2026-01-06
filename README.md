# Foundry VTT Hex Flower Engine

A flexible, generic Hex Flower engine for Foundry Virtual Tabletop. This system allows you to create, manage, and navigate "Hex Flowers" (Hexagonal Crawling Engines) for mechanics like weather, foreshadowing, terrain generation, and more.

## Features

-   **Generic Schema**: Supports *any* JSON structure. It auto-detects fields like Biome, Stage, Title, and displays generic properties (tags, encounters, description) automatically.
-   **Multi-Flower Support**: Create and switch between multiple Hex Flowers in the same world.
-   **Persistence**: Remembers your current location on each flower between sessions.
-   **Visuals**:
    -   Highlighting of the current hex.
    -   Dark Theme UI.
    -   Real-Time Preview editor.
-   **Macros**:
    -   **Manager**: Create, Edit, Import, Delete flowers.
    -   **Navigator**: View the map, click to move (using 2d6 navigation rules), and log results to Chat and Journal.

## Installation

1.  Copy the scripts into Foundry VTT as **Script Macros**.
2.  **`hex_flower_manager.js`** -> Name it "Hex Flower Manager".
3.  **`hex_flower_navigator.js`** -> Name it "Hex Flower Navigator".

## Usage

1.  **Run Manager**: Use it to Import or Create a new Hex Flower. You can paste JSON data (see `how_to_create_hex_flowers.md` for format).
2.  **Run Navigator**:
    -   Select the flower you want to use.
    -   **Click** a neighbor hex to move to it (simulating a roll result) OR manually adjust.
    -   The script will log the move to the "Hex Flower History" journal and whisper the GM.

## Files

-   `hex_flower_manager.js`: The CRUD tool for Game Masters.
-   `hex_flower_navigator.js`: The viewer and navigation tool.
-   `how_to_create_hex_flowers.md`: Guide on creating compatible JSONs.
-   `index.html`: A standalone web viewer (offline version).
-   `hex_flower.json`: Example data.

## License

MIT
