const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios').default;

const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkping')
        .setDescription('Ping Checker')
		.addStringOption(option => (
			option
			.setName('ip')
			.setDescription('IPアドレスを入力')
			.setRequired(true)
		)),
	execute: async function (interaction) {
		let url = interaction.options.getString('ip');
		if (!ipv4Regex.test(url)) {
			try {
				new URL(url)
			} catch {
				return interaction.reply("IPアドレスが間違っています。(IPv4、またはドメインのみ対応しています。")
			}
			// return interaction.reply("IPアドレスが間違っています。(IPv4、またはドメインのみ対応しています。");
		}
		let res = await axios.get("https://check-host.net/check-ping", {
			params: {
				host: url,
				max_nodes: 40
			},
			headers: {
				"Accept": "application/json"
			}
		})
		let msg = await interaction.reply("チェックしています...");
		let checkCount = 0;
		let checkResult = async () => {
			checkCount++;
			let res2 = await axios.get("https://check-host.net/check-result/" + res.data.request_id)
			if (checkCount < 8 && (Object.values(res2.data).filter(x => x?.length != 0)).length < (res.data.nodes.length * 0.8)) setTimeout(checkResult, 2000);
			let str = Object.entries(res2.data).map(([key, value]) => {
				let nodeName = key.replace(".node.check-host.net", "");
				let data = value?.[0];
		onsole.log("Data for", nodeName, ":", data);
				if (!value || !data) return `[${nodeName}] Timeout`;
				return `[${nodeName}] ${data[3] || "Error"}/${data[2]} | Ping: ${Math.floor(data[1] * 1000)}ms`;
			}).filter(x => !!x).join("\n");
			msg.edit({
				content: "結果:",
				files: [{
					attachment: Buffer.from(str),
					name: "result.txt"
				}]
			})
		};
		setTimeout(checkResult, 2000);
	}
};