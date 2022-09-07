import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"
import * as games from "../handlers/game"

export default {
	run: async ({ message, client }: CommandParameters) => {
		// if (
		// 	message.channel.id != config.mainChannelID &&
		// 	message.channel.id != config.queueChannelID &&
		// 	message.channel.id != config.commandsChannelID
		// ) {
		// 	return
		// }
		// if (message.channel.id != config.queueChannelID) {
		// 	setTimeout(async function () {
		// 		message.delete()
		// 	}, 200)
		// 	return message.author
		// 		.send({
		// 			embeds: [
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription(`That command goes in <#${config.queueChannelID}>`)
		// 			]
		// 		})
		// 		.catch((err) =>
		// 			simulateDM(
		// 				message.member,
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription(`That command goes in <#${config.queueChannelID}>`),
		// 				client
		// 			)
		// 		)
		// }
		// if (!games.inGame(message.author.id)) {
		// 	return message.channel.send({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription("You are not in a game")
		// 		]
		// 	})
		// }
		// let opponent = games.findOpponent(message.author.id)
		// const msg = await message.channel.send({
		// 	content: `<@!${message.author.id}> <@!${opponent}>`,
		// 	embeds: [
		// 		new Discord.MessageEmbed()
		// 			.setColor("BLUE")
		// 			.setDescription(`React with a :thumbsup: if you consent to aborting the game`)
		// 	]
		// })
		// addAudit(`${message.author.id} tried to abort a game with ${opponent}`)
		// await msg.react("👍")
		// await msg.react("👎")
		// const filter = (reaction, user) => user.id == opponent
		// const collector = msg.createReactionCollector({ time: 60 * 1000, filter })
		// collector.on("collect", async (reaction, user) => {
		// 	if (reaction.emoji.name == "👍") {
		// 		return collector.stop("success")
		// 	} else if (reaction.emoji.name == "👎") {
		// 		return collector.stop("failure")
		// 	}
		// })
		// collector.on("end", (collection, reason) => {
		// 	msg.reactions.removeAll()
		// 	if (reason == "success") {
		// 		if (games.findOpponent(message.author.id) != opponent) {
		// 			return msg.edit({
		// 				embeds: [
		// 					new Discord.MessageEmbed()
		// 						.setColor("NOT_QUITE_BLACK")
		// 						.setDescription("An internal error has occured. Game not found.")
		// 				]
		// 			})
		// 		}
		// 		addAudit(`${message.author.id} aborted a game with ${opponent}`)
		// 		games.deleteGame(message.author.id)
		// 		return msg.edit({
		// 			embeds: [
		// 				new Discord.MessageEmbed().setColor("RED").setDescription("Game Aborted")
		// 			]
		// 		})
		// 	}
		// 	if (reason == "failure") {
		// 		addAudit(`${message.author.id} failed to aborted a game with ${opponent}`)
		// 		return msg.edit({
		// 			embeds: [
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription("Game abortion rejected. You may have to =resign")
		// 			]
		// 		})
		// 	}
		// 	addAudit(`${message.author.id} failed to aborted a game with ${opponent}`)
		// 	return msg.edit({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription("Game abortion request timed out")
		// 		]
		// 	})
		// })
	}
}
