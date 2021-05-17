const Discord = require('discord.js'), client = new Discord.Client();
const yaml = require('js-yaml')
const fs = require('fs')
const db = require('quick.db')
const { pConversion } = require('./conversion.js')

let config = yaml.loadAll(fs.readFileSync('config.yaml', 'utf8'))[0]

console.log(config)

const prefix = "="
const k = 40

const embedColors = {
    green:"#3bcc71",
    red:"#e74c3c",
    blue:"#3498db",
    black:"#000000"
}

async function executeGame(winnerID, loserID) {
    winnerRating = await db.get(`data.${winnerID}.rating`)
    loserRating = await db.get(`data.${loserID}.rating`)

    expectedWinner = 1/(1+Math.pow(10, (loserRating - winnerRating)/400))
    expectedLoser = 1/(1+Math.pow(10, (winnerRating - loserRating)/400))

    winnerNewRating = Math.max(Math.round(winnerRating + k * (1 - expectedWinner)), 0)
    loserNewRating = Math.max(Math.round(loserRating + k * (0 - expectedLoser)), 0)

    winnerPerformance = await db.get(`data.${winnerID}.performance.opponents`)
    winnerPerformance.push(loserID)
    await db.set(`data.${winnerID}.performance.opponents`, winnerPerformance)
    await db.set(`data.${winnerID}.performance.wins`, await db.get(`data.${winnerID}.performance.wins`) + 1)
    await db.set(`data.${winnerID}.rating`, winnerNewRating)

    loserPerformance = await db.get(`data.${loserID}.performance.opponents`)
    loserPerformance.push(winnerID)
    await db.set(`data.${loserID}.performance.opponents`, loserPerformance)
    await db.set(`data.${loserID}.performance.losses`, await db.get(`data.${loserID}.performance.losses`) + 1)
    await db.set(`data.${loserID}.rating`, loserNewRating)

    return `**Game Results**
Winner: <@!${winnerID}> (${winnerRating} --> ${winnerNewRating})
Loser: <@!${loserID}> (${loserRating} --> ${loserNewRating})`
}

async function calculatePerformance(ID) {
    let wins = await db.get(`data.${ID}.performance.wins`)
    let losses = await db.get(`data.${ID}.performance.losses`)
    if (wins + losses < 10) return "10 or more games needed"

    let opponents = await db.get(`data.${ID}.performance.opponents`)
    let opponentRatingSum = 0;

    for (let i = 0; i < opponents.length; i++) {
        opponentRatingSum = opponentRatingSum + await db.get(`data.${opponents[i]}.rating`)
    }
    winPercentage = wins/(wins+losses)
    dP = pConversion[winPercentage]
    averageRating = opponentRatingSum/(wins+losses)

    return Math.max(averageRating + dP, 0)
}

client.on('ready', async () => {
    console.log("Bot: Tag ELO Bot is online!")

    //await db.set('data', {})
    //await db.set('settings', {})

    console.log(await db.get('data'))
})

let tagEloQueues = {}
let tagEloGames = {}

/**
{
    authorID: [rating, deviation, Unix]
}
 */

