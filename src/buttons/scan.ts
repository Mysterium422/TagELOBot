import { ButtonParameters } from "../ButtonParameters"
import Discord, { TextChannel } from "discord.js"
import config from "../config"
import * as db from "../db"
import * as mongo from "../mongo"
import { CommandParameters } from "../CommandParameters"
import { addAudit, simulateDM } from "../utils"
import * as games from "../handlers/game"
import { ThreadAutoArchiveDuration } from "discord-api-types/v9"

export default {
	run: async ({ button }: ButtonParameters) => {
		// args are: host

		// None of these errors should fire since buttons can only be in the Guild
		if (!button.member) throw new Error("Button Member undefined")
		if (!button.channel) throw new Error("Button Channel undefined")
		if (!button.guild) throw new Error("Button Guild undefined")
		if (!(button.member instanceof Discord.GuildMember)) {
			throw new Error("Button member is not a GuildMember")
		}
		if (!(button.message instanceof Discord.Message)) {
			throw new Error("Button message is not a Message")
		}
		if (!(button.channel instanceof Discord.TextChannel)) {
			throw new Error("Button channel is not a Text CHannel")
		}

		button.message.components[0].components[0].setDisabled(true)
		button.message.components[0].components[1].setDisabled(true)
		button.message.components[1].components[0].setDisabled(true)
		button.message.components[1].components[1].setDisabled(true)
		button.message.components[2].components[0].setDisabled(true)

		let accused = games.findOpponent(button.member.id)
		if (!accused) {
			return button.message.edit({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription("An error occurred, contact Mysterium or Admin")
				]
			})
		}

		addAudit(`${button.member.id} scanned ${accused}`)

		// let role1 = await button.guild.roles.cache.get(config.rankedRoleID)
		// let role2 = await message.guild.roles.cache.get(config.scanRoleID)
		// if (!role1) throw new Error("Couldnt find ranked role")
		// if (!role2) throw new Error("Couldnt find scan role")
		// message.member.roles.add(role2)
		// message.member.roles.remove(role1)
		// accused.roles.add(role2)
		// accused.roles.remove(role1)

		// let channel = await message.guild.channels.create("scan-request", {
		// 	type: "GUILD_TEXT",
		// 	parent: config.rankedCategoryID,
		// 	permissionOverwrites: [
		// 		{
		// 			id: config.guildID,
		// 			deny: ["VIEW_CHANNEL"]
		// 		},
		// 		{
		// 			id: config.staffRoleID,
		// 			allow: ["VIEW_CHANNEL"]
		// 		},
		// 		{
		// 			id: config.scannerRoleID,
		// 			allow: ["VIEW_CHANNEL"]
		// 		},
		// 		{
		// 			id: message.author.id,
		// 			allow: ["VIEW_CHANNEL"]
		// 		},
		// 		{
		// 			id: accused.id,
		// 			allow: ["VIEW_CHANNEL"]
		// 		}
		// 	]
		// })

		await button.channel.permissionOverwrites.create(config.scanRoleID, {
			VIEW_CHANNEL: true
		})

		let msg = await button.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle("Scan Chat")
					.setDescription("Use this thread to discuss the scan request")
			]
		})

		let thread = await msg.startThread({
			name: "Game Chat",
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
		})

		await thread.send({
			content: `**<@!${button.member.id}> has requested a scan for <@!${accused}>!**
		<@!${accused}> please do not log off Hypixel. If you do so, you'll receive a **Red Card**.
		<@!${button.member.id}> please stay online to ensure <@!${accused}> does not log off Hypixel. If they do, send a screenshot of it here.
		Neither of you should queue until directed by staff.
		If a <@&${config.scannerRoleID}> hasn't responded within 15 minutes, you may both leave the server and freely queue`
		})

		return
	}
}