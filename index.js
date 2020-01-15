const dateFormat = require('dateformat')
const config = require('./config.json')
const azure = require('./azure')
const nodes7 = require('nodes7')
const fs = require('fs')

const conn = new nodes7()

conn.initiateConnection(
    {
        port: config.clp.port,
        host: config.clp.host,
        rack: config.clp.rack,
        slot: config.clp.slot
    },
    connected
)

function connected(err) {
    if (err) console.log(err)
    else {
        conn.setTranslationCB((tag) => {
            return config.variables[tag]
        })
        conn.addItems(['var1', 'var2', 'var3', 'var4', 'var5', 'var6'])
        setInterval(() => {
            conn.readAllItems(valuesRead)
        }, 15000)
    }
}

function valuesRead(err, values) {
    if (err) {
        console.log('Error reading values!')
        process.exit()
    } else {
        console.log('Values read from CLP.')
        let today = Date.now()
        let todayFormatted = dateFormat(today, 'mm/dd/yyyy-HH:MM:ss')
        createsCSV(todayFormatted, values)
        values = Object.assign(values, {
            timestamp: today
        })
        let message = JSON.stringify({
            date: todayFormatted,
            currentWeight: values.var1,
            tankPressure: values.var2,
            airDragPressure: values.var3,
            waterFlow: values.var4,
            materialApplicationWeight: values.var5
        })
        azure.send(message)
    }
}

function createsCSV(today, values) {
    let filenameCSV = './output/' + dateFormat(today, 'mmddyyyy') + '.csv'
    let data = `${today},${values.var1},${values.var2},${values.var3},${values.var4},${values.var5},${values.var6}\n`
    fs.exists(filenameCSV, (exists) => {
        if (!exists) {
            let title = 'timestamp,var1,var2,var3,var4,var5,var6\n'
            fs.writeFile(filenameCSV, title, () => {
                fs.appendFileSync(filenameCSV, data)
            })
        } else {
            fs.appendFileSync(filenameCSV, data)
        }
    })
}
