const Discord = require("discord.js"),
	client = new Discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] })

const fs = require("fs")
const db = require("quick.db")
const { pConversion } = require("./conversion.js")
const { hypixelFetch, mojangUUIDFetch } = require("../global/mystFetch")
const { replaceError, timeConverter } = require("../global/globalUtils")
const mongoose = require("mongoose")
const mongoUtils = require("./mongoose")
const DiscButton = require("discord-buttons")
DiscButton(client)

const config = require("./config.json")

const prefix = "="
const k = 30

const embedColors = {
	green: "#3bcc71",
	red: "#e74c3c",
	blue: "#3498db",
	black: "#000000"
}

mongoose
	.connect(config.mongoConnectionMain, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		userFindAndModify: false
	})
	.then(() => {
		console.log("Connected to Mongo")
	})
	.catch((err) => {
		console.log(err)
	})

function getOpponent(ID) {
	if (ID in tagEloGames) {
		return tagEloGames[ID]
	} else {
		return tagEloDuels[ID]
	}
}

function addAudit(text) {
	let auditLog = fs.readFileSync("audit.txt")
	// 17 Aug 2015 14:05:30 >>
	auditLog = `${auditLog}\n${timeConverter(Date.now())} >> ${text}`
	fs.writeFileSync("audit.txt", auditLog)
}

async function executeGame(winnerID, loserID) {
	let winner = (await mongoUtils.findOne({ userID: winnerID })).toJSON()
	let loser = (await mongoUtils.findOne({ userID: loserID })).toJSON()

	let winnerRating = winner.elo
	let loserRating = loser.elo

	let expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 800))

	let winnerRatingChange = Math.round(k * (1 - expectedWinner) * 100) / 100

	let winnerNewRating = Math.max(winnerRating + winnerRatingChange, 0)
	let loserNewRating = Math.max(loserRating - winnerRatingChange, 0)
	let time = Date.now()

	let winnerRecord = {
		reason: "game",
		opponent: loserID,
		elo: winnerNewRating - winnerRating,
		time: time
	}
	let loserRecord = {
		reason: "game",
		opponent: winnerID,
		elo: loserNewRating - loserRating,
		time: time
	}

	winner.elo = winnerNewRating
	winner.wins = winner.wins + 1
	winner.records.push(winnerRecord)

	loser.elo = loserNewRating
	loser.losses = loser.losses + 1
	loser.records.push(loserRecord)

	await mongoUtils.findOneAndReplace({ userID: winnerID }, winner)
	await mongoUtils.findOneAndReplace({ userID: loserID }, loser)

	delete tagEloGames[winnerID]
	delete tagEloGames[loserID]
	delete tagEloHosts[winnerID]
	delete tagEloHosts[loserID]

	return `**Game Results**
Winner: <@!${winnerID}> (${Math.round(winnerRating)} --> ${Math.round(winnerNewRating)})
Loser: <@!${loserID}> (${Math.round(loserRating)} --> ${Math.round(loserNewRating)})`
}

async function executeDuel(winnerID, loserID) {
	let winner = (await mongoUtils.findOne({ userID: winnerID })).toJSON()
	let loser = (await mongoUtils.findOne({ userID: loserID })).toJSON()

	let winnerRating = winner.elo
	let loserRating = loser.elo

	let expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 800))

	let winnerRatingChange = Math.round((k / 3) * (1 - expectedWinner) * 100) / 100

	let winnerNewRating = Math.max(winnerRating + winnerRatingChange, 0)
	let loserNewRating = Math.max(loserRating - winnerRatingChange, 0)
	let time = Date.now()

	let winnerRecord = {
		reason: "duel",
		opponent: loserID,
		elo: winnerNewRating - winnerRating,
		time: time
	}
	let loserRecord = {
		reason: "duel",
		opponent: winnerID,
		elo: loserNewRating - loserRating,
		time: time
	}

	winner.elo = winnerNewRating
	winner.wins = winner.wins + 1
	winner.records.push(winnerRecord)

	loser.elo = loserNewRating
	loser.losses = loser.losses + 1
	loser.records.push(loserRecord)

	await mongoUtils.findOneAndReplace({ userID: winnerID }, winner)
	await mongoUtils.findOneAndReplace({ userID: loserID }, loser)

	delete tagEloDuels[winnerID]
	delete tagEloDuels[loserID]
	delete tagEloHosts[winnerID]
	delete tagEloHosts[loserID]

	return `**Game Results**
Winner: <@!${winnerID}> (${Math.round(winnerRating)} --> ${Math.round(winnerNewRating)})
Loser: <@!${loserID}> (${Math.round(loserRating)} --> ${Math.round(loserNewRating)})`
}

async function simulateDM(m, messageToSend) {
	let guild = await client.guilds.cache.get("724581180413968385")
	// console.log(guild)
	let role = await guild.roles.cache.get("844569493568487444")
	// console.log(role)
	// console.log(m)
	await m.member.roles.add(role)

	channel = await client.channels.cache.get("844566582218457118")
	let msg = await channel.send(`<@!${m.author.id}>`, messageToSend)
	msg.react("✅")
	const filter = (reaction, user) =>
		user.id === m.author.id && reaction.emoji.name == "✅"
	const collector = msg.createReactionCollector(filter, { time: 30 * 1000 })

	collector.on("collect", async (reaction, user) => {
		collector.stop()
	})
	collector.on("end", () => {
		msg.delete()
		m.member.roles.remove(role)
	})
}

client.on("ready", async () => {
	console.log("Bot: Tag ELO Bot is online!")

	// console.log(await mongoUtils.find())

	// let profile = await mongoUtils.create({
	//     userID: "573340518130384896",
	//     elo: 1020,
	//     username: "Mysterium_",
	//     uuid: "1435d17ae14d4af684e727dce87a8d17",
	//     wins: 0,
	//     losses: 1,
	//     records: [{
	//         reason: "game",
	//         opponent: "210050134728245249",
	//         rating: -20,
	//         time: 1623853196000
	//     }],
	//     deviation: 100
	// })
	// await profile.save()

	// let profile2 = await mongoUtils.create({
	//     userID: "210050134728245249",
	//     elo: 909.8,
	//     username: "Jonful",
	//     uuid: "556cd0decd2949629f1c8b80234e4212",
	//     wins: 1,
	//     losses: 1,
	//     records: [{
	//         reason: "game",
	//         opponent: "573340518130384896",
	//         rating: 20,
	//         time: 1623853196000
	//     },
	//     {
	//         reason: "duel",
	//         opponent: "265431766012133377",
	//         rating: -10.2,
	//         time: 1623853296000
	//     },
	//     {
	//         reason: "admin",
	//         rating: -100,
	//         time: 1623853396000
	//     }],
	//     deviation: 100
	// })
	// await profile2.save()

	// let profile3 = await mongoUtils.create({
	//     userID: "265431766012133377",
	//     elo: 1010.2,
	//     username: "Elkk",
	//     uuid: "5b05d1e776f44eb0a7599e4d3131fe85",
	//     wins: 1,
	//     losses: 0,
	//     records: [{
	//         reason: "duel",
	//         opponent: "210050134728245249",
	//         rating: 10.2,
	//         time: 1623853296000
	//     }],
	//     deviation: 100
	// })
	// await profile3.save()

	// await db.set('data', {})
	// await db.set('settings', {})
	// fs.writeFileSync('audit.txt', `${timeConverter(Date.now())} >> Reset Audit Log`)
	// await db.set('nameData', {})
	// await db.set('uuidData', {})
	// await db.set(`matches`, 0)

	// console.log(await db.get('data'))

	addAudit("Bot Starting")
})

