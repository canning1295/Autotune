import {saveData, initializeDB, getData} from "../localDatabase.js"

export async function getTempBasalData(options) {
	let currentDate = new Date(options.dateStart)
	let nextDate = new Date(currentDate)
	nextDate.setDate(currentDate.getDate() + 1)
	currentDate = currentDate.toISOString().split("T")[0]
	nextDate = new Date(nextDate).toISOString().split("T")[0]
	let daysDiff =
		Math.floor(
			(new Date(options.dateEnd) - new Date(options.dateStart)) /
				(1000 * 60 * 60 * 24)
		) + 1

	for (let i = 0; i < daysDiff; i++) {
		const tempBasalUrl = options.url.concat(
			"api/v1/treatments.json?find[created_at][$gte]=",
			currentDate.toISOString(),
			"&find[created_at][$lte]=",
			nextDate.toISOString(),
			"&find[eventType]=Temp+Basal",
			"&count=1000000"
		)
		console.log("Grabbing Temp Basals from Nightscout...", tempBasalUrl)
		const response = await fetch(tempBasalUrl)
		const tempBasalJSON = await response.json()

		console.log("Success(" + getSize(tempBasalJSON) + " KB)")

		let tempBasals = []
		tempBasalJSON.map((i) => {
			tempBasals.push({
				rate: i.rate,
				duration: i.duration,
				created_at: new Date(i.created_at),
			})
		})

		tempBasals = tempBasals.reverse()

		// Fixup temp basal durations to account for rounding discrepancies and errors in the logging
		for (let i = 1; i < tempBasals.length; i++) {
			let previousEnd = new Date(
				tempBasals[i - 1].created_at.getTime() +
					tempBasals[i - 1].duration * 60 * 1000
			)
			const currentStart = tempBasals[i].created_at
			if (previousEnd > currentStart) {
				const diff =
					(currentStart.getTime() -
						tempBasals[i - 1].created_at.getTime()) /
					(60 * 1000)
				tempBasals[i - 1].duration = diff
			}
		}

		// add 1 day to currentDate and nextDate
		currentDate = new Date(currentDate)
		currentDate.setDate(currentDate.getDate() + 1)
		currentDate = currentDate.toISOString().split("T")[0]
		nextDate = new Date(nextDate)
		nextDate.setDate(nextDate.getDate() + 1)
		nextDate = nextDate.toISOString().split("T")[0]
	}
}

function getSize(obj) {
	return (
		Math.round(
			(new TextEncoder().encode(JSON.stringify(obj)).length / 1024) * 10
		) / 10
	)
}

//This divides the basal insulin into 5 minute periods and includes default basal and temp basal insulin. It does not include bolus basal inuslin.
function averageNetTempBasalsByPeriod(netTempBasals, currentDate, daysDiff) {
	const sumNetTempBasals = netTempBasals.reduce((acc, obj) => {
		return acc + (obj.rate / 60) * obj.duration
	}, 0)

	let averageNetTempBasals = new Array(288).fill(null) // Array to hold the average basal rate for each 5-minute period
	netTempBasals.forEach((obj, index) => {
		let tbStart = new Date(obj.created_at)
		let tbEnd = new Date(new Date(tbStart.getTime() + obj.duration * 1000 * 60))
		let duration = obj.duration
		let numPeriods = Math.ceil(duration / 5) // Calculate the number of periods in the basal period

		let avgAmount = (duration * obj.rate) / 60 / numPeriods
		if (numPeriods == 0) {avgAmount = 0}
		let currentPosition = tbEnd.getHours() * 12 + Math.floor(tbEnd.getMinutes() / 5)
		let closestPeriodToTbstart = new Date(tbStart).setSeconds(0)
		let minutes = Math.ceil(tbStart.getMinutes() / 5) * 5
		if (tbStart.getMinutes() == 0) {closestPeriodToTbstart = new Date(closestPeriodToTbstart).setMinutes(minutes + 5)} 
		else {closestPeriodToTbstart = new Date(closestPeriodToTbstart).setMinutes(minutes)}
		let loopCounter = Math.ceil(duration / 5)
		for (let i = loopCounter; i >= 0; i--) {
			if (currentPosition === 0 && i > 0) {currentPosition = 287}
			if (averageNetTempBasals[currentPosition] === null) {
				averageNetTempBasals[currentPosition] = avgAmount
			} else {averageNetTempBasals[currentPosition] += avgAmount}

			if (currentPosition < 0 || currentPosition > averageNetTempBasals.length) {
				console.log(
					"currentPosition",
					currentPosition,
					"netTempBasals WHILE LOOP:",
					index,
					"tbEnd",
					tbEnd
				)
			}
			currentPosition--
		}
	})

	;(function (arr) {
		let sum = 0
		for (let i = 0; i < arr.length; i++) {
			let currentValue = arr[i]
			sum += currentValue
		}
		console.log("AverageNetTempBasal Sum:", sum)
		return sum
	})(averageNetTempBasals)

	// console.log('sum of averageNetTempBasals: I SHOULD EQUAL THE VALUE ABOVE:',averageNetTempBasals.reduce((a, b) => a + b, 0))
	for (let i = 0; i < averageNetTempBasals.length; i++) {
		averageNetTempBasals[i] = averageNetTempBasals[i] / daysDiff
	}
	console.log("averageNetTempBasalsByPeriod", averageNetTempBasals)
	console.log("daysDiff", daysDiff)
	console.log(
		"sum of averageNetTempBasalsByPeriodI SHOULD EQUAL THE VALUE ABOVE divided by # of days:",
		averageNetTempBasals.reduce((a, b) => a + b, 0)
	)

	return averageNetTempBasals
}

