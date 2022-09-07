import * as queue from "./queue"
import * as games from "./game"
import Discord, { MessageActionRow } from "discord.js"
import queue_join from "../buttons/queue_join"
import queue_leave from "../buttons/queue_leave"
import config from "../config"

export async function generateMessage(): Promise<Discord.MessageEditOptions> {
	return {
		embeds: [
			new Discord.MessageEmbed()
				.setTitle("Queue")
				.setColor("BLUE")
				.setDescription(
					`There ${queue.queueSize() != 1 ? "are" : "is"} ${queue.queueSize()} ${
						queue.queueSize() != 1 ? "players" : "player"
					} in the queue.

__**Current Games**__
${await games.generateCurrentGamesString()}

__**Recent Games**__
${games.recentGames.length == 0 ? "None" : ""}`
				)
				.addFields(games.generateRecentGames())
		],
		components: [new MessageActionRow().addComponents(queue_join.data, queue_leave.data)]
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
