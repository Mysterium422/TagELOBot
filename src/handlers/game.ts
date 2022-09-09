import config from "../config"
import * as mongo from "../mongo"
import * as queue from "./queue"
import Discord, { EmbedFieldData } from "discord.js"

class Game {
	public type: "game" | "duel"
	public player1: {
		userID: string
	}
	public player2: {
		userID: string
	}
	public host: boolean
	public match: number

	constructor(userID1: string, userID2: string, type: "game" | "duel", match: number) {
		this.type = type
		this.player1 = {
			userID: userID1
		}
		this.player2 = {
			userID: userID2
		}
		this.host = false
		this.match = match
	}

	public hostRequested() {
		this.host = true
	}
}

type EndedGame = {
	type: "game" | "duel"
	match: number
	game: executeGameReturn
}

let games: Game[] = []
export let recentGames: EndedGame[] = []

function inGame(playerID: string): boolean {
	return games.some((entry) => {
		return entry.player1.userID == playerID || entry.player2.userID == playerID
	})
}

function newGame(userID1: string, userID2: string, match: number) {
	if (
		games.some((entry) => {
			return inGame(userID1) || inGame(userID2)
		})
	) {
		throw new Error("Player is already in a game")
	}

	let game = new Game(userID1, userID2, "game", match)
	games.push(game)

	if (queue.inQueue(userID1)) {
		queue.leave(userID1)
	}

	if (queue.inQueue(userID2)) {
		queue.leave(userID2)
	}
}

export function newDuel(userID1: string, userID2: string, match: number) {
	if (
		games.some((entry) => {
			return inGame(userID1) || inGame(userID2)
		})
	) {
		throw new Error("Player is already in a game")
	}

	let game = new Game(userID1, userID2, "duel", match)
	games.push(game)

	if (queue.inQueue(userID1)) {
		queue.leave(userID1)
	}

	if (queue.inQueue(userID2)) {
		queue.leave(userID2)
	}
}

function findGame(playerID: string): Game | null {
	for (let i = 0; i < games.length; i++) {
		if (games[i].player1.userID == playerID) return games[i]
		if (games[i].player2.userID == playerID) return games[i]
	}
	return null
}

function findOpponent(playerID: string): string | null {
	let game = findGame(playerID)
	if (!game) return null
	if (playerID == game.player1.userID) return game.player2.userID
	return game.player1.userID
}

function deleteGame(playerID: string) {
	for (let i = 0; i < games.length; i++) {
		if (games[i].player1.userID == playerID) {
			games.splice(i, 1)
			return
		}
		if (games[i].player2.userID == playerID) {
			games.splice(i, 1)
			return
		}
	}
}
type executeGameReturn = {
	winner: {
		userID: string
		oldElo: number
		newElo: number
	}
	loser: {
		userID: string
		oldElo: number
		newElo: number
	}
}

async function executeGame(winnerID: string): Promise<executeGameReturn> {
	let game = findGame(winnerID)
	let loserID = findOpponent(winnerID)
	if (!loserID || !game) throw new Error("Cannot execute a game that doesn't exist")

	let winner = await mongo.findOne(mongo.MODELS.Users, { userID: winnerID })
	let loser = await mongo.findOne(mongo.MODELS.Users, { userID: loserID })

	if (!winner) throw new Error("Winner Mongo Data not found")
	if (!loser) throw new Error("Loser Mongo Data not found")

	let winnerRating = Math.round(winner.elo)
	let loserRating = Math.round(loser.elo)

	let expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 800))

	let ratingChange = config.k * (1 - expectedWinner)
	if (game.type == "duel") {
		ratingChange = ratingChange / 3
	}
	ratingChange = Math.round(ratingChange * 100) / 100

	let winnerNewRating = Math.round(Math.max(winnerRating + ratingChange, 0))
	let loserNewRating = Math.round(Math.max(loserRating - ratingChange, 0))
	let time = Date.now()

	let winnerRecord = {
		reason: game.type,
		opponent: loserID,
		elo: winnerNewRating - winnerRating,
		time: time
	}
	let loserRecord = {
		reason: game.type,
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

	await mongo.findOneAndReplace(mongo.MODELS.Users, { userID: winnerID }, winner)
	await mongo.findOneAndReplace(mongo.MODELS.Users, { userID: loserID }, loser)

	deleteGame(winnerID)

	const endedGame: EndedGame = {
		type: game.type,
		match: game.match,
		game: {
			winner: {
				userID: winnerID,
				oldElo: Math.round(winnerRating),
				newElo: Math.round(winnerNewRating)
			},
			loser: {
				userID: loserID,
				oldElo: Math.round(loserRating),
				newElo: Math.round(loserNewRating)
			}
		}
	}

	if (recentGames.length > 4) recentGames.shift()
	recentGames.push(endedGame)

	return {
		winner: {
			userID: winnerID,
			oldElo: Math.round(winnerRating),
			newElo: Math.round(winnerNewRating)
		},
		loser: {
			userID: loserID,
			oldElo: Math.round(loserRating),
			newElo: Math.round(loserNewRating)
		}
	}
}

export function debugGames() {
	for (let i = 0; i < games.length; i++) {
		console.log(games[i])
	}
}

export async function generateCurrentGamesString(): Promise<string> {
	if (games.length == 0) return "None found"
	let players = await mongo.find(mongo.MODELS.Users, {})
	let string = ""
	for (let i = 0; i < games.length; i++) {
		let player1 = players.filter((a) => {
			return a.userID == games[i].player1.userID
		})[0]
		let player2 = players.filter((a) => {
			return a.userID == games[i].player2.userID
		})[0]
		string = `${string}\n<@!${player1.userID}> (${Math.round(
			player1.elo
		)}) :crossed_swords: <@!${player2.userID}> (${Math.round(player2.elo)})`
	}
	return string
}

export function generateRecentGames(): string {
	if (recentGames.length == 0) return "None found"
	let reversedGames = recentGames.reverse()
	let string = ""
	for (let i = 0; i < Math.min(recentGames.length, 3); i++) {
		let recentGame = reversedGames[i]
		let winner = recentGame.game.winner
		let loser = recentGame.game.loser
		string = `${string}\nMatch ${recentGame.match}
Winner: <@!${winner.userID}> ${winner.oldElo} --> ${winner.newElo}
Loser: <@!${loser.userID}> ${loser.oldElo} --> ${loser.newElo}\n`
	}
	return string
}

export function getMatchFromString(string: string): number {
	if (!string.startsWith("game-")) return 0
	string = string.substring(5)
	return parseInt(string)
}

export { inGame, newGame, findGame, findOpponent, deleteGame, executeGame }
