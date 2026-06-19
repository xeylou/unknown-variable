import { MessageFlags, type Client } from 'discord.js';
import * as music from '../features/music';
import type { ComponentInteraction } from '../types';

/**
 * Composant « music:* » — boutons du panneau de lecture et menu de recherche.
 *  - music:search  → menu déroulant de /recherche
 *  - music:pause / skip / stop / loop / queue → boutons de contrôle
 */
export default {
  prefix: 'music',

  async execute(interaction: ComponentInteraction, _client: Client<true>, args: string[]) {
    if (!interaction.isButton() && !interaction.isAnySelectMenu()) return;
    const action = args[0];

    // --- Menu de recherche : joue le titre sélectionné ---
    if (action === 'search') {
      // Le menu `/recherche` est un StringSelectMenu — on narrow pour matcher
      // le type attendu par `playQuery` (StringSelectMenuInteraction).
      if (!interaction.isStringSelectMenu()) return;
      const voiceChannelId = (interaction.member as any)?.voice?.channelId;
      if (!voiceChannelId) {
        return interaction.reply({ content: "❌ Rejoins d'abord un salon vocal.", flags: MessageFlags.Ephemeral });
      }
      const url = interaction.values?.[0];
      if (!url) return;
      await interaction.deferReply();
      return music.playQuery(interaction, url, voiceChannelId);
    }

    if (!interaction.isButton()) return;

    // --- Boutons de contrôle ---
    const player = music.manager?.getPlayer(interaction.guildId!);
    if (!player || !player.queue.current) {
      return interaction.reply({ content: "❌ Rien n'est en cours de lecture.", flags: MessageFlags.Ephemeral });
    }
    const userVc = (interaction.member as any)?.voice?.channelId;
    if (!userVc || userVc !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ Vous devez être dans le même salon vocal que le bot.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'pause') {
      if (player.paused) await player.resume();
      else await player.pause();
      return interaction.update({ embeds: [music.nowPlayingEmbed(player)], components: music.controlButtons(player) });
    }

    if (action === 'skip') {
      if (player.queue.tracks.length) await player.skip();
      else await player.stopPlaying(false, false);
      return interaction.reply({ content: '⏭️ Titre passé.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'stop') {
      await player.destroy('Arrêté via les boutons');
      return interaction.reply({ content: '⏹️ Lecture arrêtée.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'loop') {
      const next = player.repeatMode === 'off' ? 'track'
        : player.repeatMode === 'track' ? 'queue' : 'off';
      await player.setRepeatMode(next);
      return interaction.update({ embeds: [music.nowPlayingEmbed(player)], components: music.controlButtons(player) });
    }

    if (action === 'queue') {
      return interaction.reply({ embeds: [music.queueEmbed(player)], flags: MessageFlags.Ephemeral });
    }

    if (action === 'volup' || action === 'voldown') {
      const step = action === 'volup' ? music.VOLUME_STEP : -music.VOLUME_STEP;
      const next = Math.min(music.MAX_VOLUME, Math.max(0, player.volume + step));
      if (next !== player.volume) await player.setVolume(next);
      return interaction.update({ embeds: [music.nowPlayingEmbed(player)], components: music.controlButtons(player) });
    }
  }
};
