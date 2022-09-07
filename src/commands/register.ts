import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import {
	addAudit,
	hypixelFetch,
	HypixelResponse,
	mojangUUIDFetch,
	replaceError,
	simulateDM,
	timeConverter
} from "../utils"
import config from "../config"
import * as db from "../db"

export default {
	run: async ({ message, client, args }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID &&
			message.channel.id != config.registerChannelID
		) {
			return
		}

		if (message.channel.id != config.registerChannelID) {
			setTimeout(async function () {
				message.delete()
			}, 200)

			return message.author
				.send({
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.registerChannelID}>`)
					]
				})
				.catch((err) => {
					simulateDM(
						message.member,
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription(`That command goes in <#${config.registerChannelID}>`),
						client
					)
				})
		}

		addAudit(`${message.author.id} tried to register with IGN: ${args[0]}`)

		if (await db.contains(db.TABLES.UserData, { discord: message.author.id })) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("You are already registered")
				]
			})
		}

		if (args.length != 1) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed()
						.setColor("NOT_QUITE_BLACK")
						.setDescription("Please specify an ign")
				]
			})
		}

		let data: HypixelResponse | null

		if (args[0].length > 20) {
			data = await hypixelFetch(`player?uuid=${args[0]}`)
		} else {
			let uuidInput = await mojangUUIDFetch(args[0]).catch(() => {
				return { id: "UUIDINVALID12345678910" }
			})

			if (uuidInput.id.length > 20) {
				data = await hypixelFetch(`player?uuid=${uuidInput.id}`)
			} else {
				data = await hypixelFetch(`player?name=${args[0]}`)
			}
		}

		if (
			!data ||
			!data.success ||
			data.player == null ||
			data.player == undefined ||
			!data.player ||
			data.player.stats == undefined
		) {
			return message.channel.send({
				embeds: [
					new Discord.MessageEmbed().setColor("RED").setDescription("Could not find IGN")
				]
			})
		}

		await message.channel.send({
			components: [
				new Discord.MessageActionRow().addComponents([
					new Discord.MessageButton()
						.setLabel("Accept")
						.setStyle("SUCCESS")
						.setCustomId(
							`register-acc-${message.author.id}-${data.player.displayname}-${data.player.uuid}`
						),
					new Discord.MessageButton()
						.setLabel("Reject")
						.setStyle("DANGER")
						.setCustomId(`register-rej-${message.author.id}`)
				])
			],
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle("Verification Request")
					.setDescription(
						`From <@!${message.author.id}>
					
**Username:** ${data.player.displayname}
**UUID:** ${data.player.uuid}
**Tag Wins:** ${replaceError(data.player.stats.TNTGames.wins_tntag, 0)}
**Network Level:** ${Math.floor(
							Math.sqrt(2 * replaceError(data.player.networkExp, 0) + 30625) / 50 - 2.5
						)}
**Discord:** ${replaceError(data.player.socialMedia?.links?.DISCORD, "Not Set")}
**First Login:** ${timeConverter(data.player.firstLogin)}`
					)
					.setFooter({ text: "Please wait for a Ranked Staff member to verify you" })
			]
		})
	}
}
