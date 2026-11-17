import type {GameServer} from '../../shared/game-contracts.ts';
import {cafeAction, cafeResult, createCafe, neutralCafe, privateCafe, publicCafe, tickCafe} from './cafe.ts';

const server: GameServer = {
  create: (base, context) => createCafe(base, context),
  tick: (game: any, inputs: any[], dt: number) => tickCafe(game, inputs, dt),
  action: (game: any, slot: number, name: string, value?: unknown) => cafeAction(game, slot, name, value),
  publicState: (game: any) => publicCafe(game),
  privateState: (game: any, slot: number) => privateCafe(game, slot),
  neutral: (game: any) => neutralCafe(game),
  result: (game: any) => cafeResult(game)
};
export default server;
