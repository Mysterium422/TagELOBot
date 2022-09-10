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
		let args = button.customId.split("-")

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

		if (!button.member.roles.cache.has(config.scannerRoleID)) {
			if (Date.now() - button.message.createdAt.getTime() < 15 * 60 * 1000) {
				return button.reply({
					embeds: [
						new Discord.MessageEmbed()
							.setDescription(
								`This is only available after a scan has been inactive till <t:${
									Math.floor(button.message.createdAt.getTime() / 1000) + 15 * 60
								}>`
							)
							.setColor("NOT_QUITE_BLACK")
					],
					ephemeral: true
				})
			}
		}

		const msg = await button.channel.messages.fetch(args[1])

		msg.components[0].components[0].setDisabled(false)
		msg.components[0].components[1].setDisabled(false)
		msg.components[1].components[0].setDisabled(false)
		msg.components[1].components[1].setDisabled(false)
		msg.components[2].components[0].setDisabled(false)

		await msg.edit({
			content: msg.content,
			embeds: msg.embeds,
			components: msg.components
		})

		if (button.message.hasThread) {
			await button.message.thread?.delete()
		}

		await button.message.delete()
	}
}
