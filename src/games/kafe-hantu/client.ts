import type {GameClient} from '../../shared/game-contracts.ts';
import {buildConsole} from './console.ts';
import {controller, control, leave, syncController} from './controller.ts';
import {hud} from './hud.ts';
import {art} from './art.ts';
import {CafeAudio} from './cafe-audio.ts';

const audio = new CafeAudio();

const client: GameClient = {
  environment: {background: '#0c1830'},
  buildConsole,
  controller,
  syncController,
  control,
  hud,
  art,
  resultLabel: 'KAFE MENUTUP · SAMPAI FAJAR',
  sceneKey: (game: any) => `${game.stage ?? 0}:${game.finished ? 'dawn' : 'night'}:${game.levelId || ''}`,
  renderKey: (state: any, personal: any) => JSON.stringify([
    state.you?.slot,
    state.game?.activeTable,
    state.game?.served,
    state.game?.mistakes,
    state.game?.prepared,
    state.game?.draft?.flavor,
    state.game?.draft?.temp,
    state.game?.draft?.cup,
    state.game?.finished,
    state.game?.customers?.map((customer: any) => [customer.table, customer.status]),
    personal?.activeTable,
    personal?.tables?.map((table: any) => [table.table, table.status, table.listened, table.returnIn, table.story])
  ]),
  snapshot: (previous: any, next: any, info) => audio.update(previous, next, {operator: info.operator, muted: info.muted || !!next?.soundMuted}),
  unlockAudio: () => audio.unlock(),
  muteAudio: (muted: boolean) => audio.setMuted(muted),
  leave: () => { leave(); audio.stop(); }
};

export default client;
