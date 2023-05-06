import { options } from "../index.js";

let db;

export const initializeDB = (() => {
  let _promise;
  return async () => {
    if (!_promise) {
      _promise = new Promise(async (resolve, reject) => {
        console.log('Initializing DB')
        // Check for IndexedDB support
        if (!("indexedDB" in window)) {
          alert(
            "This browser does not support IndexedDB. Please use a modern browser like Chrome, Firefox, or Safari."
          )
          return
        }

        const dbName = `Autotune_${options.user}`
		// If you add any more objectStores, you need to increment the version number
        const dbVersion = 2

        // Open or create the database
        const request = indexedDB.open(dbName, dbVersion)

        request.onupgradeneeded = (event) => {
          const db = event.target.result

          // Check if objectStores exist and create if it doesn't
          if (!db.objectStoreNames.contains('BGs')) {
            const objectStore = db.createObjectStore('BGs', {
              keyPath: "key",
            })
          }
          if (!db.objectStoreNames.contains('Profiles')) {
            const objectStore = db.createObjectStore('Profiles', {
              keyPath: "key",
            })
          }
          if (!db.objectStoreNames.contains('Basal_Rates')) {
            const objectStore = db.createObjectStore('Basal_Rates', {
              keyPath: "key",
            })
          }
          if (!db.objectStoreNames.contains('Boluses')) {
            const objectStore = db.createObjectStore('Boluses', {
              keyPath: "key",
            })
          }
          if (!db.objectStoreNames.contains('Combined_Data')) {
            const objectStore = db.createObjectStore('Combined_Data', {
              keyPath: "key",
            })
          }

        //   console.log("Database upgrade is complete")
        }

        request.onsuccess = (event) => {
          db = event.target.result;
        //   console.log("Database opened successfully:", db)
          resolve(db);
        }

        request.onerror = (event) => {
          console.log("Error opening database:", event.target.errorCode)
          reject(event.target.error)
        }
      });
    }
    return _promise;
  };
})();

export async function saveData(objectStoreName, key, value, timestamp) {
	// await initializeDB(); // Ensure the database is initialized
	// console.log('objectStoreName: ', objectStoreName, 'key: ', key, 'value: ', value, 'timestamp: ', timestamp)

	// Get the data type of the variable
	let dataType = typeof value

	// Check for Date objects and null
	if (value instanceof Date) {
		dataType = "date"
	} else if (value === null) {
		dataType = "null"
	}

	// Convert objects to string, except for Date objects
	if (dataType === "object" && !(value instanceof Date)) {
		value = JSON.stringify(value)
	}

	// Define the data object to store, including the variable name, value, and data type
	const dataObject = {
		key: key,
		value: value,
		dataType: dataType,
		timestamp: timestamp,
	}

	return new Promise((resolve, reject) => {
		// Create a transaction with readwrite mode
		const transaction = db.transaction([objectStoreName], "readwrite")

		// Get the object store
		const objectStore = transaction.objectStore(objectStoreName)

		// Add or update the data object in the object store using the put method
		const putRequest = objectStore.put(dataObject)

		// Handle the success event of the put request
		putRequest.onsuccess = (event) => {
			resolve(event.target.result)
		}

		// Handle the error event of the put request
		putRequest.onerror = (event) => {
		console.log(
			"Error saving data to the database:",
			event.target.error
		)
		reject(event.target.error)
		}
	})
}

export async function getData(objectStoreName, key) {
	return new Promise((resolve, reject) => {
		// Create a transaction with readonly mode
		const transaction = db.transaction([objectStoreName], "readonly")

		// Get the object store
		const objectStore = transaction.objectStore(objectStoreName)

		// Get the data object using the specified key
		const getRequest = objectStore.get(key)

		// Handle the success event of the get request
		getRequest.onsuccess = (event) => {
			const dataObject = event.target.result

			if (dataObject) {
				let value = dataObject.value

				// Parse the value based on its data type
				switch (dataObject.dataType) {
					case "object":
					case "array":
						value = JSON.parse(value)
						break
					case "date":
						value = new Date(value)
						break
					case "null":
						value = null
						break
					default:
						break
				}

				// console.log(`Data retrieved for key '${key}':`, value);
				resolve(value)
			} else {
				// console.log(`No data found for key '${key}'`)
				resolve(null)
			}
		}

		// Handle the error event of the get request
		getRequest.onerror = (event) => {
			console.log("Error retrieving data:", event.target.error)
			reject(event.target.error)
		}
	})
}

export async function closeDB() {
	if (db) {
		db.close()
		// console.log("Database connection closed")
	} else {
		// console.log("No database connection to close")
	}
}

export async function getTimestamp(objectStoreName, key) {
	return new Promise((resolve, reject) => {
		// Create a transaction with readonly mode
		const transaction = db.transaction([objectStoreName], "readonly")

		// Get the object store
		const objectStore = transaction.objectStore(objectStoreName)

		// Get the data object using the specified key
		const getRequest = objectStore.get(key)

		// Handle the success event of the get request
		getRequest.onsuccess = (event) => {
			const dataObject = event.target.result

			if (dataObject) {
				const timestamp = dataObject.timestamp
				// console.log(`Timestamp retrieved for key '${key}':`, timestamp)
				resolve(timestamp)
			} else {
				console.log(`No data found for key '${key}'`)
				resolve(null)
			}
		}

		// Handle the error event of the get request
		getRequest.onerror = (event) => {
			console.log("Error retrieving timestamp:", event.target.error)
			reject(event.target.error)
		}
	})
}