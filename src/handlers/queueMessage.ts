import * as queue from "./queue"
import * as games from "./game"
import Discord, { MessageActionRow } from "discord.js"
import queue_join from "../buttons/queue_join"
import queue_leave from "../buttons/queue_leave"
import config from "../config"
import { locked } from "../utils"

export async function generateMessage(): Promise<Discord.MessageEditOptions> {
	return {
		embeds: [
			new Discord.MessageEmbed().setColor("BLUE").addFields(
				{
					name: "Queue",
					value: `There ${queue.queueSize() != 1 ? "are" : "is"} ${queue.queueSize()} ${
						queue.queueSize() != 1 ? "players" : "player"
					} in the queue.\n\n**Current Games**
${await games.generateCurrentGamesString()}`,
					inline: true
				},
				{ name: "_ _", value: "_ _", inline: true },
				{ name: "Recent Games", value: games.generateRecentGames(), inline: true }
			)
		],
		components: [
			new MessageActionRow().addComponents(
				queue_join.data.setDisabled(locked),
				queue_leave.data.setDisabled(locked)
			)
		]
	}
}

export async function updateMessage(client: Discord.Client) {
	let channel = await client.channels.fetch(config.queueChannelID)
	if (!channel) throw new Error("Queue Channel not found")
	if (!(channel instanceof Discord.TextChannel)) {
		throw new Error("Queue Channel not found")
	}
	let message = await channel.messages.fetch(config.queueMessageID)
	if (!message) throw new Error("Queue Message not found")

	await message.edit(await generateMessage())
	return
}
