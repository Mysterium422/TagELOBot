import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, simulateDM, Staff } from "../utils"
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

		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.commandsChannelID
		) {
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
						message,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.mainChannelID}>`),
						client
					)
				)
		}
		if (!args[0]) {
			return message.channel.send("https://tagfeuds.herokuapp.com/leaderboard")
		}

		if (args[0].toLowerCase() == "host") {
			addAudit(`${message.author.id} checked host leaderboards`)
			let data = await db.all(db.TABLES.HostData)
			data = data.filter((a) => {
				return a.host > 0
			})

			if (
				!data.some((a) => {
					return a[0] == message.author.id
				})
			) {
				data.push({ discord: message.author.id, host: 0 })
			}

			if (data.length < 10) {
				return message.channel.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`Not enough leaderboard entries (${data.length})!`)
					]
				})
			}
			data = data.sort((a, b) => {
				return b.host - a.host
			})

			let position = data.length
			for (let i = 0; i < data.length; i++) {
				if (data[i][0] == message.author.id) {
					position = i + 1
					break
				}
			}
			let string = ``
			for (let i = 1; i < 11; i++) {
				string = `${string}\n${position == i ? "**" : ""}#1 <@!${data[i].discord}> - ${
					data[i].host
				}${position == i ? "**" : ""}`
			}

			if (position > 10) {
				string = `${string}\n. . .\n**#${position} <@!${data[position - 1][0]}> - ${
					data[position - 1][1]
				}**`
			}

			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("BLUE")
						.setTitle("**Hosting Leaderboard**")
						.setDescription(string)
				]
			})
		}
		return message.channel.send("https://www.tagfeuds.club/leaderboard")
	},
	aliases: ["lb"]
}