let tagEloQueues = {}
let tagEloGames = {}
let tagEloDuels = {}
let tagEloHosts = {}
let locked = false

// let scanRequests = []

/**
{
    authorID: [rating, deviation, Unix]
}
 */

client.on("message", async (m) => {
	if (m.author.bot) return

	if (!m.content.startsWith(prefix)) return

	var args = m.content.slice(prefix.length).split(" ")
	const command = args.shift().toLowerCase()

	// if (m.channel.id !== config.mainChannelID) return;

	if (command == "end") {
		if (!m.member.roles.cache.has(config.staffRoleID)) return
		if (!m.channel.name.startsWith("scan-request")) return

		let msg = await m.channel.send(
			"<a:Loading:851630056014741534> Updating Channel. This might take a while."
		)
		// await m.channel.setName(`sup${m.channel.name.slice(3)}`)
		let userIDS = Array.from(m.channel.permissionOverwrites.keys()).filter((a) => {
			let roleArray = ["724581180413968385", "844040275784892416", "844040089310068777"]
			return !roleArray.includes(a)
		})
		let ID1 = userIDS[0]
		let ID2 = userIDS[1]
		await m.channel.overwritePermissions([
			{
				id: "724581180413968385",
				deny: ["VIEW_CHANNEL"]
			}
		])

		let role1 = await m.guild.roles.cache.get(config.rankedRoleID)
		let role2 = await m.guild.roles.cache.get("844938912245612576")
		let member1 = await m.guild.members.cache.get(ID1)
		let member2 = await m.guild.members.cache.get(ID2)

		member1.roles.add(role1)
		member1.roles.remove(role2)
		member2.roles.add(role1)
		member2.roles.remove(role2)

		msg.delete()
	}

	if (
		m.channel.id != config.mainChannelID &&
		m.channel.id != config.queueChannelID &&
		m.channel.id != config.commandsChannelID &&
		m.channel.id != config.registerChannelID
	)
		return

	if (command == "register") {
		if (m.channel.id !== config.registerChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.registerChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.registerChannelID}>`)
					)
				)
		}

		addAudit(`${m.author.id} tried to register with IGN: ${args[0]}`)
		if (m.author.id in (await db.get(`data`)))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("You are already registered")
			)
		if (args.length != 1)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Please specify an ign")
			)

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

		if (data == "API ERROR") {
			return m.channel.send("API Connection Issues, Hypixel might be offline")
		}
		if (
			!data.success ||
			data.success == false ||
			data.player == null ||
			data.player == undefined ||
			!data.player ||
			data.player.stats == undefined
		) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.red)
					.setDescription("Could not find IGN")
			)
		}

		message = await m.channel.send({
			component: new DiscButton.MessageActionRow().addComponents([
				new DiscButton.MessageButton()
					.setLabel("Accept")
					.setStyle("green")
					.setID(
						`register-acc-${m.author.id}-${data.player.displayname}-${data.player.uuid}`
					),
				new DiscButton.MessageButton()
					.setLabel("Reject")
					.setStyle("red")
					.setID(`register-rej-${m.author.id}`)
			]),
			embed: new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setTitle(`Verification Request`)
				.setDescription(
					`From <@!${m.author.id}>
            
            **Username:** ${data.player.displayname}
            **UUID:** ${data.player.uuid}
            **Tag Wins:** ${replaceError(
							replaceError(data.player.stats.TNTGames, {}).wins_tntag,
							0
						)}
            **Network Level:** ${Math.floor(
							Math.sqrt(2 * replaceError(data.player.networkExp, 0) + 30625) / 50 - 2.5
						)}
            **Discord:** ${replaceError(
							replaceError(replaceError(data.player.socialMedia, {}).links, {}).DISCORD,
							"Not Set"
						)}
            **First Login:** ${timeConverter(data.player.firstLogin)}`
				)
				.setFooter("Please wait for a Ranked Staff member to verify you")
		})
	}

	if (m.channel.id == config.registerChannelID) return

	if (command == "join" || command == "j") {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}
		addAudit(`${m.author.id} tried to join`)
		if (locked) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("The queue has been locked and games can no longer start")
			)
		}
		setTimeout(async function () {
			m.delete()
		}, 200)
		if (m.author.id in tagEloQueues)
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
	} else if (command == "queue" || command == "q") {
		setTimeout(async function () {
			m.delete()
		}, 200)
		if (m.channel.id !== config.queueChannelID) {
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}
		m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription(
					`There ${Object.keys(tagEloQueues).length != 1 ? "are" : "is"} ${
						Object.keys(tagEloQueues).length
					} ${Object.keys(tagEloQueues).length != 1 ? "players" : "player"} in the queue`
				)
		)
	} else if (command == "help") {
		if (
			m.channel.id == config.commandsChannelID ||
			m.channel.id == config.registerChannelID
		)
			return

		if (m.channel.id !== config.queueChannelID && m.channel.id !== config.mainChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.mainChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					)
				)
		}

		await m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
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
				.setFooter("Tag ELO Bot created by Mysterium_")
		)
	} else if (command == "host") {
		if (
			m.channel.id == config.commandsChannelID ||
			m.channel.id == config.registerChannelID
		)
			return

		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}

		if (m.member.roles.cache.has("761106172186067015"))
			return m.channel.send("You are not authorized to use this")

		if (!(m.author.id in tagEloHosts)) {
			if (m.author.id in tagEloGames || m.author.id in tagEloDuels) {
				return m.channel.send("You have already used this command for this game")
			}
			return m.channel.send("You need to be in a game to use this command")
		}
		delete tagEloHosts[m.author.id]
		delete tagEloHosts[getOpponent(m.author.id)]
		let msg = await m.channel.send("Host Needed! <@&845322158493138975>")
		await msg.react("✋")
		const filter = async (reaction, user) => reaction.emoji.name == "✋"
		const collector = msg.createReactionCollector(filter, { time: 600 * 1000 })
		collector.on("collect", async (reaction, user) => {
			let member = await reaction.message.guild.members.cache.get(user.id)
			if (!member.roles.cache.has("845322158493138975")) return
			if (user.bot) return
			m.channel.send(`<@!${m.author.id}> <@!${user.id}> can host!`)
			if (!db.has(`hostData.${user.id}`)) {
				db.set(`hostData.${user.id}`, 1)
			} else {
				db.add(`hostData.${user.id}`, 1)
			}
			msg.delete()
			collector.stop("reaction")
		})

		collector.on("end", (collection, reason) => {
			if (reason == "reaction") return
			msg.reactions.removeAll()
			msg.edit("Host Request Timed Out")
		})
	} else if (command == "leave" || command == "l") {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}
		addAudit(`${m.author.id} tried to leave a game`)
		setTimeout(async function () {
			m.delete()
		}, 200)
		if (m.author.id in tagEloGames)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription(
						`You are in a game against <@!${
							tagEloGames[m.author.id]
						}>. If you can't make it you must either forfeit (do ${prefix}forfeit <@!${
							tagEloGames[m.author.id]
						}>) or abort (do ${prefix}abort)`
					)
			)
		if (m.author.id in tagEloDuels)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription(
						`You are in a game against <@!${
							tagEloDuels[m.author.id]
						}>. If you can't make it you must either forfeit (do ${prefix}forfeit <@!${
							tagEloDuels[m.author.id]
						}>) or abort (do ${prefix}abort)`
					)
			)

		if (!(m.author.id in tagEloQueues))
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("You are not in a queue")
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription("You are not in a queue")
					)
				)

		delete tagEloQueues[m.author.id]
		m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription(
					`There ${Object.keys(tagEloQueues).length != 1 ? "are" : "is"} ${
						Object.keys(tagEloQueues).length
					} ${Object.keys(tagEloQueues).length != 1 ? "players" : "player"} in the queue`
				)
		)
		m.author
			.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.red)
					.setDescription("Removed you from the queue")
			)
			.catch((err) =>
				simulateDM(
					m,
					new Discord.MessageEmbed()
						.setColor(embedColors.red)
						.setDescription("Removed you from the queue")
				)
			)
		addAudit(`${m.author.id} left a game`)
	} else if (command == "abort") {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}
		if (!(m.author.id in tagEloGames) && !(m.author.id in tagEloDuels))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("You are not in a game")
			)
		const msg = await m.channel.send(
			`<@!${m.author.id}> <@!${getOpponent(m.author.id)}>`,
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription(`React with a :thumbsup: if you consent to aborting the game`)
		)
		addAudit(`${m.author.id} tried to abort a game with ${getOpponent(m.author.id)}`)

		msg.react("👍").then(msg.react("👎"))

		const filter = (reaction, user) => user.id === getOpponent(m.author.id)
		const collector = msg.createReactionCollector(filter, { time: 60 * 1000 })

		let eSignatures = {}
		eSignatures[m.author.id] = false
		eSignatures[getOpponent(m.author.id)] = false

		collector.on("collect", async (reaction, user) => {
			if (reaction.emoji.name == "👍") {
				return collector.stop("success")
			} else if (reaction.emoji.name == "👎") {
				return collector.stop("failure")
			}
		})

		collector.on("end", (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "success") {
				if (m.author.id != getOpponent(getOpponent(m.author.id))) {
					return msg.edit({
						embed: new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription("An internal error has occured. Game not found.")
					})
				}
				addAudit(`${m.author.id} aborted a game with ${getOpponent(m.author.id)}`)
				delete tagEloGames[tagEloGames[m.author.id]]
				delete tagEloGames[m.author.id]
				delete tagEloDuels[tagEloDuels[m.author.id]]
				delete tagEloDuels[m.author.id]
				delete tagEloHosts[getOpponent(m.author.id)]
				delete tagEloHosts[m.author.id]
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.red)
						.setDescription("Game Aborted")
				})
			} else if (reason == "failure") {
				addAudit(
					`${m.author.id} failed to aborted a game with ${getOpponent(m.author.id)}`
				)
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("Game abortion rejected. You may have to =resign")
				})
			}
			addAudit(`${m.author.id} failed to aborted a game with ${getOpponent(m.author.id)}`)
			return msg.edit({
				embed: new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Game abortion request timed out")
			})
		})
	} else if (
		command == "resign" ||
		command == "forfeit" ||
		command == "ilost" ||
		command == "ilose"
	) {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}
		if (!(m.author.id in tagEloGames) && !(m.author.id in tagEloDuels))
			return m.channel.send("You are not in a game")

		const msg = await m.channel.send(
			`<@!${getOpponent(m.author.id)}> <@!${m.author.id}>`,
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription(
					`React with a :thumbsup: if you consent that <@!${getOpponent(
						m.author.id
					)}> beat <@!${m.author.id}>`
				)
		)

		addAudit(`${m.author.id} lost to ${getOpponent(m.author.id)}`)
		let opponentID = getOpponent(m.author.id)

		const filter = (reaction, user) => user.id === opponentID
		const collector = msg.createReactionCollector(filter, { time: 60 * 1000 })

		msg.react("👍").then(msg.react("👎"))

		collector.on("collect", async (reaction, user) => {
			if (reaction.emoji.name == "👍") {
				collector.stop("success")
			} else if (reaction.emoji.name == "👎") {
				collector.stop("failure")
			}
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "success") {
				console.log("1")
				if (!(m.author.id in tagEloGames) && !(m.author.id in tagEloDuels))
					return msg.edit({
						embed: new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(
								"Internal Error: Game End Failed! If this is an issue contact Mysterium"
							)
					})
				let string
				if (m.author.id in tagEloGames) {
					string = await executeGame(getOpponent(m.author.id), m.author.id)
				} else {
					string = await executeDuel(getOpponent(m.author.id), m.author.id)
				}
				console.log("2")
				addAudit(`${m.author.id} ${getOpponent(m.author.id)} Game Over!`)
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.blue)
						.setDescription(string)
				})
			} else if (reason == "failure") {
				console.log("3")
				addAudit(`${m.author.id} ${getOpponent(m.author.id)} Game end failed`)
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("Your opponent denied the win")
				})
			} else {
				addAudit(`${m.author.id} ${getOpponent(m.author.id)} Game end failed`)
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("Request timed out")
				})
			}
		})
	} else if (command == "stats") {
		if (
			m.channel.id !== config.mainChannelID &&
			m.channel.id !== config.commandsChannelID
		) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.mainChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					)
				)
		}
		let checkingID = m.author.id
		if (m.mentions.members.size > 0) {
			checkingID = m.mentions.members.first().id
		}

		addAudit(`${m.author.id} checked stats for ${checkingID}`)
		if (!(checkingID in (await db.get(`data`)))) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("That player is not verified.")
			)
		}

		let name = await db.get(`data.${checkingID}.name`)
		let mongoData = await mongoUtils.find()
		let player = mongoData.filter((a) => {
			return a.userID == checkingID
		})[0]

		let opponents = 0
		let opponentRatingSum = 0

		for (let i = 0; i < player.records.length; i++) {
			let record = player.records[i]
			if (!(record.reason == "game" || record.reason == "duel")) {
				continue
			}
			let opponentRating = mongoData.filter((a) => {
				return a.userID == record.opponent
			})[0].elo
			if (!opponentRating) continue
			opponentRatingSum += opponentRating
			opponents += 1
		}

		return m.channel.send(
			new Discord.MessageEmbed().setColor(embedColors.blue)
				.setDescription(`**Username:** ${name}
