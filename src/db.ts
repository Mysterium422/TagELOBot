import path from "path"
import fs from "fs"
import _knex from "knex"

export const knex = _knex({
	client: "sqlite3",
	connection: {
		filename: path.resolve(__dirname, "../db.sqlite3")
	},
	useNullAsDefault: true
})

export enum TABLES {
	UserData = "user_data",
	HostData = "host_data",
	Matches = "matches"
}

const defineTable: (
	...params: Parameters<typeof knex.schema.createTable>
) => Promise<void> = async (name, callback) =>
	knex.schema.hasTable(name).then((exists) => {
		if (!exists) return knex.schema.createTable(name, callback)
	})

export const createTables = async () => {
	await defineTable(TABLES.UserData, (table) => {
		table.string("discord").primary()
		table.string("uuid").notNullable()
		table.string("name").notNullable()
	})
	await defineTable(TABLES.HostData, (table) => {
		table.string("discord").primary()
		table.integer("host").notNullable()
	})
	await defineTable(TABLES.Matches, (table) => {
		table.string("channel").primary()
		table.integer("matches").notNullable()
	})
}

export const reset = async () => {
	console.warn("[NOTICE] Resetting database...")
	// Delete the database file if it exists
	if (fs.existsSync(path.resolve(__dirname, "../db.sqlite3"))) {
		fs.unlinkSync(path.resolve(__dirname, "../db.sqlite3"))
	}
}

export type UserRow = {
	discord: string
	uuid: string
	name: string
}

export type HostRow = {
	discord: string
	host: number
}

export type MatchesRow = {
	channel: string
	matches: number
}

interface RowMap {
	[TABLES.UserData]: UserRow
	[TABLES.HostData]: HostRow
	[TABLES.Matches]: MatchesRow
}

/** Get all rows in a table */
export const all = <K extends keyof RowMap>(table: K): RowMap[K][] =>
	knex(table) as unknown as RowMap[K][]

/** Add a row to a table */
export const add = <K extends keyof RowMap>(table: K, row: RowMap[K]) => {
	return knex(table).insert(row)
}

/** Update a row with new values */
export const update = <K extends keyof RowMap>(
	table: K,
	query: Partial<RowMap[K]>,
	newvalue: Partial<RowMap[K]>
) => {
	return knex(table).where(query).update(newvalue)
}

/** Fetch all rows which match a query */
export const where = <K extends keyof RowMap>(
	table: K,
	query: Partial<RowMap[K]>
): RowMap[K][] => {
	return knex(table).where(query) as unknown as RowMap[K][]
}

/** Checks if any row matches a query */
export const contains = async <K extends keyof RowMap>(
	table: K,
	query: Partial<RowMap[K]>
): Promise<boolean> => {
	let result = await where(table, query)
	return result.length > 0
}

type SelectReturnType<K extends keyof RowMap, C extends (keyof RowMap[K])[]> = Promise<
	{ [P in Extract<C[keyof C], keyof RowMap[K]>]: RowMap[K][P] }[]
>
/** Select columns from rows which match a query */
export const select = <K extends keyof RowMap, C extends (keyof RowMap[K])[]>(
	table: K,
	columns: C,
	query: Partial<RowMap[K]>
): SelectReturnType<K, C> =>
	knex(table)
		.select(...columns)
		.where(query) as SelectReturnType<K, C>

/** Orders Table by Column */
export const orderBy = (table: keyof RowMap, column: string) => {
	return knex(table).orderBy(column)
}

/** Delete rows by a query */
export const del = <K extends keyof RowMap>(table: K, query: Partial<RowMap[K]>) => {
	return knex(table).where(query).del()
}
