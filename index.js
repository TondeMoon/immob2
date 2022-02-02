const fs = require('fs')
const puppeteer = require('puppeteer')
const mongoose = require('mongoose')
const eventSchema = require('./homeSchema')

let link1 = 'https://www.immobilier.ch/en/buy/apartment-house/valais/verbier/page-'
let link2 = '?group=1'

// mongoose
//   .connect(
//     'mongodb+srv://tondeMoon:T2bSJN7zck4qWy9@cluster0.k1gks.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
//     { useNewUrlParser: true, useUnifiedTopology: true }
//   )
//   .then(() => {
//     console.log('mongo connected')
//   })
//   .catch((err) => {
//     console.log('mongo not connected')
//   })
;(async () => {
  let flag = true
  let res = []
  let counter = 1
  const maxPage = 1

  try {
    let browser = await puppeteer.launch({
      headless: false,
      devtools: true,
    })
    let page = await browser.newPage()
    await page.setViewport({
      width: 1400,
      height: 900,
    })

    // while (flag) {
    //   await page.goto(`${link1}${counter}${link2}`, { waitUntil: 'domcontentloaded' })
    //   await page.waitForSelector('div.filter-results-holder')
    //   console.log(counter)

    //   let html = await page.evaluate(
    //     async () => {
    //       let page = []
    //       try {
    //         let divs = await document.querySelectorAll('div.filter-item-container')
    //         console.log(divs)

    //         divs.forEach((div) => {
    //           let obj = div.querySelector('a')?.href
    //           if (obj) {
    //             page.push(obj)
    //           }
    //         })
    //       } catch (e) {
    //         console.log(e)
    //       }
    //       return page
    //     },
    //     { waitUntil: 'div.filter-results-holder' }
    //   )

    //   await res.push(html)

    //   if (counter >= maxPage) {
    //     flag = false
    //   }
    //   counter++
    // }

    //res = res.flat()

    // test webpage for parsing single house page
    let res = ['https://www.immobilier.ch/en/buy/house/valais/verbier/vfp-immobilier-222/big-tave-659210']

    let homes = []

    for (let i = 0; i < res.length; i++) {
      await page.goto(res[i], { waitUntil: 'load' })
      let html = await page.evaluate(
        async () => {
          window.scrollBy(0, window.innerHeight)
          let page = []
          try {
            let mainBlock = await document.querySelector('section.im__col')
            let titleAndDesc = await document.querySelector('div.im__postContent__body')
            let mainFeatures = await document.querySelectorAll('ul.im__characteristic-list')
            let agency = await document.querySelector('div.im__col-content')
            let imgContainer = await document.querySelectorAll('div.im__banner__slide')
            let mapContainer = await document.querySelector('div.mapContainer')

            // let images = []

            // imgContainer.forEach((el) => {
            //   const imagesrc = el.querySelector('img.valign--top')?.src
            //   images.push(imagesrc)
            //   console.log(imagesrc)
            // })

            // console.log(imgContainer)

            // mainFeatures.forEach((el) => {
            //   let obj = el.querySelector('li')?.innerHTML
            //   page.push(obj)
            // })

            let lis = await document.querySelectorAll('ul.im__table')[1].textContent

            // let featuresArr = []

            // lis.forEach((div) => {
            //   let obj = div.querySelector('span.im__assets__title')?.innerText
            //   if (obj) {
            //     featuresArr.push(obj)
            //   }
            // })

            let obj2 = {
              address: mainBlock.querySelector('div.object-address').innerText,
              price: mainBlock.querySelector('h2').innerText,
              title: titleAndDesc.querySelector('h2').innerText,
              features: lis.toString().trim(),
              desc: Array.from(titleAndDesc.querySelectorAll('p'))
                .map((x) => x.innerText)
                .toString(),
              agency: agency.querySelector('strong').innerText,
              agentAdress: agency.querySelector('address').innerText,
              businessPhone: agency.querySelector('a.im__btn').getAttribute('data-tel-num'),
              agencyWebSite: agency.querySelector('a.link-detail-agency-url').href,
              agentName: agency.querySelector('span.small-title')?.nextSibling?.innerText,
              coords: `${mapContainer?.getAttribute('_centerx')}, ${mapContainer?.getAttribute('_centery')}`,
            }
            page.push(obj2)
          } catch (e) {
            console.log(e)
          }
          return page
        },
        { waitUntil: 'div.im__row__assestGallery' }
      )
      await homes.push(html)
      // await newPage.close()
    }

    console.log(homes)

    // await browser.close()

    fs.writeFile('homes.json', JSON.stringify({ data: homes }), (err) => {
      if (err) throw err
      console.log('homes.json saved')
      console.log('homes.json length - ', res.length)
    })

    //   res = res.flat()

    //   const dataForSave = new eventSchema({ data: res })
    //   dataForSave
    //     .save()
    //     .then(() => {
    //       console.log('saved')
    //     })
    //     .catch((err) => {
    //       console.log('not saved')
    //     })
  } catch (e) {
    console.log(e)
    await browser.close()
  }
})()
