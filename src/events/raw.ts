import * as music from '../features/music';

/**
 * Transfère chaque paquet brut de la passerelle Discord à Lavalink.
 * Indispensable au fonctionnement de la voix (mises à jour de salon vocal).
 */
export default {
  name: 'raw',
  execute(packet: unknown) {
    music.manager?.sendRawData(packet as Parameters<NonNullable<typeof music.manager>['sendRawData']>[0])?.catch(() => {});
  }
};
