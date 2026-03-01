import fs from 'node:fs'
import path from 'node:path'

const summaryPath = path.resolve('coverage/coverage-summary.json')

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found: ${summaryPath}`)
  process.exit(1)
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const total = summary.total

if (!total) {
  console.error('Invalid coverage summary format: missing "total" section')
  process.exit(1)
}

const toPercent = (value) => Number(value).toFixed(2)
const statements = Number(total.statements?.pct ?? 0)
const branches = Number(total.branches?.pct ?? 0)
const functions = Number(total.functions?.pct ?? 0)
const lines = Number(total.lines?.pct ?? 0)
const aggregate = (statements + branches + functions + lines) / 4

console.log('\nCoverage Totals')
console.log(`Statements: ${toPercent(statements)}%`)
console.log(`Branches:   ${toPercent(branches)}%`)
console.log(`Functions:  ${toPercent(functions)}%`)
console.log(`Lines:      ${toPercent(lines)}%`)
console.log(`Total:      ${toPercent(aggregate)}%`)
