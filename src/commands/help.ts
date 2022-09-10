import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import config from "../config"
import { hasStaffPermission, Staff } from "../utils"

export default {
	run: async ({ message }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (!message.member) throw new Error("Message member doesnt exist")

		let prefix = config.prefix

		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle("**Help Menu (ELO Bot)**")
					.setDescription(
						`Check out <#844559642490830889> for Ranked info${
							hasStaffPermission(message.member, Staff.STAFF)
								? "\nCheck out <#859417093483790386> for Ranked info"
								: ""
						}`
					)
					.setTimestamp()
					.setFooter({ text: "Tag ELO Bot created by Mysterium_" })
			]
		})
	}
}
