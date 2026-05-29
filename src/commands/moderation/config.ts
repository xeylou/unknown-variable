import {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags,
  type ChatInputCommandInteraction
} from 'discord.js';
import { getConfig, setConfig } from '../../utils/configCache';
import { requireAdmin } from '../../utils/permissions';
import config from '../../config';

const ticketCategoryChoices = config.tickets.categories.map((c) => ({ name: c.label, value: c.value }));

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer les modules du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('voir').setDescription('Afficher la configuration actuelle'))
    .addSubcommand((s) => s.setName('automod').setDescription("Activer/désactiver l'auto-modération")
      .addBooleanOption((o) => o.setName('actif').setDescription('Activer ?').setRequired(true))
      .addBooleanOption((o) => o.setName('phishing').setDescription('Bloquer liens de phishing (défaut on)'))
      .addBooleanOption((o) => o.setName('token-leak').setDescription('Bloquer tokens Discord (défaut on)'))
      .addBooleanOption((o) => o.setName('zalgo').setDescription('Bloquer texte Zalgo (défaut on)')))
    .addSubcommand((s) => s.setName('invite-whitelist').setDescription('Gérer la liste blanche des invitations Discord (IDs de guildes alliées)')
      .addStringOption((o) => o.setName('action').setDescription('Action').setRequired(true)
        .addChoices({ name: 'Ajouter', value: 'add' }, { name: 'Retirer', value: 'remove' }, { name: 'Lister', value: 'list' }))
      .addStringOption((o) => o.setName('guild-id').setDescription("ID du serveur autorisé (pour ajouter/retirer)")))
    .addSubcommand((s) => s.setName('antiraid').setDescription("Configurer l'anti-raid")
      .addBooleanOption((o) => o.setName('actif').setDescription('Activer ?').setRequired(true))
      .addIntegerOption((o) => o.setName('age-min-compte')
        .setDescription('Âge minimum du compte en jours (0 = désactivé)').setMinValue(0).setMaxValue(365))
      .addBooleanOption((o) => o.setName('expulser-jeunes')
        .setDescription('Expulser automatiquement les comptes en-dessous de l\'âge minimum'))
      .addBooleanOption((o) => o.setName('verrouillage-auto')
        .setDescription('Relever le niveau de vérification à « Élevé » lors d\'une vague'))
      .addRoleOption((o) => o.setName('quarantaine')
        .setDescription('Rôle quarantaine attribué aux comptes suspects (alternative à l\'expulsion)')))
    .addSubcommand((s) => s.setName('captcha').setDescription("Configurer la vérification anti-robot à l'entrée")
      .addBooleanOption((o) => o.setName('actif').setDescription('Activer ?').setRequired(true))
      .addRoleOption((o) => o.setName('role-non-verifie').setDescription('Rôle attribué à l\'arrivée (bloque tout sauf #vérification)'))
      .addRoleOption((o) => o.setName('role-verifie').setDescription('Rôle attribué après réussite du CAPTCHA'))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon de fallback si le DM est bloqué')))
    .addSubcommand((s) => s.setName('mot-ajouter').setDescription('Ajouter un mot interdit')
      .addStringOption((o) => o.setName('mot').setDescription('Mot à interdire').setRequired(true)))
    .addSubcommand((s) => s.setName('mot-retirer').setDescription('Retirer un mot interdit')
      .addStringOption((o) => o.setName('mot').setDescription('Mot à retirer').setRequired(true)))
    .addSubcommand((s) => s.setName('automod-spam').setDescription("Régler le seuil anti-spam de l'auto-modération")
      .addIntegerOption((o) => o.setName('messages')
        .setDescription('Nombre de messages déclencheur (défaut 5)').setMinValue(3).setMaxValue(20))
      .addIntegerOption((o) => o.setName('secondes')
        .setDescription('Fenêtre de détection en secondes (défaut 7)').setMinValue(3).setMaxValue(30))
      .addIntegerOption((o) => o.setName('exclusion-minutes')
        .setDescription("Durée d'exclusion en minutes (défaut 5)").setMinValue(1).setMaxValue(60)))
    .addSubcommand((s) => s.setName('accueil').setDescription('Salon et message de bienvenue')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon de bienvenue')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('message')
        .setDescription('Message — variables : {user} {username} {server} {count}'))
      .addBooleanOption((o) => o.setName('carte-image').setDescription('Joindre une carte image générée (welcome card)'))
      .addStringOption((o) => o.setName('image-fond')
        .setDescription("URL d'image de fond pour la carte (https://...) — « retirer » pour revenir au dégradé"))
      .addStringOption((o) => o.setName('message-dm').setDescription('Message DM envoyé en plus (placeholders pareils)')))
    .addSubcommand((s) => s.setName('depart').setDescription("Salon et message d'au revoir")
      .addChannelOption((o) => o.setName('salon').setDescription('Salon de départ')
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('message')
        .setDescription('Message — variables : {username} {server} {count}')))
    .addSubcommand((s) => s.setName('autorole').setDescription("Rôle attribué automatiquement à l'arrivée")
      .addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true)))
    .addSubcommand((s) => s.setName('reglement').setDescription('Rôle donné lorsque le règlement est accepté')
      .addRoleOption((o) => o.setName('role').setDescription('Rôle de validation').setRequired(true)))
    .addSubcommand((s) => s.setName('suggestions').setDescription('Définir le salon des suggestions')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon')
        .addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('vocaux-temp').setDescription('Salon « rejoindre pour créer »')
      .addChannelOption((o) => o.setName('salon').setDescription('Salon vocal déclencheur')
        .addChannelTypes(ChannelType.GuildVoice).setRequired(true))
      .addChannelOption((o) => o.setName('categorie').setDescription('Catégorie où créer les salons')
        .addChannelTypes(ChannelType.GuildCategory)))
    .addSubcommand((s) => s.setName('minecraft').setDescription('Serveur Minecraft à suivre')
      .addStringOption((o) => o.setName('ip').setDescription('Adresse du serveur').setRequired(true))
      .addChannelOption((o) => o.setName('salon-statut')
        .setDescription('Salon où afficher le statut mis à jour automatiquement')
        .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('minecraft-rcon').setDescription('Connexion RCON pour /mcwhitelist et /mclink')
      .addStringOption((o) => o.setName('host').setDescription('Hôte RCON').setRequired(true))
      .addStringOption((o) => o.setName('mot-de-passe').setDescription('Mot de passe RCON').setRequired(true))
      .addIntegerOption((o) => o.setName('port').setDescription('Port RCON (défaut 25575)').setMinValue(1).setMaxValue(65535))
      .addRoleOption((o) => o.setName('role-en-jeu').setDescription('Rôle attribué aux joueurs connectés au serveur (optionnel)')))
    .addSubcommand((s) => s.setName('invitation').setDescription('URL d\'invitation publique (affichée dans les DM de kick/softban/unban)')
      .addStringOption((o) => o.setName('url').setDescription('URL d\'invitation Discord (vide = retirer)')))
    .addSubcommand((s) => s.setName('ticket-message').setDescription("Message d'ouverture des tickets (vide = restaurer le défaut)")
      .addStringOption((o) => o.setName('message')
        .setDescription('Variables : {user} {username} {category} {number} {server} (vide = retirer)'))
      .addStringOption((o) => o.setName('categorie')
        .setDescription('Limiter à une catégorie (sinon appliqué à toutes)')
        .addChoices(...ticketCategoryChoices))),

  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    if (!await requireAdmin(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const ok = (msg: string) => interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });

    if (sub === 'automod') {
      const a = interaction.options.getBoolean('actif');
      const ph = interaction.options.getBoolean('phishing');
      const tk = interaction.options.getBoolean('token-leak');
      const zg = interaction.options.getBoolean('zalgo');
      await setConfig(gid, 'automod_enabled', a ? '1' : '0');
      if (ph !== null) await setConfig(gid, 'automod_phishing', ph ? '1' : '0');
      if (tk !== null) await setConfig(gid, 'automod_token_leak', tk ? '1' : '0');
      if (zg !== null) await setConfig(gid, 'automod_zalgo', zg ? '1' : '0');
      const parts: string[] = [];
      if (ph !== null) parts.push(`phishing ${ph ? 'on' : 'off'}`);
      if (tk !== null) parts.push(`token-leak ${tk ? 'on' : 'off'}`);
      if (zg !== null) parts.push(`zalgo ${zg ? 'on' : 'off'}`);
      return ok(`✅ Auto-modération **${a ? 'activée' : 'désactivée'}**${parts.length ? ` — ${parts.join(' · ')}` : ''}.`);
    }
    if (sub === 'invite-whitelist') {
      const action = interaction.options.getString('action');
      const guildIdOpt = interaction.options.getString('guild-id');
      let list: string[] = [];
      try { list = JSON.parse((await getConfig(gid, 'automod_invite_whitelist', '[]')) ?? '[]'); } catch { /* */ }
      if (action === 'add') {
        if (!guildIdOpt) return ok('❌ Fournis un identifiant de guilde.');
        if (list.includes(guildIdOpt)) return ok('ℹ️ Déjà dans la liste.');
        list.push(guildIdOpt);
        await setConfig(gid, 'automod_invite_whitelist', JSON.stringify(list));
        return ok(`✅ Guilde \`${guildIdOpt}\` ajoutée à la liste blanche (${list.length} entrée(s)).`);
      }
      if (action === 'remove') {
        if (!guildIdOpt) return ok('❌ Fournis un identifiant de guilde.');
        const before = list.length;
        list = list.filter((g) => g !== guildIdOpt);
        if (list.length === before) return ok('ℹ️ Pas dans la liste.');
        await setConfig(gid, 'automod_invite_whitelist', JSON.stringify(list));
        return ok(`✅ Guilde \`${guildIdOpt}\` retirée (${list.length} entrée(s)).`);
      }
      // list
      return ok(list.length
        ? `📋 ${list.length} guilde(s) autorisée(s) :\n${list.map((g) => `\`${g}\``).join(', ')}`
        : 'ℹ️ La liste blanche est vide — toutes les invitations sont bloquées si l\'automod est actif.'
      );
    }
    if (sub === 'antiraid') {
      const a = interaction.options.getBoolean('actif');
      const age = interaction.options.getInteger('age-min-compte');
      const kickYoung = interaction.options.getBoolean('expulser-jeunes');
      const lockdown = interaction.options.getBoolean('verrouillage-auto');
      const quarantine = interaction.options.getRole('quarantaine');
      await setConfig(gid, 'antiraid_enabled', a ? '1' : '0');
      if (age !== null) await setConfig(gid, 'antiraid_min_age_days', age);
      if (kickYoung !== null) await setConfig(gid, 'antiraid_kick_young', kickYoung ? '1' : '0');
      if (lockdown !== null) await setConfig(gid, 'antiraid_lockdown', lockdown ? '1' : '0');
      if (quarantine) await setConfig(gid, 'antiraid_quarantine_role', quarantine.id);
      const parts: string[] = [];
      if (age !== null) parts.push(`âge min. ${age} j`);
      if (kickYoung !== null) parts.push(`expulsion auto ${kickYoung ? 'on' : 'off'}`);
      if (lockdown !== null) parts.push(`verrouillage auto ${lockdown ? 'on' : 'off'}`);
      if (quarantine) parts.push(`quarantaine → ${quarantine.name}`);
      return ok(`✅ Anti-raid **${a ? 'activé' : 'désactivé'}**${parts.length ? ` — ${parts.join(' · ')}` : ''}.`);
    }
    if (sub === 'captcha') {
      const a = interaction.options.getBoolean('actif');
      const unverified = interaction.options.getRole('role-non-verifie');
      const verified = interaction.options.getRole('role-verifie');
      const chan = interaction.options.getChannel('salon', true);
      await setConfig(gid, 'captcha_enabled', a ? '1' : '0');
      if (unverified) await setConfig(gid, 'captcha_unverified_role', unverified.id);
      if (verified) await setConfig(gid, 'captcha_verified_role', verified.id);
      if (chan) await setConfig(gid, 'captcha_channel', chan.id);
      return ok(`✅ CAPTCHA **${a ? 'activé' : 'désactivé'}**.`);
    }
    if (sub === 'mot-ajouter' || sub === 'mot-retirer') {
      const word = interaction.options.getString('mot', true).toLowerCase().trim();
      let words: string[] = [];
      try { words = JSON.parse((await getConfig(gid, 'automod_banned_words', '[]')) ?? '[]'); }
      catch { /* JSON invalide : on garde la liste vide */ }
      if (sub === 'mot-ajouter') {
        if (words.includes(word)) return ok('ℹ️ Ce mot est déjà dans la liste.');
        words.push(word);
      } else {
        if (!words.includes(word)) return ok("ℹ️ Ce mot n'est pas dans la liste.");
        words = words.filter((w: string) => w !== word);
      }
      await setConfig(gid, 'automod_banned_words', JSON.stringify(words));
      return ok(`✅ Liste des mots interdits mise à jour (${words.length} mot(s)).`);
    }
    if (sub === 'automod-spam') {
      const msgs = interaction.options.getInteger('messages');
      const secs = interaction.options.getInteger('secondes');
      const mins = interaction.options.getInteger('exclusion-minutes');
      if (msgs !== null) await setConfig(gid, 'automod_spam_messages', msgs);
      if (secs !== null) await setConfig(gid, 'automod_spam_window', secs);
      if (mins !== null) await setConfig(gid, 'automod_spam_timeout', mins);
      return ok('✅ Seuil anti-spam mis à jour.');
    }
    if (sub === 'accueil') {
      const ch = interaction.options.getChannel('salon', true);
      await setConfig(gid, 'welcome_channel', ch.id);
      const msg = interaction.options.getString('message', true);
      if (msg) await setConfig(gid, 'welcome_message', msg);
      const card = interaction.options.getBoolean('carte-image');
      if (card !== null) await setConfig(gid, 'welcome_card_enabled', card ? '1' : '0');
      const bgRaw = interaction.options.getString('image-fond')?.trim();
      let bgChange: 'set' | 'remove' | null = null;
      if (bgRaw !== undefined) {
        if (!bgRaw || /^(retirer|none|off)$/i.test(bgRaw)) {
          await setConfig(gid, 'welcome_card_background', null);
          bgChange = 'remove';
        } else if (/^https:\/\/\S+$/i.test(bgRaw)) {
          await setConfig(gid, 'welcome_card_background', bgRaw);
          bgChange = 'set';
        } else {
          return ok('❌ URL invalide pour l\'image de fond. Attendu : `https://...` ou `retirer`.');
        }
      }
      const dmMsg = interaction.options.getString('message-dm');
      if (dmMsg) await setConfig(gid, 'welcome_dm_message', dmMsg);
      const bgLabel = bgChange === 'set' ? ' · image de fond définie'
        : bgChange === 'remove' ? ' · image de fond retirée'
        : '';
      return ok(`✅ Salon de bienvenue : ${ch}${card !== null ? ` · carte ${card ? 'on' : 'off'}` : ''}${bgLabel}${dmMsg ? ' · DM activé' : ''}`);
    }
    if (sub === 'depart') {
      const ch = interaction.options.getChannel('salon', true);
      await setConfig(gid, 'goodbye_channel', ch.id);
      const msg = interaction.options.getString('message', true);
      if (msg) await setConfig(gid, 'goodbye_message', msg);
      return ok(`✅ Salon de départ : ${ch}`);
    }
    if (sub === 'autorole') {
      const role = interaction.options.getRole('role', true);
      await setConfig(gid, 'autorole', role.id);
      return ok(`✅ Autorôle : ${role}`);
    }
    if (sub === 'reglement') {
      const role = interaction.options.getRole('role', true);
      await setConfig(gid, 'verified_role', role.id);
      return ok(`✅ Rôle de validation du règlement : ${role}`);
    }
    if (sub === 'suggestions') {
      const ch = interaction.options.getChannel('salon', true);
      await setConfig(gid, 'suggestions_channel', ch.id);
      return ok(`✅ Salon des suggestions : ${ch}`);
    }
    if (sub === 'vocaux-temp') {
      const ch = interaction.options.getChannel('salon', true);
      await setConfig(gid, 'jtc_channel', ch.id);
      const cat = interaction.options.getChannel('categorie');
      if (cat) await setConfig(gid, 'jtc_category', cat.id);
      return ok(`✅ Salon « rejoindre pour créer » : ${ch}`);
    }
    if (sub === 'minecraft') {
      await setConfig(gid, 'mc_server_ip', interaction.options.getString('ip', true).trim());
      const ch = interaction.options.getChannel('salon-statut');
      if (ch) {
        await setConfig(gid, 'mc_status_channel', ch.id);
        await setConfig(gid, 'mc_status_message', null); // forcera la recréation du message
      }
      return ok('✅ Serveur Minecraft configuré.');
    }
    if (sub === 'minecraft-rcon') {
      const host = interaction.options.getString('host', true).trim();
      const port = interaction.options.getInteger('port') ?? 25575;
      const pw = interaction.options.getString('mot-de-passe', true);
      const ingameRole = interaction.options.getRole('role-en-jeu');
      await setConfig(gid, 'mc_rcon_host', host);
      await setConfig(gid, 'mc_rcon_port', port);
      await setConfig(gid, 'mc_rcon_password', pw);
      if (ingameRole) await setConfig(gid, 'mc_ingame_role', ingameRole.id);
      return ok(`✅ RCON configuré (\`${host}:${port}\`)${ingameRole ? ` — rôle en jeu : ${ingameRole}` : ''}.`);
    }
    if (sub === 'invitation') {
      const url = interaction.options.getString('url')?.trim() || null;
      if (url && !/^https?:\/\/(discord\.gg|discord\.com\/invite)\//i.test(url)) {
        return ok('❌ URL invalide. Attendu : `https://discord.gg/xxxxx` ou `https://discord.com/invite/xxxxx`.');
      }
      await setConfig(gid, 'public_invite_url', url);
      return ok(url
        ? `✅ Invitation publique : ${url} (affichée dans les DM de kick/softban/unban).`
        : '✅ Invitation publique retirée.');
    }
    if (sub === 'ticket-message') {
      const message = interaction.options.getString('message')?.trim() || null;
      const cat = interaction.options.getString('categorie');
      // Description d'embed Discord = 4096 chars max ; on rejette tôt pour
      // éviter qu'une catégorie ait un message qui crashe l'envoi du ticket.
      if (message && message.length > 3500) {
        return ok('❌ Message trop long (max 3500 caractères).');
      }
      const key = cat ? `ticket_open_message:${cat}` : 'ticket_open_message';
      await setConfig(gid, key, message);
      const scope = cat
        ? `la catégorie **${config.tickets.categories.find((c) => c.value === cat)?.label ?? cat}**`
        : '**toutes les catégories** (défaut)';
      return ok(message
        ? `✅ Message d'ouverture mis à jour pour ${scope}.`
        : `✅ Message d'ouverture réinitialisé pour ${scope}.`);
    }

    // --- voir ---
    const showChan = (id: string | null) => (id ? `<#${id}>` : '*Non défini*');
    const showRole = (id: string | null) => (id ? `<@&${id}>` : '*Non défini*');
    const bool = async (k: string) => ((await getConfig(gid, k, '0')) === '1' ? '✅ Activé' : '❌ Désactivé');
    let words: string[] = [];
    try { words = JSON.parse((await getConfig(gid, 'automod_banned_words', '[]')) ?? '[]'); }
    catch { /* JSON invalide : on garde la liste vide */ }

    const ticketGlobal = await getConfig(gid, 'ticket_open_message');
    const ticketOverrides: string[] = [];
    for (const c of config.tickets.categories) {
      if (await getConfig(gid, `ticket_open_message:${c.value}`)) ticketOverrides.push(c.label);
    }
    const ticketSummary =
      (ticketGlobal ? '✅ Personnalisé' : '🔹 Défaut') +
      (ticketOverrides.length ? ` · overrides : ${ticketOverrides.join(', ')}` : '');

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('⚙️ Configuration du serveur')
      .addFields(
        { name: '🛡️ Auto-modération', value: await bool('automod_enabled'), inline: true },
        { name: '🚨 Anti-raid', value: `${await bool('antiraid_enabled')}\nÂge min. : ${await getConfig(gid, 'antiraid_min_age_days', '0')} j`, inline: true },
        { name: '👋 Accueil', value: showChan(await getConfig(gid, 'welcome_channel')), inline: true },
        { name: '🚪 Départ', value: showChan(await getConfig(gid, 'goodbye_channel')), inline: true },
        { name: '🎭 Autorôle', value: showRole(await getConfig(gid, 'autorole')), inline: true },
        { name: '✅ Rôle règlement', value: showRole(await getConfig(gid, 'verified_role')), inline: true },
        { name: '💡 Suggestions', value: showChan(await getConfig(gid, 'suggestions_channel')), inline: true },
        { name: '🔊 Vocaux temporaires', value: showChan(await getConfig(gid, 'jtc_channel')), inline: true },
        { name: '⛏️ Serveur Minecraft', value: (await getConfig(gid, 'mc_server_ip')) || '*Non défini*', inline: true },
        { name: '🚫 Mots interdits', value: `${words.length} mot(s)`, inline: true },
        { name: '📁 Message tickets', value: ticketSummary, inline: false },
        { name: '🔗 Invitation publique', value: (await getConfig(gid, 'public_invite_url')) || '*Non définie*', inline: false }
      );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
