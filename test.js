let rating = 1
let deviation = 1

tagEloQueues = {
    1:[5, 2, 69],
    2:[12, 2, 69],
    4:[3, 5, 68],
    3:[3, 4, 69],
}


console.log(Object.entries(tagEloQueues).filter((a) => {return Math.abs(rating - a[1][0]) < deviation}).filter((a) => {return Math.abs(rating - a[1][0]) < a[1][1]}).sort((a, b) => {return (a[1][0] - rating) - (b[1][0] - rating)}).sort((a, b) => {return a[1][2] - b[1][2]}))