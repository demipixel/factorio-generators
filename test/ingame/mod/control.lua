-- Imports every blueprint string from strings.lua, places it as ghosts on an
-- empty surface, and writes what the game made of it to script-output.
local strings = require("strings")

local function count_by(list, key)
  local counts = {}
  for _, item in pairs(list) do
    local k = key(item)
    counts[k] = (counts[k] or 0) + 1
  end
  return counts
end

script.on_init(function()
  local surface = game.create_surface("bpcheck", {
    default_enable_all_autoplace_controls = false,
    autoplace_settings = {
      entity = { treat_missing_as_default = false },
      decorative = { treat_missing_as_default = false },
      tile = { treat_missing_as_default = false, settings = { ["lab-dark-1"] = {} } },
    },
    cliff_settings = { cliff_elevation_0 = 1024, richness = 0 },
  })
  surface.request_to_generate_chunks({ 0, 0 }, 10)
  surface.force_generate_chunk_requests()

  -- ore everywhere, so mining drills are allowed to stand anywhere
  for x = -110, 110 do
    for y = -110, 110 do
      surface.create_entity({ name = "iron-ore", position = { x + 0.5, y + 0.5 }, amount = 1000 })
      -- and oil, so pumpjacks are allowed too
      if x > -70 and x < 70 and y > -70 and y < 70 then
        surface.create_entity({ name = "crude-oil", position = { x + 0.5, y + 0.5 }, amount = 100000 })
      end
    end
  end

  local function places(name)
    local items = prototypes.entity[name] and prototypes.entity[name].items_to_place_this
    local out = {}
    for _, item in pairs(items or {}) do out[#out + 1] = item.name end
    return out
  end

  local inventory = game.create_inventory(1)
  local stack = inventory[1]
  local results = {}

  for name, str in pairs(strings) do
    local result = { import = stack.import_stack(str) }
    if stack.valid_for_read and stack.is_blueprint and stack.is_blueprint_setup() then
      local entities = stack.get_blueprint_entities() or {}
      local tiles = stack.get_blueprint_tiles() or {}
      result.entities = entities
      result.entity_count = #entities
      result.tile_count = #tiles
      result.names = count_by(entities, function(e) return e.name end)

      local ghosts = stack.build_blueprint({
        surface = surface,
        force = "player",
        position = { 0, 0 },
        build_mode = defines.build_mode.forced,
      })
      local placed = 0
      local placed_tiles = 0
      local placed_names = {}
      for _, ghost in pairs(ghosts) do
        if ghost.type == "tile-ghost" then
          placed_tiles = placed_tiles + 1
        else
          placed = placed + 1
          placed_names[ghost.ghost_name] = (placed_names[ghost.ghost_name] or 0) + 1
        end
      end
      result.placed = placed
      result.placed_tiles = placed_tiles
      -- which entity names did not all make it onto the ground
      local missing = {}
      for entity_name, wanted in pairs(result.names) do
        local got = placed_names[entity_name] or 0
        if got ~= wanted then missing[entity_name] = wanted - got end
      end
      result.missing = missing

      -- turn the ghosts into real entities, rails first, and see what refuses
      local order = { ["straight-rail"] = 1, ["legacy-straight-rail"] = 1 }
      table.sort(ghosts, function(a, b)
        return (order[a.valid and a.ghost_name] or 2) < (order[b.valid and b.ghost_name] or 2)
      end)
      local refused = {}
      for _, ghost in pairs(ghosts) do
        if ghost.valid and ghost.type == "entity-ghost" then
          local ghost_name = ghost.ghost_name
          local _, revived = ghost.revive()
          if not revived then refused[ghost_name] = (refused[ghost_name] or 0) + 1 end
        end
      end
      result.refused = refused
      -- and what is not standing there afterwards, such as one of two things on the same tile
      local standing = {}
      for _, entity in pairs(surface.find_entities_filtered({ force = "player" })) do
        if entity.type ~= "entity-ghost" then standing[entity.name] = (standing[entity.name] or 0) + 1 end
      end
      local lost = {}
      for entity_name, wanted in pairs(result.names) do
        local got = standing[entity_name] or 0
        if got ~= wanted then lost[entity_name] = wanted - got end
      end
      result.lost = lost

      local stops = {}
      for _, stop in pairs(surface.find_entities_filtered({ type = "train-stop" })) do
        stops[#stops + 1] = stop.connected_rail ~= nil
      end
      result.stop_connected = stops
      local networks = {}
      local network_count = 0
      for _, pole in pairs(surface.find_entities_filtered({ type = "electric-pole" })) do
        local id = pole.electric_network_id
        if id and not networks[id] then
          networks[id] = true
          network_count = network_count + 1
        end
      end
      result.networks = network_count
      -- everything that runs on electricity has to stand in a pole's supply area
      -- (worked out from the game's own boxes and reach: no tick has run yet,
      -- so nothing is hooked up to a network at this point)
      local poles = surface.find_entities_filtered({ type = "electric-pole" })
      local function powered(entity)
        local box = entity.bounding_box
        for _, pole in pairs(poles) do
          local reach = pole.prototype.get_supply_area_distance(pole.quality)
          local at = pole.position
          if box.left_top.x < at.x + reach and box.right_bottom.x > at.x - reach
            and box.left_top.y < at.y + reach and box.right_bottom.y > at.y - reach then
            return true
          end
        end
        return false
      end
      local unpowered = {}
      local useless_beacons = 0
      for _, entity in pairs(surface.find_entities_filtered({ force = "player" })) do
        if entity.type ~= "electric-pole" and entity.prototype.electric_energy_source_prototype
          and not powered(entity) then
          unpowered[entity.name] = (unpowered[entity.name] or 0) + 1
        end
        if entity.type == "beacon" and #entity.get_beacon_effect_receivers() == 0 then
          useless_beacons = useless_beacons + 1
        end
      end
      result.unpowered = unpowered
      result.useless_beacons = useless_beacons
      -- every pumpjack has to be piped to the same network as the tanks:
      -- walk the pipes from one of them and see which are never reached
      local oil = {}
      for _, entity in pairs(surface.find_entities_filtered({ type = { "mining-drill", "storage-tank" } })) do
        if #entity.fluidbox > 0 then oil[#oil + 1] = entity end
      end
      local reached = {}
      local queue = { oil[1] }
      if oil[1] then reached[oil[1].unit_number] = true end
      while #queue > 0 do
        local entity = table.remove(queue)
        for index = 1, #entity.fluidbox do
          for _, other in pairs(entity.fluidbox.get_connections(index)) do
            local owner = other.owner
            if not reached[owner.unit_number] then
              reached[owner.unit_number] = true
              queue[#queue + 1] = owner
            end
          end
        end
      end
      local cut_off = 0
      for _, entity in pairs(oil) do
        if not reached[entity.unit_number] then cut_off = cut_off + 1 end
      end
      result.cut_off = cut_off
      local signals = {}
      for _, signal in pairs(surface.find_entities_filtered({ type = "rail-signal" })) do
        signals[#signals + 1] = #signal.get_connected_rails()
      end
      result.signal_rails = signals

      for _, entity in pairs(surface.find_entities_filtered({ type = "resource", invert = true })) do
        entity.destroy()
      end
    end
    stack.clear()
    results[name] = result
  end

  -- reference: how the game itself writes new-style rails, a stop and a signal
  surface.create_entity({ name = "straight-rail", position = { 1, 1 }, direction = defines.direction.north, force = "player" })
  surface.create_entity({ name = "straight-rail", position = { 1, 3 }, direction = defines.direction.north, force = "player" })
  surface.create_entity({ name = "straight-rail", position = { 11, 11 }, direction = defines.direction.east, force = "player" })
  surface.create_entity({ name = "train-stop", position = { 3, 1 }, direction = defines.direction.north, force = "player" })
  surface.create_entity({ name = "rail-signal", position = { 2.5, 3.5 }, direction = defines.direction.south, force = "player" })
  stack.set_stack({ name = "blueprint" })
  stack.create_blueprint({ surface = surface, force = "player", area = { { -5, -5 }, { 20, 20 } } })
  results.__reference = {
    entities = stack.get_blueprint_entities(),
    string = stack.export_stack(),
    legacy_rail_placed_by = places("legacy-straight-rail"),
    rail_placed_by = places("straight-rail"),
  }

  helpers.write_file("bpcheck.json", helpers.table_to_json(results))
end)
