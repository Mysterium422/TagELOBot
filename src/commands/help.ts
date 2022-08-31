import { CommandParameters } from "../CommandParameters"
import Discord from "discord.js"
import config from "../config"

export default {
	run: async ({ message }: CommandParameters) => {
		if (
			message.channel.id != config.mainChannelID &&
			message.channel.id != config.queueChannelID
		) {
			return
		}

		let prefix = config.prefix

		return message.channel.send({
			embeds: [
				new Discord.MessageEmbed()
					.setColor("BLUE")
					.setTitle("**Help Menu (ELO Bot)**")
					.setDescription(
						`**${prefix}join** or **${prefix}j** - Join the ranked queue!
**${prefix}leave** or **${prefix}l** - Leave the queue.
**${prefix}queue** or **${prefix}q** - See how many players are in the queue.
**${prefix}abort** - Abort a started game. Both players must accept.
**${prefix}forfeit** or **${prefix}ilost** - Use when you lose the match. Both players must accept.
**${prefix}duel** - Duel any player. They must accept.
**${prefix}scan @ping** - Request a scan for a suspicious player.
**${prefix}myopponentisafk** - Run an afk check on your opponent. If they don't respond, you get the win.

**${prefix}set** - Set your deviation. This determines what range of opponents you can queue.
E.G. A 1500 rating with a 200 deviation can queue opponents from 1300 - 1700.
This must be between 50-200.
**${prefix}update** - Update your ign.

**${prefix}stats** - See your own stats!
**${prefix}lb** - See the top rated and your own position on the lb!
**${prefix}lb total** - See the most active players and your total games position!`
					)
					.setTimestamp()
					.setFooter({ text: "Tag ELO Bot created by Mysterium_" })
			]
		})
	}
}
