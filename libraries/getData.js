let profile = undefined

export async function getUserProfiles(options) {
  console.log('getAllProfiles started')
  const response = await fetch(options.url + 'api/v1/profile.json?count=10000000')
  console.log("Profile: ",options.url, 'api/v1/profile.json?count=10000000'  )
  profile = (await response.json()).reverse()
  profile = setProfiles(profile, options)
  return profile
}

//This returns default profile settings for the period selected
export async function setProfiles(profile, options) {
  console.log('setProfiles started')
  const basalProfiles = []
  let start = false
  for (let i = 0; i < profile.length; i++) {
    let obj = profile[i]
    let startDate = new Date(obj.startDate)
    let endDate = new Date(
      i + 1 < profile.length ? profile[i + 1].startDate : new Date()
    )
    let basalProfile = {
      startDate: startDate,
      endDate: endDate,
      basal: obj.store.Default.basal,
      carbRatio: obj.store.Default.carbratio,
      isf: obj.store.Default.sens,
      lowTarget: obj.store.Default.target_low,
      highTarget: obj.store.Default.target_high
    }
    if (options.dateStart > startDate && options.dateStart < endDate) {
      basalProfiles.push(basalProfile)
      start = true
    } else if (options.dateEnd > startDate && options.dateEnd < endDate) {
      basalProfiles.push(basalProfile)
      break
    } else if (start) {
      basalProfiles.push(basalProfile)
    }
  }
  console.log('Basal Profiles111111111111:', basalProfiles)
  return basalProfiles

}

export async function getBG(options) {
  const bgUrl = options.url.concat(
    'api/v1/entries/sgv.json?find[dateString][$gte]=',
    options.dateStart.toISOString(),
    '&find[dateString][$lte]=',
    options.dateEnd.toISOString(),
    '&count=1000000'
  )

  console.log('Grabbing BGs JSON from Nightscout...', [{ bgUrl }])
  const response = await fetch(bgUrl)
  const bgJSON = await response.json()
  console.log('Success(' + getSize(bgJSON) + ' KB)')

  let bgArray = []
  bgJSON.map((i) => {
    bgArray.push({
      bg: i.sgv,
      time: new Date(i.dateString),
    })
  })

  //Split the BGs array into multiple arrays that each contain only a single day's worth of BGs
  let bgsArray = _.chain(bgArray.reverse())
    .flatten(true)
    .groupBy(function (obj) {
      return obj.time.getDate()
    })
    .sortBy(function (v) {
      return v
    })
    .value()

  return bgsArray.reverse()
}

export async function getTempBasal(url, dateStart, dateEnd) {
  const tempBasalUrl = url.concat(
    'api/v1/treatments.json?find[created_at][$gte]=',
    dateStart.toISOString(),
    '&find[created_at][$lte]=',
    dateEnd.toISOString(),
    '&find[eventType]=Temp+Basal',
    '&count=1000000'
  )
  console.log('Grabbing Temp Basals from Nightscout...', [{ tempBasalUrl }])
  const response = await fetch(tempBasalUrl)
  const tempBasalJSON = await response.json()

  console.log('Success(' + getSize(tempBasalJSON) + ' KB)')

  let tempBasals = []
  tempBasalJSON.map((i) => {
    tempBasals.push({
      rate: i.rate,
      duration: i.duration,
      created_at: new Date(i.created_at),
    })
  })

  tempBasals = tempBasals.reverse()

  //Fixup temp basal durations to account for rounding discrepancies and errors in the logging
  for (let i = 1; i < tempBasals.length; i++) {
    let previousEnd = new Date(
      tempBasals[i - 1].created_at.getTime() +
        tempBasals[i - 1].duration * 60 * 1000
    )
    const currentStart = tempBasals[i].created_at
    if (previousEnd > currentStart) {
      const diff =
        (currentStart.getTime() - tempBasals[i - 1].created_at.getTime()) /
        (60 * 1000)
      tempBasals[i - 1].duration = diff
    }
  }

  return tempBasals
}

export async function getAllBoluses(options) {
  const carbCorrectionUrl = options.url.concat(
    'api/v1/treatments.json?find[created_at][$gte]=',
    options.dateStart.toISOString(),
    '&find[created_at][$lte]=',
    options.dateEnd.toISOString(),
    '&find[eventType]=Carb+Correction',
    '&count=1000000'
  )
  console.log('Grabbing Bolus Data from Nightscout...', [{ carbCorrectionUrl }],carbCorrectionUrl)
  const response1 = await fetch(carbCorrectionUrl)
  const carbCorrectionJSON = (await response1.json()).reverse()

  console.log('Success(' + getSize(carbCorrectionJSON) + ' KB)')
  const bolusUrl = options.url.concat(
    'api/v1/treatments.json?find[$or][0][created_at][$gte]=',
    options.dateStart.toISOString(),
    '&find[created_at][$lte]=',
    options.dateEnd.toISOString(),
    '&find[eventType]=Correction+Bolus'
  )
  console.log('Grabbing Bolus Data from Nightscout...', [{ bolusUrl }],bolusUrl)
  const response2 = await fetch(bolusUrl)
  const bolusJSON = (await response2.json()).reverse()

  console.log('Success(' + getSize(bolusJSON) + ' KB)')
  //prepend carbCorrectionJSON to bolusJSON
  bolusJSON.unshift(...carbCorrectionJSON)

  return bolusJSON;
}

function getSize(obj) {
  return Math.round((new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10) / 10
}