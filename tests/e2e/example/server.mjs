import cors from 'cors'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'node:fs'
import { records } from './records.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

const render = (name, entrypoint, bodyInner = '') => {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>UI Extension: ${name}</title>
    <script type="module" src="${entrypoint}"></script>
</head>
<body>${bodyInner}</body>
</html>`
}

app.use(cors())
app.use('/dist', express.static(path.join(__dirname, '/dist')))

app.get('/', (_, response) => {
    response.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/host/:uuid', async (request, response) => {
    const record = records.get(request.params.uuid.toLowerCase())

    if (record && existsSync(path.join(__dirname, record.host))) {
        response.send(render('Host', record.host, '<div id="host"></div>'))
    } else {
        response.sendStatus(404)
    }
})

app.get('/remote/:uuid', async (request, response) => {
    const record = records.get(request.params.uuid.toLowerCase())

    if (record && existsSync(path.join(__dirname, record.host))) {
        response.send(render('Remote', record.remote))
    } else {
        response.sendStatus(404)
    }
})

app.get('/remote/:uuid/stylesheet', async (request, response) => {
    const uuid = request.params.uuid

    const record = records.find(r => r.uuid === uuid)
    if (record) {
        response.sendFile(path.join(__dirname, record.stylesheet))
    } else {
        response.sendStatus(404)
    }
})

const server = app.listen(3000, () => {
    console.log('Serving on port 3000')
})

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Server has been stopped')
        process.exit(0)
    })
})
