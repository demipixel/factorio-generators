
# Factorio Generators

## Usage

`require('./index')` returns an object with the following keys as functions:

### outpost(blueprintString, opt)

Generates an outpost given a blueprintString with 2 walls at the corner of the ore patch you want to cover. Options are:

- trainDirection: 0-3, side train station should enter from (0 is top) (default 2 bottom)
- trainSide: 0-3, side the train station should be on (Must be perpendicular to minedOreDirection) (default 1 right)
- minerSpace: 0-2, space between miners (default 1)
- module: Module name to fill up miners with, empty for none
- includeRadar: Boolean, whether or not to include a radar (default true)
- turretSpacing: 2-9, spacing between turrets on wall (default 8)
- turrets: Boolean, whether turrets are enabled or not (default true)
- laserTurrets: Boolean, use laser turrets instead of gun turrets (default true)
- includeTrainStation: Boolean, whether or not to include a train station (default true)
- locomotiveCount: 1+, number of locomotives before cargo wagons (default 2)
- cargoWagonCount: 1+, number of cargo wagons on train (default 4)
- exitRoute: true/false, whether or not there is a route past the train station for single-headed trains (default false)
- walls: Whether or not to include walls (default true)
- wallSpace: Space between wall and rest of the outpost (default 5)
- wallThickness: Number of walls thick the outpost defenses are (default 1)
- undergroundBelts: Use underground belts in front of miners instead of regular belts
- compact: No horizontal spacing between miners, place electric poles in between miners. Requires `undergroundBelts` to be `true`.
- beltName: Name of type of belt in the format `type` or `type_transport_belt` (default `''` which is yellow belt)
- useStackInserters: Boolean, use stack inserters between the buffer chests and cargo wagon instead of fast inserters (default true)
- botBased: Boolean, use passive provider and requester chests (default false)
- requestItem: Item for requester chests to request if botBased (default iron_ore)
- requestAmount: The amount of items each chest requests when bot based (default 4800)
- roboports: Boolean, include roboports by tracks (default false)
- conrete: Name of concrete type (in vanilla either `concrete` or `hazard_conrete`) (default none)
- borderConcrete: Type of concrete put on the wall and just inside the walls (default none)
- trackConrete: Type of concrete put on the track and just surrounding the track (default none)
- balancer: Blueprint string for an NxN balancer if the script does not have any available (N being the # of cargo wagons) (no default)

### blueprintTool(blueprintString, opt)

Modifies a blueprint in different ways and returns a new blueprint string.

- flipX: Boolean, flip along the X axis (default false)
- flipY: Boolean, flip along the Y axis (default false)
- The following are an array of objects with a key `to` for the entity name to convert to and `from` for an exact name or `includes` for any entity including the string
- entityReplace: Array of objects to convert entity types in the form { from: 'name', to: 'name' } (default empty array)
- recipeReplace: Array of objects to convert recipes in assembly machines in the form { from: 'name', to: 'name' } (default empty array)
- modifiedOnly: Resulting blueprint only contains entities which have been modified by a replace.
