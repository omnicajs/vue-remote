import { rollup } from 'rollup'

import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import alias from '@rollup/plugin-alias'
import vue from 'rollup-plugin-vue'
import typescript from 'rollup-plugin-typescript2'

import path from 'node:path'
import process from 'node:process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rm } from 'node:fs/promises'

import { Timer, millisecondsToTime } from './timer.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const timer = new Timer()

const getDirectories = source =>
    readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

const output = (dirPath, filename) => ({
    exports: 'named',
    format: 'esm',
    dir: path.join(dirPath, 'dist'),
    entryFileNames: filename + '.js',
    sourcemap: true,
})

const plugins = [
    replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.SERVER': process.env.SERVER || 'localhost',
        __buildDate__: () => JSON.stringify(new Date()),
    }),
    alias({
        entries: [{
            find: '@',
            replacement: path.resolve(__dirname, '../..', 'src'),
        },
        {
            find: '~tests',
            replacement: path.resolve(__dirname, '../..', 'tests'),
        }],
    }),
    vue(),
    resolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
    }),
    typescript(),
]

const configOptions = (dirPath, filename) => ({
    input: path.join(dirPath, filename + '.ts'),
    output: [output(dirPath, filename)],
    plugins,
})

async function build({ output: outputOptionsList, ...inputOptions }) {
    let bundle

    try {
        bundle = await rollup(inputOptions)

        await Promise.all(outputOptionsList.map(bundle.write))
    } catch (e) {
        console.error(e)
    }

    if (bundle) {
        await bundle.close()
    }
}

const cleanDir = dirPath => rm(path.join(dirPath, 'dist'), { force: true, recursive: true })

const buildCases = async () => {
    const directories = getDirectories(path.join(__dirname, 'cases'))

    for (const directory of directories) {
        if (!directory) {
            continue
        }
        
        const dirPath = path.join(__dirname, 'cases', directory)

        timer.start(directory)
        
        await cleanDir(dirPath)

        console.info(`clean dist directory ${directory} was completed`)
        console.info(`host.ts and remote.ts builds have been started`)
        
        await build(configOptions(dirPath, 'host'))
        await build(configOptions(dirPath, 'remote'))
        
        console.info(`host.ts and remote.ts builds were completed in ${millisecondsToTime(timer.end(directory))}`)
    }
}


try {
    await buildCases()
} catch (e) {
    console.log(e)
}