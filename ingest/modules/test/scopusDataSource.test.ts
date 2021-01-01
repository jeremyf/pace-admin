import { ScopusDataSource } from '../scopusDataSource'
import dotenv from 'dotenv'
const fs = require('fs');
import _ from 'lodash'

let ds: ScopusDataSource
let dsConfig: DataSourceConfig
let defaultExpectedResultKeys = []
let defaultNormedPerson: NormedPerson
let defaultNormedPersonWAffiliation: NormedPerson
let defaultYear: string
let defaultTotalExpectedResultsMin
let defaultPubSourceMetadata
let defaultExpectedNormedPublication: NormedPublication

beforeAll(async () => {

  const filePath =  '../.env'
  if (!fs.existsSync(filePath)) {
    throw `Invalid path on load csv from: ${filePath}`
  }

  dotenv.config({
    path: filePath
  })
        
  // environment variables
  process.env.NODE_ENV = 'development';

  dsConfig = {
    baseUrl: 'https://www-scopus-com.proxy.library.nd.edu',
    queryUrl: 'https://api.elsevier.com/content/search/scopus',
    apiKey: process.env.SCOPUS_API_KEY,
    sourceName: 'Scopus',
    pageSize: '25'  // page size must be a string for the request to work
  }
  ds = new ScopusDataSource(dsConfig)

  // for now this is the set expected every time, not fully optimized yet
  defaultExpectedResultKeys = [
    "prism:url",
    "dc:identifier",
    "eid",
    "dc:title",
    "dc:creator",
    "prism:publicationName",
    "prism:volume",
    "prism:pageRange",
    "prism:coverDate",
    "prism:coverDisplayDate",
    "prism:doi",
    "citedby-count",
    "affiliation",
    "prism:aggregationType",
    "subtype",
    "subtypeDescription",
    "source-id",
    "openaccess",
    "openaccessFlag"
  ]

  defaultNormedPerson = {
    id: 1,
    lastName: 'Zhang',
    firstInitial: 'S',
    firstName: 'Suyaun',
    startDate: new Date('2017-01-01'),
    endDate: undefined,
    sourceIds: {
      scopusAffiliationId: '60021508'
    }
  }

  defaultYear = '2019'

  defaultTotalExpectedResultsMin = {
      withAffiliation: 198,
      woutAffilation: 77000
  }

  defaultPubSourceMetadata = {
    "@_fa":"true",
    "link":[
        {"@_fa":"true","@ref":"self","@href":"https://api.elsevier.com/content/abstract/scopus_id/85077122528"},
        {"@_fa":"true","@ref":"author-affiliation","@href":"https://api.elsevier.com/content/abstract/scopus_id/85077122528?field=author,affiliation"},
        {"@_fa":"true","@ref":"scopus","@href":"https://www.scopus.com/inward/record.uri?partnerID=HzOxMe3b&scp=85077122528&origin=inward"},
        {"@_fa":"true","@ref":"scopus-citedby","@href":"https://www.scopus.com/inward/citedby.uri?partnerID=HzOxMe3b&scp=85077122528&origin=inward"}],
    "prism:url":"https://api.elsevier.com/content/abstract/scopus_id/85077122528",
    "dc:identifier":"SCOPUS_ID:85077122528",
    "eid":"2-s2.0-85077122528",
    "dc:title":"Oxidation-Induced Polymerization of InP Surface and Implications for Optoelectronic Applications",
    "dc:creator":"Zhang X.",
    "prism:publicationName":"Journal of Physical Chemistry C",
    "prism:issn":"19327447",
    "prism:eIssn":"19327455",
    "prism:volume":"123",
    "prism:issueIdentifier":"51",
    "prism:pageRange":"30893-30902",
    "prism:coverDate":"2019-12-26",
    "prism:coverDisplayDate":"26 December 2019",
    "prism:doi":"10.1021/acs.jpcc.9b07260",
    "citedby-count":"2",
    "affiliation":[{"@_fa":"true","affilname":"Notre Dame Radiation Laboratory","affiliation-city":"Notre Dame","affiliation-country":"United States"}],
    "prism:aggregationType":"Journal",
    "subtype":"ar",
    "subtypeDescription":"Article",
    "source-id":"5200153123",
    "openaccess":"0",
    "openaccessFlag":false
  }

  defaultExpectedNormedPublication = {
    search_person: defaultNormedPerson,
    title: 'Oxidation-Induced Polymerization of InP Surface and Implications for Optoelectronic Applications',
    journalTitle: 'Journal of Physical Chemistry C',
    journalIssn: '19327447',
    journalEIssn: '19327455',
    doi: '10.1021/acs.jpcc.9b07260',
    publicationDate: '2019-12-26',
    datasource_name: dsConfig.sourceName,
    source_id: '85077122528',
    source_metadata: defaultPubSourceMetadata
  }
 })

