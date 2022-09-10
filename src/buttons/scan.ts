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

		await button.deferUpdate()

		if (
			games.findGame(button.member.id)?.match !=
			games.getMatchFromString(button.channel.name)
		) {
			return
		}

		button.message.components[0].components[0].setDisabled(true)
		button.message.components[0].components[1].setDisabled(true)
		button.message.components[1].components[0].setDisabled(true)
		button.message.components[1].components[1].setDisabled(true)
		button.message.components[2].components[0].setDisabled(true)

		await button.message.edit({
			content: button.message.content,
			embeds: button.message.embeds,
			components: button.message.components
		})

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

		// await button.channel.permissionOverwrites.create(config.scanRoleID, {
		// 	VIEW_CHANNEL: true
		// })

		let msg = await button.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle("Scan Chat")
					.setDescription("Use this thread to discuss the scan request")
			],
			components: [
				new Discord.MessageActionRow().addComponents(
					new Discord.MessageButton()
						.setLabel("End Scan")
						.setCustomId(`end_scan-${button.message.id}`)
						.setStyle("PRIMARY")
				)
			]
		})

		let thread = await msg.startThread({
			name: "Scan Chat",
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
		})

		await thread.send({
			content: `**<@!${button.member.id}> has requested a scan for <@!${accused}>!**
<@!${accused}> please do not log off Hypixel. If you do so, you'll receive a **Ranked Blacklist**.
<@!${button.member.id}> please stay online to ensure <@!${accused}> does not log off Hypixel. If they do, send a screenshot of it here.
Neither of you should queue until directed by staff.
If a <@&${config.scannerRoleID}> hasn't responded within 15 minutes, you may both leave the server and freely queue`
		})

		return
	}
}
