import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, Staff } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"

export default {
	run: async ({ message, client, args }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (!message.member) throw new Error("Message member missing")
		if (!hasStaffPermission(message.member, Staff.STAFF)) return

		if (!message.mentions.members || message.mentions.members.size == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you would like to change host points for")
				]
			})
		}

		let first = message.mentions.members.first()
		if (!first) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Ping the player you would like to change host points for")
				]
			})
		}

		let changeID = first.id

		let hostChange = parseInt(args[1])

		if (!hostChange) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Specify a valid number")
				]
			})
		}
		// let player = (await mongoUtils.findOne({userID:changeID})).toJSON()
		// player.records.push({
		//     reason:"admin",
		//     elo:Math.max(player.elo + eval(args[1]), 0) - player.elo,
		//     time:Date.now()
		// })
		// player.elo = Math.max(player.elo + eval(args[1]), 0)
		// await mongoUtils.findOneAndReplace({userID:changeID}, player)

		let hostRows = await db.where(db.TABLES.HostData, { discord: changeID })
		if (hostRows.length == 0) {
			await db.add(db.TABLES.HostData, { discord: changeID, host: hostChange })
		} else {
			await db.update(
				db.TABLES.HostData,
				{ discord: changeID },
				{ discord: changeID, host: hostRows[0].host + hostChange }
			)
		}

		addAudit(
			`${message.author.id} changed ${changeID}'s hostScore by ${hostChange} to ${
				hostRows[0].host + hostChange
			}`
		)
		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("GREEN")
					.setDescription(
						`Changed <@!${changeID}>'s hosting score to ${hostRows[0].host + hostChange}`
					)
			]
		})
	}
}
