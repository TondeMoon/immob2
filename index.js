const fs = require('fs')
const puppeteer = require('puppeteer')
const mongoose = require('mongoose')
const { scrollPageToBottom } = require('puppeteer-autoscroll-down')

const homesSc = require('./homeSchema')

const parsingObject = {
  link1:
    'https://www.swissfineproperties.com/?t=1&page=result&tri=&triSens=&type_1=1&type_4=4&dist=6&commune=1053&region=&bounds=&area=&p=&communeName=Verbier',
  link2: '',
  waitingSelectors: {
    overall: {
      selector: 'div.tab-pane',
    },
    images: {
      selector: 'div.im__row__assestGallery',
    },
    itemLinks: { selector: 'filter-results-holder' },
  },
  type: {
    separate: true,
    selector: 'h1.fs-25.lg-fs-36.lh-130',
  },
  pagination: {
    selector: 'ul.pages',
    innerPagination: {
      selector: 'li:last-child',
    },
  },
  allLinks: {
    selector: 'div.col-auto',
    inner: {
      selector: 'a',
    },
  },
  reference: {
    separate: true,
    selector: 'div.text-uppercase.m-bot-10.fs-12',
  },
  mainSection: {
    selector: 'div.tablediv',
    priceExs: {
      selector: 'div.js-price',
    },
    priceExsToShow: {
      selector: 'div.active',
    },
    addressExs: {
      selector: 'div',
      absence: true,
    },
  },
  titleDescr: {
    selector: 'div.content-details',
    title: {
      selector: 'h2',
    },
    desc: {
      selector: 'div.content > p',
    },
  },
  roomsBaths: {
    selector: 'div.row.text-uppercase',
    table: true,
    rooms: 'umber of rooms',
    baths: 'bain',
    beds: 'bed',
  },
  features: {
    table: true,
    floor: {
      replace: 'Type of floor',
    },
    main: {
      selector: 'tr',
      index: 4,
    },
    additional: {
      selector: 'tr',
      index: '4',
    },
  },
  agency: {
    selector: 'div.m-bot-20.col-lg-12',
    inner: {
      selector: 'span',
      innerAdress: '',
      nested: false,
    },
    phone: {
      selector: 'span.fade.hidden',
      attr: '',
      noDataAttr: true,
    },
    site: {
      selector: '',
      exs: false,
    },
    agentName: {
      selector: 'div',
    },
    link: {
      selector: 'ul.im__table',
      index: 0,
      innerSel: 'li:last-child',
      innerSelTwo: 'a',
    },
  },
  images: {
    selector: 'div.owl-item',
    imageWrapper: {
      selector: 'img',
    },
  },
  map: {
    selector: 'a.popup-image',
    linked: true,
    startSign: 'center=',
    lat: '',
    long: '',
  },
  source: 'Swiss Fine Properties',
}

mongoose
  .connect(
    'mongodb+srv://tondeMoon:T2bSJN7zck4qWy9@cluster0.k1gks.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log('mongo connected')
  })
  .catch((err) => {
    console.log('mongo not connected')
  })
