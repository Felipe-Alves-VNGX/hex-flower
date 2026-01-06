import { install } from './installer';

Hooks.once('ready', async () => {
    await install();
});
