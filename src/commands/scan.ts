import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (message.channel.id != config.queueChannelID) {
			setTimeout(async function () {
				message.delete()
			}, 200)
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					]
				})
				.catch((err) =>
					simulateDM(
						message,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.queueChannelID}>`),
						client
					)
				)
		}

		if (!message.guild) throw new Error("Message guild not found")
		if (!message.member) throw new Error("Message member not found")

		if (!message.mentions.members || message.mentions.members.size == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you are trying to scan")
				]
			})
		}

		let accused = message.mentions.members.first()
		if (!accused) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you are trying to scan")
				]
			})
		}

		addAudit(`${message.author.id} scanned ${accused.id}`)

		let role1 = await message.guild.roles.cache.get(config.rankedRoleID)
		let role2 = await message.guild.roles.cache.get(config.scanRoleID)
		if (!role1) throw new Error("Couldnt find ranked role")
		if (!role2) throw new Error("Couldnt find scan role")
		message.member.roles.add(role2)
		message.member.roles.remove(role1)
		accused.roles.add(role2)
		accused.roles.remove(role1)

		let channel = await message.guild.channels.create("scan-request", {
			type: "GUILD_TEXT",
			parent: config.rankedCategoryID,
			permissionOverwrites: [
				{
					id: config.guildID,
					deny: ["VIEW_CHANNEL"]
				},
				{
					id: config.staffRoleID,
					allow: ["VIEW_CHANNEL"]
				},
				{
					id: config.scannerRoleID,
					allow: ["VIEW_CHANNEL"]
				},
				{
					id: message.author.id,
					allow: ["VIEW_CHANNEL"]
				},
				{
					id: accused.id,
					allow: ["VIEW_CHANNEL"]
				}
			]
		})

		channel.send(`**<@!${message.author.id}> has requested a scan for <@!${accused.id}>!**
<@!${accused.id}> please do not log off Hypixel. If you do so, you'll receive a **Red Card**.
<@!${message.author.id}> please stay online to ensure <@!${accused.id}> does not log off Hypixel. If they do, send a screenshot of it here.
Neither of you should queue until directed by staff.
If a <@&${config.scannerRoleID}> hasn't responded within 15 minutes, you may both leave the server and freely queue`)
		setTimeout(async function () {
			message.delete()
		}, 200)
		return
	}
}