**Rating:** ${Math.round(player.elo)}
**Wins:** ${player.wins}
**Losses:** ${player.losses}
**Total Games:** ${player.wins + player.losses}
**Win Rate:** ${replaceError(
				Math.round((player.wins / (player.wins + player.losses)) * 1000) / 10,
				100
			)}%
**Avg Opponent:** ${Math.round(opponentRatingSum / opponents)}`)
		)
		// **Estimated Performance:** ${performanceScore}
	} else if (command == "leaderboard" || command == "lb") {
		if (
			m.channel.id !== config.mainChannelID &&
			m.channel.id !== config.commandsChannelID
		) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.mainChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					)
				)
		}
		if (!args[0]) return m.channel.send("https://www.tagfeuds.club/leaderboard")

		if (args[0].toLowerCase() == "host") {
			addAudit(`${m.author.id} checked host leaderboards`)
			let data = Object.entries(await db.get("hostData")).filter((a) => {
				return a[1] > 0
			})
			if (
				!data.some((a) => {
					return a[0] == m.author.id
				})
			)
				data.push([m.author.id, 0])
			if (data.length < 10)
				return m.channel.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`Not enough leaderboard entries (${data.length})!`)
				)
			data = data.sort((a, b) => {
				return b[1] - a[1]
			})

			let position = null
			for (let i = 0; i < data.length; i++) {
				if (data[i][0] == m.author.id) {
					position = i + 1
					break
				}
			}

			let string = `${position == 1 ? "**" : ""}#1 <@!${data[0][0]}> - ${data[0][1]}${
				position == 1 ? "**" : ""
			}
