export function addUserToDB() {
	console.log('Initializing IndexedDB')
	const dbName = `autotuneDB_${options.user}` // Database name
	const storeName = `user_data_${options.user}` // Store name
	const openRequest = indexedDB.open(dbName);

	openRequest.onsuccess = function(event) {
		const db = event.target.result;
		if (db.objectStoreNames.contains(storeName)) {
			console.log('Object store exists', storeName);
		} else {
			console.log('Object store does not exist', storeName);
		}
	}

	openRequest.onerror = function (event) {
		console.error("Error opening IndexedDB database", event.target.error)
	}

	openRequest.onupgradeneeded = function (event) {
		// console.log('onupgradeneeded called', event)
		const db = event.target.result

		// Check if the object store already exists
		if (!db.objectStoreNames.contains(storeName)) {
			// If it doesn't, create the object store
			const store = db.createObjectStore(storeName)
			console.log('Created object store', storeName)
			// You can also define any indexes or other properties of the object store here
			// store.createIndex(...);
		} else {
			console.log('Object store exists', storeName)
		}
	}
}

export function saveData(username, key, data) {
    const dbName = `autotuneDB`;
    const storeName = `user_data_${username}`;
    const openRequest = indexedDB.open(dbName);

    openRequest.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        // Convert the data to a storable format
        const value = JSON.stringify({ type: typeof data, value: data });

        // Save the data to the object store
        store.put(value, key);
    };
}

export function getData(username, key) {
    return new Promise((resolve, reject) => {
        const dbName = `autotuneDB`;
        const storeName = `user_data_${username}`;
        const openRequest = indexedDB.open(dbName);

        openRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(storeName);
            const store = transaction.objectStore(storeName);
            const getRequest = store.get(key);

            getRequest.onsuccess = function(event) {
                // Convert the data back to its original form
                let data;
                try {
                    const parsedData = JSON.parse(event.target.result);
                    data = parsedData.value;
                } catch (error) {
                    data = event.target.result;
                }

                resolve(data);
            };

            getRequest.onerror = function(event) {
                reject(event.target.error);
            };
        };

        openRequest.onerror = function(event) {
            reject(event.target.error);
        };
    });
}