client.on('message', async (m) => {
    if (m.author.bot) return

    if (!m.content.startsWith(prefix)) return

    var args = m.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase()

    if (command == "join" || command == "j") {
        if (m.channel.id != config.mainChannelID) return
        if (m.author.id in tagEloQueues) return m.channel.send("You are already queued")
        if (m.author.id in tagEloGames) return m.channel.send(`You stil have a game against <@!${tagEloGames[m.author.id]}>`)

        if (!(m.author.id in await db.get(`data`))) return m.channel.send("You must be verified first. Contact a Staff member for support")

        setTimeout(async function () {
            m.delete()
        }, 100);

        let rating = await db.get(`data.${m.author.id}.rating`)
        let deviation = await db.get(`settings.${m.author.id}.deviation`)

        let potentialOponents = await Object.entries(tagEloQueues).filter((a) => {return Math.abs(rating - a[1][0]) < deviation}).filter((a) => {return Math.abs(rating - a[1][0]) < a[1][1]}).sort((a, b) => {return (a[1][0] - rating) - (b[1][0] - rating)}).sort((a, b) => {return a[1][2] - b[1][2]})

        // Check if 
        if (potentialOponents.length == 0) {
            tagEloQueues[m.author.id] = [rating, deviation, Date.now()]
            return m.author.send("Added you to the queue!")
        }

        tagEloGames[m.author.id] = potentialOponents[0][0]
        tagEloGames[potentialOponents[0][0]] = m.author.id

        delete tagEloQueues[potentialOponents[0][0]]

        return m.channel.send(`Game Starting:
<@!${potentialOponents[0][0]}> (${potentialOponents[0][1][0]}) vs <@!${m.author.id}> (${rating})`)
    }
    else if (command == "leave" || command == "l") {
        if (m.channel.id != config.mainChannelID) return
        if (m.author.id in tagEloGames) return m.channel.send(`You are in a game against <@!${tagEloGames[m.author.id]}>. If you can't make it you must either forfeit (do ${prefix}winner <@!${tagEloGames[m.author.id]}>) or abort (do ${prefix}abort)`)
        if (!(m.author.id in tagEloQueues)) return m.channel.send("You are not in a queue")

        delete tagEloQueues[m.author.id]
        m.channel.send("Removed you from the queue")
    }
    else if (command == "abort") {
        if (!(m.author.id in tagEloGames)) return m.channel.send("You are not in a game")
        const msg = await m.channel.send(`<@!${m.author.id}> <@!${tagEloGames[m.author.id]}> React with a :thumbsup: if you consent to aborting the game`)

        msg.react('👍')

        const filter = (reaction, user) => (user.id === m.author.id || user.id === tagEloGames[m.author.id])
        const collector = msg.createReactionCollector(filter, {time: 10000})

        let eSignatures = {}
        eSignatures[m.author.id] = false
        eSignatures[tagEloGames[m.author.id]] = false

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                eSignatures[user.id] = true
            }
        })

        collector.on('end', () => {
            if (eSignatures[m.author.id] && eSignatures[tagEloGames[m.author.id]]) {
                delete tagEloGames[tagEloGames[m.author.id]]
                delete tagEloGames[m.author.id]
                return msg.edit("Game Aborted")
            }
            else {
                return msg.edit("Game abortion failed. You may have to =resign")
            }
        })
    }
    else if (command == "resign" || command == "forfeit" || command == "winner") {
        if (!(m.author.id in tagEloGames)) return m.channel.send("You are not in a game")
        const msg = await m.channel.send(`React with a :thumbsup: if you consent that <@!${tagEloGames[m.author.id]}> beat <@!${m.author.id}>`)

        const filter = (reaction, user) => (user.id === m.author.id || user.id === tagEloGames[m.author.id])
        const collector = msg.createReactionCollector(filter, {time: 10000})

        msg.react('👍').then(msg.react('👎'))

        let eSignatures = {}

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                eSignatures[user.id] = true
            }
            else if (reaction.emoji.name == "👎") {
                eSignatures[user.id] = false
            }

            if (Object.keys(eSignatures).length == 2) {
                collector.stop()
            }
        })

        collector.on('end', async () => {
            if (eSignatures[m.author.id] && eSignatures[tagEloGames[m.author.id]]) {
                let string = await executeGame(tagEloGames[m.author.id], m.author.id)
                delete tagEloGames[tagEloGames[m.author.id]]
                delete tagEloGames[m.author.id]
                return msg.edit(string)
            }
            else {
                return msg.edit("Game end failed. <@&752177298161008763>")
            }
        })
    }
    else if (command == "stats") {

        if (!(m.author.id in await db.get(`data`))) {
            return m.channel.send("You must be verified first. Contact a Staff member for support")
        }
        console.log(await db.get(`data.${m.author.id}`))
        console.log(await db.get(`data.${m.author.id}.performance`))
        console.log(await db.get(`data.${m.author.id}.performance.wins`))
        return m.channel.send(`
Rating: ${await db.get(`data.${m.author.id}.rating`)}
Wins: ${await db.get(`data.${m.author.id}.performance.wins`)}
Losses: ${await db.get(`data.${m.author.id}.performance.losses`)}
Estimated Performance: ${await calculatePerformance(m.author.id)}`)
    }
    else if (command == "leaderboard") {
        let data = Object.entries(await db.get(`data`))
        data = data.sort((a, b) => {return b[1].rating - a[1].rating})

        let position = null;
        if (m.author.id in await db.get(`data`)) { 
            for (let i = 0; i<data.length; i++) {
                if (data[i][0] == m.author.id) {
                    position = i+1
                    break;
                }
            }
        }

        let string = `**ELO Leaderboard**
${(position == 1) ? "**" : ""}#1 <@!${data[0][0]}> - ${data[0][1].rating}${(position == 1) ? "**" : ""}
${(position == 2) ? "**" : ""}#2 <@!${data[1][0]}> - ${data[1][1].rating}${(position == 2) ? "**" : ""}
${(position == 3) ? "**" : ""}#3 <@!${data[2][0]}> - ${data[2][1].rating}${(position == 3) ? "**" : ""}
${(position == 4) ? "**" : ""}#4 <@!${data[3][0]}> - ${data[3][1].rating}${(position == 4) ? "**" : ""}
${(position == 5) ? "**" : ""}#5 <@!${data[4][0]}> - ${data[4][1].rating}${(position == 5) ? "**" : ""}
${(position == 6) ? "**" : ""}#6 <@!${data[5][0]}> - ${data[5][1].rating}${(position == 6) ? "**" : ""}
${(position == 7) ? "**" : ""}#7 <@!${data[6][0]}> - ${data[6][1].rating}${(position == 7) ? "**" : ""}
${(position == 8) ? "**" : ""}#8 <@!${data[7][0]}> - ${data[7][1].rating}${(position == 8) ? "**" : ""}
${(position == 9) ? "**" : ""}#9 <@!${data[8][0]}> - ${data[8][1].rating}${(position == 8) ? "**" : ""}
${(position == 10) ? "**" : ""}#10 <@!${data[9][0]}> - ${data[9][1].rating}${(position == 10) ? "**" : ""}`

        if (position > 10) {
            string = `${string}\n. . .\n**#${position} <@!${data[position - 1][0]}> - ${data[position - 1][1].rating}**`
        }

        return m.channel.send(string)
    }
    else if (command == "verify") {
        if (!(m.member.roles.cache.has('752177298161008763') || m.member.roles.cache.has('737003993494061216') || m.member.roles.cache.has('793227819391123457'))) return
        if (m.mentions.members.size != 1) return m.channel.send("Ping the *one* person you would like to verify")

        await db.set(`data.${m.mentions.members.first().id}`, {"rating":1500, "performance":{"wins":0, "losses":0, "opponents":[]}})
        await db.set(`settings.${m.mentions.members.first().id}.deviation`, 100)

        return m.channel.send(`Verified <@!${m.mentions.members.first().id}>`)
    }
    else if (command == "duel") {
        if (m.channel.id != config.mainChannelID) return
        if (!(m.author.id in await db.get(`data`))) {
            return m.channel.send("You must be verified first. Contact a Staff member for support")
        }
        if (m.author.id in tagEloGames) return m.channel.send(`You are in a game against <@!${tagEloGames[m.author.id]}>. If you can't make it you must either forfeit (do ${prefix}winner <@!${tagEloGames[m.author.id]}>) or abort (do ${prefix}abort)`)
        if (m.author.id in tagEloQueues) return m.channel.send("You are in the queue. Leave it to duel")
        pingedMember = m.mentions.members.first()
        if (!(pingedMember.id in await db.get(`data`))) {
            return m.channel.send("That player isn't verified!")
        }
        if (pingedMember.id in tagEloGames) return m.channel.send("That player is already in a game")
        if (pingedMember.id in tagEloQueues) return m.channel.send("That player is in the queue. They must leave it to duel")
        if (!pingedMember.id in await db.get(`data`)) {
            return m.channel.send("You must be verified first. Contact a Staff member for support")
        }

        const msg = await m.channel.send(`<@!${pingedMember.id}> React with a :thumbsup: if you would like to duel <@!${m.author.id}> (Rated ${await db.get(`data.${m.author.id}.rating`)})`)

        const filter = (reaction, user) => (user.id === pingedMember.id)
        const collector = msg.createReactionCollector(filter, {time: 10000})

        msg.react('👍')

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                tagEloGames[m.author.id] = pingedMember.id
                tagEloGames[pingedMember.id] = m.author.id
                msg.edit(`Game Starting:
<@!${m.author.id}> (${await db.get(`data.${m.author.id}.rating`)}) vs <@!${pingedMember.id}> (${await db.get(`data.${pingedMember.id}.rating`)})`)
                collector.stop("A")
            }
        })

        collector.on('end', (collection, reason) => {
            console.log(reason)
            if (reason != "A") msg.edit("Duel request denied")
        })
    }
    else if (command == "debug") {
        console.log(await db.get('data'))
        console.log(await db.get('settings'))
        console.log(tagEloGames)
        console.log(tagEloQueues)
    }
    else if (command == "set") {
        if (m.channel.id !== config.mainChannelID) return;

        if (!(m.author.id in await db.get(`data`))) return m.channel.send("You must be verified first. Contact a Staff member for support")

        if (!isFinite(args[0])) {
            return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.black)
                .setDescription("Specify a valid number"))
        }

        if (args[0] < 100 || args[0] > 300) {
            return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.black)
                .setDescription("Must be between 100 and 300. Default: 100"))
        }

        await db.set(`settings.${m.author.id}.deviation`)

        return m.channel.send(new Discord.MessageEmbed()
                .setColor(embedColors.green)
                .setDescription(`Your deviation has been set to ${args[0]}`))
    }
})

client.login(config.botToken)