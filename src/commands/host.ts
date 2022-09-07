import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { simulateDM } from "../utils"
import config from "../config"
import * as games from "../handlers/game"
import * as db from "../db"

export default {
	run: async ({ message, client }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID
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
						message.member,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.queueChannelID}>`),
						client
					)
				)
		}

		if (!message.member) throw new Error("Message Member is null")

		if (message.member.roles.cache.has(config.mutedRoleID)) {
			return message.channel.send("You are not authorized to use this")
		}

		let game = games.findGame(message.author.id)
		if (!game) {
			return message.channel.send("You need to be in a game to use this command")
		}
		if (game.host) {
			return message.channel.send("You have already used this command for this game")
		}

		game.hostRequested()
		let msg = await message.channel.send(`Host Needed! <@&${config.hostRoleID}>`)
		await msg.react("✋")
		const filter = async (reaction, user) => reaction.emoji.name == "✋"
		const collector = msg.createReactionCollector({ time: 600 * 1000, filter })
		collector.on("collect", async (reaction, user) => {
			if (!reaction.message.guild) throw new Error("Host reaction not in a guild")
			let member = await reaction.message.guild.members.cache.get(user.id)

			if (!member) throw new Error("Member not found in guild")
			if (!member.roles.cache.has(config.hostRoleID)) return
			if (user.bot) return

			message.channel.send(`<@!${message.author.id}> <@!${user.id}> can host!`)

			let hostRows = await db.where(db.TABLES.HostData, { discord: user.id })
			if (hostRows.length == 0) {
				await db.add(db.TABLES.HostData, { discord: user.id, host: 1 })
			} else {
				await db.update(
					db.TABLES.HostData,
					{ discord: user.id },
					{ discord: user.id, host: hostRows[0].host + 1 }
				)
			}

			msg.delete()
			collector.stop("reaction")
		})

		collector.on("end", (collection, reason) => {
			if (reason == "reaction") return
			msg.reactions.removeAll()
			msg.edit("Host Request Timed Out")
		})
	}
}
