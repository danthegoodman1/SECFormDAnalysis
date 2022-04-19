import * as cheerio from 'cheerio'
import fetch from 'isomorphic-fetch'
import path from 'path';
import fs from 'fs/promises';
import {createWriteStream} from 'fs';
import { time } from 'console';
import util from 'util'
import { pipeline } from 'stream';
import xml2js from 'xml2js'

const parser = new xml2js.Parser()


const streamPipeline = util.promisify(pipeline)

async function main() {
  await test1()
}

async function test1() {
  const res = await fetch(genCurrentSearchURL(), {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "cookie": "bm_mi=506CC60A7EC2ADF095803F0454269F5D~JeMMrZudNNcUzb/7umygbk6Xc2umBgWi+Wkuv5QOXIDX7DmjZ35tzQBmyITxglJouZUKxshq1V+DzGLC70EqupwtyFgAX6NFMc+ZL9R1+dWLb4EYJL3HerJZLLRQ168HPR11Z5IXH3YGueCySD9+rEGPq3lysy5SOAP8vwUzuVCmFY0EH5/f8ksw0rG+uKnX/IsBYkGYF7dm7/5f2ADrlPnEJuw4m8NDPx7NmXpVRd21DtqMWaq8RwMLSUiFd7tTxTqT0tb5nnfEwAyqpRRcBSofnJ5rqGevTZoixbVbftE=; bm_sv=E4F74DF7CBC0A3177DD6871F0EFE6ED2~FYAPtTjKlWbI7DqywPHzTey8nSogJOz2ujsCMymBbmKGGbth4SzFLt4fbeBfT0Xi3XXgm9iRz7glCDF78IFDOUYB6+M0U947QTTcJSWgVx7Btu0unb87NHz1HELqHfwfwLuxurifq7aOfup6I4pwSA==; ak_bmsc=2C98E30FD7274CBD737DBC7719B37B19~000000000000000000000000000000~YAAQn3hGaPG1/QGAAQAAkmXxHw9xf81vB2X5uLu9CjZ165lEpbiWGoKxRJs8xNJ88fyKxTWTiF4GVm6cOYTU9oAbRPpeqxqGFi6zRQM292wGd2CSOLdct3A+W4vDqzYFHFn+q23ByC6613RVQUUUyhyc3AOeTgOP9NMSy6ULhldH6Ep2Rm//M/DVA5HzMOiUC7l2pC9+snQbMtrJfo82MnSTrkvlk597kfoVhAedGKHfHcJuZKRsg7P0b2ZHIVuEG5mj9813eRLr/tLYqa8umoboLt+KXgDtFM8QZ9KupuoQM7xGxQvg7sLN/KRTxyEaI/QFKPKmKh+Fy7ZP/lW+i0zJEhVvg9+yxlr+KrMZpbBnfh84fFio3VhxH2UlGZSOyxB2BmBpT2A6U1sfxEUrCxqrXlEzFI0+aLGmfWD2d8rHBlAuG5h0uBbgPsfHhUU=",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  });
  const rawHTML = await res.text()

  const $ = cheerio.load(rawHTML)

  const trs = $.root().find('tr')

  for (const tr of trs) {
    const tds = $(tr).find('td')
    if (tds[0] && tds[0].attribs['nowrap'] === 'nowrap') {
      const [formType, formats, description, accepted, filingDate, fileNum] = tds
      if (!['D', 'D/A'].includes($(formType).text())) {
        continue
      }
      const a = $(formats).find('a')[0]
      const rawURL = a.attribs['href']
      const url = genXMLURL(rawURL)
      const localFile = path.join('xml', genLocalFileNameFromXMLURL(url))

      // Make sure the local file exists
      if (!await fileExists('xml')) {
        await fs.mkdir('xml')
      }

      // Download file
      if (!await fileExists(localFile)) {
        console.log('Downloading', url, 'to local file', localFile)
        const s = new Date().getTime()
        const fileRes = await fetch(url, {
          "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": "bm_mi=506CC60A7EC2ADF095803F0454269F5D~JeMMrZudNNcUzb/7umygbk6Xc2umBgWi+Wkuv5QOXIDX7DmjZ35tzQBmyITxglJouZUKxshq1V+DzGLC70EqupwtyFgAX6NFMc+ZL9R1+dWLb4EYJL3HerJZLLRQ168HPR11Z5IXH3YGueCySD9+rEGPq3lysy5SOAP8vwUzuVCmFY0EH5/f8ksw0rG+uKnX/IsBYkGYF7dm7/5f2ADrlPnEJuw4m8NDPx7NmXpVRd21DtqMWaq8RwMLSUiFd7tTxTqT0tb5nnfEwAyqpRRcBSofnJ5rqGevTZoixbVbftE=; bm_sv=E4F74DF7CBC0A3177DD6871F0EFE6ED2~FYAPtTjKlWbI7DqywPHzTey8nSogJOz2ujsCMymBbmKGGbth4SzFLt4fbeBfT0Xi3XXgm9iRz7glCDF78IFDOUYB6+M0U947QTTcJSWgVx7Btu0unb87NHz1HELqHfwfwLuxurifq7aOfup6I4pwSA==; ak_bmsc=2C98E30FD7274CBD737DBC7719B37B19~000000000000000000000000000000~YAAQn3hGaPG1/QGAAQAAkmXxHw9xf81vB2X5uLu9CjZ165lEpbiWGoKxRJs8xNJ88fyKxTWTiF4GVm6cOYTU9oAbRPpeqxqGFi6zRQM292wGd2CSOLdct3A+W4vDqzYFHFn+q23ByC6613RVQUUUyhyc3AOeTgOP9NMSy6ULhldH6Ep2Rm//M/DVA5HzMOiUC7l2pC9+snQbMtrJfo82MnSTrkvlk597kfoVhAedGKHfHcJuZKRsg7P0b2ZHIVuEG5mj9813eRLr/tLYqa8umoboLt+KXgDtFM8QZ9KupuoQM7xGxQvg7sLN/KRTxyEaI/QFKPKmKh+Fy7ZP/lW+i0zJEhVvg9+yxlr+KrMZpbBnfh84fFio3VhxH2UlGZSOyxB2BmBpT2A6U1sfxEUrCxqrXlEzFI0+aLGmfWD2d8rHBlAuG5h0uBbgPsfHhUU=",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"
          },
          "referrerPolicy": "strict-origin-when-cross-origin",
          "body": null,
          "method": "GET"
        })

        const fileContents = await fileRes.text()
        console.log(`Got file in ${new Date().getTime() - s} milliseconds`)
        await fs.writeFile(localFile, fileContents)

        console.log('Downloaded', localFile, "with filing date of", $(filingDate).text())

        const xmlJSON = await parser.parseStringPromise(fileContents)
        // console.log(JSON.stringify(xmlJSON, null, 2))

        // Sleep so we don't go crazy
        await new Promise((r) => {
          setTimeout(r, 50)
        })
      } else {
        console.log("File", localFile, "already exists")
      }
    }
  }
}

main()

function genSearchUrl(startYear: number, endYear: number, offset?: number): string {
  return `https://www.sec.gov/cgi-bin/srch-edgar?text=FORM-TYPE%3DD&start=${offset || 0}&count=100&first=${startYear}&last=${endYear}`
}

function genCurrentSearchURL(offset?: number): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?type=D&owner=include&start=${0 || offset}&count=100&action=getcurrent`
}

function genXMLURL(rawURL: string): string {
  const parts = rawURL.split('/')
  return 'https://sec.gov' + parts.slice(0, -1).join('/') + '/primary_doc.xml'
}

/**
 * @returns Url in format {CIK}_{ACCESSIONNUMBER}.xml
 */
function genLocalFileNameFromXMLURL(xmlURL: string): string {
  // xmlURL: sec.gov/Archives/edgar/data/1841356/000184135622000177/primary_doc.xml
  // https://www.sec.gov/Archives/edgar/data/1921900/000192190022000001/xslFormDX01/primary_doc.xml for the visual form
  return xmlURL.split('/').slice(6, 8).join('_') + '.xml'
}

const fileExists = async (p: string) => !!(await fs.stat(p).catch(e => false))
