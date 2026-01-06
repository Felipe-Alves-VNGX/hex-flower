export const FLAG_SCOPE = "world";
export const FLAG_REGISTRY = "hex_flower_registry";
export const FLAG_STATE = "hex_flower_state";

export async function getRegistry() {
    return game.user.getFlag(FLAG_SCOPE, FLAG_REGISTRY) || {};
}

export async function saveRegistry(registry) {
    await game.user.setFlag(FLAG_SCOPE, FLAG_REGISTRY, registry);
}

export async function getStates() {
    return game.user.getFlag(FLAG_SCOPE, FLAG_STATE) || {};
}

export async function saveStates(states) {
    await game.user.setFlag(FLAG_SCOPE, FLAG_STATE, states);
}
