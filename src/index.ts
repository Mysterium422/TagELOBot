import { Client, ClientUser, Message } from "discord.js"
import { readdirSync } from "fs"
import { resolve } from "path"

import config from "./config"
import { consolelog } from "./utils"

const client = new Client({
	intents: [
		"GUILDS",
		"GUILD_MEMBERS",
		"GUILD_BANS",
		"GUILD_INVITES",
		"GUILD_VOICE_STATES",
		"GUILD_PRESENCES",
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"DIRECT_MESSAGES",
		"DIRECT_MESSAGE_REACTIONS"
	],
	restTimeOffset: 0
})

const Commands = {}
const buttons = {}
let isReady = false

client.on("ready", async () => {
	console.log("[TAG FEUDS] Initiliazing Bot")

	// try {
	// 	console.log("[TAG FEUDS] [INFO] Loading database...")
	// 	await db.createTables()
	// 	console.log("[TAG FEUDS] [SUCCESS] Database loaded.")
	// } catch (e) {
	// 	console.error("[TAG FEUDS] [ERROR] Failed to load database! Aborting...")
	// 	throw e
	// }

	console.log("[TAG FEUDS] Loading Commands")
	try {
		const file_path = resolve(__dirname, "./Commands")
		const commandFiles = readdirSync(file_path).filter((file) => file.endsWith(".js"))

		for (const fileName of commandFiles) {
			const command = (await import("./Commands/" + fileName)).default
			Commands[fileName.slice(0, -3)] = command
			command.aliases.forEach((name) => {
				Commands[name] = command
			})
		}
	} catch (e) {
		console.error("[TAG FEUDS] Error: Failed to load Commands")
		throw e
	}

	console.log("[TAG FEUDS] Commands loaded")

	// try {
	// 	console.log("[TAG FEUDS] [INFO] Loading buttons...")
	// 	const file_path = resolve(__dirname, "./buttons")
	// 	const buttonFiles = readdirSync(file_path).filter((file) => file.endsWith(".js"))

	// 	for (const fileName of buttonFiles) {
	// 		const button = (await import("./buttons/" + fileName)).default
	// 		buttons[fileName.slice(0, -3)] = button
	// 	}

	// 	console.log("[TAG FEUDS] [SUCCESS] Loaded all buttons")
	// } catch (e) {
	// 	console.error("[TAG FEUDS] [ERROR] Failed to load buttons! Aborting...")
	// 	throw e
	// }

	isReady = true
})

client.on("messageCreate", async (message) => {
	try {
		if (!isReady) return

		if (message.author.bot) return
		if (message.channel.type != "GUILD_TEXT") return
		if (!message.content.startsWith(config.prefix)) return

		var args = message.content.toLowerCase().slice(config.prefix.length).split(" ")
		const command = args.shift()
		if (!command) return

		if (command in Commands) {
			try {
				await Commands[command].run({ client, message, args, command })
			} catch (e) {
				console.error(e)
			}
		}
	} catch (e) {
		console.log(e)
	}

	try {
		consolelog("[START] Loading buttons")
		const file_path = resolve(__dirname, "./buttons")
		const buttonFiles = readdirSync(file_path).filter((file) => file.endsWith(".js"))

		for (const fileName of buttonFiles) {
			const button = (await import("./buttons/" + fileName)).default
			buttons[fileName.slice(0, -3)] = button
		}

		consolelog("[START] Buttons loaded")
	} catch (e) {
		console.error("[TAG FEUDS] [ERROR] Failed to load buttons! Aborting...")
		throw e
	}
})

client.on("interactionCreate", async (interaction) => {
	if (!isReady) {
		return
	}
	if (interaction.isButton()) {
		const args = interaction.customId.split("-")
		if (args[0] in buttons) {
			try {
				return await buttons[args[0]].run({
					client,
					button: interaction
				})
			} catch (e) {
				const user = await client.users.fetch(config.ownerID)
				const errorMessage = [
					`**====== [ BEGIN ERROR LOG ] ======**`,
					`Date: ${interaction.createdAt.toString()}`,
					`Button: ${interaction.customId}`,
					`Channel: <#${interaction.channelId}>`,
					`Error: ${e.message}`,
					`${e.stack}`
				].join("\n")
				user.send({ content: errorMessage })
				// if (interaction.deferred) {
				// 	await interaction.editReply({
				// 		content: "An internal error occurred."
				// 	})
				// } else {
				// 	await interaction.reply({
				// 		content: "An internal error occurred.",
				// 		ephemeral: true
				// 	})
				// }

				console.error(e)
			}
		}
	}
})

client.login(config.token)
