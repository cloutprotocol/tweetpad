import { APP_H, APP_W } from "../components/ui";
/** Where the app sits in the 1080 frame for scenes 2–5. */
export const APP = { x: (1080 - APP_W * 1.55) / 2, y: 236, scale: 1.55, w: APP_W, h: APP_H };
/** app px -> film px */
export const toFilm = (ax: number, ay: number) => ({ x: APP.x + ax * APP.scale, y: APP.y + ay * APP.scale });
/** The player card's rect in the hook scene (film px). Scene 2 grows the app out of it. */
export const CARD = { x: 300, y: 430, w: 480, h: 480 };