export function getNetTempBasals(){
	const basalProfiles = JSON.parse(localStorage.getItem('profile'))
	const tempBasals = JSON.parse(localStorage.getItem('tempBasals'))
	let netTempBasals = []
	let createdDate = new Date(tempBasals[0].created_at)
	createdDate.setHours(0,0,0,0)
	createdDate.setDate(createdDate.getDate() - 1)
  
	for (let i = 0; i < tempBasals.length; i++) { 
	  let currentDate = new Date(tempBasals[i].created_at)
	  currentDate.setHours(0,0,0,0)
		if(currentDate > createdDate && i == tempBasals.length - 1) 
		  {tempBasals[i].duration = 0}
		if(i == 0 || currentDate > createdDate) {
		  createdDate = currentDate
		  tempBasals.splice(i, 0,{
			rate: 0,
			duration: 0,
			created_at: createdDate
		  })
		}
	}
	console.log('TempBasals',tempBasals)
	for(let i = 0; i < tempBasals.length-1; i++){
	  const currentBasal = {
		rate: tempBasals[i].rate,
		duration: tempBasals[i].duration,
		created_at: new Date(tempBasals[i].created_at)
	  }
	  netTempBasals.push(currentBasal)
	  let tbStart = new Date(tempBasals[i].created_at)
	  let tbEnd = new Date(new Date(tbStart).setMinutes(tbStart.getMinutes() + tempBasals[i].duration))
	  let nextTbStart = new Date(tempBasals[i+1].created_at)
	  if(tbEnd < nextTbStart){
		  pushBasalProfiles(basalProfiles, tbEnd, netTempBasals, nextTbStart)
	  } 
	}
  
	console.log('netTempBasals',netTempBasals)
	return netTempBasals
  }
  //This is tied to the getNetBasals function. getNetBasals returns the actual basal rates through the time periods 
  function pushBasalProfiles(basalProfiles, tbEnd, netTempBasals, nextTbStart){
	// console.log('tbEnd',tbEnd)
	let profile = []
	basalProfiles.map((obj) =>{
	  if(tbEnd >= new Date(obj.startDate) && tbEnd <= new Date(obj.endDate)){
		  profile = obj.basal.map((x) => x)
		  profile.push({
				  value: profile![0].value,
				  time: profile![0].time,
				  timeAsSeconds: 60 * 60 * 24
			  })
	  }
	})
	
	for(let i = 0; i < profile.length -1; i++){
		let bStart = new Date(new Date(tbEnd).setHours(0,0,profile[i].timeAsSeconds,0))
		let bEnd = new Date(new Date(tbEnd).setHours(0,0,profile[i+1].timeAsSeconds,0))
		let bFinal = new Date(new Date(tbEnd).setHours(0,0,60 * 60 * 24,0))
		if (tbEnd >= bStart && tbEnd <= bEnd){
			let newBEnd = (bEnd < nextTbStart) ? new Date(bEnd) : new Date(nextTbStart)
			if(newBEnd = bFinal){newBEnd = new Date(nextTbStart)}
			let created_at = new Date(tbEnd)
			let duration = (newBEnd.getTime() - created_at.getTime()) / (1000 * 60)
			let rate = profile[i].value
			netTempBasals.push({
					rate: rate,
					duration: duration,
					created_at: created_at,
			})
			tbEnd = new Date(tbEnd.getTime() + duration * 1000 * 60)
		} else ('No basal rate found for this time period.')
	}
  }