${position == 2 ? "**" : ""}#2 <@!${data[1][0]}> - ${data[1][1]}${
				position == 2 ? "**" : ""
			}
${position == 3 ? "**" : ""}#3 <@!${data[2][0]}> - ${data[2][1]}${
				position == 3 ? "**" : ""
			}
${position == 4 ? "**" : ""}#4 <@!${data[3][0]}> - ${data[3][1]}${
				position == 4 ? "**" : ""
			}
${position == 5 ? "**" : ""}#5 <@!${data[4][0]}> - ${data[4][1]}${
				position == 5 ? "**" : ""
			}
${position == 6 ? "**" : ""}#6 <@!${data[5][0]}> - ${data[5][1]}${
				position == 6 ? "**" : ""
			}
${position == 7 ? "**" : ""}#7 <@!${data[6][0]}> - ${data[6][1]}${
				position == 7 ? "**" : ""
			}
${position == 8 ? "**" : ""}#8 <@!${data[7][0]}> - ${data[7][1]}${
				position == 8 ? "**" : ""
			}
${position == 9 ? "**" : ""}#9 <@!${data[8][0]}> - ${data[8][1]}${
				position == 9 ? "**" : ""
			}
${position == 10 ? "**" : ""}#10 <@!${data[9][0]}> - ${data[9][1]}${
				position == 10 ? "**" : ""
			}`

			if (position > 10) {
				string = `${string}\n. . .\n**#${position} <@!${data[position - 1][0]}> - ${
					data[position - 1][1]
				}**`
			}

			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.blue)
					.setTitle("**Hosting Leaderboard**")
					.setDescription(string)
			)
		}
		return m.channel.send("https://www.tagfeuds.club/leaderboard")
		if (args.length == 0 || args[0].toLowerCase() == "elo") {
			addAudit(`${m.author.id} checked elo leaderboards`)
			let data = Object.entries(await db.get(`data`)).filter((a) => {
				return a[1].performance.wins + a[1].performance.losses >= 1
			})
			if (data.length < 10)
				return m.channel.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`Not enough leaderboard entries (${data.length})!`)
				)
			data = data.sort((a, b) => {
				return b[1].rating - a[1].rating
			})

			let position = null
			if (m.author.id in (await db.get(`data`))) {
				for (let i = 0; i < data.length; i++) {
					if (data[i][0] == m.author.id) {
						position = i + 1
						break
					}
				}
			}

			let string = `${position == 1 ? "**" : ""}#1 <@!${data[0][0]}> ${await db.get(
				`nameData.${data[0][0]}`
			)} - ${Math.round(data[0][1].rating)}${position == 1 ? "**" : ""}
${position == 2 ? "**" : ""}#2 <@!${data[1][0]}> ${await db.get(
				`nameData.${data[1][0]}`
			)} - ${Math.round(data[1][1].rating)}${position == 2 ? "**" : ""}
${position == 3 ? "**" : ""}#3 <@!${data[2][0]}> ${await db.get(
				`nameData.${data[2][0]}`
			)} - ${Math.round(data[2][1].rating)}${position == 3 ? "**" : ""}
${position == 4 ? "**" : ""}#4 <@!${data[3][0]}> ${await db.get(
				`nameData.${data[3][0]}`
			)} - ${Math.round(data[3][1].rating)}${position == 4 ? "**" : ""}
${position == 5 ? "**" : ""}#5 <@!${data[4][0]}> ${await db.get(
				`nameData.${data[4][0]}`
			)} - ${Math.round(data[4][1].rating)}${position == 5 ? "**" : ""}
${position == 6 ? "**" : ""}#6 <@!${data[5][0]}> ${await db.get(
				`nameData.${data[5][0]}`
			)} - ${Math.round(data[5][1].rating)}${position == 6 ? "**" : ""}
${position == 7 ? "**" : ""}#7 <@!${data[6][0]}> ${await db.get(
				`nameData.${data[6][0]}`
			)} - ${Math.round(data[6][1].rating)}${position == 7 ? "**" : ""}
${position == 8 ? "**" : ""}#8 <@!${data[7][0]}> ${await db.get(
				`nameData.${data[7][0]}`
			)} - ${Math.round(data[7][1].rating)}${position == 8 ? "**" : ""}
${position == 9 ? "**" : ""}#9 <@!${data[8][0]}> ${await db.get(
				`nameData.${data[8][0]}`
			)} - ${Math.round(data[8][1].rating)}${position == 9 ? "**" : ""}
