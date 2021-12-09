# SmartMirror-Detection-Simulator
[LEGaTO-SmartMirror](https://github.com/LEGaTO-SmartMirror) and therefore [MagicMirror²](https://github.com/MichMich/MagicMirror) module for simulating gesture, object and face detections and person recognitions.
The desired detections are selected through an overlayed GUI widget and detection messages are send in constant intervals to other SmartMirror modules.

## Configuration
The module can be configured by setting the desired values in the MagicMirror `config.js`
- `image_width` and `image_height`: Integers; Default: 1920 x 1080
Sets the dimensions of the camera image.
- `simFps`: Integer; Default: 30
Sets the interval at which detection messages are sent. Only set at startup.
- `forceShow`: Boolean; Default: true
If true the widget is forced to show even if other modules try to hide it.
- `widgetWidth`: Integer; Default: 0
Sets the width of the GUI widget in pixel. If 0 the width is fitted to the content.
- `widgetHeight`: Integer; Default: 0
Sets the height of the GUI widget in pixel. If 0 the height is fitted to the content.

## Usage
- The GUI widget can be hidden or shown with the button in the top right.
- To simulate detections activate the category checkbox to the left.
- All coordinates are given in pixels.
- Changes to the detection parameters are instantly applied.
- Add a detection by pressing the green `+` button.
- Delete a detection by pressing the red `x` button. Only additional detections can be deleted.
- The person recognition simulation uses the data from above fields if their category is active and their `TrackID` equals the one given. The `id` of the given face is then used to log in a user by the DecisionMaker by looking up the `id` in the MySQL database. If the corresponding categories are not active a placeholder is used with the `id` given in the person entry (Can be used to quickly log in a user).

### Mouse Interaction
- To move a detection with the mouse activate `Mousemove` and select a meta-key (`Ctrl`, `Shift` or `Alt`). Now the detection follows the mouse if the meta-key is pressed.
- To scale the detections with the mouse wheel activate the `Scale` checkbox. Now the activation dimensions are scaled with turning the mouse wheel.

## Name Files
The names of the gesture and object detections are loaded line by line from the `hand.names` and `coco.names` textfiles in the `public` folder. Empty lines are ignored.

## Communication
Sent MagicMirror messages:

notification | payload
 ------- | ------- 
`DETECTED_GESTURES` | `{"DETECTED_GESTURES": [{"TrackID": int, "name": string, "w_h": (float, float), "center": (float, float)}]}`
`DETECTED_OBJECTS` | `{"DETECTED_OBJECTS": [{"TrackID": int, "name": string, "w_h": (float, float), "center": (float, float)}]}`
`DETECTED_FACES` | `{"DETECTED_FACES": [{"TrackID": int, "name": string, "w_h": (float, float), "center": (float, float), "id": int, "confidence": float}]}`
`RECOGNISED_PERSONS` | `{"RECOGNIZED_PERSONS": {int: {"TrackID": int, "name": string, "w_h": [float, float], "center": [float, float]}, "face": {...}, "gestures": [...]}}`

## Requirements
Versions relate to tested versions.

- MagicMirror 2.10.1

## Installation
To install SmartMirror-Detection-Simulator module on an existing SmartMirror instance:

- Clone SmartMirror-Detection-Simulator to the MagicMirror module folder.
- Add module section to the MagicMirror `config.js`:
```
{
	module: 'SmartMirror-Detection-Simulator',
	position: 'top-right',
	config: {
		image_width: 1920,
		image_height: 1080,
	}
},
```