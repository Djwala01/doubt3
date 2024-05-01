const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}
const createObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

const convert = each => {
  return {
    totalCases: each['SUM(cases)'],
    totalCured: each['SUM(cured)'],
    totalActive: each['SUM(active)'],
    totalDeaths: each['SUM(deaths)'],
  }
}

//API 1

app.get('/states/', async (request, response) => {
  const getQuery = `SELECT * FROM state;`
  const stateDetails = await db.all(getQuery)
  response.send(stateDetails.map(each => convertObject(each)))
})

//API 2
app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params
  const getQuery = `SELECT * FROM state
  WHERE state_id=${stateId};`
  const result = await db.get(getQuery)
  response.send(convertObject(result))
})

//API 3
app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const postQuery = `INSERT INTO district(
district_name,
state_id,
cases,
cured,
active,
deaths)
VALUES("${districtName}",${stateId},"${cases}","${cured}","${active}","${deaths}");`
  const result = await db.run(postQuery)
  response.send('District Successfully Added')
})

//API 4
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getQuery = `SELECT * FROM district
  WHERE district_id=${districtId};`
  const result = await db.get(getQuery)
  response.send(createObject(result))
})

//API 5

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `DELETE FROM district WHERE district_id=${districtId};`
  await db.run(deleteQuery)
  response.send('District Removed')
})

//API 6

app.put('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateQuery = `UPDATE district
  SET
  district_name="${districtName}",
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  WHERE district_id=${districtId};`
  await db.run(updateQuery)
  response.send('District Details Updated')
})

//API 7

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getQuery = `SELECT 
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
  FROM district
  WHERE state_id=${stateId};`
  const result = await db.get(getQuery)
  response.send(convert(result))
})

//API 8

app.get('/districts/:districtId/details', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `SELECT state_id FROM district
  WHERE district_id=${districtId}`
  const result = await db.get(getDistrictQuery)
  const getStateQuery = `SELECT state_name as stateName FROM state
  WHERE state_id=${result.state_id};`
  const dbresponse = await db.get(getStateQuery)
  response.send(dbresponse)
})

module.exports = app
