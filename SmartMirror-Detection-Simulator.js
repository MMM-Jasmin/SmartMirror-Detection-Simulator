/**
 * @file SmartMirror-Detection-Simulator.js
 *
 * @author cstollen
 * @license MIT
 *
 * @see
 */

Module.register("SmartMirror-Detection-Simulator", {
	defaults: {
		image_width: 1920,
		image_height: 1080,
		simFps: 30,
		forceShow: true,
		widgetWidth: 0,
		widgetHeight: 0,

		wheelDistanceEnabled: true, // Enable setting gesture and object distance using the mouse wheel
	},

	lastMousemove: 0.0,
	isPressCtrl: false,
	isPressAlt: false,
	isPressShift: false,
	wheelScale: 1.0,
	posX: 0,
	posY: 0,
	simTimer: 0,
	modulesStarted: false,
	gestures: [{}],
	gesturesMeta: [{}],
	objects: [{}],
	objectsMeta: [{}],
	faces: [{}],
	facesMeta: [{}],
	persons: [{}],
	personsMeta: [{}],
	widgetDom: undefined,
	names: {},
	simGestures: false,
	simObjects: false,
	simFaces: false,
	simPersons: false,
	wheelDistance: 1000, // Starting distance to the camera in mm
	wheelDistanceIncement: 10, // Mouse wheel distance increment in mm

	/**
	 * Requests any additional stylesheets that need to be loaded.
	 * @return {Array} Additional style sheet filenames as array of strings.
	 */
	getStyles() {
		return ["font-awesome.css", this.data.path + "/public/SmartMirror-Detection-Simulator.css"];
	},

	/**
	 * Called when all modules are loaded and the system is ready to boot up.
	 */
	start: function () {
		Log.info(this.name + " started!");
		var self = this;

		// Add key event listeners
		document.addEventListener("keydown", function (event) {
			if (event.code == "KeyZ" && (event.ctrlKey || event.metaKey)) {
				Log.info("CTRL+Z pressed");
			} else if (event.code == "ControlLeft") {
				self.isPressCtrl = true;
			} else if (event.code == "AltLeft") {
				self.isPressAlt = true;
			} else if (event.code == "ShiftLeft") {
				self.isPressShift = true;
			}
		});
		document.addEventListener("keyup", function (event) {
			if (event.code == "ControlLeft") {
				self.isPressCtrl = false;
			} else if (event.code == "AltLeft") {
				self.isPressAlt = false;
			} else if (event.code == "ShiftLeft") {
				self.isPressShift = false;
			}
		});

		// Add mouse event listeners
		document.addEventListener("wheel", function (event) {
			var scale = self.wheelScale;
			self.wheelScale += event.deltaY * -0.001;
			self.wheelScale = Math.min(Math.max(-100.0, self.wheelScale), 100.0);
			if (self.config.wheelDistanceEnabled) {
				self.wheelDistance += Math.sign(event.deltaY) * 10; // 1cm increments for mouse wheel distance change
				self.wheelDistance = Math.min(Math.max(200.0, self.wheelDistance), 4000.0); // min: 20cm, max: 4m
				console.debug("wheelDistance = " + self.wheelDistance);
			}
		});
		document.addEventListener("mousemove", this.updatePos.bind(this));

		// Start simulation interval
		this.simTimer = setInterval(this.simFrame.bind(this), Math.floor(1000 / this.config.simFps));

		this.loadNames("gestures", "hand.names");
		this.loadNames("objects", "coco.names");
		this.loadWidget();
	},

	/**
	 * Called when all modules have started.
	 */
	postinit: function () {
		// Force show
		if (this.config.forceShow && this.hidden) {
			this.show(0, { force: true });
		}

		var self = this;
		setTimeout(function () {
			self.modulesStarted = true;
		}, 1000);

		// this.menuSelect();
	},

	/**
	 * Loads entity names linewise from a textfile.
	 * @param {String} nameType Type of the loaded names
	 * @param {Sting} filename Filename of the text file to load
	 */
	loadNames: function (nameType, filename) {
		const namesPath = this.data.path + "public/" + filename;
		var self = this;
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (this.readyState == 4 && this.status == 200) {
				const namesString = this.responseText;
				self.names[nameType] = namesString.split("\n").filter(function (el) {
					return el.length != 0;
				});
			}
			if (this.status == 404) {
				Log.info("Names file not found: " + namesPath);
			}
		};
		xmlhttp.onabort = xmlhttp.onerror = function () {
			Log.info("Names file request error: " + xmlhttp.responseText);
		};
		xmlhttp.open("GET", namesPath, true);
		xmlhttp.responseType = "text";
		xmlhttp.send();
	},

	/**
	 * Loads the display widget from the HTML file.
	 */
	loadWidget: function () {
		const widgetPath = this.data.path + "public/SmartMirror-Detection-Simulator.html";
		var self = this;
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (this.readyState == 4 && this.status == 200) {
				self.initWidget(this);
			}
			if (this.status == 404) {
				Log.info("Widget HTML file not found: " + widgetPath);
			}
		};
		xmlhttp.onabort = xmlhttp.onerror = function () {
			Log.info("Widget HTML request error: " + xmlhttp.responseText);
		};
		xmlhttp.open("GET", widgetPath, true);
		xmlhttp.responseType = "document";
		xmlhttp.send();
	},

	/**
	 * Initializes the display widget.
	 * @param {XMLHttpRequest} widgetXML The loaded widget HTML document
	 */
	initWidget: function (widgetXML) {
		var widgetDoc = widgetXML.responseXML;

		// Init gesture drop down select
		var gestSelects = widgetDoc.querySelectorAll(".gestureForm .entryName");
		for (let sel of gestSelects) {
			for (var i = 0; i < this.names.gestures.length; i++) {
				var option = document.createElement("option");
				option.value = this.names.gestures[i];
				option.innerHTML = this.names.gestures[i];
				if (option.value === "flat_right") {
					option.selected = true;
				}
				sel.appendChild(option);
			}
		}

		// Init object drop down select
		var objSelects = widgetDoc.querySelectorAll(".objectForm .entryName");
		for (let sel of objSelects) {
			for (var i = 0; i < this.names.objects.length; i++) {
				var option = document.createElement("option");
				option.value = this.names.objects[i];
				option.innerHTML = this.names.objects[i];
				if (option.value === "person") {
					option.selected = true;
				}
				sel.appendChild(option);
			}
		}

		// Init hide button
		var hideButton = widgetDoc.querySelector("#hideButton");
		var content = widgetDoc.querySelector("#content");
		hideButton.onclick = () => {
			content.classList.toggle("collapsed");
			if (content.classList.contains("collapsed")) {
				hideButton.innerHTML = "show";
			} else {
				hideButton.innerHTML = "hide";
			}
		};

		// Init form callbacks
		var forms = widgetDoc.querySelectorAll("form");
		var self = this;
		for (let form of forms) {
			// Init form add and delete buttons
			form.querySelector(".deleteButton").classList.add("hidden");
			form.querySelector(".addButton").onclick = (event) => {
				if (event.target.parentNode.className === "gestureForm") {
					this.gestures.push({});
					this.gesturesMeta.push({});
				} else if (event.target.parentNode.className === "objectForm") {
					this.objects.push({});
					this.objectsMeta.push({});
				} else if (event.target.parentNode.className === "faceForm") {
					this.faces.push({});
					this.facesMeta.push({});
				} else if (event.target.parentNode.className === "personForm") {
					this.persons.push({});
					this.personsMeta.push({});
				}
				var newForm = event.target.parentNode.cloneNode(true);
				newForm.querySelector(".addButton").classList.add("hidden");
				var deleteButton = newForm.querySelector(".deleteButton");
				deleteButton.classList.remove("hidden");
				deleteButton.onclick = (event) => {
					event.target.parentNode.remove();
				};

				var newFormInputs = newForm.querySelectorAll("input, select");
				for (let formInput of newFormInputs) {
					formInput.onchange = (event) => {
						this.formCallback(newForm);
					};
				}

				event.target.parentNode.parentNode.appendChild(newForm);
				this.formCallback(newForm);
			};

			// Callbacks for category checkboxes
			var catCheckbox = form.parentNode.querySelector("input.categoryCheckbox");
			catCheckbox.onchange = (event) => {
				switch (event.currentTarget.id) {
					case "gestureCheckbox":
						this.simGestures = event.currentTarget.checked;
						break;
					case "objectCheckbox":
						this.simObjects = event.currentTarget.checked;
						break;
					case "faceCheckbox":
						this.simFaces = event.currentTarget.checked;
						break;
					case "personCheckbox":
						this.simPersons = event.currentTarget.checked;
						break;
				}
				this.formCallback(form);
			};

			// Callbacks for input and select tags inside form
			var formInputs = form.querySelectorAll("input, select");
			for (let formInput of formInputs) {
				formInput.onchange = (event) => {
					this.formCallback(form);
				};
			}

			// Init from form entries
			this.formCallback(form);
		}

		// Fetch widget from HTML file
		this.widgetDoc = widgetDoc.querySelector("#widget");
		// Set width and height
		if (this.config.widgetWidth > 0) {
			widgetDoc.querySelector("#content").style.width = this.config.widgetWidth + "px";
		}
		if (this.config.widgetHeight > 0) {
			widgetDoc.querySelector("#content").style.height = this.config.widgetHeight + "px";
		}

		this.updateDom();
	},

	/**
	 * Callback for form value changes.
	 * @param {Element} form The form element that changed
	 */
	formCallback: function (form) {
		var index = Array.prototype.indexOf.call(form.parentNode.children, form) - 1;
		var entry = {};
		var meta = {};
		const formData = new FormData(form);
		for (const [key, value] of formData.entries()) {
			if (key === "move" || key === "movekey" || key === "scale" || key === "scalevalue") {
				meta[key] = value;
			} else {
				//if (key === "TrackID" || key === "id") {
				if (key === "TrackID" || key === "ID") {
					entry[key] = parseInt(value);
				} else if (key === "confidence") {
					entry[key] = parseFloat(value);
				} else {
					entry[key] = value;
				}
			}
		}
		switch (form.className) {
			case "gestureForm":
				this.gestures[index] = entry;
				this.gesturesMeta[index] = meta;
				break;
			case "objectForm":
				this.objects[index] = entry;
				this.objectsMeta[index] = meta;
				break;
			case "faceForm":
				this.faces[index] = entry;
				this.facesMeta[index] = meta;
				break;
			case "personForm":
				this.persons[index] = entry;
				this.personsMeta[index] = meta;
				break;
		}
	},

	/**
	 * Updates UI on screen by returning a current DOM object.
	 * @return {Element} The current DOM object in form of a div element.
	 */
	getDom: function () {
		var wrapper = document.createElement("div");

		if (this.widgetDoc) {
			// Log.info("Widget DOM loaded");
			wrapper.appendChild(this.widgetDoc);
		} else {
			// Log.info("Widget DOM not loaded yet");
		}

		return wrapper;
	},

	/**
	 * Simulates detection messages for one frame.
	 */
	simFrame: function () {
		// Force show
		if (this.config.forceShow && this.hidden) {
			this.show(0, { force: true });
		}

		if (this.modulesStarted) {
			const simFlags = [this.simGestures, this.simObjects, this.simFaces, this.simPersons];
			var simData = [this.gestures, this.objects, this.faces, this.persons];
			var simMeta = [this.gesturesMeta, this.objectsMeta, this.facesMeta, this.personsMeta];

			// Create recognized person placeholder
			var recPersons = {};
			/*
			for (var i = 0; i < this.persons.length; i++) {
				recPersons[this.persons[i]["TrackID"]] = this.persons[i];
				recPersons[this.persons[i]["TrackID"]]["name"] = "unknown";
				recPersons[this.persons[i]["TrackID"]]["center"] = [0.1, 0.1];
				recPersons[this.persons[i]["TrackID"]]["w_h"] = [0.05, 0.05];
				recPersons[this.persons[i]["TrackID"]]["gestures"] = [];
				recPersons[this.persons[i]["TrackID"]]["face"] = {
					id: this.persons[i]["id"],
					center: [0.1, 0.1],
					w_h: [0.01, 0.01],
					name: "unknown",
				};
			}
			*/
			for (var i = 0; i < this.persons.length; i++) {
				recPersons[this.persons[i]["TrackID"]] = this.persons[i];
				recPersons[this.persons[i]["TrackID"]]["name"] = "Placeholder";
				recPersons[this.persons[i]["TrackID"]]["center"] = [0.1, 0.1];
				recPersons[this.persons[i]["TrackID"]]["w_h"] = [0.05, 0.05];
				recPersons[this.persons[i]["TrackID"]]["gestures"] = [];
				recPersons[this.persons[i]["TrackID"]]["face"] = {
					ID: this.persons[i]["ID"],
					center: [0.5, 0.5],
					w_h: [0.0, 1.0],
					name: "person",
					confidence: 0.9,
					emotion: 4,
					mask_state: 0,
					//bbox: {x: Math.floor(this.config.image_width * 0.1 - 0.01) , y: Math.floor(this.config.image_height * 0.1 - 0.01), w: Math.floor(this.config.image_width * 0.1), h: Math.floor(this.config.image_height * 0.1)},
					bbox: {x: 0 , y: 0, w: this.config.image_width, h: this.config.image_height},
					//"landmarks": [623.5, 321.199982, 676.247986, 310.633331, 655.533386, 353.283356, 653.666687, 383.966675, 695.524963, 374.56665]
				};
			}

			// Assemble notification payload for sending
			for (var cat = 0; cat < simData.length; cat++) {
				var sendData = JSON.parse(JSON.stringify(simData[cat]));
				if (simFlags[cat]) {
					for (var i = 0; i < simData[cat].length; i++) {
						// Mousemove
						if (simMeta[cat][i]["move"] === "on") {
							const movekey = simMeta[cat][i]["movekey"];
							if (
								(movekey === "Ctrl" && this.isPressCtrl) ||
								(movekey === "Alt" && this.isPressAlt) ||
								(movekey === "Shift" && this.isPressShift)
							) {
								sendData[i]["posx"] = this.posX;
								sendData[i]["posy"] = this.posY;
							} else {
								// Remove if not mouse moved
								sendData.splice(i, 1);
								continue;
							}
						}
					}
					for (var i = 0; i < sendData.length; i++) {
						// Mousewheel distance
						if (this.config.wheelDistanceEnabled) {
							if (cat < 2) {
								// Add distance to gestures and objects
								sendData[i]["distance"] = this.wheelDistance;
							}
						}
					
						// Mousewheel scaling
						if (simMeta[cat][i]["scale"] === "on") {
							sendData[i]["w"] *= this.wheelScale;
							sendData[i]["h"] *= this.wheelScale;
						}
						// Center attribute
						if (sendData[i].hasOwnProperty("posx") && sendData[i].hasOwnProperty("posy")) {
							sendData[i]["center"] = this.fromPixels([sendData[i]["posx"], sendData[i]["posy"]]);
							delete sendData[i]["posx"];
							delete sendData[i]["posy"];
						}
						// Width/height attribute
						if (sendData[i].hasOwnProperty("w") && sendData[i].hasOwnProperty("h")) {
							sendData[i]["w_h"] = this.fromPixels([sendData[i]["w"], sendData[i]["h"]]);
							delete sendData[i]["w"];
							delete sendData[i]["h"];
						}
						// Check for recognized person track ids and replace placeholder if found
						if (cat != 3) {
							if (recPersons.hasOwnProperty(sendData[i]["TrackID"])) {
								if (cat == 0) {
									recPersons[sendData[i]["TrackID"]]["gestures"].push(sendData[i]);
								} else if (cat == 1) {
									if (sendData[i]["name"] === "person") {
										recPersons[sendData[i]["TrackID"]]["center"] = sendData[i]["center"];
										recPersons[sendData[i]["TrackID"]]["w_h"] = sendData[i]["w_h"];
										//console.debug("DEBUG: DetSim person rec");
									}
								} else if (cat == 2) {
									recPersons[sendData[i]["TrackID"]]["face"] = sendData[i];
								}
							}
						} else {
							// Create recognized person data
							sendData = Object.assign({}, recPersons);
						}
					}
				} else {
					if (cat == 3) {
						sendData = {};
					} else {
						sendData = [];
					}
				}
				//console.debug(sendData);
				if (cat == 0) {
					var payload = { DETECTED_GESTURES: sendData };
					//console.debug("[Det-Sim] DETECTED_GESTURES: ", payload);
					this.sendNotification("DETECTED_GESTURES", payload);
					// {"DETECTED_GESTURES": [{"TrackID": int, "name": string, "w_h": (float, float), "center": (float, float)}]}
				} else if (cat == 1) {
					var payload = { DETECTED_OBJECTS: sendData };
					this.sendNotification("DETECTED_OBJECTS", payload);
					// {"DETECTED_OBJECTS": [{"TrackID": int, "name": string, "w_h": (float, float), "center": (float, float)}]}
				} else if (cat == 2) {
					var payload = { DETECTED_FACES: sendData };
					this.sendNotification("DETECTED_FACES", payload);
					// {"DETECTED_FACES": [{"TrackID": int, "name": string, "w_h": (float, float), "center": (float, float), "ID": int, "confidence": float}]}
				} else if (cat == 3) {
					var payload = { RECOGNIZED_PERSONS: sendData };
					//console.debug(JSON.stringify(payload));
					this.sendNotification("RECOGNIZED_PERSONS", payload);
					// {"RECOGNIZED_PERSONS": {int: {"TrackID": int, "name": string, "w_h": [float, float], "center": [float, float]}, "face": {...}, "gestures": [...]}}
				}
			}
		}
	},

	/**
	 * Updates the mouse position.
	 * @param {Event} evt The mouse event
	 */
	updatePos: function (evt) {
		if (Math.abs(this.posX - evt.clientX) > 0) {
			this.posX = evt.clientX;
		}
		if (Math.abs(this.posY - evt.clientY) > 0) {
			this.posY = evt.clientY;
		}
	},

	/**
	 * Sends a gesture detection message for debug purposes.
	 * @param {Int} trackid
	 * @param {String} name
	 * @param {Array} w_h
	 * @param {Array} center
	 */
	simGestureDetection: function (trackid, name = "unknown", w_h = [100, 100], center = [50, 50]) {
		var payload = { DETECTED_GESTURES: [] };
		if (trackid >= 0) {
			payload = {
				DETECTED_GESTURES: [
					{ TrackID: trackid, name: name, w_h: this.fromPixels(w_h), center: this.fromPixels(center) },
				],
			};
		}
		this.sendNotification("DETECTED_GESTURES", payload);
	},

	/**
	 * Sends an object detection message for debug purposes.
	 * @param {Int} trackid
	 * @param {String} name
	 * @param {Array} w_h
	 * @param {Array} center
	 */
	simObjectDetection: function (trackid, name = "unknown", w_h = [100, 100], center = [50, 50]) {
		var payload = { DETECTED_OBJECTS: [] };
		if (trackid >= 0) {
			payload = {
				DETECTED_OBJECTS: [
					{ TrackID: trackid, name: name, w_h: this.fromPixels(w_h), center: this.fromPixels(center) },
				],
			};
		}
		this.sendNotification("DETECTED_OBJECTS", payload);
	},

	/**
	 * Sends a face detection message for debug purposes.
	 * @param {Int} trackid
	 * @param {String} name
	 * @param {Array} w_h
	 * @param {Array} center
	 * @param {Int} id
	 * @param {Float} confidence
	 */
	simFaceDetection: function (
		trackid,
		name = "unknown",
		w_h = [100, 100],
		center = [50, 50],
		id = 0,
		confidence = 0.2
	) {
		var payload = { DETECTED_FACES: [] };
		if (trackid >= 0) {
			payload = {
				DETECTED_FACES: [
					{
						TrackID: trackid,
						name: name,
						w_h: this.fromPixels(w_h),
						center: this.fromPixels(center),
						id: id,
						confidence: confidence,
					},
				],
			};
		}
		this.sendNotification("DETECTED_FACES", payload);
	},

	/**
	 * Sends a person recognition message for debug purposes.
	 * @param {Int} trackid
	 * @param {Array} w_h
	 * @param {Array} center
	 * @param {Array} gestures
	 */
	simRecognisedPerson(trackid, w_h, center, gestures = []) {
		var payload = { RECOGNIZED_PERSONS: {} };
		payload["RECOGNIZED_PERSONS"][trackid] = {
			TrackID: trackid,
			name: "unknown",
			w_h: this.fromPixels(w_h),
			center: this.fromPixels(center),
			face: {
				id: 1,
				confidence: 0.2,
				TrackID: trackid,
				name: "unknown",
				w_h: this.fromPixels([Math.floor(w_h[0] / 4), Math.floor(w_h[1] / 4)]),
				center: this.fromPixels(center),
			},
			gestures: gestures,
		};
		this.sendNotification("RECOGNIZED_PERSONS", payload);
	},

	/**
	 * Converts relative image coordinates into pixel coordinates.
	 * @param {Array} coords
	 * @return {Array} Pixel coordinates
	 */
	toPixels: function (coords) {
		const x = this.config.image_width * coords[0];
		const y = this.config.image_height * coords[1];
		return [x, y];
	},

	/**
	 * Converts pixel coordinates into relative image coordinates.
	 * @param {Array} coords
	 * @return {Array} Relative image coordinates
	 */
	fromPixels: function (coords) {
		const x = coords[0] / this.config.image_width;
		const y = coords[1] / this.config.image_height;
		if (x < 0) x = 0;
		if (x > this.config.image_width) x = this.config.image_width;
		if (y < 0) y = 0;
		if (y > this.config.image_height) y = this.config.image_height;
		return [x, y];
	},

	/**
	 * MagicMirror notification handler.
	 * @param {String} notification The notification identifier as a string.
	 * @param {AnyType} payload The notification payload.
	 * @param {Module} sender The identification of the notification sender.
	 */
	notificationReceived: function (notification, payload, sender) {
		if (notification === "ALL_MODULES_STARTED") {
			this.postinit();
		} else if (notification === "DOM_OBJECTS_CREATED") {
		}
	},

	/**
	 * Selects and clicks main menu entries for debug purposes.
	 */
	menuSelect: function () {
		setTimeout(function () {
			// Activate gesture recognition by default
			self.sendNotification("MAIN_MENU_SELECT", 0); // Display
			self.sendNotification("MAIN_MENU_CLICK_SELECTED", 0);
			// self.sendNotification('MAIN_MENU_SELECT', 0); // Toggle camera
			// self.sendNotification('MAIN_MENU_CLICK_SELECTED', 0);
			// self.sendNotification('MAIN_MENU_SELECT', 4); // Show gesture recognition
			// self.sendNotification('MAIN_MENU_CLICK_SELECTED', 4);
			self.sendNotification("MAIN_MENU_SELECT", 5); // Show / hide all recognitions
			self.sendNotification("MAIN_MENU_CLICK_SELECTED", 5);
			// self.sendNotification("MAIN_MENU_SELECT", 6); // Show person recognition
			// self.sendNotification("MAIN_MENU_CLICK_SELECTED", 6);
			self.sendNotification("MAIN_MENU_SELECT", 8); // Back
			self.sendNotification("MAIN_MENU_CLICK_SELECTED", 8);
		}, 2000);
	},

	/**
	 * Helper function for debug purposes.
	 */
	debug: function () {
		if (this.modulesStarted) {
			var gestures = [];
			if (this.isPressCtrl) {
				this.simGestureDetection(1, "flat_right", [200, 200], [this.posX, this.posY]);
				// this.simObjectDetection(0, "person", [200, 400], [100, 300]);
				// this.simFaceDetection(0, "unknown", [200, 200], [100, 300], 0, 0.1);
				gestures = [
					{
						TrackID: 0,
						name: "flat_right",
						w_h: this.fromPixels([200, 200]),
						center: this.fromPixels([this.posX, this.posY]),
					},
				];
			} else {
				this.simGestureDetection(-1);
			}

			// this.simObjectDetection(0, "person", [400, 400], [210, 210]);
			// this.simFaceDetection(0, "unknown", [200, 200], [210, 210], 0, 0.2);
			this.simRecognisedPerson(1, [400, 400], [210, 210], gestures);
		}
	},
});
