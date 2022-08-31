import { CommandParameters } from "../CommandParameters"
import { hasStaffPermission, Staff, addAudit } from "../utils"
import config from "../config"
import { resolve } from "path"

export default {
	run: async ({ message }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID &&
			message.channel.id != config.commandsChannelID
		) {
			return
		}

		if (!message.member) throw new Error("Message member missing")
		addAudit(`${message.author.id} checked audit logs`)
		if (!hasStaffPermission(message.member, Staff.ADMINISTRATOR)) return

		return message.author
			.send({ files: [resolve(__dirname, "../../audit.txt")] })
			.catch((err) => {
				return message.channel.send({
					content: "Error while sending file (file too large? bot blocked?)"
				})
			})
	}
}
