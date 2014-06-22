/**
 * RoomRepository
 *
 * @param {Object} config
 */
function RoomRepository(SocketClient, PlayerRepository)
{
    EventEmitter.call(this);

    this.synced = false;
    this.client = SocketClient;
    this.rooms  = new Collection([], 'name');

    this.onNewRoom     = this.onNewRoom.bind(this);
    this.onCloseRoom   = this.onCloseRoom.bind(this);
    this.onJoinRoom    = this.onJoinRoom.bind(this);
    this.onLeaveRoom   = this.onLeaveRoom.bind(this);
    this.onWarmupRoom  = this.onWarmupRoom.bind(this);
    this.onPlayerReady = this.onPlayerReady.bind(this);
    this.onPlayerColor = this.onPlayerColor.bind(this);

    this.client.io.on('room:new', this.onNewRoom);
    this.client.io.on('room:close', this.onCloseRoom);
    this.client.io.on('room:join', this.onJoinRoom);
    this.client.io.on('room:leave', this.onLeaveRoom);
    this.client.io.on('room:start', this.onWarmupRoom);
    this.client.io.on('room:player:ready', this.onPlayerReady);
    this.client.io.on('room:player:color', this.onPlayerColor);
}

RoomRepository.prototype = Object.create(EventEmitter.prototype);

/**
 * Get all
 *
 * @return {Array}
 */
RoomRepository.prototype.all = function()
{
    return this.rooms;
};

/**
 * Get all
 *
 * @return {Array}
 */
RoomRepository.prototype.get = function(name)
{
    return this.rooms.getById(name);
};

/**
 * Create
 *
 * @return {Array}
 * @param {Function} callback
 */
RoomRepository.prototype.create = function(name, callback)
{
    return this.client.io.emit('room:create', {name: name}, callback);
};

/**
 * Join
 *
 * @param {String} room
 * @param {Function} callback
 */
RoomRepository.prototype.join = function(room, callback)
{
    return this.client.io.emit('room:join', {room: room}, callback);
};

/**
 * Add player
 *
 * @param {String} name
 * @param {Function} callback
 */
RoomRepository.prototype.addPlayer = function(name, callback)
{
    return this.client.io.emit('room:player:add', {name: name}, callback);
};

/**
 * Leave
 *
 * @return {Array}
 * @param {Function} callback
 */
RoomRepository.prototype.leave = function(callback)
{
    return this.client.io.emit('room:leave', callback);
};

/**
 * Set color
 *
 * @return {Array}
 * @param {Function} callback
 */
RoomRepository.prototype.setColor = function(room, player, color, callback)
{
    return this.client.io.emit('room:color', {room: room, player: player, color: color}, callback);
};

/**
 * Set ready
 *
 * @param {Room} room
 * @param {Boolean} ready
 * @param {Function} callback
 *
 * @return {Array}
 */
RoomRepository.prototype.setReady = function(room, player, callback)
{
    return this.client.io.emit('room:ready', {room: room, player: player}, callback);
};

// EVENTS:

/**
 * On new room
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onNewRoom = function(data)
{
    var room = new Room(data.name);

    for (var i = data.players.length - 1; i >= 0; i--) {
        room.addPlayer(new Player(data.players[i].client, data.players[i].name, data.players[i].color));
    }

    if(this.rooms.add(room)) {
        this.emit('room:new', {room: room});
    }

    this.setSynced();
};

/**
 * On close room
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onCloseRoom = function(data)
{
    var room = this.get(data.room);

    if(room && this.rooms.remove(room)) {
        this.emit('room:close', {room: room});
    }
};

/**
 * On join room
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onJoinRoom = function(data)
{
    var room = this.rooms.getById(data.room),
        player = new Player(data.player.client, data.player.name, data.player.color);

    if (room && room.addPlayer(player)) {
        var data = {room: room, player: player};
        this.emit('room:join', data);
        this.emit('room:join:' + room.name, data);
    }
};

/**
 * On leave room
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onLeaveRoom = function(data)
{
    var room = this.rooms.getById(data.room),
        player = room ? room.players.getById(data.player) : null;

    if (room && player && room.removePlayer(player)) {
        var data = {room: room, player: player};
        this.emit('room:leave', data);
        this.emit('room:leave:' + room.name, data);
    }
};

/**
 * On player change color
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onPlayerColor = function(data)
{
    var room = this.rooms.getById(data.room),
        player = room ? room.players.getById(data.player) : null;

    if (player) {
        player.setColor(data.color);
        this.emit('room:player:color:' + room.name, {room: room, player: player});
    }
};

/**
 * On player toggle ready
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onPlayerReady = function(data)
{
    var room = this.rooms.getById(data.room),
        player = room ? room.players.getById(data.player) : null;

    if (player) {
        player.toggleReady(data.ready);
        this.emit('room:player:ready:' + room.name, {room: room, player: player});
    }
};

/**
 * On join room
 *
 * @param {Object} data
 *
 * @return {Boolean}
 */
RoomRepository.prototype.onWarmupRoom = function(data)
{
    var room = this.rooms.getById(data.room),
        repository = this;

    if (room) {
        var data = {room: room};
        this.emit('room:start', data);
        this.emit('room:start:' + room.name, data);
    }
};

/**
 * Set synced
 */
RoomRepository.prototype.setSynced = function()
{
    if (!this.synced) {
        this.synced = true;
        this.emit('synced');
    }
};

/**
 * Refresh
 */
RoomRepository.prototype.refresh = function()
{
    this.synced = false;
    this.rooms  = new Collection([], 'name');

    return this.client.io.emit('room:join', {room: room}, callback);
};