${position == 10 ? "**" : ""}#10 <@!${data[9][0]}> ${await db.get(
				`nameData.${data[9][0]}`
			)} - ${Math.round(data[9][1].rating)}${position == 10 ? "**" : ""}`

			if (position > 10) {
				string = `${string}\n. . .\n**#${position} <@!${
					data[position - 1][0]
				}> - ${Math.round(data[position - 1][1].rating)}**`
			}

			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.blue)
					.setTitle("**ELO Leaderboard**")
					.setDescription(string)
			)
		} else if (args[0].toLowerCase() == "total") {
			addAudit(`${m.author.id} checked total leaderboards`)
			let data = Object.entries(await db.get(`data`))
			if (data.length < 10)
				return m.channel.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`Not enough leaderboard entries (${data.length})!`)
				)
			data = data.sort((a, b) => {
				return (
					b[1].performance.wins +
					b[1].performance.losses -
					a[1].performance.wins -
					a[1].performance.losses
				)
			})

			let position = null
			if (m.author.id in (await db.get(`data`))) {
				for (let i = 0; i < data.length; i++) {
					if (data[i][0] == m.author.id) {
						position = i + 1
						break
					}
				}
			}

			// console.log(data[0][1])

			let string = `${position == 1 ? "**" : ""}#1 <@!${data[0][0]}> ${await db.get(
				`nameData.${data[0][0]}`
			)} - ${data[0][1].performance.wins + data[0][1].performance.losses}${
				position == 1 ? "**" : ""
			}
${position == 2 ? "**" : ""}#2 <@!${data[1][0]}> ${await db.get(
				`nameData.${data[1][0]}`
			)} - ${data[1][1].performance.wins + data[1][1].performance.losses}${
				position == 2 ? "**" : ""
			}
${position == 3 ? "**" : ""}#3 <@!${data[2][0]}> ${await db.get(
				`nameData.${data[2][0]}`
			)} - ${data[2][1].performance.wins + data[2][1].performance.losses}${
				position == 3 ? "**" : ""
			}
${position == 4 ? "**" : ""}#4 <@!${data[3][0]}> ${await db.get(
				`nameData.${data[3][0]}`
			)} - ${data[3][1].performance.wins + data[3][1].performance.losses}${
				position == 4 ? "**" : ""
			}
${position == 5 ? "**" : ""}#5 <@!${data[4][0]}> ${await db.get(
				`nameData.${data[4][0]}`
			)} - ${data[4][1].performance.wins + data[4][1].performance.losses}${
				position == 5 ? "**" : ""
			}
${position == 6 ? "**" : ""}#6 <@!${data[5][0]}> ${await db.get(
				`nameData.${data[5][0]}`
			)} - ${data[5][1].performance.wins + data[5][1].performance.losses}${
				position == 6 ? "**" : ""
			}
${position == 7 ? "**" : ""}#7 <@!${data[6][0]}> ${await db.get(
				`nameData.${data[6][0]}`
			)} - ${data[6][1].performance.wins + data[6][1].performance.losses}${
				position == 7 ? "**" : ""
			}
${position == 8 ? "**" : ""}#8 <@!${data[7][0]}> ${await db.get(
				`nameData.${data[7][0]}`
			)} - ${data[7][1].performance.wins + data[7][1].performance.losses}${
				position == 8 ? "**" : ""
			}
${position == 9 ? "**" : ""}#9 <@!${data[8][0]}> ${await db.get(
				`nameData.${data[8][0]}`
			)} - ${data[8][1].performance.wins + data[8][1].performance.losses}${
				position == 9 ? "**" : ""
			}
${position == 10 ? "**" : ""}#10 <@!${data[9][0]}> ${await db.get(
				`nameData.${data[9][0]}`
			)} - ${data[9][1].performance.wins + data[9][1].performance.losses}${
				position == 10 ? "**" : ""
			}`

			if (position > 10) {
				string = `${string}\n. . .\n**#${position} <@!${data[position - 1][0]}> - ${
					data[position - 1][1].performance.wins +
					data[position - 1][1].performance.losses
				}**`
			}

			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.blue)
					.setTitle("**Games Played Leaderboard**")
					.setDescription(string)
			)
		} else {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Not Recognized! do =lb or =lb total")
			)
		}
	} else if (command == "duel") {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}

		if (locked) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("The queue has been locked and games can no longer start")
			)
		}

		if (!(m.author.id in (await db.get(`data`)))) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("You must be verified first. =register to be verified")
			)
		}
		if (m.author.id in tagEloGames)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription(
						`You are in a game against <@!${getOpponent(
							m.author.id
						)}>. If you can't make it you must either forfeit (do ${prefix}forfeit <@!${getOpponent(
							m.author.id
						)}>) or abort (do ${prefix}abort)`
					)
			)
		if (m.author.id in tagEloDuels)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription(
						`You are in a game against <@!${getOpponent(
							m.author.id
						)}>. If you can't make it you must either forfeit (do ${prefix}forfeit <@!${getOpponent(
							m.author.id
						)}>) or abort (do ${prefix}abort)`
					)
			)
		if (m.author.id in tagEloQueues)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("You are in the queue. Leave it to duel")
			)
		let pingedMemberID
		if (m.mentions.members.size == 0) {
			// if (args[0] in await db.get(`data`)) {
			//     pingedMemberID = await db.get(`nameData.${args[0]}`)
			// }
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Ping the player you are trying to duel")
			)
		}
		pingedMemberID = m.mentions.members.first().id
		addAudit(`${m.author.id} tried to duel ${pingedMemberID}`)
		if (!(pingedMemberID in (await db.get(`data`)))) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("That player isn't verified!")
			)
		}
		if (pingedMemberID == m.author.id) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("You cannot duel yourself")
			)
		}
		if (pingedMemberID in tagEloGames)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("That player is already in a game")
			)
		if (pingedMemberID in tagEloDuels)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("That player is already in a game")
			)
		if (pingedMemberID in tagEloQueues)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("That player is in the queue. They must leave it to duel")
			)

		// let opponents = await db.get(`data.${m.author.id}.performance.opponents`)
		// if (opponents.length > 0) {
		//     if (pingedMemberID == opponents[opponents.length - 1]) {
		//         return m.channel.send(new Discord.MessageEmbed()
		//         .setColor(embedColors.black)
		//         .setDescription("You cannot duel the same person twice in a row"))
		//     }
		// }

		let challenger = (await mongoUtils.findOne({ userID: m.author.id })).toJSON()

		const msg = await m.channel.send(
			`<@!${pingedMemberID}>`,
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription(
					`React with a :thumbsup: if you would like to duel <@!${
						m.author.id
					}> (Rated ${Math.round(challenger.elo)})`
				)
		)

		const filter = (reaction, user) => user.id === pingedMemberID
		const collector = msg.createReactionCollector(filter, { time: 60 * 1000 })

		msg.react("👍").then(msg.react("👎"))

		collector.on("collect", async (reaction, user) => {
			if (reaction.emoji.name == "👍") {
				collector.stop("success")
			} else if (reaction.emoji.name == "👎") {
				collector.stop("failure")
			}
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "success") {
				if (
					m.author.id in tagEloGames ||
					pingedMemberID in tagEloGames ||
					m.author.id in tagEloQueues ||
					pingedMemberID in tagEloQueues ||
					m.author.id in tagEloDuels ||
					pingedMemberID in tagEloDuels
				) {
					addAudit(`${m.author.id} ${pingedMemberID} Game Start Failed`)
					return msg.edit({
						embed: new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription("Internal Error: Duel Request failed")
					})
				}

				tagEloDuels[m.author.id] = pingedMemberID
				tagEloDuels[pingedMemberID] = m.author.id
				tagEloHosts[m.author.id] = pingedMemberID
				tagEloHosts[pingedMemberID] = m.author.id

				addAudit(`${m.author.id} ${pingedMemberID} Game Start`)
				await db.set(`matches`, (await db.get(`matches`)) + 1)

				let player1 = (await mongoUtils.findOne({ userID: m.author.id })).toJSON()
				let player2 = (await mongoUtils.findOne({ userID: pingedMemberID })).toJSON()

				return msg.edit({
					embed: new Discord.MessageEmbed().setColor(embedColors.blue)
						.setDescription(`Game ${await db.get(`matches`)} Starting:
