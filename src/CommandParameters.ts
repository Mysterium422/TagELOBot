import type { Client, Message } from "discord.js"

export type CommandParameters = {
	readonly client: Client
	readonly message: Message
	readonly args: string[]
	readonly command: string
}
