import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, hasStaffPermission, simulateDM, Staff, locked } from "../utils"
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

		if (message.channel.id !== config.queueChannelID) {
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

		addAudit(`${message.author.id} tried to join`)
		if (locked) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("The queue has been locked and games can no longer start")
				]
			})
		}
		setTimeout(async function () {
			message.delete()
		}, 200)
		if (message.author.id in tagEloQueues)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("You are already queued")
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription("You are already queued")
					)
				)
		if (m.author.id in tagEloGames)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(
							`You stil have a game against <@!${tagEloGames[m.author.id]}>`
						)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(
								`You stil have a game against <@!${tagEloGames[m.author.id]}>`
							)
					)
				)
		if (m.author.id in tagEloDuels)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(
							`You stil have a game against <@!${tagEloDuels[m.author.id]}>`
						)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(
								`You stil have a game against <@!${tagEloDuels[m.author.id]}>`
							)
					)
				)

		if (!(m.author.id in (await db.get(`data`))))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription(
						"You must be verified first. Do =register to start the verification process"
					)
			)

		addAudit(`${m.author.id} successfully joined`)

		let player = (await mongoUtils.findOne({ userID: m.author.id })).toJSON()

		let rating = player.elo
		let deviation = player.deviation

		let potentialOpponents = await Object.entries(tagEloQueues)
			.filter((a) => {
				return Math.abs(rating - a[1][0]) < deviation
			})
			.filter((a) => {
				return Math.abs(rating - a[1][0]) < a[1][1]
			})
			.sort((a, b) => {
				return a[1][0] - rating - (b[1][0] - rating)
			})
			.sort((a, b) => {
				return a[1][2] - b[1][2]
			})

		// Check if
		if (potentialOpponents.length == 0) {
			tagEloQueues[m.author.id] = [rating, deviation, Date.now()]
			m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.blue)
					.setDescription(
						`There ${Object.keys(tagEloQueues).length != 1 ? "are" : "is"} ${
							Object.keys(tagEloQueues).length
						} ${
							Object.keys(tagEloQueues).length != 1 ? "players" : "player"
						} in the queue`
					)
			)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.green)
						.setDescription("Added you to the queue!")
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.green)
							.setDescription("Added you to the queue!")
					)
				)
		}

		tagEloGames[m.author.id] = potentialOpponents[0][0]
		tagEloGames[potentialOpponents[0][0]] = m.author.id
		tagEloHosts[m.author.id] = potentialOpponents[0][0]
		tagEloHosts[potentialOpponents[0][0]] = m.author.id

		delete tagEloQueues[potentialOpponents[0][0]]
		m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription(
					`There ${Object.keys(tagEloQueues).length != 1 ? "are" : "is"} ${
						Object.keys(tagEloQueues).length
					} ${Object.keys(tagEloQueues).length != 1 ? "players" : "player"} in the queue`
				)
		)
		await db.set(`matches`, (await db.get(`matches`)) + 1)
		addAudit(
			`Starting match ${await db.get(`matches`)} ${potentialOpponents[0][0]} vs ${
				m.author.id
			}`
		)
		return m.channel.send(
			`<@!${m.author.id}> <@!${potentialOpponents[0][0]}>`,
			new Discord.MessageEmbed().setColor(embedColors.blue)
				.setDescription(`Game ${await db.get(`matches`)} Starting:
<@!${potentialOpponents[0][0]}> ${await db.get(
				`data.${potentialOpponents[0][0]}.name`
			)} (${Math.round(potentialOpponents[0][1][0])}) vs <@!${
				m.author.id
			}> ${await db.get(`data.${m.author.id}.name`)} (${Math.round(rating)})`)
		)
	}
}
