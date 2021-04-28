const Discord = require('discord.js'), client = new Discord.Client();
const yaml = require('js-yaml')
const fs = require('fs')
const db = require('quick.db')

let config = yaml.loadAll(fs.readFileSync('config.yaml', 'utf8'))[0]

const prefix = "="

client.on('ready', () => {
    console.log("Bot: Tag ELO Bot is online!")
})

let tagEloQueues = {}
let tagEloGames = {}

/**
{
    authorID: [rating, deviation, Unix]
}
 */

client.on('message', async (m) => {
    console.log(m.content)

    var args = m.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase()

    if (command == "join" || command == "j") {
        if (m.channel.id != config.mainChannelID) return
        if (m.author.id in tagEloQueues) return m.channel.send("You are already queued")
        if (m.author.id in tagEloGames) return m.channel.send(`You stil have a game against <@!${tagEloGames[m.author.id]}>`)

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

        tagEloGames[m.author] = potentialOponents[0][0]
        tagEloGames[potentialOponents[0][0]] = m.author.id

        delete tagEloQueues[potentialOponents[0][0]]

        return m.channel.send(`Game Starting:
<@!${potentialOponents[0][0]}> (${potentialOponents[0][1][0]}) vs ${m.author.id} (${rating})`)
    }
    else if (command == "leave" || command == "l") {
        if (m.channel.id != config.mainChannelID) return
        if (m.author.id in tagEloGames) return m.channel.send(`You are in a game against <@!${tagEloGames[m.author.id]}>. If you can't make it you must either forfeit (do ${prefix}winner <@!${tagEloGames[m.author.id]}>) or abort (do ${prefix}abort)`)
        if (!m.author.id in tagEloQueues) return m.channel.send("You are not in a queue")

        delete tagEloQueues[m.author.id]
        m.channel.send("Removed you from the queue")
    }
    else if (command == "abort") {
        const msg = await m.channel.send(`<@!${m.author.id}> <@!${tagEloGames[m.author.id]}> React with a :thumbsup: if you consent to aborting the game`)

        msg.react('👍')

        const filter = (reaction, user) => (user.id === m.author.id || user.id === tagEloGames[m.author.id])
        const collector = msg.createReactionCollector(filter, {time: 10000})

        let eSignatures = {}
        eSignatures[m.author.id] = false
        eSignatures[tagEloGames[m.author.id]] = false

        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name == "👍") {
                eSignatures[m.author.id] = true
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
})

client.login(config.botToken)