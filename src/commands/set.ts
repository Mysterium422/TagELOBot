import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import { addAudit, simulateDM } from "../utils"
import config from "../config"
import * as queue from "../handlers/queue"
import * as db from "../db"
import * as mongo from "../mongo"

export default {
	run: async ({ message, client, args }: CommandParameters) => {
		// if (
		// 	message.channel.id != config.mainChannelID &&
		// 	message.channel.id != config.queueChannelID &&
		// 	message.channel.id != config.commandsChannelID
		// ) {
		// 	return
		// }
		// if (message.channel.id != config.mainChannelID) {
		// 	setTimeout(async function () {
		// 		message.delete()
		// 	}, 200)
		// 	return message.author
		// 		.send({
		// 			embeds: [
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription(`That command goes in <#${config.mainChannelID}>`)
		// 			]
		// 		})
		// 		.catch((err) =>
		// 			simulateDM(
		// 				message.member,
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription(`That command goes in <#${config.mainChannelID}>`),
		// 				client
		// 			)
		// 		)
		// }
		// if (!(await db.contains(db.TABLES.UserData, { discord: message.author.id })))
		// 	return message.channel.send({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription(
		// 					"You must be verified first. Contact a Staff member for support"
		// 				)
		// 		]
		// 	})
		// if (queue.inQueue(message.author.id)) {
		// 	return message.author
		// 		.send({
		// 			embeds: [
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription("You must leave the queue to use the set command")
		// 			]
		// 		})
		// 		.catch((err) =>
		// 			simulateDM(
		// 				message.member,
		// 				new Discord.MessageEmbed()
		// 					.setColor("NOT_QUITE_BLACK")
		// 					.setDescription(`You must leave the queue to use the set command`),
		// 				client
		// 			)
		// 		)
		// }
		// let newDev = parseInt(args[0])
		// if (!newDev) {
		// 	return message.channel.send({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription("Specify a valid number")
		// 		]
		// 	})
		// }
		// if (newDev < 50 || newDev > 200) {
		// 	return message.channel.send({
		// 		embeds: [
		// 			new Discord.MessageEmbed()
		// 				.setColor("NOT_QUITE_BLACK")
		// 				.setDescription("Must be between 50 and 200. Default: 100")
		// 		]
		// 	})
		// }
		// let user = await mongo.findOne(mongo.MODELS.Users, { userID: message.author.id })
		// if (!user) throw new Error("Could not find mongo user")
		// user.deviation = newDev
		// await mongo.findOneAndReplace(mongo.MODELS.Users, { userID: message.author.id }, user)
		// addAudit(`${message.author.id} set their deviation to ${newDev}`)
		// return message.channel.send({
		// 	embeds: [
		// 		new Discord.MessageEmbed()
		// 			.setColor("GREEN")
		// 			.setDescription(`Your deviation has been set to ${newDev}`)
		// 	]
		// })
	}
}
