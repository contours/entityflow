/* global d3 console */

d3.entityflow = function() {
  var entityflow = {}
    , size = [1, 1]
    , sessionWidth = 140
    , sessionPadding = 80
    , entityPadding = 10
    , entityFilter = null
    , valueScale = null
    , entities = []
    , sessions = []
    , yscale

  entityflow.size = function(_) {
    if (! arguments.length) return size
    size = _
    return entityflow
  }

  entityflow.sessionWidth = function(_) {
    if (! arguments.length) return sessionWidth
    sessionWidth = +_
    return entityflow
  }

  entityflow.sessionPadding = function(_) {
    if (! arguments.length) return sessionPadding
    sessionPadding = +_
    return entityflow
  }

  entityflow.entityPadding = function(_) {
    if (! arguments.length) return entityPadding
    entityPadding = +_
    return entityflow
  }

  entityflow.entityFilter = function(_) {
    if (! arguments.length) return entityFilter
    entityFilter = _
    return entityflow
  }

  entityflow.valueScale = function(_) {
    if (! arguments.length) return valueScale
    valueScale = _
    return entityflow
  }

  entityflow.entities = function(_) {
    if (! arguments.length) return entities
    entities = _
    return entityflow
  }

  entityflow.sessions = function(_) {
    if (! arguments.length) return sessions
    sessions = _
    return entityflow
  }

  entityflow.head = function(entity) {
    return { x: entity.nodes[0].session.x
           , y: entity.nodes[0].y
           , dx: entity.nodes[0].session.dx
           , dy: entity.nodes[0].dy
           , entity: entity }
  }

  entityflow.nodes = function(entity) {
    return entity.nodes
                 .filter(function(node) {
                   return (! node.detour)
                 })
                 .map(function(node) {
                   return { x: node.session.x
                          , y: node.y
                          , dx: node.session.dx
                          , dy: node.dy
                          , value: node.value
                          , entity: entity }
                 })
  }

  entityflow.layout = function(iterations) {
    computeSessionGraph()
    computeSessionBreadths()
    computeSessionDepths(iterations)
    for (; iterations > 0; --iterations) {
      minimizeEntityCrossing()
      minimizeEntityWiggle()
    }
    computeEntityDetours()
    entities.sort(function(a, b) {
      return medianNodeDepth(a) - medianNodeDepth(b)
    })
    return entityflow
  }

  entityflow.entitypath = function() {
    function path(d) {
      d.nodes.sort(ascendingSessionBreadth)

      return ( "M" + [d.nodes[0].session.x, d.nodes[0].y]
             + joinTops(d.nodes)
             + "v" + d.nodes[d.nodes.length - 1].dy
             + joinBottoms(d.nodes.slice().reverse())
             + "Z" )
    }

    function ascendingSessionBreadth(a, b) {
      return a.session.x - b.session.x
    }

    function joinTops(nodes) {
      return nodes.map(
        function(node, i) {
          var path = "", dx, dy, ctrlx
          if (i > 0) {
            dx = node.session.x - (nodes[i - 1].session.x + sessionWidth)
            dy = node.y - nodes[i - 1].y
            if (dy > 0) {
              ctrlx = [ dx*0.6, dx*0.5 ]
            } else {
              ctrlx = [ dx*0.5, dx*0.4 ]
            }
            path = "c" + [ ctrlx[0], 0, ctrlx[1], dy, dx, dy ]
          }
          return path + "h" + sessionWidth
        }).join("")
    }

    function joinBottoms(nodes) {
      return nodes.map(
        function(node, i) {
          var path = "", dx, dy, ctrlx
          if (i > 0) {
            dx = (node.session.x + sessionWidth) - nodes[i - 1].session.x
            dy = (node.y + node.dy) - (nodes[i - 1].y + nodes[i - 1].dy)
            if (dy > 0) {
              ctrlx = [ dx*0.5, dx*0.4 ]
            } else {
              ctrlx = [ dx*0.6, dx*0.5 ]
            }
            path = "c" + [ ctrlx[0], 0, ctrlx[1], dy, dx, dy ]
          }
          return path + "h" + (-sessionWidth)
        }).join("")
    }

    return path
  }

  // Each node in the graph belongs to one entity and one session.
  // Links join sessions participated in by the same entity.
  function computeSessionGraph() {
    sessions.forEach(function(session) {
      session.nodes = []
      session.value = 0
      session.sourceLinks = []
      session.targetLinks = []
      session.entities.forEach(function(e) {
        var entity = entities[e.index]
          , node = { entity: entity
                   , session: session
                   , value: e.value
                   , scaledValue: e.value }
          , link
        e.name = entity.name
        delete e.index
        if (! ("nodes" in entity)) { entity.nodes = [] }
        if (entity.nodes.length > 0) {
          link = { source: entity.nodes[entity.nodes.length - 1].session
                 , target: session }
          link.source.sourceLinks.push(link)
          link.target.targetLinks.push(link)
        }
        entity.nodes.push(node)
        session.nodes.push(node)
        session.value += node.scaledValue
      })
    })

    if (entityFilter) filterEntities()

    if (valueScale) scaleValues()

    function filterEntities() {
      entities = entities.filter(
        function(entity) {
          var keep = entityFilter(entity)
          if (! keep) {
            entity.nodes.forEach(function(node) {
              node.session.nodes.splice(node.session.nodes.indexOf(node), 1)
              node.session.value -= node.scaledValue
            })
          }
          return keep
        })
    }

    function scaleValues() {
      var nodes = d3.merge(
        entities.map(function(entity) { return entity.nodes }))
        , domain = [ d3.min(nodes, value), d3.max(nodes, value) ]
        , scale = valueScale(domain)

      nodes.forEach(function(node) { node.scaledValue = scale(node.value) })

      sessions.forEach(function(session) {
        session.value = d3.sum(session.nodes, function(node) {
                          return node.scaledValue })
      })
    }
  }

  // Iteratively assign the breadth (x-position) for each session.
  // Sessions are assigned the maximum breadth of incoming neighbors plus one;
  // sessions with no incoming links are assigned breadth zero, while
  // sessions with no outgoing links are assigned the maximum breadth.
  function computeSessionBreadths() {
    var remainingSessions = sessions
      , nextSessions
      , x = 0

    while (remainingSessions.length) {
      nextSessions = []
      remainingSessions.forEach(function(session) {
        session.x = x
        session.dx = sessionWidth
        session.sourceLinks.forEach(function(link) {
          nextSessions.push(link.target)
        })
      })
      remainingSessions = nextSessions
      x += 1
    }

    moveSinksRight(x)
    scaleSessionBreadths((size[0] - sessionWidth) / (x - 1))

    function moveSinksRight(x) {
      sessions.forEach(function(session) {
        if (! session.sourceLinks.length) {
          session.x = x - 1
        }
      })
    }

    function scaleSessionBreadths(kx) {
      sessions.forEach(function(session) {
        session.x *= kx
      })
    }
  } // end computeSessionBreadths

  // Start from the sessions on the right, positioning the upstream
  // sessions so as to minimize link distance. A reverse pass is then
  // made from left-to-right, and then the entire process is repeated
  // for the specified number of iterations. Overlapping nodes are
  // shifted to avoid collision.
  function computeSessionDepths(iterations) {
    var sessionsByBreadth = sortSessionsByBreadth()

    initializeSessionDepth()

    resolveCollisions()
    for (var alpha = 1; iterations > 0; --iterations) {
      relaxRightToLeft(alpha *= .99)
      resolveCollisions()
      relaxLeftToRight(alpha)
      resolveCollisions()
    }
    repositionNodes()

    function initializeSessionDepth() {
      yscale = d3.min(sessionsByBreadth, function(sessions) {
             return (size[1] - (sessions.length + 1) * sessionPadding)
                  / d3.sum(sessions, value)
      })

      sessionsByBreadth.forEach(function(sessions) {
        sessions.forEach(function(session, i) {
          var ky
          session.y = i + sessionPadding
          session.dy = session.value * yscale
          ky = (session.dy - (session.nodes.length - 1) * entityPadding)
             / d3.sum(session.nodes, function(node) { return node.scaledValue })
          session.nodes.forEach(function(node) {
            node.dy = node.scaledValue * ky
          })
        })
      })
    }

    function resolveCollisions() {
      sessionsByBreadth.forEach(function(sessions) {
        var session
          , dy
          , y0 = 0
          , n = sessions.length
          , i

        // Push any overlapping sessions down.
        sessions.sort(topToBottom)
        for (i = 0; i < n; ++i) {
          session = sessions[i]
          dy = y0 - session.y
          if (dy > 0) session.y += dy
          y0 = session.y + session.dy + sessionPadding
        }

        // If the bottommost session goes outside the bounds, push it back up.
        dy = y0 - size[1]
        if (dy > 0) {
          y0 = session.y -= dy

          // Push any overlapping sessions back up.
          for (i = n - 2; i >= 0; --i) {
            session = sessions[i]
            dy = session.y + session.dy + sessionPadding - y0
            if (dy > 0) session.y -= dy
            y0 = session.y
          }
        }
      })

    } // end resolveCollisions

    function relaxRightToLeft(alpha) {
      sessionsByBreadth.slice().reverse().forEach(function(sessions) {
        sessions.forEach(function(session) {
          if (session.sourceLinks.length) {
            var y = d3.sum(session.sourceLinks, targetCenter)
                  / session.sourceLinks.length
            session.y += (y - center(session)) * alpha
          }
        })
      })

      function targetCenter(link) {
        return center(link.target)
      }
    }

    function relaxLeftToRight(alpha) {
      sessionsByBreadth.forEach(function(sessions, breadth) {
        sessions.forEach(function(session) {
          if (session.targetLinks.length) {
            var y = d3.sum(session.targetLinks, sourceCenter)
                  / session.targetLinks.length
            session.y += (y - center(session)) * alpha
          }
        })
      })

      function sourceCenter(link) {
        return center(link.source)
      }
    }
  } // end computeSessionDepths

  // Begin by ordering nodes (points at which entity paths intersect
  // sessions) in order of descending value (i.e. fattest paths on
  // top). Start from the sessions on the right, positioning the nodes
  // within each session so as to minimize crossing of entity paths. A
  // reverse pass is then made from left-to-right, and the entire
  // process is repeated a few times.
  function minimizeEntityCrossing() {
    var sessionsByBreadth = sortSessionsByBreadth()

    initializeNodeOrder()

    for (var iterations = 4; iterations > 0; --iterations) {
      reorderRightToLeft()
      reorderLeftToRight()
    }

    function initializeNodeOrder() {
      sessions.forEach(function(session) {
        session.nodes.sort(descendingValue);
      })
      repositionNodes()
    }

    function reorderRightToLeft() {
      sessionsByBreadth.slice().reverse().forEach(function(sessions) {
        sessions.sort(bottomToTop).forEach(function(session) {
          session.nodes.sort(ascendingUpstreamDepth)
        })
      })
      repositionNodes()
    }

    function reorderLeftToRight() {
      sessionsByBreadth.forEach(function(sessions) {
        sessions.sort(topToBottom).forEach(function(session) {
          session.nodes.sort(ascendingDownstreamDepth)
        })
      })
      repositionNodes()
    }

    function descendingValue(a, b) {
      return b.value - a.value
    }

    function ascendingUpstreamDepth(a, b) {
      return upstreamDepth(a) - upstreamDepth(b)
    }

    function ascendingDownstreamDepth(a, b) {
      return downstreamDepth(a) - downstreamDepth(b)
    }

    function upstreamDepth(node) {
      var stream = node.entity.nodes
        , i = stream.indexOf(node)
      if (i > 0) {
        return d3.mean(stream.slice(0, i), center)
      } else {
        return center(node)
      }
    }

    function downstreamDepth(node) {
      var stream = node.entity.nodes
        , i = stream.indexOf(node)
      if (i < stream.length - 1) {
        return d3.mean(stream.slice(i + 1), center)
      } else {
        return center(node)
      }
    }

  } // end minimizeEntityCrossing

  // Slide sessions up or down to minimize the curavature of each entity path.
  function minimizeEntityWiggle() {
    var sessionsByBreadth = sortSessionsByBreadth()

    straightenLeftToRight()
    straightenRightToLeft()

    function straightenLeftToRight() {
      sessionsByBreadth.forEach(function(sessions) {
        sessions.sort(topToBottom).forEach(straighten)
      })
    }

    function straightenRightToLeft() {
      sessionsByBreadth.slice().reverse().forEach(function(sessions) {
        sessions.sort(topToBottom).forEach(straighten)
      })
    }

    function straighten(session, i) {
      var w = totalWiggle(session)
        , starty = session.y
        , best = { wiggle: w, y: starty }
        , above = (i > 0) ? sessions[i - 1] : null
        , below = (i < sessions.length - 1) ? sessions[i + 1] : null

      best = moveUp(session, above, best)
      moveSession(session, starty)
      best = moveDown(session, below, best)
      moveSession(session, best.y)
    }

    function moveUp(session, above, best) {
      var limit = above
                ? (above.y + above.dy + sessionPadding)
                : 0
        , y = session.y - 1
        , wiggle
      for (; y >= limit; --y) {
        moveSession(session, y)
        wiggle = totalWiggle(session)
        if (wiggle < best.wiggle) {
          best.wiggle = wiggle
          best.y = y
        }
      }
      return best
    }

    function moveDown(session, below, best) {
      var limit = below
                ? (below.y - session.dy - sessionPadding)
                : size[1] - session.dy
        , y = session.y + 1
        , wiggle
      for (; y <= limit; ++y) {
        moveSession(session, y)
        wiggle = totalWiggle(session)
        if (wiggle < best.wiggle) {
          best.wiggle = wiggle
          best.y = y
        }
      }
      return best
    }

    function moveSession(session, y) {
      session.y = y
      repositionNodes()
    }

    function ascendingWiggle(a, b) {
      return a.wiggle - b.wiggle
    }

    function totalWiggle(session) {
      return d3.sum(session.nodes.map(
        function(node) { return wiggle(node.entity) }))
    }

    function wiggle(entity) {
      return d3.sum(
        d3.pairs(entity.nodes)
          .map(function(pair) {
          return Math.abs(center(pair[0]) - center(pair[1]))
        })
      )
    }
  } // end minimizeEntityWiggle

  // Add dummy "detour" nodes to each entity path to route it around sessions
  // in which it does not participate.
  function computeEntityDetours() {
    var columns = getColumns()
      , breadths = columns.map(function(c) { return +c.key })
      , obstaclesByPosition = {}

    columns.forEach(function(c) {
      obstaclesByPosition[c.key] = c.values.map(
        function(s) { return { x: s.x, y: s.y, dy: s.dy }})
    })

    entities.sort(topToBottomAndLeftToRight).forEach(function(e) {
      var detours = []
        , start = breadths.indexOf(e.nodes[0].session.x)
        , stop = breadths.indexOf(e.nodes[e.nodes.length - 1].session.x) + 1
        , positions = breadths.slice(start, stop)
        , node = e.nodes.shift()

      positions.forEach(function(position) {
        if (node.session.x > position) {
          detours.push(detour(position, detours[detours.length - 1], e))
        } else {
          detours.push(node)
          node = e.nodes.shift()
        }
      })

      e.nodes = detours
    })

    function detour(position, previousNode, entity) {
      var dy = yscale - entityPadding
        , node = { detour: true
                 , y: center(previousNode) - (dy / 2)
                 , dy: dy
                 , entity: entity
                 }
        , obstacles = obstaclesByPosition[pad(position)]

      obstacles.sort(function(a, b) { return a.y - b.y })
      avoid(currentObstacle())
      node.x = position
      // detour nodes don't really belong to a session
      node.session = node
      obstacles.push(node)

      return node

      function avoid(obstacle) {
        if (obstacle === null) return
        var direction = center(node) < center(obstacle) ? "up" : "down"
        do {
          if (direction == "up") {
            node.y = obstacle.y - node.dy - entityPadding
          } else {
            node.y = obstacle.y + obstacle.dy + entityPadding
          }
          obstacle = currentObstacle()
        } while (obstacle !== null)
      }

      function currentObstacle() {
        for (var i = 0; i < obstacles.length; ++i) {
          if (overlaps(node, obstacles[i])) {
            return obstacles[i]
          }
        }
        return null
      }

      function overlaps(a, b) {
        var objects = [a, b].sort(function(a, b) { return a.y - b.y })
          , gap = Math.ceil(objects[1].y - (objects[0].y + objects[0].dy))
        return gap < entityPadding
      }
    }

    function topToBottomAndLeftToRight(a, b) {
      var cmp = a.nodes[0].session.x - b.nodes[0].session.x
      if (cmp != 0) {
        return cmp
      } else {
        return a.nodes[0].y - b.nodes[0].y
      }
    }

  } // end computeEntityDetours


  function value(x) {
    return x.value
  }

  function getColumns() {
    return d3.nest()
             .key(function(session) { return pad(session.x) })
             .sortKeys(d3.ascending)
             .entries(sessions)
  }

  function sortSessionsByBreadth() {
    return getColumns().map(function(nest) { return nest.values })
  }

  function pad(num) {
    var strings = num.toString().split(".")
      , size = 6
    while (strings[0].length < size) strings[0] = "0" + strings[0]
    return strings.join(".")
  }

  function repositionNodes() {
    sessions.forEach(function(session) {
      var y = session.y
      session.nodes.forEach(function(node) {
        node.y = y
        y += node.dy + entityPadding
      })
    })
  }

  function bottomToTop(a, b) {
    return b.y - a.y
  }

  function topToBottom(a, b) {
    return a.y - b.y
  }

  function center(o) {
    return o.y + o.dy / 2
  }

  function medianNodeDepth(entity) {
    return d3.median(entity.nodes, function(node) { return node.y })
  }

  return entityflow
}