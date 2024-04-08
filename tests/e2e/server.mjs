import cors from 'cors'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'node:fs'

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
app.use('/cases', express.static(path.join(__dirname, '/cases')))

app.get('/', (_, response) => {
    response.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/host/:name', async (request, response) => {
    const name = request.params.name.toLowerCase()

    if (existsSync(path.join(__dirname, 'cases', name, 'dist/host.js'))) {
        response.send(render('Host', path.join('/cases', name, 'dist/host.js'), '<div id="host"></div>'))
    } else {
        response.sendStatus(404)
    }
})

app.get('/remote/:name', async (request, response) => {
    const name = request.params.name.toLowerCase()

    if (existsSync(path.join(__dirname, 'cases', name, 'dist/remote.js'))) {
        response.send(render('Remote', path.join('/cases', name, 'dist/remote.js')))
    } else {
        response.sendStatus(404)
    }
})

app.get('/remote/:name/stylesheet', async (request, response) => {
    const name = request.params.name.toLowerCase()

    if (existsSync(path.join(__dirname, 'cases', name, 'dist/remote.css'))) {
        response.send(render('Remote', path.join('/cases', name, 'dist/remote.css')))
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