// TOD fix overriding JEST timeout of 5000 ms that creeps up sometimes
// TODO convert to use input parameters and expected csv
test('testing fetch scopus query with REST call', async () => {
  expect.hasAssertions()
  const year = '2019'
  const authorQuery = "AUTHFIRST("+ _.toLower(defaultNormedPerson.firstInitial) +") and AUTHLASTNAME("+ _.toLower(defaultNormedPerson.lastName)+ ") and AF-ID(" + defaultNormedPerson.sourceIds.scopusAffiliationId + ")"
  const results = await ds.fetchScopusQuery(authorQuery, year, dsConfig.pageSize, 0)
  
  if (results && results['search-results']['opensearch:totalResults']){
    const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
    console.log(`Author Search Result Total Results: ${totalResults}`)
    expect(totalResults).toBeGreaterThanOrEqual(defaultTotalExpectedResultsMin.withAffiliation)
    if (totalResults > 0 && results['search-results']['entry']){
      expect(results['search-results']['entry'].length).toEqual(Number.parseInt(dsConfig.pageSize))
      console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
      const resultKeys = _.keys(results['search-results']['entry'][0])
      // just check if a subset of keys are in the expected list
      expect(resultKeys).toEqual(expect.arrayContaining(defaultExpectedResultKeys))
    }
  }
})

// TODO: move dup code to shared method
test('testing get publication from Scopus with no affiliation id', async () => {
    expect.hasAssertions()

    const person: NormedPerson = _.cloneDeep(defaultNormedPerson)
    person.sourceIds = {}
    const results = await ds.getPublicationsByAuthorName(person, new Date(`${defaultYear}-01-01`))
    if (results && results['search-results']['opensearch:totalResults']){
        const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
        console.log(`Author Search Result Total Results: ${totalResults}`)
        expect(totalResults).toBeGreaterThanOrEqual(defaultTotalExpectedResultsMin.woutAffilation)
        if (totalResults > 0 && results['search-results']['entry']){
           expect(results['search-results']['entry'].length).toEqual(Number.parseInt(dsConfig.pageSize))
           console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
           const resultKeys = _.keys(results['search-results']['entry'][0])
           // just check if a subset of keys are in the expected list
           expect(resultKeys).toEqual(expect.arrayContaining(defaultExpectedResultKeys))       
        }
    }
})

test('testing get publication from Scopus with affiliation id', async () => {
    expect.hasAssertions()
    const results = await ds.getPublicationsByAuthorName(defaultNormedPerson, new Date(`${defaultYear}-01-01`))
    if (results && results['search-results']['opensearch:totalResults']){
        const totalResults = Number.parseInt(results['search-results']['opensearch:totalResults'])
        console.log(`Author Search Result Total Results: ${totalResults}`)
        expect(totalResults).toBeGreaterThanOrEqual(defaultTotalExpectedResultsMin.withAffiliation)
        if (totalResults > 0 && results['search-results']['entry']){
           expect(results['search-results']['entry'].length).toEqual(Number.parseInt(dsConfig.pageSize))
           console.log(`Fetch Query Result 1 is: ${JSON.stringify(_.keys(results['search-results']['entry'][0]), null, 2)}`)
           const resultKeys = _.keys(results['search-results']['entry'][0])
           // just check if a subset of keys are in the expected list
           expect(resultKeys).toEqual(expect.arrayContaining(defaultExpectedResultKeys))
        }
    }
})

// TODO: convert to large set
test('testing get normedPublications with default pub', async () => {
    expect.hasAssertions()
    const testPubs = [ defaultPubSourceMetadata ]
    const normedPubResults = await ds.getNormedPublications(testPubs, defaultNormedPerson)
    // expect(normedPubResults.length).toEqual(1)
    // as the source metadata can vary only check the other values and that source metadata is not null
    _.each(_.keys(normedPubResults[0]), (key) => {
        if (key === 'source_metadata') {
          expect(normedPubResults[0][key]).toBeDefined
        } else {
          expect(normedPubResults[0][key]).toEqual(defaultExpectedNormedPublication[key])
        }
    })
})