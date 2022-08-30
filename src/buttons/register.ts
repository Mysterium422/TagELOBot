import { ButtonParameters } from "../ButtonParameters"
import Discord from "discord.js"
import config from "../config"
import { addAudit } from "../utils"
import * as db from "../db"

export default {
	run: async ({ button }: ButtonParameters) => {
		let args = button.id.split("-")

		if (!button.member) throw new Error("Button Member undefined")
		if (!button.channel) throw new Error("Button Channel undefined")
		if (!button.guild) throw new Error("Button Guild undefined")
		if (!(button.member instanceof Discord.GuildMember)) {
			throw new Error("Button member is not a GuildMember")
		}
		if (!(button.message instanceof Discord.Message)) {
			throw new Error("Button message is not a Message")
		}

		if (!button.member.roles.cache.has(config.staffRoleID)) return
		button.message.delete()

		if (args[1] == "acc") {
			addAudit(`${button.user.id} verified ${args[2]}`)

			if (await db.where(db.TABLES.UserData, { discord: args[2] })) {
				return button.channel.send({
					content: `<@!${args[2]}>`,
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("That ID is already verified")
					]
				})
			}

			if (await db.where(db.TABLES.UserData, { uuid: args[4] })) {
				return button.channel.send({
					content: `<@!${args[2]}>`,
					embeds: [
						new Discord.MessageEmbed()
							.setColor("NOT_QUITE_BLACK")
							.setDescription("That UUID is already verified")
					]
				})
			}

			let guildMember = await button.guild.members.cache.get(args[2])
			let role = await button.guild.roles.cache.get(config.rankedRoleID)

			if (!guildMember) throw new Error("guildMember not found")
			if (!role) throw new Error("Ranked Role not found")
			await guildMember.roles.add(role)

			await db.add(db.TABLES.UserData, { discord: args[2], name: args[3], uuid: args[4] })

			// TODO: Mongo

			// let profile = await mongoUtils.create({
			// 	userID: args[2],
			// 	elo: 1000,
			// 	username: args[3],
			// 	uuid: args[4],
			// 	wins: 0,
			// 	losses: 0,
			// 	records: [],
			// 	deviation: 100
			// })
			// profile.save()

			return button.channel.send({
				content: `<@!${args[2]}>`,
				embeds: [
					new Discord.MessageEmbed()
						.setColor("GREEN")
						.setDescription(`Verified <@!${args[2]}>`)
				]
			})
		} else if (args[1] == "rej") {
			addAudit(`${button.user.id} did not verify ${args[2]}`)

			return button.channel.send({
				content: `<@!${args[2]}>`,
				embeds: [
					new Discord.MessageEmbed()
						.setColor("RED")
						.setDescription(`Staff has denied your verification request`)
				]
			})
		}
	}
}