
# Factorio Generators

## Usage

`require('./index')` returns an object with the following keys as functions:

### outpost(blueprintString, opt)

Generates an outpost given a blueprintString with 2 walls at the corner of the ore patch you want to cover. Options are:

- minedOreDirection: 0-3 direction ore should flow when mined (0 is up) (default 2)
- trainDirection: 0-3, Side the train station should be on (Must be perpendicular to minedOreDirection) (default 1)
- minerSpace: 0-2, space between miners (default 1)
- turretSpacing: 2-9, spacing between turrets on wall (default 8)
- turrets: true/false, whether turrets are enabled or not (default true)
- laserTurrets: true/false, use laser turrets instead of gun turrets (default true)
- locomotiveCount: 1+, number of locomotives before cargo wagons (default 2)
- cargoWagonCount: 1+, number of cargo wagons on train (default 4)
- exitRoute: true/false, whether or not there is a route past the train station for single-headed trains (default false)
- walls: Whether or not to include walls (default true)
- wallSpace: Space between wall and rest of the outpost (default 5)
- undergroundBelts: Use underground belts in front of miners instead of regular belts
- beltName: Name of type of belt in the format `type` or `type_transport_belt` (default `` which is yellow belt)
- useStackInserters: Boolean, use stack inserters between the buffer chests and cargo wagon instead of fast inserters (default true)
- botBased: Boolean, use passive provider and requester chests (default false)
- requestItem: Item for requester chests to request if botBased (default iron_ore)
- conrete: Name of concrete type (in vanilla either `concrete` or `hazard_conrete`) (default none)
- borderConcrete: Type of concrete put on the wall and just inside the walls (default none)
- trackConrete: Type of concrete put on the track and just surrounding the track (default none)
- balancer: Blueprint string for an NxN balancer if the script does not have any available (N being the # of cargo wagons) (no default)