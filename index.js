import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { config } from 'dotenv';
import { QuickDB } from 'quick.db';

config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers
    ]
});

const db = new QuickDB();
const prefix = '$';
const prizes = [
    '**500K**',
    '**500K**',
    '**500K**',
    '**1M**',

    

];

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Store invites for all guilds on startup
    for (const [id, guild] of client.guilds.cache) {
        try {
            const guildInvites = await guild.invites.fetch();
            invites.set(id, new Map(guildInvites.map(inv => [inv.code, inv.uses])));
        } catch (error) {
            console.error(`❌ Failed to fetch invites for ${guild.name}:`, error);
        }
    }
});

// Track invites properly
const invites = new Map();
client.on('guildMemberAdd', async member => {
    const guild = member.guild;
    try {
        const newInvites = await guild.invites.fetch();
        const oldInvites = invites.get(guild.id) || new Map();

        const usedInvite = newInvites.find(inv => (oldInvites.get(inv.code) || 0) < inv.uses);

        if (usedInvite && usedInvite.inviter) {
            await db.add(`points_${usedInvite.inviter.id}`, 1);
            console.log(`${usedInvite.inviter.tag} gained 1 point for inviting ${member.user.tag}`);
        }

        // Update stored invites
        invites.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
    } catch (error) {
        console.error(`❌ Error tracking invites for ${member.user.tag}:`, error);
    }
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    if (command === 'spin') {
        const points = (await db.get(`points_${userId}`)) || 0;
        if (points <= 0) {
            return message.reply('❌ **ليس لديك نقاط كافيه للعب ادعى صديقك او شخص للسيرفر لكى تحصل على نقاط للعب**');
        }

        await db.sub(`points_${userId}`, 1);
        const prize = prizes[Math.floor(Math.random() * prizes.length)];
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        const embed = new EmbedBuilder()
            .setTitle('🎡 **مبروك لقد ربحت**')
            .setColor(`#${randomColor}`)
            .setDescription(`**${prize}**`)
            .setFooter({ text: 'استعمل هذا الأمر مرة اخرى اذا كنت تريد اللعب مرة اخرى' });

        await message.reply({ embeds: [embed] });
    }

    if (command === 'p') {
        const points = (await db.get(`points_${userId}`)) || 0;
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        const embed = new EmbedBuilder()
            .setTitle('🏆 Your points')
            .setColor(`#${randomColor}`)
            .setDescription(`**مبروك لديك ${points} نقاط !**`)
            .setFooter({ text: 'استمر فى كسب النقاط عن طريق الدعوات الاصدقاء و الاشخاص !' });

        await message.reply({ embeds: [embed] });
    }

    if (command === 'help') {
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const embed = new EmbedBuilder()
            .setTitle('📜 Help Menu')
            .setColor(`#${randomColor}`)
            .setDescription('Here are all the available commands:')
            .addFields(
                { name: '$spin', value: 'Spin the lucky wheel (Costs 1 point)' },
                { name: '$p', value: 'Check your points' },
                { name: '$addpoints @user amount', value: 'Add points to a user (Admin only)' },
                { name: '$resetpoints @user amount', value: 'reset points from a user write (admin only )' },
                { name: '$prize', value: 'Show all available prizes (Admin only)' },
                { name: '$help', value: 'Show this help menu' }
            )
            .setFooter({ text: 'Use these commands to play and manage the bot!' });

        await message.reply({ embeds: [embed] });
    }

    if (command === 'prize') {
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const embed = new EmbedBuilder()
            .setTitle('🎁 جوائز عجلة الحظ القويه !')
            .setColor(`#${randomColor}`)
            .setDescription(prizes.map(prize => `- ${prize}`).join('\n'))
            .setFooter({ text: 'Use $spin to win a prize!' });

        await message.reply({ embeds: [embed] });
    }

    if (command === 'addpoints') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply('❌ Invalid usage! Use: `$addpoints @user amount`');
        }

        await db.add(`points_${target.id}`, amount);
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const embed = new EmbedBuilder()
            .setTitle('✅ Points Added')
            .setColor(`#${randomColor}`)
            .setDescription(`Added **${amount}** points to ${target.tag}`);

        await message.reply({ embeds: [embed] });
    }

    if (command === 'resetpoints') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target || isNaN(amount) || amount < 0) {
            return message.reply('❌ Invalid usage! Use: `$resetpoints @user amount`');
        }

        await db.set(`points_${target.id}`, amount);
        const randomColor = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const embed = new EmbedBuilder()
            .setTitle('✅ Points Reset')
            .setColor(`#${randomColor}`)
            .setDescription(`Reset points for ${target.tag} to **${amount}**`);

        await message.reply({ embeds: [embed] });
    }
});

client.login("MTM0NTgyNTIxMDk2Mzg1NzQ0OQ.Gz8Y3Q.tNE_8F-4nMQ--I1Kkh0Zrdc8wzC1CAIYDZOqvM");
