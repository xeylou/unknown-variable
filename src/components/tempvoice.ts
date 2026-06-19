import {
  MessageFlags,
  ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  UserSelectMenuBuilder,
  type Client, type VoiceChannel
} from 'discord.js';
import { prisma } from '../database';
import { createLogger } from '../utils/logger';
import type { ComponentInteraction } from '../types';

const log = createLogger('component:tempvoice');

export default {
  prefix: 'tempvoice',

  async execute(interactionRaw: ComponentInteraction, _client: Client<true>, args: string[]) {
    // tempvoice route plusieurs types (boutons, menus, modales) sur les mêmes
    // données ; on garde un alias `any` ciblé pour ne pas écrire 12 narrowings.
    const interaction = interactionRaw as any;
    const action = args[0];
    const channel = interactionRaw.channel as VoiceChannel;
    if (!channel) return;

    const temp = await prisma.temp_voice.findUnique({ where: { channel_id: channel.id } });
    if (!temp) {
      return interaction.reply({ content: '❌ Ce salon n\'est pas un salon temporaire.', flags: MessageFlags.Ephemeral });
    }
    if (temp.owner_id !== interaction.user.id) {
      return interaction.reply({ content: '❌ Seul le propriétaire du salon peut le gérer.', flags: MessageFlags.Ephemeral });
    }

    const everyone = interaction.guild.roles.everyone;

    if (action === 'lock') {
      await channel.permissionOverwrites.edit(everyone, { Connect: false });
      await saveOwnerPref(interaction.user.id, { locked: 1 });
      return interaction.reply({ content: '🔒 Salon verrouillé.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'unlock') {
      await channel.permissionOverwrites.edit(everyone, { Connect: null });
      await saveOwnerPref(interaction.user.id, { locked: 0 });
      return interaction.reply({ content: '🔓 Salon déverrouillé.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'rename') {
      return interaction.showModal(new ModalBuilder()
        .setCustomId('tempvoice:rename_modal')
        .setTitle('Renommer le salon')
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('valeur').setLabel('Nouveau nom')
            .setStyle(TextInputStyle.Short).setMaxLength(95).setRequired(true)
        )));
    }

    if (action === 'limit') {
      return interaction.showModal(new ModalBuilder()
        .setCustomId('tempvoice:limit_modal')
        .setTitle('Limite de places')
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('valeur').setLabel('Nombre de places (0 = illimité)')
            .setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true)
        )));
    }

    // --- Inviter / Bannir / Kick / Transfert : ouvrent un user-select ---
    if (action === 'invite' || action === 'ban' || action === 'kick' || action === 'transfer') {
      const select = new UserSelectMenuBuilder()
        .setCustomId(`tempvoice:select_${action}`)
        .setPlaceholder(
          action === 'invite' ? 'Sélectionner lemembre à inviter'
          : action === 'ban' ? 'Sélectionner lemembre à bannir du salon'
          : action === 'kick' ? 'Sélectionner lemembre à expulser du salon'
          : 'Sélectionner lenouvel owner'
        )
        .setMinValues(1)
        .setMaxValues(1);
      return interaction.reply({
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral
      });
    }

    // --- Sélections suite à invite/ban/kick/transfer ---
    if (action === 'select_invite' || action === 'select_ban'
        || action === 'select_kick' || action === 'select_transfer') {
      const targetId = interaction.values?.[0];
      if (!targetId) return;
      const target = await interaction.guild.members.fetch(targetId).catch(() => null);
      if (!target) {
        return interaction.update({ content: '❌ Membre introuvable.', components: [] });
      }
      if (action === 'select_invite') {
        await channel.permissionOverwrites.edit(target.id, { Connect: true });
        return interaction.update({ content: `➕ ${target} peut désormais rejoindre.`, components: [] });
      }
      if (action === 'select_ban') {
        await channel.permissionOverwrites.edit(target.id, { Connect: false });
        if (target.voice.channelId === channel.id) {
          await target.voice.disconnect('Banni du salon temporaire').catch(() => {});
        }
        return interaction.update({ content: `🚫 ${target} ne peut plus rejoindre.`, components: [] });
      }
      if (action === 'select_kick') {
        if (target.voice.channelId !== channel.id) {
          return interaction.update({ content: '❌ Ce membre n\'est pas dans le salon.', components: [] });
        }
        await target.voice.disconnect('Expulsé du salon temporaire').catch(() => {});
        return interaction.update({ content: `👋 ${target} expulsé du salon.`, components: [] });
      }
      if (action === 'select_transfer') {
        if (target.id === interaction.user.id) {
          return interaction.update({ content: '❌ Vous êtes déjà l\'owner.', components: [] });
        }
        await prisma.temp_voice.update({
          where: { channel_id: channel.id },
          data: { owner_id: target.id }
        });
        await channel.permissionOverwrites.edit(target.id, {
          ManageChannels: true, MoveMembers: true, MuteMembers: true, Connect: true
        });
        await channel.permissionOverwrites.edit(interaction.user.id, {
          ManageChannels: false, MoveMembers: false, MuteMembers: false
        });
        return interaction.update({ content: `👑 ${target} est maintenant l'owner.`, components: [] });
      }
    }

    // --- Soumissions de modales ---
    if (action === 'rename_modal') {
      const name = interaction.fields.getTextInputValue('valeur').trim();
      await channel.setName(name).catch(() => {});
      await saveOwnerPref(interaction.user.id, { name });
      return interaction.reply({ content: `✏️ Salon renommé en **${name}**.`, flags: MessageFlags.Ephemeral });
    }

    if (action === 'limit_modal') {
      const n = parseInt(interaction.fields.getTextInputValue('valeur'), 10);
      if (Number.isNaN(n) || n < 0 || n > 99) {
        return interaction.reply({ content: '❌ Entrer un nombre entre 0 et 99.', flags: MessageFlags.Ephemeral });
      }
      await channel.setUserLimit(n).catch(() => {});
      await saveOwnerPref(interaction.user.id, { user_limit: n });
      return interaction.reply({
        content: n === 0 ? '👥 Limite retirée.' : `👥 Limite fixée à **${n}** place(s).`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

/** Mémorise une préférence pour l'owner (appliquée à chaque nouvelle création). */
async function saveOwnerPref(userId: string, patch: { name?: string; user_limit?: number; locked?: number }) {
  await prisma.tempvoice_prefs.upsert({
    where: { user_id: userId },
    update: { ...patch, updated_at: Date.now() },
    create: {
      user_id: userId,
      name: patch.name ?? null,
      user_limit: patch.user_limit ?? null,
      locked: patch.locked ?? 0,
      updated_at: Date.now()
    }
  }).catch((e) => log.warn('saveOwnerPref', e));
}
