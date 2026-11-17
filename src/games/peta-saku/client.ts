import type {GameClient} from '../../shared/game-contracts.ts';
import {buildConsole} from './console.ts';
import {controller,syncController,control,leave} from './controller.ts';
import {hud} from './hud.ts';
import {art} from './art.ts';
import {PetaPresentation} from './peta-presentation.ts';
import {PetaAudio} from './peta-audio.ts';
const presentation=new PetaPresentation();let audio=new PetaAudio();
const client:GameClient={
 buildConsole,hud,art,controller,syncController,control,
 sceneKey:g=>g.stage,
 renderKey:(state,personal)=>[state.you?.slot,state.game?.stage,state.game?.rolesLocked,state.game?.navigatorSlot,!!personal?.route,personal?.pin?.x,personal?.pin?.z,personal?.segment,personal?.nextStep?.s,state.game?.finished],
 snapshot(previous,next,context){presentation.push(next.game,context.time,next.gameInstanceId);if(context.operator)audio.update(previous,next,context.muted||next.soundMuted);},
 frameState:(game,time)=>presentation.sample(time)||game,
 unlockAudio:()=>audio.unlock(),muteAudio:muted=>audio.setMuted(muted),
 leave(){audio.stop();audio=new PetaAudio();leave();}
};
export default client;