<@!${m.author.id}> ${await db.get(`data.${m.author.id}.name`)} (${Math.round(
						player1.elo
					)}) vs <@!${pingedMemberID}> ${await db.get(
						`data.${pingedMemberID}.name`
					)} (${Math.round(player2.elo)})`)
				})
				//
			} else if (reason == "failure") {
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.red)
						.setDescription("Duel request denied")
				})
			}

			return msg.edit({
				embed: new Discord.MessageEmbed()
					.setColor(embedColors.red)
					.setDescription("Duel request timed out")
			})
		})
	} else if (command == "resetallelo") {
		if (!m.member.hasPermission("ADMINISTRATOR")) return
		db.set("data", {})
		db.set("hostData", {})
		db.set("matches", 0)
		tagEloDuels = {}
		tagEloGames = {}
		tagEloQueues = {}
		tagEloHosts = {}
		m.channel.send("Reset All Stuff exceot mongo")
	} else if (command == "debug") {
		if (m.author.id != "573340518130384896") return

		setTimeout(async function () {
			m.delete()
		}, 200)

		console.log(tagEloGames)
		console.log(tagEloDuels)
		console.log(tagEloQueues)
		console.log(tagEloHosts)
	} else if (command == "set") {
		if (m.channel.id !== config.mainChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.mainChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					)
				)
		}
		if (!(m.author.id in (await db.get(`data`))))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription(
						"You must be verified first. Contact a Staff member for support"
					)
			)

		if (m.author.id in tagEloQueues) {
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("You must leave the queue to use the set command")
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`You must leave the queue to use the set command`)
					)
				)
		}

		if (!isFinite(args[0])) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Specify a valid number")
			)
		}

		if (args[0] < 50 || args[0] > 200) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Must be between 50 and 200. Default: 100")
			)
		}

		let user = (await mongoUtils.findOne({ userID: m.author.id })).toJSON()
		user.deviation = Math.round(eval(args[0]))
		// console.log(Math.round(eval(args[0])))
		// console.log(user)
		// const keys = Object.keys(user);
		// const len = keys.length;
		// for (let i = 0; i < len; ++i) {
		//     if (keys[i].startsWith('$')) {
		//         console.log(keys[i])
		//         console.log(keys)
		//     }
		// }
		// return
		await mongoUtils.findOneAndReplace({ userID: m.author.id }, user)

		addAudit(`${m.author.id} set their deviation to ${Math.round(eval(args[0]))}`)

		return m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.green)
				.setDescription(`Your deviation has been set to ${Math.round(eval(args[0]))}`)
		)
	} else if (command == "audit") {
		addAudit(`${m.author.id} checked audit logs`)
		if (m.member.hasPermission("ADMINISTRATOR"))
			return m.author.send({ files: ["./audit.txt"] }).catch((err) => {
				return m.channel.send("Error while sending file (file too large?)")
			})
	} else if (command == "scan") {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}

		if (m.mentions.members.size == 0) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Ping the player you are trying to scan")
			)
		}

		accused = m.mentions.members.first()

		addAudit(`${m.author.id} scanned ${accused.id}`)

		role1 = await m.guild.roles.cache.get(config.rankedRoleID)
		role2 = await m.guild.roles.cache.get("844938912245612576")
		m.member.roles.add(role2)
		m.member.roles.remove(role1)
		accused.roles.add(role2)
		accused.roles.remove(role1)

		channel = await m.guild.channels.create("scan-request", {
			type: "text",
			parent: "844559180081266718",
			permissionOverwrites: [
				{
					id: "724581180413968385",
					deny: ["VIEW_CHANNEL"]
				},
				{
					id: "844040275784892416",
					allow: ["VIEW_CHANNEL"]
				},
				{
					id: "844040089310068777",
					allow: ["VIEW_CHANNEL"]
				},
				{
					id: m.author.id,
					allow: ["VIEW_CHANNEL"]
				},
				{
					id: accused.id,
					allow: ["VIEW_CHANNEL"]
				}
			]
		})

		channel.send(`**<@!${m.author.id}> has requested a scan for <@!${accused.id}>!**
