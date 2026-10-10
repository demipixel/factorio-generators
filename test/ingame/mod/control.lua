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
