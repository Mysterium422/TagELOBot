import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { hypixelFetch, simulateDM } from "../utils"
import config from "../config"
import * as db from "../db"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (message.channel.id != config.mainChannelID) {
			setTimeout(async function () {
				message.delete()
			}, 200)
			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					]
				})
				.catch((err) =>
					simulateDM(
						message.member,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.mainChannelID}>`),
						client
					)
				)
		}

		let userData = await db.where(db.TABLES.UserData, { discord: message.author.id })

		if (userData.length == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("This command is only available if you have registered")
				]
			})
		}

		let newName = await hypixelFetch(`player?uuid=${userData[0].uuid}`)
		if (!newName || !newName.success) return

		await db.update(
			db.TABLES.UserData,
			{ discord: message.author.id },
			{
				discord: message.author.id,
				uuid: userData[0].uuid,
				name: newName.player.displayname
			}
		)

		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("GREEN")
					.setDescription(`Your IGN has been updated to ${newName.player.displayname}`)
			]
		})
	}
}