<@!${accused.id}> please do not log off Hypixel. If you do so, you'll receive a **Red Card**.
<@!${m.author.id}> please stay online to ensure <@!${accused.id}> does not log off Hypixel. If they do, send a screenshot of it here.
Neither of you should queue until directed by staff.
If a <@&844040089310068777> hasn't responded within 15 minutes, you may both leave the server and freely queue`)
		setTimeout(async function () {
			m.delete()
		}, 200)
		return
	} else if (command == "blacklist") {
		if (!m.member.hasPermission("ADMINISTRATOR")) return
		if (m.mentions.members.size == 0)
			return m.channel.send("Ping the player you are trying to blacklist")
		let blacklistedID = m.mentions.members.first().id
		addAudit(`${m.author.id} blacklisted ${blacklistedID}`)
		let blacklisted = (await mongoUtils.findOne({ userID: blacklistedID })).toJSON()
		await mongoUtils.findOneAndDelete({ userID: blacklistedID })

		addAudit(`Blacklisted data: ${JSON.stringify(blacklisted)}`)
		db.delete(`data.${blacklistedID}`)
		return m.channel.send(`Blacklisted <@!${blacklistedID}>`)
	} else if (command == "change") {
		if (!m.member.roles.cache.has(config.staffRoleID)) return
		if (m.mentions.members.size == 0)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Ping the player you would like to award elo to")
			)

		let changeID = m.mentions.members.first().id

		if (!(changeID in (await db.get(`data`))))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Player not verified")
			)

		if (!isFinite(args[1])) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Specify a valid number")
			)
		}
		let player = (await mongoUtils.findOne({ userID: changeID })).toJSON()
		player.records.push({
			reason: "admin",
			elo: Math.max(player.elo + eval(args[1]), 0) - player.elo,
			time: Date.now()
		})
		player.elo = Math.max(player.elo + eval(args[1]), 0)
		await mongoUtils.findOneAndReplace({ userID: changeID }, player)
		addAudit(`${m.author.id} changed ${changeID}'s score by ${args[1]} to ${player.elo}`)
		return m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.green)
				.setDescription(`Changed <@!${changeID}>'s rating to ${Math.round(player.elo)}`)
		)
	} else if (command == "resolve") {
		if (!m.member.roles.cache.has(config.staffRoleID)) return
		if (m.mentions.members.size == 0)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Ping the player who should get the *win*")
			)
		pingedID = m.mentions.members.first().id

		if (!(pingedID in tagEloGames) && !(pingedID in tagEloDuels))
			return msg.edit({
				embed: new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Game End Failed! If this is an issue contact Mysterium")
			})

		let string
		if (pingedID in tagEloGames) {
			string = await executeGame(pingedID, getOpponent(pingedID))
		} else {
			string = await executeDuel(pingedID, getOpponent(pingedID))
		}

		addAudit(`${m.author.id} resolved ${pingedID}'s game Game Over!`)
		return m.channel.send(
			new Discord.MessageEmbed().setColor(embedColors.blue).setDescription(string)
		)
	} else if (command == "update") {
		if (m.channel.id !== config.mainChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.mainChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					)
				)
		}
		if (!(m.author.id in (await db.get(`data`))))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("This command is only available if you have registered")
			)

		let newName = await hypixelFetch(
			`player?uuid=${await db.get(`data.${m.author.id}.uuid`)}`
		)
		newName = newName.player.displayname
		await db.set(`data.${m.author.id}.name`, newName)
		return m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.green)
				.setDescription(`Your IGN has been updated to ${newName}`)
		)
	} else if (command == "myopponentisafk") {
		if (m.channel.id !== config.queueChannelID) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.queueChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.queueChannelID}>`)
					)
				)
		}
		if (!(m.author.id in tagEloGames) && !(m.author.id in tagEloDuels)) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("You are not in a game")
			)
		}

		addAudit(`${m.author.id} accused ${getOpponent(m.author.id)} of being afk`)

		msg = await m.channel.send(
			`<@!${getOpponent(m.author.id)}>`,
			new Discord.MessageEmbed()
				.setColor(embedColors.blue)
				.setDescription("React to this now if you're not afk (1/3)")
		)

		msg.react("✅")

		const filter = (reaction, user) =>
			user.id === getOpponent(m.author.id) && reaction.emoji.name == "✅"
		const collector = msg.createReactionCollector(filter, { time: 60 * 1000 })

		collector.on("collect", async (reaction, user) => {
			collector.stop("NOTAFK")
		})

		collector.on("end", async (collection, reason) => {
			msg.reactions.removeAll()
			if (reason == "NOTAFK") {
				return msg.edit({
					embed: new Discord.MessageEmbed()
						.setColor(embedColors.blue)
						.setDescription("That player is not afk")
				})
			}

			msg.delete()

			msg2 = await m.channel.send(
				`<@!${getOpponent(m.author.id)}>`,
				new Discord.MessageEmbed()
					.setColor(embedColors.blue)
					.setDescription("React to this now if you're not afk (2/3)")
			)

			msg2.react("✅")

			const collector2 = msg2.createReactionCollector(filter, { time: 60 * 1000 })

			collector2.on("collect", async (reaction, user) => {
				collector2.stop("NOTAFK")
			})

			collector2.on("end", async (collection, reason) => {
				msg2.reactions.removeAll()
				if (reason == "NOTAFK") {
					return msg2.edit({
						embed: new Discord.MessageEmbed()
							.setColor(embedColors.blue)
							.setDescription("That player is not afk")
					})
				}

				msg2.delete()

				msg3 = await m.channel.send(
					`<@!${getOpponent(m.author.id)}>`,
					new Discord.MessageEmbed()
						.setColor(embedColors.blue)
						.setDescription("React to this now if you're not afk (3/3)")
				)

				msg3.react("✅")

				const collector3 = msg3.createReactionCollector(filter, { time: 180 * 1000 })

				collector3.on("collect", async (reaction, user) => {
					collector3.stop("NOTAFK")
				})

				collector3.on("end", async (collection, reason) => {
					msg3.reactions.removeAll()
					if (reason == "NOTAFK") {
						return msg3.edit({
							embed: new Discord.MessageEmbed()
								.setColor(embedColors.blue)
								.setDescription("That player is not afk")
						})
					}

					msg3.delete()

					if (!getOpponent(getOpponent(m.author.id)))
						return msg3.edit({
							embed: new Discord.MessageEmbed()
								.setColor(embedColors.black)
								.setDescription("Game End Failed! If this is an issue contact Mysterium")
						})

					addAudit(`${getOpponent(m.author.id)} was afk! gave win to ${m.author.id}`)

					let string
					if (m.author.id in tagEloGames) {
						string = await executeGame(m.author.id, getOpponent(m.author.id))
					} else {
						string = await executeDuel(m.author.id, getOpponent(m.author.id))
					}
					return m.channel.send(
						new Discord.MessageEmbed().setColor(embedColors.blue).setDescription(string)
					)
				})
			})
		})
	} else if (command == "macrostats") {
		return
		if (
			m.channel.id !== config.mainChannelID &&
			m.channel.id !== config.commandsChannelID
		) {
			setTimeout(async function () {
				m.delete()
			}, 200)
			return m.author
				.send(
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription(`That command goes in <#${config.mainChannelID}>`)
				)
				.catch((err) =>
					simulateDM(
						m,
						new Discord.MessageEmbed()
							.setColor(embedColors.black)
							.setDescription(`That command goes in <#${config.mainChannelID}>`)
					)
				)
		}
		let totalMatches = await db.get(`matches`)
		let totalRegistered = await Object.keys(await db.get(`data`)).length
		let totalPlayers = (
			await Object.entries(await db.get(`data`)).filter((a) => {
				return a[1].performance.wins + a[1].performance.losses >= 1
			})
		).length
		let totalPlayers10 = (
			await Object.entries(await db.get(`data`)).filter((a) => {
				return a[1].performance.wins + a[1].performance.losses >= 10
			})
		).length
		m.channel.send(
			new Discord.MessageEmbed().setColor(embedColors.blue)
				.setDescription(`**Total Matches:** ${totalMatches}
**Total Registered Players:** ${totalRegistered}
**Total Players with at least 1 game:** ${totalPlayers}
**Total Players with at least 10 games:** ${totalPlayers10}`)
		)
	} else if (command == "lock") {
		if (!m.member.hasPermission("ADMINISTRATOR")) return

		locked = true
		return m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.red)
				.setDescription("Locked Channel, players will no longer be able to join games")
		)
	} else if (command == "changehost") {
		if (!m.member.roles.cache.has(config.staffRoleID)) return
		if (m.mentions.members.size == 0)
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Ping the player you would like change host points for")
			)

		let changeID = m.mentions.members.first().id

		if (!(changeID in (await db.get(`data`))))
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Player not verified")
			)

		if (!isFinite(args[1])) {
			return m.channel.send(
				new Discord.MessageEmbed()
					.setColor(embedColors.black)
					.setDescription("Specify a valid number")
			)
		}
		// let player = (await mongoUtils.findOne({userID:changeID})).toJSON()
		// player.records.push({
		//     reason:"admin",
		//     elo:Math.max(player.elo + eval(args[1]), 0) - player.elo,
		//     time:Date.now()
		// })
		// player.elo = Math.max(player.elo + eval(args[1]), 0)
		// await mongoUtils.findOneAndReplace({userID:changeID}, player)

		if (!db.has(`hostData.${changeID}`)) {
			db.set(`hostData.${changeID}`, eval(args[1]))
		} else {
			db.add(`hostData.${changeID}`, eval(args[1]))
		}

		addAudit(
			`${m.author.id} changed ${changeID}'s hostScore by ${args[1]} to ${await db.get(
				`hostData.${changeID}`
			)}`
		)
		return m.channel.send(
			new Discord.MessageEmbed()
				.setColor(embedColors.green)
				.setDescription(
					`Changed <@!${changeID}>'s hosting score to ${await db.get(
						`hostData.${changeID}`
					)}`
				)
		)
	}
	//     else if (command == "calculate") {
	//         if (args.length != 3) {
	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.black)
	//             .setDescription("This command needs 3 arguments. Ex: =calculate 1600 4 5"))
	//         }
	//         if (!isFinite(args[0])) {
	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.black)
	//             .setDescription(`${args[0]} is not a valid rating`))
	//         }

	//         if (!isFinite(args[1])) {
	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.black)
	//             .setDescription(`${args[1]} is not a valid score`))
	//         }

	//         if (!isFinite(args[2])) {
	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.black)
	//             .setDescription(`${args[2]} is not a valid rating`))
	//         }

	//         if (Math.max(args[1], args[2]) != 5) {
	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.black)
	//             .setDescription("The winner must have a score of 5"))
	//         }

	//         let opponentRating = Math.max(0, args[0])
	//         let yourRating = 1500

	//         let loserScore = Math.round(Math.max(Math.min(args[1], args[2], 4), 0))
	//         if (m.author.id in await db.get(`data`)) {
	//             yourRating = await db.get(`data.${m.author.id}.rating`)
	//         }

	//         let yourExpectedScore = 1/(1+Math.pow(10, (opponentRating - yourRating)/850))
	//         let opponentExpectedScore = 1/(1+Math.pow(10, (yourRating - opponentRating)/850))

	//         if (args[1] < args[2]) {
	//             // You lost

	//             let winnerRatingChange = 5 * k * (1 - opponentExpectedScore) + loserScore * k * (0 - opponentExpectedScore)

	//             let winnerNewRating = Math.max(Math.round((opponentRating + winnerRatingChange)*10)/10, 0)
	//             let loserNewRating = Math.max(Math.round((yourRating - winnerRatingChange)*10)/10, 0)

	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.blue)
	//             .setDescription(`**Game Results**
	// 5-${loserScore} to Dummy

	// Winner: Dummy (${Math.round(opponentRating)} --> ${Math.round(winnerNewRating)})
	// Loser: You (${Math.round(yourRating)} --> ${Math.round(loserNewRating)})`))
	//         }
	//         else {
	//             let winnerRatingChange = 5 * k * (1 - yourExpectedScore) + loserScore * k * (0 - yourExpectedScore)

	//             let winnerNewRating = Math.max(Math.round((yourRating + winnerRatingChange)*10)/10, 0)
	//             let loserNewRating = Math.max(Math.round((opponentRating - winnerRatingChange)*10)/10, 0)

	//             return m.channel.send(new Discord.MessageEmbed()
	//             .setColor(embedColors.blue)
	//             .setDescription(`**Game Results**
	// 5-${loserScore} to You

	// Winner: You (${Math.round(yourRating)} --> ${Math.round(winnerNewRating)})
	// Loser: Dummy (${Math.round(opponentRating)} --> ${Math.round(loserNewRating)})`))
	//         }
	//     }
})

