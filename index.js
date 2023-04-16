//Import getUserProfiles from getData.js
import { getUserProfiles } from './libraries/getData.js'

export const options = {
    url: 'https://canning.herokuapp.com/',
    dateStart: new Date('2022-12-08T00:00'),
    dateEnd: new Date('2022-12-15T00:00'),
    COBRate: 30,
    adjustBasalRates: true,
    ISF: 27,
    weight: 80,
    minBG: NaN,
    targetBG: 110,
    poolingTime: 120,
    period: 30
  }

getUserProfiles(options)