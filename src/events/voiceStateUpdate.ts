import { Events, type VoiceState } from 'discord.js';
import { handleVoiceUpdate } from '../features/tempvoice';
import { handleAloneState } from '../features/music';
import { logVoiceActivity } from '../features/serverlog';
import { createLogger } from '../utils/logger';

const log = createLogger('events:voice');

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    // --- Salons vocaux temporaires (« rejoindre pour créer ») ---
    await handleVoiceUpdate(oldState, newState).catch((e) => log.warn('tempvoice', e));

    // --- Musique : pause si le bot est seul, reprise sinon ---
    await handleAloneState(newState.guild).catch((e) => log.warn('music alone', e));

    // --- Journalisation des changements de salon (pas mute/deafen) ---
    await logVoiceActivity(oldState, newState).catch((e) => log.warn('serverlog voice', e));
  }
};
