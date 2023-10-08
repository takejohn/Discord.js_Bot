// Discord.js Bot - by ringoXD
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '1';
const { Client, Events, Intents, Status, ActivityType } = require('discord.js');
const fs = require("fs");
const path = require("path");
const { token, linkPort, linkDomain } = require('./config.json');
const { generateDependencyReport } = require('@discordjs/voice');
const express = require("express");
const app = express();
const server = require("http").Server(app);
const activity = require('./internal/activity');

const creset = '\x1b[0m';
const cgreen = '\x1b[32m';
const cred = '\x1b[31m';

let commands = [];


console.log('Starting Discord.js bot...')

fs.readdirSync(path.join(__dirname, "commands"), {
	withFileTypes: true
}).forEach((file) => {
	if (!file.isFile() || path.extname(file.name) != ".js")
		return;
	commands.push(require(path.join(__dirname, "commands", file.name)));
})

const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES]
})


activity.setupActivity(client);

setInterval(() => {
	if (!client.templinks) return;
	client.templinks = client.templinks.filter((link) => {
		if ((Date.now() - link.createdAt.valueOf()) > link.period) {
			console.log(`[TempLink] リンク: ${link.id} が期限切れになりました`)
			return false;
		} else {
			return true;
		}
	});
}, 1000);

client.on('ready', async () => {
	client.templinks = [];
	console.log(`${cgreen}Logged in as${creset} ${client.user.tag}`);
	client.user.setActivity('起動中...', { status: 'dnd' });
	console.log(`Registering guild commands...`)
	await client.application.commands.set(commands.map(x => x.data.toJSON()));
	console.log(`${cgreen}Ready!`);
	let SyslogChannel = client.channels.cache.get("1151139585791901746");
	SyslogChannel.send('Discord.js Bot is Ready!')
	const wsping = client.ws.ping;
	activity.addPingValue(wsping)
	client.user.setActivity({
		name: `[${client.ws.ping}ms] | Created by ringoXD`,
		type: `LISTENING`,
		Status: `online`
	})
})


client.on("interactionCreate", async interaction => {
	if (!interaction.isCommand()) return;

	let command = commands.find(x => x.data.name == interaction.commandName);
	if (!command) {
		console.error(`${interaction.commandName}というコマンドには対応していません。`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'コマンド実行時にエラーになりました。', ephemeral: true });
		} else {
			await interaction.reply({ content: 'コマンド実行時にエラーになりました。', ephemeral: true });
		}
		throw error;
	}
});

client.login(token);

function unicodeEscape(str) {
	if (!String.prototype.repeat) {
		String.prototype.repeat = function (digit) {
			var result = '';
			for (var i = 0; i < Number(digit); i++) result += str;
			return result;
		};
	}

	var strs = str.split(''), hex, result = '';

	for (var i = 0, len = strs.length; i < len; i++) {
		hex = strs[i].charCodeAt(0).toString(16);
		result += '\\u' + ('0'.repeat(Math.abs(hex.length - 4))) + hex;
	}

	return result;
};

app.get("/link/oembed/:linkCode", async (req, res) => {
	if (!client.templinks) return res.sendStatus(500);
	let link = client.templinks.find(x => x.id == req.params.linkCode);
	if (!link) {
		return res.sendStatus(404);
	}
	res.json({
		"version": "1.0",
		"title": `${link.link}`,
		"type": "link",
		"author_name": "省略リンク\nリンク先:",
		"provider_name": "MCSV Discord BOT",
		"provider_url": "https://mcsv.life",
		"url": link.link
	});
});


app.get("/:linkCode", async (req, res) => {
	if (!client.templinks) return res.sendStatus(500);
	let link = client.templinks.find(x => x.id == req.params.linkCode);
	if (!link) {
		return res.status(404).send(`<center><h1>省略リンクが見つかりませんでした</h1>\n<hr>\nnginsex/82.64 (UwUbuntu)</center>`);
	}
	res.send(
		`<script>location.href="${unicodeEscape(link.url)}"</script>` +
		`\n<link rel="alternate" type="application/json+oembed" href="https://${linkDomain}/oembed/${link.code}" />`
	)
});

process.on('uncaughtException', function (err) {
	console.error(err);
	//console.error("Depend Err ->" + generateDependencyReport());
});
server.listen(linkPort, () => {
	console.log(`[TempLink] ポート${linkPort} (${linkDomain}) でlistenしました`)
})