import config from "../config"
import * as mongo from "../mongo"

type queueEntry = {
	userID: string
	elo: number
	deviation: number
	time: number
}

let queue: queueEntry[] = []

export function join(member: string, data: mongo.MongoUser) {
	if (
		queue.some((entry) => {
			return entry.userID == member
		})
	) {
		throw new Error("Member already in queue")
	}
	queue.push({
		userID: member,
		elo: data.elo,
		deviation: data.deviation,
		time: Date.now()
	})
}

export function leave(member: string) {
	if (
		queue.some((entry) => {
			return entry.userID == member
		})
	) {
		queue = queue.filter((entry) => {
			return entry.userID != member
		})
	}
}

export function inQueue(member: string): boolean {
	return queue.some((entry) => {
		return entry.userID == member
	})
}

export function queueSize(): number {
	return queue.length
}

export function resetQueue() {
	queue = []
}

export function findOpponent(member: string, data: mongo.MongoUser): queueEntry | null {
	if (
		queue.some((entry) => {
			return entry.userID == member
		})
	) {
		throw new Error("Member already in queue")
	}
	queue = queue.sort((a, b) => {
		return a.time - b.time
	})

	for (let i = 0; i < queue.length; i++) {
		if (
			Math.abs(data.elo - queue[i].elo) <= Math.min(data.deviation, queue[i].deviation)
		) {
			return queue[i]
		}
	}
	return null
}

export function debugQueue() {
	console.log(queue)
}
