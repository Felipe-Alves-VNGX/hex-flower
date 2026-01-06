import { showManagerDialog } from '../apps/manager.js';
import { showNavigatorDialog } from '../apps/navigator.js';

export async function install(): Promise<void> {

    Hooks.once('init', async function () {
        console.log('Hex Flower Engine | Inteializing');
    });

    Hooks.once('ready', async function () {
        // Expose API
        (game as any).modules.get('hex-flower-engine').api = {
            showManager: showManagerDialog,
            showNavigator: showNavigatorDialog
        };
    });
}
