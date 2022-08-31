import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, replaceError, simulateDM, Staff } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as games from "../handlers/game"
import * as db from "../db"
import * as mongo from "../mongo"

export default {
	run: async ({ message, client }: CommandParameters) => {
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

		let checkingID = message.author.id
		if (message.mentions.members) {
			if (message.mentions.members.size > 0) {
				let first = message.mentions.members.first()
				if (first) {
					checkingID = first.id
				}
			}
		}

		addAudit(`${message.author.id} checked stats for ${checkingID}`)
		let userDataRow = await db.where(db.TABLES.UserData, { discord: checkingID })
		if (userDataRow.length == 0) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("That player is not verified.")
				]
			})
		}
		let userData = userDataRow[0]

		let mongoData = await mongo.find(mongo.MODELS.Users, {})
		let player = mongoData.filter((a) => {
			return a.userID == checkingID
		})[0]

		let opponents = 0
		let opponentRatingSum = 0

		for (let i = 0; i < player.records.length; i++) {
			let record = player.records[i]
			if (record.reason == "admin") continue
			let opponentRating = mongoData.filter((a) => {
				if (record.reason == "admin") return
				return a.userID == record.opponent
			})[0].elo

			if (!opponentRating) continue
			opponentRatingSum += opponentRating
			opponents += 1
		}

		let performanceScore = Math.round(
			opponentRatingSum / opponents + rdCalculation(player.wins, player.losses)
		).toString()
		if (player.wins + player.losses < 10) {
			performanceScore = "10 games needed for a performance score"
		}

		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed().setColor("BLUE").setDescription(`**Username:** ${
					userData.name
				}
**Rating:** ${Math.round(player.elo)}
**Wins:** ${player.wins}
**Losses:** ${player.losses}
**Total Games:** ${player.wins + player.losses}
**Win Rate:** ${replaceError(
					Math.round((player.wins / (player.wins + player.losses)) * 1000) / 10,
					100
				)}%
**Avg Opponent:** ${Math.round(opponentRatingSum / opponents)}
**Estimated Performance:** ${performanceScore}`)
			]
		})
	}
}

function rdCalculation(wins: number, losses: number): number {
	if (losses == 0) return 800
	if (wins == 0) return -800
	let wl = wins / (wins + losses)
	return -400 * Math.log10(1 / wl - 1)
}
