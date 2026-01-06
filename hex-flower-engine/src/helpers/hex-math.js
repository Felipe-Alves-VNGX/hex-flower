export const HEX_SIZE = 25; // Default for preview
export const SQRT3 = Math.sqrt(3);

export function cubeToPixel(q, r, size) {
    const x = size * (SQRT3 * q + (SQRT3 / 2) * r);
    const y = size * (3 / 2) * r;
    return { x, y };
}

export function hexCorners(cx, cy, size) {
    let points = "";
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        const x = cx + size * Math.cos(angle_rad);
        const y = cy + size * Math.sin(angle_rad);
        points += `${x},${y} `;
    }
    return points;
}

export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