// client.on('messageReactionAdd', async (reaction, user) => {
//     if (reaction.message.partial) await reaction.message.fetch()
//     if (reaction.partial) await reaction.fetch()
//     if (reaction.message.author.id != client.user.id) return
//     if (!reaction.message.guild) return

//     if (reaction.emoji.name == '✋') {
//         let member = await reaction.message.guild.members.cache.get(user.id)
//         if (!member.roles.cache.has('845322158493138975')) return

//         m.channel.send("")
//     }

//     if (!member.roles.cache.has(config.staffRoleID)) return
// })

client.on("clickButton", async (button) => {
	if (button.partial) await button.fetch()
	if (button.id.startsWith("register")) {
		let args = button.id.split("-")
		if (!button.clicker.member.roles.cache.has(config.staffRoleID)) return
		button.message.delete()

		if (args[1] == "acc") {
			addAudit(`${button.clicker.user.id} verified ${args[2]}`)

			if (await db.has(`data.${args[2]}`))
				return button.channel.send(
					`<@!${args[2]}>`,
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("That ID is already verified")
				)
			if (
				await Object.entries(await db.get("data")).some((a) => {
					return a[1].uuid == args[4]
				})
			)
				return button.channel.send(
					`<@!${args[2]}>`,
					new Discord.MessageEmbed()
						.setColor(embedColors.black)
						.setDescription("That UUID is already verified")
				)

			let guildMember = await button.guild.members.cache.get(args[2])
			let role = await button.guild.roles.cache.get(config.rankedRoleID)
			await guildMember.roles.add(role)

			await db.set(`data.${args[2]}`, { name: args[3], uuid: args[4] })
			let profile = await mongoUtils.create({
				userID: args[2],
				elo: 1000,
				username: args[3],
				uuid: args[4],
				wins: 0,
				losses: 0,
				records: [],
				deviation: 100
			})
			profile.save()

			return button.channel.send(
				`<@!${args[2]}>`,
				new Discord.MessageEmbed()
					.setColor(embedColors.green)
					.setDescription(`Verified <@!${args[2]}>`)
			)
		} else if (args[1] == "rej") {
			addAudit(`${button.clicker.user.id} did not verify ${args[2]}`)

			return button.channel.send(
				`<@!${args[2]}>`,
				new Discord.MessageEmbed()
					.setColor(embedColors.red)
					.setDescription(`Staff has denied your verification request`)
			)
		}
	}
})

client.login(config.botToken)