;(async () => {
  let flag = true
  let res = []
  let counter = 1

  try {
    let browser = await puppeteer.launch({
      headless: true,
      devtools: true,
      // slowMo: 500,
    })
    let page = await browser.newPage()
    await page.setViewport({
      width: 1400,
      height: 900,
    })

    while (flag) {
      await page.goto(`${parsingObject.link1}${counter}${parsingObject.link2}`, { waitUntil: 'domcontentloaded' })
      await scrollPageToBottom(page, {
        size: 500,
        delay: 250,
      })
      await page.waitForSelector(`${parsingObject.waitingSelectors.overall.selector}`)

      const maxPage = await page.evaluate(async (parsingObject) => {
        let endPage =
          document
            .querySelector(parsingObject.pagination.selector)
            ?.querySelector(parsingObject.pagination.innerPagination.selector).innerText || 1
        return endPage
      }, parsingObject)

      let html = await page.evaluate(async (parsingObject) => {
        let page = []
        try {
          let divs = document.querySelectorAll(parsingObject.allLinks.selector)
          console.log(divs)

          divs.forEach((div) => {
            let obj = div.querySelector(parsingObject.allLinks.inner.selector)?.href
            if (obj) {
              page.push(obj)
            }
          })
        } catch (e) {
          console.log(e)
        }
        return page
      }, parsingObject)

      res.push(html)

      if (counter >= maxPage) {
        flag = false
      }
      counter++
      console.log(counter)
    }

    res = res.flat()
    console.log(res)

    // test webpage for parsing single house page
    // let res = [
    //   'https://www.swissfineproperties.com/luxury/flat-for+sale-bruson-723476.html?pos=69',
    //   'https://www.swissfineproperties.com/luxury/flat-for+sale-bruson-747241.html?pos=70',
    //   'https://www.swissfineproperties.com/luxury/penthouse-for+sale-la+tzoumaz-697198.html?pos=71',
    // ]

    let homes = []

    page.setDefaultNavigationTimeout(0)

    for (let i = 0; i < res.length; i++) {
      await page.goto(res[i], { waitUntil: 'load' })
      console.log(res[i], i)
      await scrollPageToBottom(page, {
        size: 500,
        delay: 250,
      })
      let html = await page.evaluate(async (parsingObject) => {
        let page = []
        try {
          let mainBlock = await document.querySelector(parsingObject.mainSection.selector)
          let titleAndDesc = await document.querySelector(parsingObject.titleDescr.selector)
          let roomsBaths = await document.querySelector(parsingObject.roomsBaths.selector)
          let agency = await document.querySelector(parsingObject.agency.selector)
          let imgContainer = await document.querySelectorAll(parsingObject.images.selector)
          let mapContainer = await document.querySelector(parsingObject.map.selector)

          const rooms = new RegExp(parsingObject.roomsBaths.rooms)
          const bath = new RegExp(parsingObject.roomsBaths.baths)
          const bed = new RegExp(parsingObject.roomsBaths.beds)

          let mainFeats = parsingObject.features.table
            ? Array.from(document.querySelectorAll(parsingObject.features.main.selector)).map((x) => x.textContent)
            : document
                .querySelectorAll(parsingObject.features.main.selector)
                [parsingObject.features.main.index]?.textContent.toString()
                ?.trim()
                .replaceAll('  ', ',')
                .split(',')

          const roomBedCommon = (regExp) =>
            Number(
              Array.from(roomsBaths.childNodes)
                .map((el) => el.innerHTML)
                ?.find((value) => regExp.test(value))
                ?.replace(/(<([^>]+)>)/gi, '')
            )

          const roomFinder = (regExp) =>
            parsingObject.roomsBaths.table
              ? parseFloat(mainFeats?.find((value) => regExp.test(value))?.match(/[\d\.]+/))
              : roomBedCommon

          const bathBedFinder = (regExp) =>
            parsingObject.roomsBaths.table
              ? parseInt(mainFeats?.find((value) => regExp.test(value))?.match(/\d+/))
              : roomBedCommon

          let restFeats = document
            .querySelectorAll(parsingObject.features.additional.selector)
            [parsingObject.features.additional.index].textContent.toString()
            ?.trim()
            .replaceAll('  ', ', ')

          const addressArray = parsingObject.agency.inner.nested
            ? Array.from(agency.querySelector(parsingObject.agency.inner.innerAdress).childNodes).filter(
                (el) => el.nodeName == '#text'
              )
            : agency

          const priceExistence = /[0-9]/.test(
            mainBlock.querySelector(parsingObject.mainSection.priceExs.selector)?.innerText.replace(/\D/g, '')
          )

          const noAddress = /agency/.test(
            mainBlock.querySelector(parsingObject.mainSection.addressExs.selector)?.innerText
          )

          const coordsFromMapLink = mapContainer.href.split(parsingObject.map.startSign)[1].slice(0, 20)

          const images = []

          imgContainer.forEach((el) => {
            const imagesrc = el
              .querySelector(parsingObject.images.imageWrapper.selector)
              ?.src.replace('NewThumbnail', 'Detail')
            images.push(imagesrc)
          })

          let obj2 = {
            type: parsingObject.type.separate
              ? document.querySelector(parsingObject.type.selector).textContent.replace(' ', ',').split(',')[0]
              : mainFeats[0],
            address: parsingObject.mainSection.addressExs.absence
              ? ''
              : mainBlock.querySelector(parsingObject.mainSection.addressExs.selector)?.innerText.trim(),
            price: priceExistence
              ? Number(
                  mainBlock.querySelector(parsingObject.mainSection.priceExs.selector)?.innerText.replace(/\D/g, '')
                )
              : mainBlock.querySelector(parsingObject.mainSection.priceExs.selector)?.innerText.trim(),
            currency: priceExistence
              ? mainBlock
                  .querySelector(parsingObject.mainSection.priceExsToShow.selector)
                  ?.innerText.trim()
                  .replace(' ', ',')
                  .split(',')[0]
              : '',
            title: titleAndDesc.querySelector(parsingObject.titleDescr.title.selector)?.innerText,
            features: restFeats,
            desc: Array.from(titleAndDesc.querySelectorAll(parsingObject.titleDescr.desc.selector))
              ?.map((x) => x.textContent)
              .toString(),
            agency: parsingObject.agency.inner.nested
              ? agency.querySelector(parsingObject.agency.inner.selector)?.innerText
              : agency?.innerText?.replaceAll('\n', ',').split(',')[0],
            agentCity: parsingObject.agency.inner.nested
              ? addressArray[addressArray.length - 1]?.textContent.trim().replace(' ', ',').split(',')[1]
              : addressArray?.innerText?.replaceAll('\n', ',').split(',')[2].replace(' ', ',').split(',')[1],
            agentAdress: parsingObject.agency.inner.nested
              ? addressArray.map((el) => el.textContent)?.toString()
              : agency?.innerText.replaceAll('\n', ','),
            businessPhone: parsingObject.agency.phone.noDataAttr
              ? agency?.querySelector(parsingObject.agency.phone.selector)?.innerText
              : agency
                  ?.querySelector(parsingObject.agency.phone.selector)
                  ?.getAttribute(parsingObject.agency.phone.attr),
            agencyWebSite: parsingObject.agency.site.exs
              ? agency.querySelector(parsingObject.agency.site.selector)?.href
              : '',
            agentName: agency?.querySelector(parsingObject.agency.agentName.selector)?.nextSibling?.innerText,
            coords: noAddress
              ? ''
              : parsingObject.map.linked
              ? coordsFromMapLink
              : `${mapContainer?.getAttribute(parsingObject.map.lat)}, ${mapContainer?.getAttribute(
                  parsingObject.map.long
                )}`,
            link: window.location.href,
            reference: parsingObject.reference.separate
              ? titleAndDesc.querySelector(parsingObject.reference.selector).innerText
              : mainFeats.find((value) => /eferen/.test(value)),
            livingSq: parseInt(
              mainFeats
                .find((value) => /iving/.test(value))
                ?.replace('(m2)', '')
                ?.match(/[\d\.]+/)[0]
            ),
            square: parseInt(
              mainFeats
                .find((value) => /sable/.test(value))
                ?.replace('(m2)', '')
                ?.match(/[\d\.]+/)[0]
            ),
            area: parseInt(
              mainFeats
                .find((value) => /area/.test(value))
                ?.replace('’', '')
                ?.match(/[\d\.]+/)[0]
            ),
            availableFrom: mainFeats.find((value) => /vailab/.test(value)),
            floor: mainFeats
              .find((value) => /floor/.test(value))
              ?.replace('(m2)', '')
              .replace(parsingObject.features.floor.replace, ''),
            // ?.match(/[\d\.]+/)[0]
            floors: parseInt(
              mainFeats
                .find((value) => /level/.test(value))
                ?.replace('(m2)', '')
                ?.match(/[\d\.]+/)[0]
            ),
            rooms: roomFinder(rooms),
            baths: bathBedFinder(bath),
            beds: bathBedFinder(bed),
            yearBuilt: parseInt(mainFeats.find((value) => /uilt/.test(value))?.match(/\d+/)[0]),
            yearRenovated: parseInt(mainFeats.find((value) => /enovat/.test(value))?.match(/\d+/)[0]),
            images: images,
            directLink: parsingObject.agency.site.exs
              ? document
                  .querySelectorAll(parsingObject.agency.link.selector)
                  [parsingObject.agency.link.index]?.querySelector(parsingObject.agency.link.innerSel)
                  ?.querySelector(parsingObject.agency.link.innerSelTwo)?.href
              : '',
            source: parsingObject.source,
          }
          page.push(obj2)
        } catch (e) {
          console.log(e)
        }
        return page
      }, parsingObject)

      homes.push(html)
      // await newPage.close()
    }

    console.log(homes)

    // await browser.close()

    homes = homes.flat()

    fs.writeFile('homes.json', JSON.stringify(homes), (err) => {
      if (err) throw err
      console.log('homes.json saved')
      console.log('homes.json length - ', res.length)
    })

    homesSc
      .insertMany(homes)
      .then(() => {
        console.log('homes saved')
      })
      .catch((err) => {
        console.log('homes not saved', err)
      })
  } catch (e) {
    console.log(e)
    //await browser.close()
  }
})()
