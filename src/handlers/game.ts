import config from "../config"
import * as mongo from "../mongo"
import * as queue from "./queue"

class Game {
	public type: "game" | "duel"
	public player1: {
		userID: string
	}
	public player2: {
		userID: string
	}
	public host: boolean

	constructor(userID1: string, userID2: string, type: "game" | "duel") {
		this.type = type
		this.player1 = {
			userID: userID1
		}
		this.player2 = {
			userID: userID2
		}
		this.host = false
	}

	public hostRequested() {
		this.host = true
	}
}

let games: Game[] = []

function inGame(playerID: string): boolean {
	return games.some((entry) => {
		return entry.player1.userID == playerID || entry.player2.userID == playerID
	})
}

function newGame(userID1: string, userID2: string) {
	if (
		games.some((entry) => {
			return inGame(userID1) || inGame(userID2)
		})
	) {
		throw new Error("Player is already in a game")
	}

	let game = new Game(userID1, userID2, "game")
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

	let winnerRating = winner.elo
	let loserRating = loser.elo

	let expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 800))

	let ratingChange = config.k * (1 - expectedWinner)
	if (game.type == "duel") {
		ratingChange = ratingChange / 3
	}
	ratingChange = Math.round(ratingChange * 100) / 100

	let winnerNewRating = Math.max(winnerRating + ratingChange, 0)
	let loserNewRating = Math.max(loserRating - ratingChange, 0)
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

export { inGame, newGame, findGame, findOpponent, deleteGame, executeGame }
