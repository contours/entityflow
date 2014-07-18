entityflow
==========

d3 layout for showing flow of entity interactions: http://bl.ocks.org/rybesh/5fa6d89c5136b4e897d0

<a name="entityflow" href="#entityflow">#</a> d3.layout.<b>entityflow</b>()

Creates a new entityflow layout with the default settings: the default
size is 1x1; the default session width is 140; the default session
padding is 80; the default entity padding is 10; the default
entityFilter is null; the default valueScale is null.

<a name="entities" href="#entities">#</a> entityflow.<b>entities</b>([<i>entities</i>])

If *entities* is specified, it should be an array of objects. After
the layout is generated, each objects will have various properties
added to it, including an array of *nodes* determining the entity
path. If *entities* is not specified, returns the current array of
entities, which is empty by default.

<a name="sessions" href="#sessions">#</a> entityflow.<b>sessions</b>([<i>sessions</i>])

If *sessions* is specified, it should be an array of objects, each of
which must have a *entities* property. The value of the *entities*
property must be an array of objects, and each of these objects must
have an *index* property specifying the array index of an entity (see
above) participating in that session. Each object may also have a
*value* property, the value of which is a number interpretable as the
degree or level of participation. After the layout is generated, each
session objects will have various properties added to it, including
*x*, *y*, *dx*, *dy*, and an array of *nodes* where entity paths cross
through it. If *sessions* is not specified, returns the current array
of sessions, which is empty by default.

<a name="layout" href="#layout">#</a> entityflow.<b>layout</b>([<i>iterations</i>])

Compute the layout using the specified number of iterations.

<a name="entitypath" href="#entitypath">#</a> entityflow.<b>entitypath</b>()

Returns a function which can be passed to obtain the value of the `d`
attribute for drawing the entity path, e.g:

    svg.append("path").attr("d", entityflow.entitypath())

<a name="entityhead" href="#entityhead">#</a> entityflow.<b>entityhead</b>()

Returns a function which can be passed to obtain the head (first) node
in an entity's path, e.g.:

    svg.selectAll(".head")
       .data(flow.entities())
       .enter()
       .data(flow.entityhead())

<a name="entitynodes" href="#entitynodes">#</a> entityflow.<b>entitynodes</b>()

Returns a function which can be passed to obtain the nodes in an
entity's path, e.g.:

    svg.selectAll(".node")
       .data(flow.entities())
       .enter()
       .data(flow.entitynodes())

<a name="size" href="#size">#</a> entityflow.<b>size</b>([<i>size</i>])

If *size* is specified, sets the available layout size to the
specified two-element array of numbers representing *x* and *y*. If
*size* is not specified, returns the current size, which defaults to
1×1.

<a name="size" href="#sessionWidth">#</a> entityflow.<b>sessionWidth</b>([<i>width</i>])

If *width* is specified, sets the width of each session object. If
*width* is not specified, returns the current size, which defaults to
140.

<a name="size" href="#sessionPadding">#</a> entityflow.<b>sessionPadding</b>([<i>padding</i>])

If *padding* is specified, sets the minimum vertical spacing between session
objects (and above and below the top and bottom session objects,
respectively). If *padding* is not specified, returns the current
padding, which defaults to 80.

<a name="size" href="#entityPadding">#</a> entityflow.<b>entityPadding</b>([<i>padding</i>])

If *padding* is specified, sets the minimum vertical spacing between
entity paths). If *padding* is not specified, returns the current
padding, which defaults to 10.

<a name="size" href="#entityFilter">#</a> entityflow.<b>entityFilter</b>([<i>filter</i>])

If *filter* is specified, it should be a function which takes a single
*entity* argument and returns a boolean indicating whether the entity
passes the filter. This is convenient as it allows the filter to use
entity properties computed by the layout, such as the array of nodes
in the entity path.  If *filter* is not specified, returns the current
filter function, which defaults to null.

<a name="size" href="#valueScale">#</a> entityflow.<b>valueScale</b>([<i>scale</i>])

If *scale* is specified, it should be a function which takes a
two-element array of numbers representing the minimum and maximum
participation values (*after* the entities have been filtered; see
above) and returns a d3 scale function for scaling the values. This is
useful for when a direct linear scaling of values to entity path
height is undesirable. If *scale* is not specified, returns the
current scale function, which defaults to null.
